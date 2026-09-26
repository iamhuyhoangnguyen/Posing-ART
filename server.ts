import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import type { Collection, Db } from "mongodb";
import { buildPoseAdvisorPrompt, parsePoseAdvisorResponse } from "./src/services/poseAdvisorService";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 3000;
const configuredCorsOrigins = new Set(
  (process.env.CORS_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean),
);
const nativeCorsOrigins = new Set([
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = !origin || nativeCorsOrigins.has(origin) || configuredCorsOrigins.has(origin);
  if (origin && allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-User-Id,X-Admin-Pin");
    res.setHeader("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") return res.sendStatus(allowed ? 204 : 403);
  next();
});

const configuredTokenSecret = process.env.AUTH_TOKEN_SECRET || "";
const TOKEN_SECRET = configuredTokenSecret && !configuredTokenSecret.startsWith("replace-")
  ? configuredTokenSecret
  : randomBytes(32).toString("hex");
if (process.env.NODE_ENV === "production" && (configuredTokenSecret.length < 32 || configuredTokenSecret.startsWith("replace-"))) {
  throw new Error("AUTH_TOKEN_SECRET must be configured in production.");
}

// Increase payload limits for base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ==========================================
// SHARED CLOUD DRIVE PERSISTENT STORAGE (RBAC)
// ==========================================
interface CloudPhotoItem {
  id: string;
  ownerUserId?: string;
  localPhotoId?: string;
  poseKey: string;
  dataUrl: string;
  note?: string;
  uploadedBy?: string;
  uploaderRole?: "admin" | "member";
  status?: "approved" | "pending";
  createdAt: number;
}

const MAX_PHOTO_DATA_URL_LENGTH = 14_000_000;
const PHOTO_TOO_LARGE_ERROR = "Ảnh quá lớn, vui lòng chọn ảnh nhỏ hơn 10 MB";

export interface UserCloudRecord {
  id: string;
  userId: string;
  type: "favorite" | "savedPose" | "collection" | "generatedIdea" | "personalConcept" | "setting" | "profile";
  data: any;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
}

const USER_RECORD_TYPES = new Set<UserCloudRecord["type"]>([
  "favorite", "savedPose", "collection", "generatedIdea", "personalConcept", "setting", "profile",
]);
const MAX_USER_RECORD_BYTES = 5 * 1024 * 1024;
const AUTH_TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 30;
const AUTH_TOKEN_REFRESH_GRACE_SECONDS = 60 * 60 * 24 * 30;

function isValidUserCloudRecord(record: unknown): record is UserCloudRecord {
  if (!record || typeof record !== "object" || Array.isArray(record)) return false;
  const item = record as Partial<UserCloudRecord>;
  if (typeof item.id !== "string" || !item.id.trim() || item.id.length > 256) return false;
  if (!item.type || !USER_RECORD_TYPES.has(item.type)) return false;
  if (!item.data || typeof item.data !== "object") return false;
  if (!Number.isFinite(item.createdAt) || !Number.isFinite(item.updatedAt)) return false;
  if ((item.createdAt as number) <= 0 || (item.updatedAt as number) <= 0) return false;
  if (item.isDeleted !== undefined && typeof item.isDeleted !== "boolean") return false;
  try {
    return Buffer.byteLength(JSON.stringify(item) || "", "utf8") <= MAX_USER_RECORD_BYTES;
  } catch {
    return false;
  }
}

interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: "admin" | "member";
  authType: "credentials" | "google" | "facebook";
  avatar?: string;
  createdAt: number;
}

interface CloudDriveData {
  adminPin: string;
  adminPinEnvFingerprint?: string;
  users: StoredUser[];
  photos: CloudPhotoItem[];
  records: UserCloudRecord[];
  customPoses: Array<{
    section: string;
    categoryId: string;
    pose: any;
  }>;
  customCategories: any[];
  updatedAt: number;
  legacyMigrationComplete?: boolean;
}

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.resolve(__dirname, "data"));
const STORE_PATH = path.resolve(DATA_DIR, "cloud_drive_store.json");
const MONGODB_URI = process.env.MONGODB_URI?.trim() || "";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME?.trim() || undefined;

interface CloudMongoCollections {
  metadata: Collection<any>;
  users: Collection<any>;
  photos: Collection<any>;
  records: Collection<any>;
  customPoses: Collection<any>;
  customCategories: Collection<any>;
}

let mongoClient: MongoClient | undefined;
let mongoDatabase: Db | undefined;
let mongoCollections: CloudMongoCollections | undefined;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim() || "";
const rawAdminPassword = process.env.ADMIN_PASSWORD || "";
const ADMIN_PASSWORD = rawAdminPassword.startsWith("replace-") ? "" : rawAdminPassword;
const rawAdminPin = process.env.ADMIN_PIN || "";
const INITIAL_ADMIN_PIN = rawAdminPin.startsWith("replace-") ? "" : rawAdminPin;
const ADMIN_PIN_ENV_FINGERPRINT = INITIAL_ADMIN_PIN
  ? createHmac("sha256", TOKEN_SECRET).update(INITIAL_ADMIN_PIN).digest("hex")
  : "";
if (process.env.NODE_ENV === "production" && (!ADMIN_USERNAME || ADMIN_PASSWORD.length < 12 || INITIAL_ADMIN_PIN.length < 12 || rawAdminPassword.startsWith("replace-") || rawAdminPin.startsWith("replace-"))) {
  throw new Error("Set ADMIN_USERNAME and use ADMIN_PASSWORD/ADMIN_PIN with at least 12 characters in production.");
}

interface AuthClaims {
  sub: string;
  role: "admin" | "member";
  exp: number;
}

function hashPassword(value: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(value, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(value: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(value, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function createAuthToken(user: Pick<StoredUser, "id" | "role">): string {
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + AUTH_TOKEN_LIFETIME_SECONDS,
  } satisfies AuthClaims)).toString("base64url");
  const signature = createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function getAuthenticatedUser(req: express.Request): StoredUser | null {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", TOKEN_SECRET).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthClaims;
    if (!claims.sub || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    const user = cloudStore.users.find((candidate) => candidate.id === claims.sub);
    return user && user.role === claims.role ? user : null;
  } catch {
    return null;
  }
}

function getSignedAuthClaims(token: string): AuthClaims | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", TOKEN_SECRET).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(expected, received)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthClaims;
    return claims.sub && Number.isFinite(claims.exp) && ["admin", "member"].includes(claims.role)
      ? claims
      : null;
  } catch {
    return null;
  }
}

function getAuthenticationFailureReason(req: express.Request): string {
  const authorization = req.headers.authorization || "";
  if (!authorization) return "missing_authorization_header";
  if (!/^Bearer\s+/i.test(authorization)) return "missing_or_malformed_bearer_token";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return "missing_or_malformed_bearer_token";
  const claims = getSignedAuthClaims(token);
  if (!claims) return "malformed_token_or_invalid_signature";
  if (claims.exp <= Math.floor(Date.now() / 1000)) return "token_expired";
  const user = cloudStore.users.find((candidate) => candidate.id === claims.sub);
  if (!user) return "user_not_found";
  if (user.role !== claims.role) return "role_mismatch";
  return "unknown_authentication_failure";
}

function requireUser(req: express.Request, res: express.Response): StoredUser | null {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
    return null;
  }
  return user;
}

function requireAdmin(req: express.Request, res: express.Response): StoredUser | null {
  const user = requireUser(req, res);
  if (user && user.role !== "admin") {
    res.status(403).json({ success: false, error: "Chỉ quản trị viên được phép thực hiện thao tác này" });
    return null;
  }
  return user?.role === "admin" ? user : null;
}

function rateLimit(maxRequests: number, windowMs: number): express.RequestHandler {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let bucket = attempts.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      attempts.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > maxRequests) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, error: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." });
    }
    if (attempts.size > 5000) {
      for (const [attemptKey, value] of attempts) {
        if (value.resetAt <= now) attempts.delete(attemptKey);
      }
    }
    next();
  };
}

function asyncRoute(handler: express.RequestHandler): express.RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function isMongoDocumentTooLargeError(error: unknown): boolean {
  const pending: unknown[] = [error];
  const seen = new Set<unknown>();
  const messages: string[] = [];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);

    const candidate = current as {
      message?: unknown;
      code?: unknown;
      cause?: unknown;
      writeErrors?: unknown;
    };
    if (candidate.code === 10334 || candidate.code === "BSONObjectTooLarge") return true;
    if (typeof candidate.message === "string") messages.push(candidate.message);
    if (candidate.cause) pending.push(candidate.cause);
    if (Array.isArray(candidate.writeErrors)) pending.push(...candidate.writeErrors);
  }

  return /bson[^\n]*(?:too large|maximum size|size[^\n]*exceed|exceed[^\n]*size)|document[^\n]*(?:too large|maximum size|exceed)|object to insert too large/i
    .test(messages.join(" "));
}

app.use("/api/auth/login", rateLimit(10, 15 * 60 * 1000));
app.use("/api/auth/register", rateLimit(10, 60 * 60 * 1000));
app.use("/api/auth/social", rateLimit(10, 15 * 60 * 1000));
app.use("/api/cloud/admin/login", rateLimit(5, 15 * 60 * 1000));
app.use("/api/ai", rateLimit(20, 60 * 60 * 1000));

app.get("/api/health", asyncRoute(async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const now = Date.now();
  try {
    await mongoDatabase?.command({ ping: 1 });
  } catch (err) {
    console.error("[MongoDB] Health check ping failed:", err instanceof Error ? err.message : err);
    return res.status(503).json({
      status: "degraded",
      database: "disconnected",
      timestamp: now,
      time: new Date(now).toISOString(),
    });
  }
  res.json({
    status: "ok",
    database: mongoDatabase ? "connected" : "disconnected",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: now,
    time: new Date(now).toISOString(),
  });
}));

function createEmptyCloudStore(): CloudDriveData {
  return {
    adminPin: "",
    users: [],
    photos: [],
    records: [],
    customPoses: [],
    customCategories: [],
    updatedAt: Date.now(),
  };
}

function readLegacyStore(): Partial<CloudDriveData> | null {
  try {
    if (!fs.existsSync(STORE_PATH)) return null;
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as Partial<CloudDriveData>;
  } catch (err) {
    console.error(`[MongoDB Migration] Could not read legacy store at ${STORE_PATH}:`, err);
    throw err;
  }
}

function normalizeCloudStore(input: Partial<CloudDriveData> | null): CloudDriveData {
  const data: CloudDriveData = { ...createEmptyCloudStore(), ...(input || {}) };
  data.users ||= [];
  data.photos ||= [];
  data.records ||= [];
  data.customPoses ||= [];
  data.customCategories ||= [];

  // Remove access tokens accidentally embedded in profile sync records by
  // older clients before writing the data to MongoDB.
  for (const record of data.records) {
    if (record.type !== "profile" || !record.data || typeof record.data !== "object") continue;
    if (Object.prototype.hasOwnProperty.call(record.data, "token")) {
      const { token: _oldToken, ...safeProfile } = record.data;
      record.data = safeProfile;
    }
  }

  // Upgrade credentials saved in plaintext by older app versions.
  data.users.forEach((user) => {
    if (user.passwordHash && !user.passwordHash.startsWith("scrypt$")) {
      user.passwordHash = hashPassword(user.passwordHash);
    }
  });
  if (data.adminPin && !data.adminPin.startsWith("scrypt$")) data.adminPin = "";
  if (INITIAL_ADMIN_PIN.length >= 12) {
    if (!data.adminPin || data.adminPinEnvFingerprint !== ADMIN_PIN_ENV_FINGERPRINT) {
      data.adminPin = hashPassword(INITIAL_ADMIN_PIN);
      data.adminPinEnvFingerprint = ADMIN_PIN_ENV_FINGERPRINT;
      console.info("[Admin PIN] Stored PIN synchronized with the current ADMIN_PIN environment value.");
    }
  }

  // Administrator credentials are provisioned only from server-side environment values.
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    data.users.forEach((user) => {
      if (user.role === "admin") {
        user.passwordHash = hashPassword(randomBytes(32).toString("hex"));
        user.role = "member";
      }
    });
  }
  if (ADMIN_USERNAME && ADMIN_PASSWORD) {
    const admin = data.users.find((u) => u.username.toLowerCase() === ADMIN_USERNAME.toLowerCase())
      || data.users.find((u) => u.role === "admin");
    if (admin) {
      data.users.forEach((user) => {
        if (user !== admin && user.role === "admin") {
          user.passwordHash = hashPassword(randomBytes(32).toString("hex"));
          user.role = "member";
        }
      });
      admin.username = ADMIN_USERNAME;
      admin.passwordHash = hashPassword(ADMIN_PASSWORD);
      admin.role = "admin";
    } else {
      data.users.unshift({
        id: `admin-${randomBytes(12).toString("hex")}`,
        username: ADMIN_USERNAME,
        passwordHash: hashPassword(ADMIN_PASSWORD),
        name: "Quản trị viên",
        role: "admin",
        authType: "credentials",
        createdAt: Date.now(),
      });
    }
  }

  data.photos.forEach((photo) => {
    if (!photo.status) photo.status = "approved";
  });
  return data;
}

function customPoseStorageIds(poses: CloudDriveData["customPoses"]): string[] {
  const occurrences = new Map<string, number>();
  return poses.map((item) => {
    const key = JSON.stringify([item.section || "", item.categoryId || "", item.pose?.id || ""]);
    const occurrence = occurrences.get(key) || 0;
    occurrences.set(key, occurrence + 1);
    return `pose:${Buffer.from(key).toString("base64url")}:${occurrence}`;
  });
}

async function syncMongoCollection(
  collection: Collection<any>,
  documents: Array<Record<string, unknown>>,
  previousDocuments?: Array<Record<string, unknown>>,
): Promise<void> {
  const previousById = new Map((previousDocuments || []).map((document) => [String(document._id), document]));
  const changedDocuments = documents.filter((document) => {
    if (!previousDocuments) return true;
    return JSON.stringify(previousById.get(String(document._id))) !== JSON.stringify(document);
  });
  if (changedDocuments.length) {
    await collection.bulkWrite(changedDocuments.map((document) => ({
      replaceOne: {
        filter: { _id: document._id },
        replacement: document,
        upsert: true,
      },
    })), { ordered: false });
  }
  if (previousDocuments) {
    const currentIds = new Set(documents.map((document) => String(document._id)));
    const deletedIds = previousDocuments
      .filter((document) => !currentIds.has(String(document._id)))
      .map((document) => document._id);
    if (deletedIds.length) await collection.deleteMany({ _id: { $in: deletedIds } });
  }
}

async function persistMongoStore(data: CloudDriveData, previousData?: CloudDriveData): Promise<void> {
  if (!mongoCollections) throw new Error("MongoDB storage is not initialized.");
  const currentPoseIds = customPoseStorageIds(data.customPoses);
  const previousPoseIds = previousData ? customPoseStorageIds(previousData.customPoses) : [];
  const toUserDocuments = (items: StoredUser[]) => items.map((user) => ({
    ...user,
    _id: user.id,
    usernameKey: user.username.toLowerCase(),
  }));
  const toPhotoDocuments = (items: CloudPhotoItem[]) => items.map((photo) => ({ ...photo, _id: photo.id }));
  const toRecordDocuments = (items: UserCloudRecord[]) => items.map((record) => ({
    ...record,
    _id: `${record.userId}:${record.id}`,
  }));
  const toPoseDocuments = (items: CloudDriveData["customPoses"], ids: string[]) => items.map((item, index) => ({
    ...item,
    _id: ids[index],
  }));
  const toCategoryDocuments = (items: any[]) => items.map((category, index) => ({
    _id: String(category?.id || `category:${index}`),
    data: category,
  }));
  await Promise.all([
    syncMongoCollection(mongoCollections.users, toUserDocuments(data.users), previousData && toUserDocuments(previousData.users)),
    syncMongoCollection(mongoCollections.photos, toPhotoDocuments(data.photos), previousData && toPhotoDocuments(previousData.photos)),
    syncMongoCollection(mongoCollections.records, toRecordDocuments(data.records), previousData && toRecordDocuments(previousData.records)),
    syncMongoCollection(
      mongoCollections.customPoses,
      toPoseDocuments(data.customPoses, currentPoseIds),
      previousData && toPoseDocuments(previousData.customPoses, previousPoseIds),
    ),
    syncMongoCollection(
      mongoCollections.customCategories,
      toCategoryDocuments(data.customCategories),
      previousData && toCategoryDocuments(previousData.customCategories),
    ),
    mongoCollections.metadata.replaceOne(
      { _id: "primary" },
      {
        _id: "primary",
        adminPin: data.adminPin,
        adminPinEnvFingerprint: data.adminPinEnvFingerprint,
        updatedAt: data.updatedAt,
        legacyMigrationComplete: data.legacyMigrationComplete === true,
      },
      { upsert: true },
    ),
  ]);
}

async function loadMongoStore(): Promise<CloudDriveData> {
  if (!mongoCollections) throw new Error("MongoDB storage is not initialized.");
  const [metadata, users, photos, records, customPoses, customCategories] = await Promise.all([
    mongoCollections.metadata.findOne({ _id: "primary" }),
    mongoCollections.users.find({}).toArray(),
    mongoCollections.photos.find({}).toArray(),
    mongoCollections.records.find({}).toArray(),
    mongoCollections.customPoses.find({}).toArray(),
    mongoCollections.customCategories.find({}).toArray(),
  ]);
  const removeStorageFields = (document: Record<string, any>) => {
    const { _id, usernameKey: _usernameKey, ...item } = document;
    return item;
  };
  return {
    ...createEmptyCloudStore(),
    adminPin: String(metadata?.adminPin || ""),
    adminPinEnvFingerprint: metadata?.adminPinEnvFingerprint as string | undefined,
    updatedAt: Number(metadata?.updatedAt) || Date.now(),
    legacyMigrationComplete: metadata?.legacyMigrationComplete === true,
    users: users.map((document) => removeStorageFields(document) as unknown as StoredUser),
    photos: photos.map((document) => removeStorageFields(document) as unknown as CloudPhotoItem),
    records: records.map((document) => removeStorageFields(document) as unknown as UserCloudRecord),
    customPoses: customPoses.map((document) => removeStorageFields(document) as CloudDriveData["customPoses"][number]),
    customCategories: customCategories.map((document) => document.data),
  };
}

async function initializeMongoStore(): Promise<CloudDriveData> {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing. Configure it in the server environment before startup.");
  }
  mongoClient = new MongoClient(MONGODB_URI, {
    appName: "Posing-ART",
    serverSelectionTimeoutMS: 10_000,
  });
  await mongoClient.connect();
  const database = MONGODB_DB_NAME ? mongoClient.db(MONGODB_DB_NAME) : mongoClient.db();
  mongoDatabase = database;
  mongoCollections = {
    metadata: database.collection("cloud_metadata"),
    users: database.collection("cloud_users"),
    photos: database.collection("cloud_photos"),
    records: database.collection("user_records"),
    customPoses: database.collection("custom_poses"),
    customCategories: database.collection("custom_categories"),
  };
  await Promise.all([
    mongoCollections.users.createIndex({ usernameKey: 1 }, { unique: true }),
    mongoCollections.photos.createIndex({ ownerUserId: 1, localPhotoId: 1 }),
    mongoCollections.records.createIndex({ userId: 1, updatedAt: 1 }),
    mongoCollections.customPoses.createIndex({ section: 1, categoryId: 1 }),
    mongoCollections.customCategories.createIndex({ _id: 1 }),
  ]);
  console.info(`[MongoDB] Connected to database "${database.databaseName}".`);

  const [metadata, migration] = await Promise.all([
    mongoCollections.metadata.findOne({ _id: "primary" }),
    mongoCollections.metadata.findOne({ _id: "legacy-migration" }),
  ]);
  const collectionCounts = await Promise.all([
    mongoCollections.users.countDocuments(),
    mongoCollections.photos.countDocuments(),
    mongoCollections.records.countDocuments(),
    mongoCollections.customPoses.countDocuments(),
    mongoCollections.customCategories.countDocuments(),
  ]);
  const isDatabaseEmpty = collectionCounts.every((count) => count === 0);
  let initialData: Partial<CloudDriveData> | null = null;
  const resumeMigration = migration?.state === "importing";
  if (metadata?.legacyMigrationComplete !== true && (isDatabaseEmpty || resumeMigration)) {
    initialData = readLegacyStore();
    if (initialData) {
      await mongoCollections.metadata.replaceOne(
        { _id: "legacy-migration" },
        { _id: "legacy-migration", state: "importing", startedAt: migration?.startedAt || Date.now() },
        { upsert: true },
      );
      console.info("[MongoDB Migration] Importing legacy JSON data into MongoDB.");
    }
  } else if (metadata?.legacyMigrationComplete !== true && !isDatabaseEmpty) {
    console.warn("[MongoDB Migration] MongoDB already contains data; preserving it and skipping JSON import.");
  }

  const loaded = await loadMongoStore();
  const normalized = normalizeCloudStore(initialData || loaded);
  normalized.legacyMigrationComplete = true;
  await persistMongoStore(normalized);
  lastPersistedStore = structuredClone(normalized);
  await mongoCollections.metadata.replaceOne(
    { _id: "legacy-migration" },
    { _id: "legacy-migration", state: "complete", completedAt: Date.now() },
    { upsert: true },
  );
  if (initialData) {
    console.info("[MongoDB Migration] JSON import completed. The legacy JSON file was kept as a backup.");
  }
  return normalized;
}

let cloudStore: CloudDriveData;
let saveQueue: Promise<void> = Promise.resolve();
let lastPersistedStore: CloudDriveData | undefined;

function saveStore(): Promise<void> {
  cloudStore.updatedAt = Date.now();
  const snapshot = structuredClone(cloudStore);
  const saveOperation = saveQueue.then(async () => {
    await persistMongoStore(snapshot, lastPersistedStore);
    lastPersistedStore = structuredClone(snapshot);
  });
  saveQueue = saveOperation.catch((err) => {
    console.error("[MongoDB] Failed to persist cloud data:", err);
  });
  return saveOperation;
}

// ==========================================
// USER AUTHENTICATION & SUB-ACCOUNTS (RBAC)
// ==========================================

// Login endpoint: every account receives a server-signed, expiring access token.
app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Vui lòng nhập tên tài khoản và mật khẩu" });
    }

    const cleanUser = String(username).trim();
    const cleanPass = String(password).trim();

    const user = cloudStore.users.find(
      (u) => u.username.toLowerCase() === cleanUser.toLowerCase() && verifyPassword(cleanPass, u.passwordHash)
    );

    if (user) {
      const token = createAuthToken(user);
      const { passwordHash, ...safeUser } = user;
      return res.json({
        success: true,
        user: { ...safeUser, token },
        token,
      });
    }

    return res.status(401).json({
      success: false,
      error: "Tài khoản hoặc mật khẩu không chính xác",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Refresh a signed access token during a short grace period after expiry.
app.post("/api/auth/refresh", (req, res) => {
  const authorization = req.headers.authorization || "";
  const token = /^Bearer\s+/i.test(authorization)
    ? authorization.replace(/^Bearer\s+/i, "").trim()
    : "";
  const claims = token ? getSignedAuthClaims(token) : null;
  const now = Math.floor(Date.now() / 1000);

  if (!claims || claims.exp < now - AUTH_TOKEN_REFRESH_GRACE_SECONDS) {
    return res.status(401).json({ success: false, error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." });
  }

  const user = cloudStore.users.find((candidate) => candidate.id === claims.sub);
  if (!user || user.role !== claims.role) {
    return res.status(401).json({ success: false, error: "Tài khoản không còn hợp lệ. Vui lòng đăng nhập lại." });
  }

  res.json({ success: true, token: createAuthToken(user) });
});

// Register sub-account: NO Gmail or external account needed
app.post("/api/auth/register", asyncRoute(async (req, res) => {
  try {
    const { username, password, name } = req.body;
    const cleanUser = String(username || "").trim();
    const cleanPass = String(password || "").trim();
    const cleanName = String(name || cleanUser).trim();

    if (!cleanUser || cleanUser.length < 3) {
      return res.status(400).json({ success: false, error: "Tên đăng nhập phải từ 3 ký tự trở lên" });
    }
    if (!cleanPass || cleanPass.length < 10) {
      return res.status(400).json({ success: false, error: "Mật khẩu phải từ 10 ký tự trở lên" });
    }
    if (ADMIN_USERNAME && cleanUser.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
      return res.status(400).json({ success: false, error: "Tên tài khoản này đã được dành riêng cho Admin" });
    }

    const exists = cloudStore.users.some(
      (u) => u.username.toLowerCase() === cleanUser.toLowerCase()
    );
    if (exists) {
      return res.status(400).json({ success: false, error: "Tên tài khoản đã tồn tại, vui lòng chọn tên khác" });
    }

    const newUser: StoredUser = {
      id: `user-${randomBytes(16).toString("hex")}`,
      username: cleanUser,
      passwordHash: hashPassword(cleanPass),
      name: cleanName || cleanUser,
      role: "member",
      authType: "credentials",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
      createdAt: Date.now(),
    };

    cloudStore.users.push(newUser);
    await saveStore();

    const token = createAuthToken(newUser);
    const { passwordHash, ...safeUser } = newUser;
    return res.json({
      success: true,
      user: { ...safeUser, token },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}));

// Social login is disabled until an OAuth provider can verify the user identity.
app.post("/api/auth/social", (req, res) => {
  res.status(501).json({ success: false, error: "Đăng nhập mạng xã hội chưa được cấu hình" });
});

// 1. Cloud Drive Status
app.get("/api/cloud/status", (_req, res) => {
  const pendingCount = cloudStore.photos.filter((p) => p.status === "pending").length;
  res.json({
    success: true,
    connected: true,
    photosCount: cloudStore.photos.length,
    pendingPhotosCount: pendingCount,
    customPosesCount: cloudStore.customPoses.length,
    usersCount: cloudStore.users.length,
    updatedAt: cloudStore.updatedAt,
  });
});

// 2. Cloud Drive Full Sync (Fetch all shared photos & custom poses for any device)
app.get("/api/cloud/sync", (_req, res) => {
  const approvedPhotos = cloudStore.photos
    .filter((photo) => photo.status === "approved")
    .map(({ id, poseKey, dataUrl, note, uploadedBy, uploaderRole, status, createdAt }) => ({
      id, poseKey, dataUrl, note, uploadedBy, uploaderRole, status, createdAt,
    }));
  res.json({
    success: true,
    photos: approvedPhotos,
    customPoses: cloudStore.customPoses,
    customCategories: cloudStore.customCategories,
    updatedAt: cloudStore.updatedAt,
  });
});

// 3. Upload Photo to Cloud Drive
// Sub-accounts uploads are tagged as "pending" for admin approval
app.post("/api/cloud/upload-photo", asyncRoute(async (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const { poseKey, dataUrl, note, uploadedBy, localPhotoId } = req.body;
    if (!poseKey || !dataUrl) {
      return res.status(400).json({ error: "Thiếu dữ liệu poseKey hoặc ảnh dataUrl" });
    }
    if (typeof dataUrl !== "string" || !/^data:image\/(jpeg|png|webp|gif);base64,/i.test(dataUrl)) {
      return res.status(400).json({ error: "Ảnh không hợp lệ hoặc vượt quá dung lượng cho phép" });
    }
    if (dataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
      return res.status(413).json({ error: PHOTO_TOO_LARGE_ERROR });
    }
    if (typeof localPhotoId === "string" && localPhotoId.length > 128) {
      return res.status(400).json({ error: "Mã ảnh cục bộ không hợp lệ" });
    }
    const existingPhoto = typeof localPhotoId === "string"
      ? cloudStore.photos.find((photo) => photo.ownerUserId === user.id && photo.localPhotoId === localPhotoId)
      : undefined;
    if (existingPhoto) return res.json({ success: true, photo: existingPhoto, duplicate: true });

    const role = user.role;
    const initialStatus = role === "admin" ? "approved" : "pending";

    const newPhoto: CloudPhotoItem = {
      id: `cloud_photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      ownerUserId: user.id,
      localPhotoId: typeof localPhotoId === "string" ? localPhotoId : undefined,
      poseKey,
      dataUrl,
      note: note || "",
      uploadedBy: user.name || uploadedBy || "Thành viên",
      uploaderRole: role,
      status: initialStatus,
      createdAt: Date.now(),
    };

    cloudStore.photos.unshift(newPhoto);
    await saveStore();

    res.json({ success: true, photo: newPhoto });
  } catch (err: any) {
    if (isMongoDocumentTooLargeError(err)) {
      return res.status(413).json({ error: PHOTO_TOO_LARGE_ERROR });
    }
    res.status(500).json({ error: err.message || "Lỗi lưu ảnh lên Cloud Drive" });
  }
}));

// 3B. Get Pending Photos for Admin Approval
app.get("/api/cloud/photos/pending", (req, res) => {
  if (!requireAdmin(req, res)) return;
  const pending = cloudStore.photos.filter((p) => p.status === "pending");
  res.json({ success: true, pending });
});

// 3C. Approve Photo (ADMIN ONLY)
app.post("/api/cloud/photo/:id/approve", asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const photo = cloudStore.photos.find((p) => p.id === id);
  if (!photo) {
    return res.status(404).json({ error: "Không tìm thấy ảnh" });
  }
  photo.status = "approved";
  await saveStore();
  res.json({ success: true, photo });
}));

// 3D. Approve All Pending Photos (ADMIN ONLY)
app.post("/api/cloud/photos/approve-all", asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  let approvedCount = 0;
  cloudStore.photos.forEach((p) => {
    if (p.status === "pending") {
      p.status = "approved";
      approvedCount++;
    }
  });
  if (approvedCount > 0) await saveStore();
  res.json({ success: true, approvedCount });
}));

// 4. Add Custom Pose to Cloud Drive (ALLOWED FOR EVERYONE)
app.post("/api/cloud/add-pose", asyncRoute(async (req, res) => {
  try {
    if (!requireUser(req, res)) return;
    const { section, categoryId, pose } = req.body;
    if (!pose || !pose.id) {
      return res.status(400).json({ error: "Thiếu dữ liệu tư thế" });
    }

    cloudStore.customPoses.unshift({ section, categoryId, pose });
    await saveStore();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}));

// 5. Admin Login Verification
app.post("/api/cloud/admin/login", (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ success: false, error: "Vui lòng nhập mã PIN" });
  }
  const admin = cloudStore.users.find((user) => user.role === "admin");
  if (admin && cloudStore.adminPin && verifyPassword(String(pin), cloudStore.adminPin)) {
    return res.json({
      success: true,
      token: createAuthToken(admin),
    });
  }
  res.status(401).json({ success: false, error: "Mã PIN Quản trị viên không chính xác" });
});

// 6. Change Admin PIN (REQUIRES ADMIN)
app.post("/api/cloud/admin/change-pin", asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { newPin } = req.body;
  if (typeof newPin !== "string" || newPin.trim().length < 12) {
    return res.status(400).json({ error: "Mã PIN mới phải từ 12 ký tự trở lên" });
  }
  cloudStore.adminPin = hashPassword(newPin.trim());
  await saveStore();
  res.json({ success: true, message: "Đã cập nhật mã PIN Admin thành công" });
}));

// 7. Delete Photo from Cloud Drive (STRICTLY REQUIRES ADMIN)
app.delete("/api/cloud/photo/:id", asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const initialLen = cloudStore.photos.length;
  cloudStore.photos = cloudStore.photos.filter((p) => p.id !== id);
  if (cloudStore.photos.length !== initialLen) {
    await saveStore();
  }
  res.json({ success: true });
}));

// 8. Delete Custom Pose from Cloud Drive (STRICTLY REQUIRES ADMIN)
app.delete("/api/cloud/pose/:id", asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  cloudStore.customPoses = cloudStore.customPoses.filter((cp) => cp.pose.id !== id);
  await saveStore();
  res.json({ success: true });
}));

// ==========================================
// CENTRALIZED VERSION & MULTI-PLATFORM UPDATE
// ==========================================
const CURRENT_APP_VERSION = "2.2.0";
const MINIMUM_SUPPORTED_VERSION = "1.0.0";
const ANDROID_DOWNLOAD_URL = (process.env.ANDROID_DOWNLOAD_URL || "").trim();

app.get("/api/version", (req, res) => {
  const clientVer = (req.query.clientVersion as string) || "1.0.0";
  const platform = (req.query.platform as string) || "web";

  const isClientOutdated = clientVer !== CURRENT_APP_VERSION;

  res.json({
    currentVersion: CURRENT_APP_VERSION,
    minimumVersion: MINIMUM_SUPPORTED_VERSION,
    releaseDate: "2026-09-26",
    releaseNotes: [
      "Phiên bản 2.2 tập trung Web/PWA và Android (.apk).",
      "Hệ thống Cơ sở Dữ liệu Đám Mây đồng nhất: Favorites, Saved Poses, Collections, Concepts và AI Ideas.",
      "Cơ chế giải quyết xung đột Last-Write-Wins bảo đảm toàn vẹn dữ liệu giữa nhiều thiết bị.",
      "Tối ưu hóa bộ nhớ đệm Cache ngoại tuyến khi mất kết nối mạng.",
      "Hỗ trợ cập nhật bản Android và làm mới ứng dụng Web/PWA.",
    ],
    android: {
      updateAvailable: platform === "android" && isClientOutdated && Boolean(ANDROID_DOWNLOAD_URL),
      version: CURRENT_APP_VERSION,
      downloadUrl: ANDROID_DOWNLOAD_URL,
      instructions: "Tải file POSING_ART.apk, mở file và chọn Cài đặt (Cho phép cài đặt từ nguồn tin cậy nếu có yêu cầu).",
    },
    web: {
      updateAvailable: platform === "web" && isClientOutdated,
      version: CURRENT_APP_VERSION,
    },
  });
});

// ==========================================
// USER CLOUD DATA SYNCHRONIZATION (PHẦN 4, 5, 6, 7)
// Shared dataset across Web and Android
// ==========================================

// 1. Get all cloud records for user (incremental with ?since=timestamp)
app.get("/api/user/sync", (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const requestedUserId = (req.query.userId as string) || (req.headers["x-user-id"] as string);
    if (requestedUserId && requestedUserId !== user.id) {
      return res.status(403).json({ success: false, error: "Không có quyền truy cập dữ liệu tài khoản khác" });
    }
    const userId = user.id;
    const since = Number(req.query.since) || 0;

    if (!userId) {
      return res.status(400).json({ success: false, error: "Thiếu thông tin userId" });
    }

    if (!cloudStore.records) {
      cloudStore.records = [];
    }

    // Filter active records for this user modified since requested timestamp
    const records = cloudStore.records.filter(
      (r) => r.userId === userId && r.updatedAt >= since
    );

    res.json({
      success: true,
      records,
      serverTime: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Push & merge user cloud records with Last-Write-Wins conflict resolution
app.post("/api/user/sync", asyncRoute(async (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const { userId: requestedUserId, records } = req.body;
    if (requestedUserId && requestedUserId !== user.id) {
      return res.status(403).json({ success: false, error: "Không có quyền đồng bộ dữ liệu tài khoản khác" });
    }
    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, error: "Thiếu dữ liệu đồng bộ userId hoặc records" });
    }
    if (records.length > 1000) {
      return res.status(413).json({ success: false, error: "Mỗi lần đồng bộ hỗ trợ tối đa 1000 mục" });
    }
    if (!records.every(isValidUserCloudRecord)) {
      return res.status(400).json({ success: false, error: "Có bản ghi đồng bộ không hợp lệ hoặc vượt quá dung lượng cho phép" });
    }
    const userId = user.id;

    if (!cloudStore.records) {
      cloudStore.records = [];
    }

    const conflicts: UserCloudRecord[] = [];
    let updatedCount = 0;

    for (const incoming of records as UserCloudRecord[]) {
      const existingIdx = cloudStore.records.findIndex(
        (r) => r.id === incoming.id && r.userId === userId
      );

      if (existingIdx >= 0) {
        const existing = cloudStore.records[existingIdx];
        // Last-Write-Wins: compare updatedAt
        if (incoming.updatedAt >= existing.updatedAt) {
          cloudStore.records[existingIdx] = {
            ...incoming,
            userId,
          };
          updatedCount++;
        } else {
          // Conflict: existing on server is newer
          conflicts.push(existing);
        }
      } else {
        cloudStore.records.push({
          ...incoming,
          userId,
        });
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      await saveStore();
    }

    res.json({
      success: true,
      updatedCount,
      conflicts,
      serverTime: Date.now(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}));

// 3. Upsert single record
app.post("/api/user/record", asyncRoute(async (req, res) => {
  const requestRecord = req.body as Partial<UserCloudRecord> | undefined;
  const recordLogContext = {
    recordId: typeof requestRecord?.id === "string" ? requestRecord.id : "unknown",
    type: typeof requestRecord?.type === "string" ? requestRecord.type : "unknown",
  };
  try {
    const user = requireUser(req, res);
    if (!user) {
      console.warn("[User Record Sync] Rejected unauthenticated record request", {
        ...recordLogContext,
        authFailure: getAuthenticationFailureReason(req),
      });
      return;
    }
    const record = req.body as UserCloudRecord;
    if (!isValidUserCloudRecord(record)) {
      console.warn("[User Record Sync] Rejected invalid or oversized record", recordLogContext);
      return res.status(400).json({ success: false, error: "Dữ liệu record không hợp lệ" });
    }
    if (record.userId && record.userId !== user.id) {
      console.warn("[User Record Sync] Rejected record for a different user", recordLogContext);
      return res.status(403).json({ success: false, error: "Không có quyền sửa dữ liệu tài khoản khác" });
    }
    record.userId = user.id;

    if (!cloudStore.records) {
      cloudStore.records = [];
    }

    const existingIdx = cloudStore.records.findIndex(
      (r) => r.id === record.id && r.userId === record.userId
    );

    const now = Date.now();
    const itemToSave: UserCloudRecord = {
      ...record,
      updatedAt: record.updatedAt || now,
      createdAt: record.createdAt || now,
    };
    let operation: "inserted" | "updated" | "ignored_older" = "inserted";

    if (existingIdx >= 0) {
      const existing = cloudStore.records[existingIdx];
      if (itemToSave.updatedAt >= existing.updatedAt) {
        cloudStore.records[existingIdx] = itemToSave;
        await saveStore();
        operation = "updated";
      } else {
        operation = "ignored_older";
      }
    } else {
      cloudStore.records.push(itemToSave);
      await saveStore();
    }

    console.info("[User Record Sync] Record request completed", {
      ...recordLogContext,
      operation,
      userId: user.id,
      updatedAt: itemToSave.updatedAt,
    });
    res.json({ success: true, record: itemToSave });
  } catch (err: any) {
    console.error("[User Record Sync] Record request failed", {
      ...recordLogContext,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ success: false, error: err.message });
  }
}));

// 4. Delete user record
app.delete("/api/user/record/:id", asyncRoute(async (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const { id } = req.params;
    const requestedUserId = (req.query.userId as string) || (req.headers["x-user-id"] as string);
    if (requestedUserId && requestedUserId !== user.id) {
      return res.status(403).json({ success: false, error: "Không có quyền xóa dữ liệu tài khoản khác" });
    }

    if (!cloudStore.records) {
      cloudStore.records = [];
    }

    const initialLen = cloudStore.records.length;
    cloudStore.records = cloudStore.records.filter(
      (r) => !(r.id === id && r.userId === user.id)
    );

    if (cloudStore.records.length !== initialLen) {
      await saveStore();
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}));

// 5. User dataset summary (counts for Web and Android)
app.get("/api/user/summary", (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const requestedUserId = (req.query.userId as string) || (req.headers["x-user-id"] as string);
    if (requestedUserId && requestedUserId !== user.id) {
      return res.status(403).json({ success: false, error: "Không có quyền xem dữ liệu tài khoản khác" });
    }
    const userId = user.id;

    if (!cloudStore.records) {
      cloudStore.records = [];
    }

    const userRecords = cloudStore.records.filter((r) => r.userId === userId && !r.isDeleted);

    const favs = userRecords.filter((r) => r.type === "favorite" && r.data?.isFavorite);
    const poses = userRecords.filter((r) => r.type === "savedPose");
    const collections = userRecords.filter((r) => r.type === "collection");
    const ideas = userRecords.filter((r) => r.type === "generatedIdea");
    const concepts = userRecords.filter((r) => r.type === "personalConcept");

    res.json({
      userId,
      favoritesCount: favs.length,
      savedPosesCount: poses.length,
      collectionsCount: collections.length,
      generatedIdeasCount: ideas.length,
      personalConceptsCount: concepts.length,
      lastSyncedAt: cloudStore.updatedAt,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

function withAiTimeout<T>(request: Promise<T>, timeoutMs = 45_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("AI request timed out."), { code: "AI_TIMEOUT" })), timeoutMs);
  });
  return Promise.race([request, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function getAiErrorMessage(error: any, fallback: string): string {
  const status = Number(error?.status || error?.code);
  const message = String(error?.message || "");
  if (error?.code === "AI_TIMEOUT") return "AI phản hồi quá thời gian chờ. Vui lòng thử lại sau.";
  if (status === 401 || status === 403 || /API_KEY_INVALID|API key (?:not valid|invalid)|invalid API key/i.test(message)) {
    return "GEMINI_API_KEY không hợp lệ hoặc chưa được cấp quyền sử dụng model.";
  }
  if (status === 404 || /model.+(not found|does not exist)|not found.+model/i.test(message)) {
    return `Model Gemini không khả dụng: ${message || "hãy kiểm tra tên model trong cấu hình máy chủ."}`;
  }
  if (status === 429) return "Gemini đang giới hạn lượt gọi hoặc đã hết quota. Vui lòng thử lại sau.";
  if (status >= 500) return "Dịch vụ Gemini đang gặp sự cố tạm thời. Vui lòng thử lại sau.";
  return message || fallback;
}

function isRetryableAiError(error: any): boolean {
  const status = Number(error?.status || error?.code);
  return error?.code === "AI_TIMEOUT" || status === 408 || status === 429 || status >= 500;
}

// 1. Analyze Pose using gemini-3.1-pro-preview
app.post("/api/ai/creative-chat", async (req, res) => {
  try {
    const {
      model = "chatgpt",
      message,
      image,
      mimeType = "image/jpeg",
    } = req.body;

    if (!message && !image) {
      return res.status(400).json({ error: "Vui lòng nhập câu hỏi hoặc gửi ảnh." });
    }
    if (message !== undefined && typeof message !== "string") {
      return res.status(400).json({ error: "Nội dung câu hỏi không hợp lệ." });
    }
    if (image !== undefined && (typeof image !== "string" || !image.startsWith("data:image/"))) {
      return res.status(400).json({ error: "Ảnh gửi lên không đúng định dạng." });
    }

    const modelName = model === "claude" ? "Claude 3.7" : model === "gemini" ? "Gemini 2.5" : "ChatGPT (GPT-4o)";

    const systemPrompt = `
Bạn là Trợ Lý Sáng Tạo Ý Tưởng Nhiếp Ảnh & Tạo Dáng Chuyên Nghiệp đóng vai trò mô hình ${modelName}.
Mục tiêu của bạn: Giải quyết tình trạng "Bí ý tưởng" cho nhiếp ảnh gia và người mẫu chụp Kỷ Yếu & Concept Cá Nhân theo phong cách THỰC CHIẾN TẠI HIỆN TRƯỜNG.

Ngôn ngữ trả lời: Tiếng Việt tự nhiên, súc tích, thẩm mỹ, chuyên nghiệp, không dài dòng rườm rà.
NGUYÊN TẮC:
- Mọi hướng dẫn phải chuyển thành HÀNH ĐỘNG VẬT LÝ CỤ THỂ mà mẫu hoặc thợ ảnh thực hiện được ngay (vị trí tay, độ khép ngón tay, góc xoay vai, hướng mắt, hạ/nâng cằm, góc máy, hướng ánh sáng).
- TUYỆT ĐỐI KHÔNG dùng lời khuyên sáo rỗng như: "hãy tạo dáng tự nhiên", "hãy dùng ánh sáng mềm", "hãy tạo cảm giác điện ảnh".
- KHÔNG BỊA ĐẶT metadata máy ảnh/khẩu độ/tốc/ISO nếu người dùng không cung cấp; chỉ khuyến nghị tiêu cự và góc máy theo nguyên lý quang học.
${
  model === "chatgpt"
    ? "Phong cách của bạn (ChatGPT): Thực chiến, kịch bản concept chi tiết, câu chuyện chụp ảnh độc đáo và các caption hay."
    : model === "claude"
    ? "Phong cách của bạn (Claude): Tinh tế, mỹ học cao cấp, cảm xúc ánh sáng nghệ thuật, bố cục chuẩn điện ảnh và tone màu."
    : "Phong cách của bạn (Gemini): Đa phương thức thông minh, phân tích thị giác sắc bén, tối ưu góc máy, bối cảnh và mẹo hiện trường nhanh."
}

Hãy cấu trúc câu trả lời mạch lạc theo các mục sau (dùng định dạng Markdown rõ ràng):
✨ **Ý TƯỞNG CONCEPT CHỦ ĐẠO** (Tóm tắt concept & cảm hứng)
📸 **3 - 5 GỢI Ý DÁNG CHỤP CHI TIẾT** (Ghi rõ: tư thế vai/tay/ngón tay/chân, hướng nhìn mắt, biểu cảm)
📐 **GÓC MÁY & BỐ CỤC KHUYÊN DÙNG** (Góc máy, khoảng cách, chiều cao đặt máy)
💡 **ÁNH SÁNG & ĐẠO CỤ PHÙ HỢP** (Nguồn sáng, hướng sáng chính, phụ kiện cần chuẩn bị)
🇨🇳 **TỪ KHÓA TÌM KIẾM REDNOTE (TIẾU HỒNG THƯ - TIẾNG TRUNG)** (Cung cấp 2-3 cụm từ tiếng Trung chuẩn xác kèm pinyin để người dùng tìm thêm ảnh trên Xiaohongshu)
`;

    if (!process.env.GEMINI_API_KEY) {
      // Fallback creative response when API key is not yet set
      const fallbackChinese = model === "claude" ? "法式复古人像写真 氛围感拍照姿势" : "女生写真创意 拍照姿势灵感 青春感";
      return res.json({
        success: true,
        model,
        reply: `### ✨ Ý TƯỞNG CONCEPT: ${message ? message.slice(0, 50) : "Sáng Tạo Mới"}\n\n` +
          `**Phong cách ${modelName}:**\n` +
          `1. **Dáng 1 - Góc Nghiêng Tự Nhiên**: Đứng chếch 45 độ, một tay vén nhẹ tóc mai, mắt nhìn hướng 2 giờ mỉm cười nhẹ. Trọng tâm dồn chân sau.\n` +
          `2. **Dáng 2 - Tương Tác Với Đạo Cụ**: Cầm hoa hoặc sách che nhẹ 1/3 khuôn mặt, tạo sự bí ẩn và thu hút ánh nhìn vào đôi mắt.\n` +
          `3. **Dáng 3 - Bắt Khoảnh Khắc Chuyển Động**: Bước đi chậm rãi, váy bay nhẹ, đầu ngoảnh lại nhìn máy ảnh theo phong cách "Candid".\n\n` +
          `📐 **Góc Máy:** Ngang tầm mắt hoặc góc thấp 15 độ để tôn dáng dài.\n` +
          `💡 **Ánh Sáng:** Tận dụng ánh sáng xiên lúc hoàng hôn (Golden Hour) hoặc hắt sáng tự nhiên.\n` +
          `🇨🇳 **Từ khóa Rednote (Tiểu Hồng Thư):** \`${fallbackChinese}\`\n\n*(Bạn có thể kết nối thêm tài khoản web trực tiếp qua các nút bấm bên trên)*`,
      });
    }

    const parts: any[] = [];

    if (image) {
      const imageMimeType = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i)?.[1] || mimeType;
      const cleanBase64 = image.replace(/^data:[^;]+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: cleanBase64,
        },
      });
      parts.push({
        text: `Dưới đây là hình ảnh do người dùng gửi lên. Hãy phân tích bối cảnh, trang phục, góc chụp của ảnh và kết hợp với câu hỏi: "${message || "Hãy gợi ý các dáng chụp sáng tạo dựa trên ảnh này"}".\n\n${systemPrompt}`,
      });
    } else {
      parts.push({
        text: `Câu hỏi / yêu cầu ý tưởng từ người dùng: "${message}".\n\n${systemPrompt}`,
      });
    }

    let response: any = null;
    let lastError: any = null;
    const chatModels = ["gemini-3.6-flash", "gemini-3.8-flash"];
    for (const m of chatModels) {
      try {
        response = await withAiTimeout(ai.models.generateContent({
          model: m,
          contents: { parts },
        }));
        if (response?.text) break;
      } catch (e: any) {
        lastError = e;
        console.warn(`Chat model ${m} failed:`, e?.message);
        if (!isRetryableAiError(e)) throw e;
      }
    }

    if (!response || !response.text) {
      if (lastError) throw lastError;
      throw new Error("Không thể kết nối đến mô hình AI lúc này.");
    }

    const reply = response.text || "Đã tạo ý tưởng thành công.";
    res.json({
      success: true,
      model,
      reply,
    });
  } catch (error: any) {
    console.error("Creative chat error:", error);
    res.status(error?.code === "AI_TIMEOUT" ? 504 : 502).json({
      error: getAiErrorMessage(error, "Lỗi xử lý yêu cầu sáng tạo ý tưởng AI."),
    });
  }
});

// 1. Analyze Pose using Real-world Field Photography Assistant
app.post("/api/ai/analyze-pose", async (req, res) => {
  try {
    const {
      image,
      mimeType = "image/jpeg",
      poseTitle,
      category,
      contextNotes,
      context,
    } = req.body;

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return res.status(400).json({ error: "Vui lòng cung cấp hình ảnh để phân tích." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: "Chưa cấu hình API Key trên máy chủ.",
      });
    }

    let actualMimeType = mimeType || "image/jpeg";
    const dataUriMatch = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    if (dataUriMatch && dataUriMatch[1]) {
      actualMimeType = dataUriMatch[1];
    }
    const cleanBase64 = image.replace(/^data:[^;]+;base64,/, "");

    const promptText = buildPoseAdvisorPrompt({
      poseTitle,
      category,
      contextNotes,
      context,
    });

    const modelsToTry = [
      "gemini-3.6-flash",
      "gemini-3.1-pro-preview",
      "gemini-3.8-flash",
    ];
    let response: any = null;
    let lastError: any = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const modelCandidate = modelsToTry[i];
      try {
        if (i > 0) {
          // Brief pause before retry/fallback to avoid demand spike
          await new Promise((r) => setTimeout(r, 1000));
        }
        response = await withAiTimeout(ai.models.generateContent({
          model: modelCandidate,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: actualMimeType,
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
          config: {
            responseMimeType: "application/json",
          },
        }));
        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Pose Advisor] Attempt ${i + 1} (${modelCandidate}) failed:`, err?.status || err?.code, err?.message);
        if (!isRetryableAiError(err)) break;
      }
    }

    if (!response || !response.text) {
      const errorMsg = getAiErrorMessage(lastError, "Không thể phân tích ảnh lúc này. Vui lòng thử lại sau.");
      return res.status(lastError?.code === "AI_TIMEOUT" ? 504 : 502).json({ error: errorMsg });
    }

    const rawText = response.text || "";
    const { structured, markdown } = parsePoseAdvisorResponse(rawText);

    res.json({
      success: true,
      analysis: markdown,
      structured,
    });
  } catch (error: any) {
    console.error("Pose analysis error:", error);
    res.status(error?.code === "AI_TIMEOUT" ? 504 : 502).json({
      error: getAiErrorMessage(error, "Đã xảy ra lỗi khi phân tích ảnh tư thế."),
    });
  }
});

// Configure Vite in dev mode or static files in production
async function startServer() {
  cloudStore = await initializeMongoStore();

  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Server] Request failed:", err);
  if (res.headersSent) return;
  res.status(500).json({ success: false, error: "Lỗi máy chủ khi xử lý yêu cầu" });
});

startServer().catch(async (err) => {
  console.error(
    "[Startup] Server could not start because MongoDB initialization failed:",
    err instanceof Error ? err.message : err,
  );
  try {
    await mongoClient?.close();
  } catch (closeError) {
    console.error("[MongoDB] Failed to close after startup error:", closeError);
  }
  process.exitCode = 1;
});
