import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import sharp from "sharp";
import type { Collection, Db } from "mongodb";
import { buildPoseAdvisorPrompt, parsePoseAdvisorResponse } from "./src/services/poseAdvisorService";
import { withGeminiUnavailableRetry } from "./src/services/geminiRetry";
import { APP_RELEASE_DATE, APP_VERSION, CURRENT_RELEASE_NOTES } from "./src/version";
import { INITIAL_DATA_CANHAN, INITIAL_DATA_KYYEU } from "./src/data/posesData";
import { appendGalleryPhotoReferences, categoryGalleryKey, createLegacyPoseKeyMap, remapLegacyGalleryPhotos, UNCATEGORIZED_CATEGORY_ID } from "./src/utils/categoryGallery";
import { stripSeedGalleryPhotosFromCloudCategories } from "./src/utils/seedGalleryPhotos";

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
  /** Original V2 pose key retained so a V3 migration can be rolled back. */
  legacyPoseKey?: string;
  note?: string;
  uploadedBy?: string;
  uploaderRole?: "admin" | "member";
  status?: "approved";
  createdAt: number;
  imageVersion?: number;
}

type CloudPhotoDocument = CloudPhotoItem & { dataUrl: string };
type LegacyCloudPhotoItem = CloudPhotoItem & { dataUrl?: string };
type LegacyCloudDriveData = Omit<Partial<CloudDriveData>, "photos"> & { photos?: LegacyCloudPhotoItem[] };

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

function getCloudCategoryRecordData(record: UserCloudRecord): { section: "kyyeu" | "canhan"; category: any } | null {
  const data = record.data;
  if (record.type !== "personalConcept" || data?.kind !== "posing-art-category-v1" ||
    (data.section !== "kyyeu" && data.section !== "canhan")) return null;
  const category = data.category;
  if (!category || typeof category !== "object" || Array.isArray(category) ||
    typeof category.id !== "string" || !category.id.trim() || category.id.length > 160 ||
    typeof category.label !== "string" || !category.label.trim() || category.label.length > 100 ||
    (category.images !== undefined && !Array.isArray(category.images)) ||
    (category.poses !== undefined && !Array.isArray(category.poses)) ||
    Buffer.byteLength(JSON.stringify(category) || "", "utf8") > 12 * 1024 * 1024) return null;
  return { section: data.section, category };
}

function applyCloudCategoryRecord(record: UserCloudRecord, user: StoredUser): void {
  const categoryData = getCloudCategoryRecordData(record);
  if (!categoryData) return;
  const { section, category } = categoryData;
  const entryId = `user-category:${section}:${category.id}`;
  const existingIndex = cloudStore.customCategories.findIndex((item) => item?.id === entryId && item?.kind === "userCategory");
  const existing = existingIndex >= 0 ? cloudStore.customCategories[existingIndex] : undefined;
  if (existing?.ownerUserId && existing.ownerUserId !== user.id && user.role !== "admin") return;

  if (record.isDeleted) {
    if (existingIndex >= 0) cloudStore.customCategories.splice(existingIndex, 1);
    return;
  }
  const entry = {
    id: entryId,
    kind: "userCategory",
    section,
    categoryId: category.id,
    category: structuredClone(category),
    ownerUserId: existing?.ownerUserId || user.id,
  };
  if (existingIndex >= 0) cloudStore.customCategories[existingIndex] = entry;
  else cloudStore.customCategories.push(entry);
}

function createCloudCategoryEntry(section: "kyyeu" | "canhan", category: any, ownerUserId: string, existing?: any) {
  return {
    id: `user-category:${section}:${category.id}`,
    kind: "userCategory",
    section,
    categoryId: category.id,
    category: structuredClone(category),
    ownerUserId: existing?.ownerUserId || ownerUserId,
  };
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
  deletedCategories: Array<{ section: "kyyeu" | "canhan"; categoryId: string; poseKeys: string[] }>;
  deletedPoseKeys: string[];
  updatedAt: number;
  legacyMigrationComplete?: boolean;
  galleryV300MigrationComplete?: boolean;
  galleryV300BackupReference?: string;
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
    deletedCategories: [],
    deletedPoseKeys: [],
    updatedAt: Date.now(),
  };
}

function readLegacyStore(): LegacyCloudDriveData | null {
  try {
    if (!fs.existsSync(STORE_PATH)) return null;
    return JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as LegacyCloudDriveData;
  } catch (err) {
    console.error(`[MongoDB Migration] Could not read legacy store at ${STORE_PATH}:`, err);
    throw err;
  }
}

function normalizeCloudStore(input: LegacyCloudDriveData | Partial<CloudDriveData> | null): CloudDriveData {
  const data: CloudDriveData = { ...createEmptyCloudStore(), ...(input || {}) };
  data.users ||= [];
  data.photos = (input?.photos || []).map((photo) => {
    const { dataUrl: _dataUrl, ...metadata } = photo as LegacyCloudPhotoItem;
    return metadata;
  });
  data.records ||= [];
  data.customPoses ||= [];
  data.customCategories ||= [];
  data.deletedCategories ||= [];
  data.deletedPoseKeys ||= [];

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
    // Photo approval has been removed; normalize legacy pending records at startup.
    photo.status = "approved";
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

async function importLegacyPhotoDocuments(photos: LegacyCloudPhotoItem[]): Promise<void> {
  if (!mongoCollections || photos.length === 0) return;
  await mongoCollections.photos.bulkWrite(photos.map((photo) => {
    const { dataUrl, ...metadata } = photo;
    return {
      updateOne: {
        filter: { _id: metadata.id },
        update: {
          $set: { ...metadata, ...(typeof dataUrl === "string" ? { dataUrl } : {}) },
        },
        upsert: true,
      },
    };
  }), { ordered: false });
}

/** Syncs only photo metadata; image bytes remain untouched in MongoDB. */
async function syncMongoPhotoMetadata(
  collection: Collection<any>,
  photos: CloudPhotoItem[],
  previousPhotos?: CloudPhotoItem[],
): Promise<void> {
  if (!previousPhotos) {
    console.warn("[MongoDB] Skipping cloud photo metadata sync because the previous photo snapshot is unavailable.");
    return;
  }
  const previousById = new Map(previousPhotos.map((photo) => [photo.id, photo]));
  const currentById = new Map(photos.map((photo) => [photo.id, photo]));
  const operations = photos.flatMap((photo) => {
    const previous = previousById.get(photo.id);
    if (!previous || JSON.stringify(previous) === JSON.stringify(photo)) return [];
    return [{ updateOne: { filter: { _id: photo.id }, update: { $set: { ...photo } } } }];
  });
  if (operations.length) await collection.bulkWrite(operations, { ordered: false });
  const removedIds = previousPhotos.filter((photo) => !currentById.has(photo.id)).map((photo) => photo.id);
  if (removedIds.length) await collection.deleteMany({ _id: { $in: removedIds } });
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
  const writes: Promise<void>[] = [
    syncMongoCollection(mongoCollections.users, toUserDocuments(data.users), previousData && toUserDocuments(previousData.users)),
    syncMongoPhotoMetadata(mongoCollections.photos, data.photos, previousData?.photos),
    syncMongoCollection(mongoCollections.records, toRecordDocuments(data.records), previousData && toRecordDocuments(previousData.records)),
    syncMongoCollection(
      mongoCollections.customCategories,
      toCategoryDocuments(data.customCategories),
      previousData && toCategoryDocuments(previousData.customCategories),
    ),
  ];
  if (!data.galleryV300MigrationComplete) {
    writes.push(syncMongoCollection(
      mongoCollections.customPoses,
      toPoseDocuments(data.customPoses, currentPoseIds),
      previousData && toPoseDocuments(previousData.customPoses, previousPoseIds),
    ));
  }
  await Promise.all(writes);
  await mongoCollections.metadata.replaceOne(
    { _id: "primary" },
    {
      _id: "primary",
      adminPin: data.adminPin,
      adminPinEnvFingerprint: data.adminPinEnvFingerprint,
      updatedAt: data.updatedAt,
      legacyMigrationComplete: data.legacyMigrationComplete === true,
      deletedCategories: data.deletedCategories,
      deletedPoseKeys: data.deletedPoseKeys,
      galleryV300MigrationComplete: data.galleryV300MigrationComplete === true,
      galleryV300BackupReference: data.galleryV300BackupReference,
    },
    { upsert: true },
  );
}

async function loadMongoStore(): Promise<CloudDriveData> {
  if (!mongoCollections) throw new Error("MongoDB storage is not initialized.");
  const [metadata, users, photos, records, customPoses, customCategories] = await Promise.all([
    mongoCollections.metadata.findOne({ _id: "primary" }),
    mongoCollections.users.find({}).toArray(),
    mongoCollections.photos.find({}, { projection: { dataUrl: 0 } }).toArray(),
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
    deletedCategories: Array.isArray(metadata?.deletedCategories) ? metadata.deletedCategories : [],
    deletedPoseKeys: Array.isArray(metadata?.deletedPoseKeys) ? metadata.deletedPoseKeys : [],
    galleryV300MigrationComplete: metadata?.galleryV300MigrationComplete === true,
    galleryV300BackupReference: typeof metadata?.galleryV300BackupReference === "string" ? metadata.galleryV300BackupReference : undefined,
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
  let initialData: LegacyCloudDriveData | null = null;
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

  if (initialData?.photos?.length) {
    await importLegacyPhotoDocuments(initialData.photos);
    initialData.photos = initialData.photos.map((photo) => {
      const { dataUrl: _dataUrl, ...metadata } = photo;
      return metadata;
    });
  }
  const loaded = await loadMongoStore();
  const normalized = normalizeCloudStore(initialData || loaded);
  if (!normalized.galleryV300MigrationComplete) {
    const backupReference = process.env.V3_GALLERY_BACKUP_REFERENCE?.trim();
    if (MONGODB_URI && !backupReference) {
      throw new Error("V3 gallery migration requires V3_GALLERY_BACKUP_REFERENCE after a full MongoDB Atlas backup has been exported.");
    }
    if (backupReference) {
      const poseKeyMap = createLegacyPoseKeyMap(
        [
          { section: "kyyeu", categories: INITIAL_DATA_KYYEU },
          { section: "canhan", categories: INITIAL_DATA_CANHAN },
        ],
        normalized.customPoses as Array<{ section: string; categoryId: string; pose: { id?: string } }>,
      );
      const validGalleryKeys = new Set<string>();
      for (const [section, categories] of [["kyyeu", INITIAL_DATA_KYYEU], ["canhan", INITIAL_DATA_CANHAN]] as const) {
        for (const category of categories) validGalleryKeys.add(categoryGalleryKey(section, category.id));
      }
      for (const item of normalized.customPoses) {
        if ((item.section === "kyyeu" || item.section === "canhan") && item.categoryId) {
          validGalleryKeys.add(categoryGalleryKey(item.section, item.categoryId));
        }
      }
      for (const item of normalized.customCategories) {
        if (item?.kind === "categoryGallery" && typeof item.galleryKey === "string") validGalleryKeys.add(item.galleryKey);
      }
      const galleryImages = new Map<string, Array<{ id: string; imageUrl?: string; sourcePoseId?: string; photoId?: string }>>();
      const addLegacyImages = (section: string, categoryId: string, poses: Array<{ id?: string; coverImage?: string }>) => {
        const key = categoryGalleryKey(section, categoryId);
        const images = galleryImages.get(key) || [];
        for (const pose of poses) {
          if (!pose.coverImage) continue;
          images.push({ id: `legacy:${pose.id || images.length}`, imageUrl: pose.coverImage, sourcePoseId: pose.id || "" });
        }
        galleryImages.set(key, images);
      };
      for (const [section, categories] of [["kyyeu", INITIAL_DATA_KYYEU], ["canhan", INITIAL_DATA_CANHAN]] as const) {
        for (const category of categories) addLegacyImages(section, category.id, category.poses);
      }
      for (const item of normalized.customPoses) {
        addLegacyImages(item.section, item.categoryId, [item.pose]);
      }
      const originalPhotoCount = normalized.photos.length;
      const photoMigration = remapLegacyGalleryPhotos(normalized.photos, poseKeyMap, (photo) => {
        const matchingPoseCover = normalized.records.find((record) =>
          record.type === "setting" && record.data?.kind === "pose" && record.data.targetId === photo.poseKey
        );
        const deletedParent = normalized.deletedCategories.find((category) => category.poseKeys.includes(photo.poseKey));
        const keySection = photo.poseKey.startsWith("canhan-") ? "canhan" : photo.poseKey.startsWith("kyyeu-") ? "kyyeu" : undefined;
        const section = matchingPoseCover?.data?.sectionKey === "canhan" || matchingPoseCover?.data?.sectionKey === "kyyeu"
          ? matchingPoseCover.data.sectionKey
          : deletedParent?.section || keySection || "kyyeu";
        return categoryGalleryKey(section, UNCATEGORIZED_CATEGORY_ID);
      }, validGalleryKeys);
      if (photoMigration.photos.length !== originalPhotoCount) {
        throw new Error("[V3 Gallery Migration] Photo count changed while planning the migration; refusing to persist.");
      }
      if (photoMigration.unmappedCount > photoMigration.fallbackCount) {
        throw new Error(`[V3 Gallery Migration] Refusing to migrate: ${photoMigration.unmappedCount - photoMigration.fallbackCount} photos were not mapped or assigned to fallback. Keep the Atlas backup and resolve these records before retrying.`);
      }
      for (const fallback of photoMigration.fallbackPhotos) {
        console.warn(`[V3 Gallery Migration] Photo ${fallback.id} with unknown poseKey "${fallback.legacyPoseKey}" assigned to fallback gallery "${fallback.fallbackGalleryKey}"; legacyPoseKey retained.`);
      }
      normalized.photos = photoMigration.photos;
      for (const [galleryKey, images] of galleryImages) {
        const [, , section, categoryId] = galleryKey.split(":");
        const id = `category-gallery:${section}:${categoryId}`;
        const current = normalized.customCategories.findIndex((item) => item?.id === id);
        const gallery = { id, kind: "categoryGallery", section, categoryId, galleryKey, images };
        if (current >= 0) normalized.customCategories[current] = gallery;
        else normalized.customCategories.push(gallery);
        const completeImages = appendGalleryPhotoReferences(images, normalized.photos, galleryKey);
        gallery.images = completeImages;
        galleryImages.set(galleryKey, completeImages);
        const photoCount = normalized.photos.filter((photo) => photo.poseKey === galleryKey).length;
        const totalGalleryImages = images.filter((image) => !image.photoId).length + photoCount;
        if (totalGalleryImages > 100) {
          console.warn(`[V3 Gallery Migration] ${section}/${categoryId} has ${totalGalleryImages} existing images; all are being preserved. New uploads stay blocked until the gallery is below 100.`);
        }
      }
      normalized.galleryV300MigrationComplete = true;
      normalized.galleryV300BackupReference = backupReference || "local-development";
      console.info(`[V3 Gallery Migration] Remapped ${photoMigration.remappedCount} cloud photos; assigned ${photoMigration.fallbackCount} unknown photos to the visible Uncategorized gallery; retained all custom_poses records.`);
    }
  }
  const seedGalleryCleanup = stripSeedGalleryPhotosFromCloudCategories(normalized.customCategories);
  normalized.customCategories = seedGalleryCleanup.categories as CloudDriveData["customCategories"];
  if (seedGalleryCleanup.removedCount > 0) {
    console.info(`[Gallery Seed Cleanup] Removed ${seedGalleryCleanup.removedCount} built-in pose photos from category galleries.`);
  }
  normalized.legacyMigrationComplete = true;
  await persistMongoStore(normalized, loaded);
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

app.get("/api/auth/verify-admin", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const user = requireAdmin(req, res);
  if (!user) return;
  res.json({ success: true, userId: user.id, role: user.role });
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
  res.json({
    success: true,
    connected: true,
    photosCount: cloudStore.photos.length,
    customPosesCount: cloudStore.customPoses.length,
    usersCount: cloudStore.users.length,
    updatedAt: cloudStore.updatedAt,
  });
});

// Permanent public category sharing; public reads expose image references only.
app.post("/api/share/category-token", asyncRoute(async (req, res) => {
  if (!requireUser(req, res)) return;
  const { section, categoryId } = req.body || {};
  if ((section !== "kyyeu" && section !== "canhan") || typeof categoryId !== "string" || !categoryId.trim() || categoryId.length > 160) {
    return res.status(400).json({ success: false, error: "Danh mục không hợp lệ" });
  }
  const builtInCategories = section === "kyyeu" ? INITIAL_DATA_KYYEU : INITIAL_DATA_CANHAN;
  const known = builtInCategories.some((category) => category.id === categoryId);
  const galleryId = `category-gallery:${section}:${categoryId}`;
  let gallery = cloudStore.customCategories.find((item) => item?.id === galleryId && item?.kind === "categoryGallery");
  if (!known && !gallery) return res.status(404).json({ success: false, error: "Không tìm thấy danh mục công khai" });
  const galleryWasCreated = !gallery;
  const previousGallery = gallery ? structuredClone(gallery) : undefined;
  if (!gallery) {
    const galleryKey = categoryGalleryKey(section, categoryId);
    gallery = { id: galleryId, kind: "categoryGallery", section, categoryId, galleryKey, images: [] };
    cloudStore.customCategories.push(gallery);
  }
  if (typeof gallery.shareToken !== "string" || gallery.shareToken.length < 32) {
    let token: string;
    do {
      token = randomBytes(32).toString("base64url");
    } while (cloudStore.customCategories.some((item) => item !== gallery && item?.shareToken === token));
    gallery.shareToken = token;
    gallery.section = section;
    gallery.categoryId = categoryId;
    gallery.galleryKey ||= categoryGalleryKey(section, categoryId);
    gallery.images ||= [];
    try {
      await saveStore();
    } catch (error) {
      if (galleryWasCreated) cloudStore.customCategories = cloudStore.customCategories.filter((item) => item !== gallery);
      else {
        const galleryIndex = cloudStore.customCategories.indexOf(gallery);
        if (galleryIndex >= 0 && previousGallery) cloudStore.customCategories[galleryIndex] = previousGallery;
      }
      throw error;
    }
  }
  res.json({ success: true, shareToken: gallery.shareToken });
}));

app.get("/api/share/:shareToken", (req, res) => {
  const token = req.params.shareToken;
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return res.status(404).json({ success: false, error: "Không tìm thấy danh mục được chia sẻ" });
  const gallery = cloudStore.customCategories.find((item) => item?.kind === "categoryGallery" && item?.shareToken === token);
  if (!gallery || typeof gallery.galleryKey !== "string") return res.status(404).json({ success: false, error: "Không tìm thấy danh mục được chia sẻ" });
  const approvedPhotos = cloudStore.photos.filter((photo) => photo.poseKey === gallery.galleryKey && photo.status === "approved");
  const photoById = new Map<string, CloudPhotoItem>(approvedPhotos.map((photo) => [photo.id, photo]));
  const orderedIds = Array.isArray(gallery.images)
    ? gallery.images.map((image: any) => image?.photoId).filter((id: unknown): id is string => typeof id === "string")
    : [];
  const orderedPhotos: CloudPhotoItem[] = orderedIds.flatMap((id: string) => {
    const photo = photoById.get(id);
    return photo ? [photo] : [];
  });
  const includedIds = new Set(orderedPhotos.map((photo) => photo.id));
  const images = [...orderedPhotos, ...approvedPhotos.filter((photo) => !includedIds.has(photo.id))]
    .map((photo) => `/api/cloud/photo/${encodeURIComponent(photo.id)}/image${photo.imageVersion ? `?v=${photo.imageVersion}` : ""}`);
  const category = (gallery.section === "kyyeu" ? INITIAL_DATA_KYYEU : INITIAL_DATA_CANHAN)
    .find((item) => item.id === gallery.categoryId);
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, categoryName: category?.label || "Danh mục", images });
});

// 2. Cloud Drive Full Sync (Fetch all shared photos & custom poses for any device)
app.get("/api/cloud/sync", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const photos = cloudStore.photos.map(({ id, poseKey, legacyPoseKey, note, uploadedBy, uploaderRole, createdAt, imageVersion }) => ({
    id,
    poseKey,
    legacyPoseKey,
    note,
    uploadedBy,
    uploaderRole,
    status: "approved" as const,
    createdAt,
    imageVersion,
  }));
  res.json({
    success: true,
    photos,
    customPoses: cloudStore.customPoses,
    customCategories: cloudStore.customCategories.map(({ shareToken: _shareToken, ownerUserId: _ownerUserId, ...category }) => category),
    deletedCategories: cloudStore.deletedCategories,
    deletedPoseKeys: cloudStore.deletedPoseKeys,
    updatedAt: cloudStore.updatedAt,
  });
});

// Fetch image bytes only for photos that are missing from the requesting device.
app.get("/api/cloud/photo/:id/content", asyncRoute(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!mongoCollections) return res.status(503).json({ success: false, error: "Kho ảnh chưa sẵn sàng" });
  const photo = await mongoCollections.photos.findOne(
    { _id: req.params.id },
    { projection: { _id: 0, id: 1, dataUrl: 1 } },
  );
  if (!photo || typeof photo.dataUrl !== "string") return res.status(404).json({ success: false, error: "Không tìm thấy ảnh" });
  res.json({ success: true, photo: { id: photo.id, dataUrl: photo.dataUrl } });
}));

// Stable public image URL used by visual-search providers such as Google Lens.
app.get("/api/cloud/photo/:id/image", asyncRoute(async (req, res) => {
  if (!mongoCollections) return res.status(503).send("Image store unavailable");
  const photo = await mongoCollections.photos.findOne(
    { _id: req.params.id },
    { projection: { _id: 0, status: 1, dataUrl: 1, imageVersion: 1 } },
  );
  if (!photo || photo.status !== "approved") return res.status(404).send("Image not found");
  if (photo.imageVersion && req.query.v !== String(photo.imageVersion)) {
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    return res.redirect(302, `/api/cloud/photo/${encodeURIComponent(req.params.id)}/image?v=${photo.imageVersion}`);
  }
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/.exec(photo.dataUrl || "");
  if (!match) return res.status(415).send("Unsupported image data");
  res.setHeader("Content-Type", match[1]);
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(Buffer.from(match[2], "base64"));
}));

const INSPIRATION_PAGE_HOSTS = ["pinterest.com", "pin.it", "xiaohongshu.com", "xhslink.com", "rednote.com"];
const DROPPED_IMAGE_HOSTS = [...INSPIRATION_PAGE_HOSTS, "pinimg.com", "xhscdn.com", "xhscdn.net"];
const MAX_INSPIRATION_HTML_BYTES = 2_000_000;
const MAX_INSPIRATION_IMAGE_BYTES = 10 * 1024 * 1024;
const INSPIRATION_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

function isPublicInternetAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split(".").map(Number);
    const [a, b, c] = octets;
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return !(
      normalized === "::" || normalized === "::1" ||
      normalized.startsWith("::ffff:") || normalized.startsWith("2002:") || normalized.startsWith("2001:0:") ||
      normalized.startsWith("fc") || normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) || normalized.startsWith("ff") ||
      normalized.startsWith("2001:db8:") || normalized.startsWith("2001:10:")
    );
  }
  return false;
}

async function validateInspirationPageUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw Object.assign(new Error("Liên kết không hợp lệ."), { statusCode: 400 });
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const normalizedIp = hostname.replace(/^\[|\]$/g, "");
  const isIpLiteral = isIP(normalizedIp) !== 0;
  const isLocalHostname = hostname === "localhost" || hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") || hostname.endsWith(".internal");
  const allowedHost = INSPIRATION_PAGE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  if (isIpLiteral || isLocalHostname) {
    throw Object.assign(new Error("Không chấp nhận địa chỉ IP nội bộ, localhost hoặc host riêng."), { statusCode: 400 });
  }
  if (url.protocol !== "https:" || (url.port && url.port !== "443") || url.username || url.password || !allowedHost) {
    throw Object.assign(new Error("Chỉ hỗ trợ liên kết HTTPS từ Pinterest hoặc RedNote."), { statusCode: 400 });
  }
  let resolvedAddresses: Array<{ address: string; family: number }>;
  try {
    resolvedAddresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw Object.assign(new Error("Không thể xác minh địa chỉ máy chủ của liên kết này."), { statusCode: 400 });
  }
  if (!resolvedAddresses.length || resolvedAddresses.some(({ address }) => !isPublicInternetAddress(address))) {
    throw Object.assign(new Error("Liên kết trỏ tới địa chỉ IP nội bộ hoặc không an toàn."), { statusCode: 400 });
  }
  return url;
}

async function validatePublicInspirationImageUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Địa chỉ ảnh xem trước không hợp lệ.");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const normalizedIp = hostname.replace(/^\[|\]$/g, "");
  if (
    url.protocol !== "https:" || (url.port && url.port !== "443") || url.username || url.password ||
    isIP(normalizedIp) !== 0 || hostname === "localhost" || hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") || hostname.endsWith(".internal")
  ) {
    throw new Error("Địa chỉ ảnh xem trước không an toàn.");
  }
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Không thể xác minh máy chủ ảnh xem trước.");
  }
  if (!addresses.length || addresses.some(({ address }) => !isPublicInternetAddress(address))) {
    throw new Error("Địa chỉ ảnh xem trước trỏ tới máy chủ không an toàn.");
  }
  return url;
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function findOpenGraphImage(html: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
    }
    const key = (attributes.get("property") || attributes.get("name") || "").toLowerCase();
    if (key === "og:image" || key === "og:image:secure_url") {
      const content = attributes.get("content");
      if (content) return decodeHtmlAttribute(content.trim());
    }
  }
  return null;
}

async function getInspirationOgImage(value: string): Promise<{ imageUrl: string; pageUrl: string }> {
  let pageUrl = await validateInspirationPageUrl(value);
  for (let redirectCount = 0; redirectCount <= 4; redirectCount++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(pageUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "PosingART-LinkPreview/1.0",
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirectCount === 4) throw new Error("Liên kết chuyển hướng quá nhiều lần.");
        pageUrl = await validateInspirationPageUrl(new URL(location, pageUrl).toString());
        continue;
      }
      if (!response.ok) throw new Error(`Không tải được trang (${response.status}).`);
      if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
        throw new Error("Liên kết này không trỏ tới trang Pinterest hoặc RedNote.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Không đọc được nội dung trang.");
      const decoder = new TextDecoder();
      let html = "";
      let byteLength = 0;
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        byteLength += chunk.byteLength;
        if (byteLength > MAX_INSPIRATION_HTML_BYTES) {
          await reader.cancel();
          throw new Error("Trang nguồn quá lớn để xử lý.");
        }
        html += decoder.decode(chunk, { stream: true });
      }
      html += decoder.decode();

      const rawImageUrl = findOpenGraphImage(html);
      if (!rawImageUrl) throw new Error("Trang này không cung cấp ảnh xem trước (og:image).");
      const imageUrl = new URL(rawImageUrl, pageUrl);
      if (imageUrl.protocol !== "https:" || imageUrl.username || imageUrl.password) {
        throw new Error("Địa chỉ ảnh xem trước không an toàn.");
      }
      return { imageUrl: imageUrl.toString(), pageUrl: pageUrl.toString() };
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Không thể theo liên kết chuyển hướng.");
}

function isAllowedDroppedImageHost(hostname: string): boolean {
  return DROPPED_IMAGE_HOSTS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

async function downloadInspirationImage(value: string, allowedHosts?: string[]): Promise<string> {
  let imageUrl = await validatePublicInspirationImageUrl(value);
  if (allowedHosts && !allowedHosts.some((domain) => imageUrl.hostname === domain || imageUrl.hostname.endsWith(`.${domain}`))) {
    throw Object.assign(new Error("Domain ảnh chưa được cho phép. Chỉ hỗ trợ Pinterest/RedNote và CDN ảnh tương ứng."), { statusCode: 400 });
  }
  for (let redirectCount = 0; redirectCount <= 4; redirectCount++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(imageUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (compatible; PosingART-CoverImage/1.0)",
          ...(imageUrl.hostname === "xhscdn.com" || imageUrl.hostname.endsWith(".xhscdn.com") || imageUrl.hostname === "xiaohongshu.com" || imageUrl.hostname.endsWith(".xiaohongshu.com")
            ? { Referer: "https://www.xiaohongshu.com/" }
            : imageUrl.hostname === "pinimg.com" || imageUrl.hostname.endsWith(".pinimg.com") || imageUrl.hostname === "pinterest.com" || imageUrl.hostname.endsWith(".pinterest.com")
              ? { Referer: "https://www.pinterest.com/" }
              : {}),
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirectCount === 4) throw new Error("Ảnh nguồn chuyển hướng quá nhiều lần.");
        imageUrl = await validatePublicInspirationImageUrl(new URL(location, imageUrl).toString());
        if (allowedHosts && !allowedHosts.some((domain) => imageUrl.hostname === domain || imageUrl.hostname.endsWith(`.${domain}`))) {
          throw Object.assign(new Error("Ảnh chuyển hướng tới domain chưa được cho phép."), { statusCode: 400 });
        }
        continue;
      }
      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          throw new Error(`CDN từ chối tải ảnh (HTTP ${response.status}). Link có thể hết hạn hoặc yêu cầu quyền truy cập.`);
        }
        throw new Error(`Máy chủ ảnh trả về lỗi HTTP ${response.status}.`);
      }
      const responseMimeType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
      if (responseMimeType && !responseMimeType.startsWith("image/") && responseMimeType !== "application/octet-stream") {
        throw new Error(`Máy chủ trả về ${responseMimeType} thay vì dữ liệu ảnh.`);
      }
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_INSPIRATION_IMAGE_BYTES) {
        throw new Error("Ảnh nguồn vượt quá giới hạn 10 MB.");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Không đọc được nội dung ảnh nguồn.");
      const chunks: Uint8Array[] = [];
      let byteLength = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        byteLength += value.byteLength;
        if (byteLength > MAX_INSPIRATION_IMAGE_BYTES) {
          await reader.cancel();
          throw new Error("Ảnh nguồn vượt quá giới hạn 10 MB.");
        }
        chunks.push(value);
      }
      if (byteLength === 0) throw new Error("Ảnh nguồn không có dữ liệu.");
      const bytes = new Uint8Array(byteLength);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const signature = Buffer.from(bytes.subarray(0, 16));
      let detectedMimeType: string | null = null;
      if (signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff) detectedMimeType = "image/jpeg";
      else if (signature.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) detectedMimeType = "image/png";
      else if (signature.toString("ascii", 0, 4) === "GIF8") detectedMimeType = "image/gif";
      else if (signature.toString("ascii", 0, 4) === "RIFF" && signature.toString("ascii", 8, 12) === "WEBP") detectedMimeType = "image/webp";
      else if (signature.toString("ascii", 4, 8) === "ftyp" && /^(avif|avis)$/.test(signature.toString("ascii", 8, 12))) detectedMimeType = "image/avif";
      const mimeType = detectedMimeType || responseMimeType;
      if (!mimeType || !INSPIRATION_IMAGE_MIME_TYPES.has(mimeType)) {
        throw new Error(`Ảnh có định dạng không được hỗ trợ${responseMimeType ? ` (${responseMimeType})` : ""}. Hãy chọn ảnh JPEG, PNG, WebP, GIF hoặc AVIF.`);
      }
      return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Không thể theo liên kết ảnh chuyển hướng.");
}

app.post("/api/inspiration/og-image", asyncRoute(async (req, res) => {
  const url = req.body?.url;
  if (typeof url !== "string" || !url.trim() || url.length > 2_048) {
    return res.status(400).json({ success: false, error: "Vui lòng nhập một liên kết Pinterest hoặc RedNote hợp lệ." });
  }
  try {
    const result = await getInspirationOgImage(url.trim());
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(error?.statusCode || 502).json({
      success: false,
      error: error?.message || "Không thể lấy ảnh xem trước từ liên kết này.",
    });
  }
}));

app.post("/api/inspiration/download-image", asyncRoute(async (req, res) => {
  const imageUrl = req.body?.imageUrl;
  if (typeof imageUrl !== "string" || !imageUrl.trim() || imageUrl.length > 4_096) {
    return res.status(400).json({ success: false, error: "Địa chỉ ảnh xem trước không hợp lệ." });
  }
  try {
    const dataUrl = await downloadInspirationImage(imageUrl.trim());
    return res.json({ success: true, dataUrl });
  } catch (error: any) {
    let sourceHost = "invalid-url";
    try { sourceHost = new URL(imageUrl.trim()).hostname; } catch { /* Keep the safe fallback host label. */ }
    console.warn("[inspiration-image-download]", JSON.stringify({ host: sourceHost, error: error?.message || "unknown error" }));
    return res.status(502).json({
      success: false,
      error: error?.message || "Không thể tải ảnh xem trước. Hãy thử ảnh khác hoặc tải ảnh lên từ thiết bị.",
    });
  }
}));

app.post("/api/inspiration/fetch-dropped-image", asyncRoute(async (req, res) => {
  const value = req.body?.url;
  if (typeof value !== "string" || !value.trim() || value.length > 4_096) {
    return res.status(400).json({ success: false, error: "URL ảnh kéo thả không hợp lệ." });
  }
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || !isAllowedDroppedImageHost(url.hostname.toLowerCase())) {
      return res.status(400).json({ success: false, error: "Domain này chưa được hỗ trợ. Chỉ nhận ảnh Pinterest/RedNote và CDN ảnh hợp lệ." });
    }
    const pageHostAllowed = INSPIRATION_PAGE_HOSTS.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
    const imageUrl = pageHostAllowed
      ? (await getInspirationOgImage(url.toString())).imageUrl
      : url.toString();
    const dataUrl = await downloadInspirationImage(imageUrl, DROPPED_IMAGE_HOSTS);
    return res.json({ success: true, dataUrl });
  } catch (error: any) {
    return res.status(error?.statusCode || 502).json({
      success: false,
      error: error?.message || "Không thể tải ảnh từ URL đã thả. Hãy lưu ảnh về máy rồi thử lại.",
    });
  }
}));

// 3. Upload Photo to Cloud Drive; every authenticated account's photo is immediately shared.
app.post("/api/cloud/upload-photo", asyncRoute(async (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const { poseKey, dataUrl, note, uploadedBy, localPhotoId } = req.body;
    if (!poseKey || !dataUrl) {
      return res.status(400).json({ error: "Thiếu dữ liệu poseKey hoặc ảnh dataUrl" });
    }
    if (typeof poseKey !== "string" || poseKey.length > 512) {
      return res.status(400).json({ error: "Mã bộ sưu tập không hợp lệ" });
    }
    let storagePoseKey = poseKey;
    if (cloudStore.galleryV300MigrationComplete && !poseKey.startsWith("category-gallery:v3:")) {
      const legacyKeys = createLegacyPoseKeyMap(
        [
          { section: "kyyeu", categories: INITIAL_DATA_KYYEU },
          { section: "canhan", categories: INITIAL_DATA_CANHAN },
        ],
        cloudStore.customPoses as Array<{ section: string; categoryId: string; pose: { id?: string } }>,
      );
      storagePoseKey = legacyKeys.get(poseKey) || poseKey;
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
    if (existingPhoto) {
      if (existingPhoto.status !== "approved") {
        existingPhoto.status = "approved";
        await saveStore();
      }
      return res.json({ success: true, photo: existingPhoto, duplicate: true });
    }
    if (storagePoseKey.startsWith("category-gallery:v3:")) {
      const galleryImages = cloudStore.customCategories.find((item) => item?.kind === "categoryGallery" && item.galleryKey === storagePoseKey)?.images;
      const reservedImageCount = Array.isArray(galleryImages) ? galleryImages.filter((image: any) => !image.photoId).length : 0;
      const uploadedImageCount = cloudStore.photos.filter((photo) => photo.poseKey === storagePoseKey).length;
      if (reservedImageCount + uploadedImageCount >= 100) {
        return res.status(409).json({ error: "Danh mục đã đạt giới hạn 100 ảnh. Hãy xóa bớt ảnh trước khi thêm." });
      }
    }

    const role = user.role;

    const newPhoto: CloudPhotoItem = {
      id: `cloud_photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      ownerUserId: user.id,
      localPhotoId: typeof localPhotoId === "string" ? localPhotoId : undefined,
      poseKey: storagePoseKey,
      note: note || "",
      uploadedBy: user.name || uploadedBy || "Thành viên",
      uploaderRole: role,
      status: "approved",
      createdAt: Date.now(),
    };

    if (!mongoCollections) throw new Error("MongoDB storage is not initialized.");
    const photoDocument: CloudPhotoDocument = { ...newPhoto, dataUrl };
    let insertAttempted = false;
    let photoAddedToMemory = false;
    let gallery: any;
    let createdGallery = false;
    let previousGalleryImages: any[] | undefined;
    try {
      insertAttempted = true;
      await mongoCollections.photos.insertOne({ ...photoDocument, _id: photoDocument.id });
      cloudStore.photos.unshift(newPhoto);
      photoAddedToMemory = true;
      if (storagePoseKey.startsWith("category-gallery:v3:")) {
        const [, , section, categoryId] = storagePoseKey.split(":");
        const galleryId = `category-gallery:${section}:${categoryId}`;
        gallery = cloudStore.customCategories.find((item) => item?.id === galleryId);
        if (!gallery) {
          gallery = { id: galleryId, kind: "categoryGallery", section, categoryId, galleryKey: storagePoseKey, images: [] };
          cloudStore.customCategories.push(gallery);
          createdGallery = true;
        } else {
          previousGalleryImages = Array.isArray(gallery.images) ? [...gallery.images] : undefined;
        }
        gallery.images ||= [];
        gallery.images = appendGalleryPhotoReferences(gallery.images, [newPhoto], storagePoseKey);
      }
      await saveStore();
    } catch (error) {
      if (photoAddedToMemory) cloudStore.photos = cloudStore.photos.filter((photo) => photo.id !== newPhoto.id);
      if (createdGallery) {
        cloudStore.customCategories = cloudStore.customCategories.filter((item) => item !== gallery);
      } else if (gallery) {
        gallery.images = previousGalleryImages;
      }
      if (insertAttempted) {
        try {
          await mongoCollections.photos.deleteOne({ _id: newPhoto.id });
        } catch (rollbackError) {
          console.error("[MongoDB] Failed to roll back uploaded photo document", { photoId: newPhoto.id, error: rollbackError });
        }
      }
      throw error;
    }

    res.json({ success: true, photo: newPhoto });
  } catch (err: any) {
    if (isMongoDocumentTooLargeError(err)) {
      return res.status(413).json({ error: PHOTO_TOO_LARGE_ERROR });
    }
    res.status(500).json({ error: err.message || "Lỗi lưu ảnh lên Cloud Drive" });
  }
}));

// 4. Add Custom Pose to Cloud Drive (ALLOWED FOR EVERYONE)
app.post("/api/cloud/add-pose", asyncRoute(async (req, res) => {
  try {
    if (!requireUser(req, res)) return;
    if (cloudStore.galleryV300MigrationComplete) {
      return res.status(410).json({ error: "Phiên bản 3 lưu ảnh trực tiếp trong gallery của danh mục." });
    }
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

app.post("/api/cloud/admin/recompress-photos", asyncRoute(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!requireAdmin(req, res)) return;
  if (!mongoCollections) return res.status(503).json({ success: false, error: "Kho ảnh chưa sẵn sàng" });

  const dryRun = req.body?.dryRun;
  const maxEdge = req.body?.maxEdge ?? 1200;
  const quality = req.body?.quality ?? 75;
  if (typeof dryRun !== "boolean" || maxEdge !== 1200 || quality !== 75) {
    return res.status(400).json({ success: false, error: "Tham số không hợp lệ; maxEdge phải là 1200 và quality phải là 75" });
  }

  const report = { scanned: 0, recompressed: 0, skipped: 0, failed: 0, originalBytes: 0, compressedBytes: 0, items: [] as Array<{ id: string; originalBytes: number; compressedBytes: number; status: string }> };
  const cursor = mongoCollections.photos.find({}, { projection: { _id: 1, dataUrl: 1 } }).batchSize(1);
  for await (const document of cursor) {
    report.scanned += 1;
    const dataUrl = typeof document.dataUrl === "string" ? document.dataUrl : "";
    const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
    if (!match) {
      report.failed += 1;
      report.items.push({ id: String(document._id), originalBytes: 0, compressedBytes: 0, status: "invalid-image" });
      continue;
    }
    const original = Buffer.from(match[2], "base64");
    report.originalBytes += original.byteLength;
    try {
      const compressed = await sharp(original, { failOn: "none" })
        .rotate()
        .flatten({ background: "#ffffff" })
        .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      if (compressed.byteLength > original.byteLength * 0.8) {
        report.skipped += 1;
        report.compressedBytes += original.byteLength;
        report.items.push({ id: String(document._id), originalBytes: original.byteLength, compressedBytes: original.byteLength, status: "under-20-percent-savings" });
        continue;
      }
      report.compressedBytes += compressed.byteLength;
      report.recompressed += 1;
      report.items.push({ id: String(document._id), originalBytes: original.byteLength, compressedBytes: compressed.byteLength, status: dryRun ? "would-recompress" : "recompressed" });
      if (!dryRun) {
        const imageVersion = Date.now();
        await mongoCollections.photos.updateOne(
          { _id: document._id, dataUrl },
          { $set: { dataUrl: `data:image/jpeg;base64,${compressed.toString("base64")}`, imageVersion } },
        );
        const metadata = cloudStore.photos.find((photo) => photo.id === String(document._id));
        if (metadata) metadata.imageVersion = imageVersion;
      }
    } catch (error) {
      report.failed += 1;
      report.compressedBytes += original.byteLength;
      report.items.push({ id: String(document._id), originalBytes: original.byteLength, compressedBytes: 0, status: error instanceof Error ? error.message : "compression-failed" });
    }
  }
  if (!dryRun && report.recompressed > 0) await saveStore();
  res.json({ success: true, dryRun, ...report, savedBytes: report.originalBytes - report.compressedBytes });
}));

function getTopicDeleteRequest(body: any): { section: "kyyeu" | "canhan"; categoryId: string; poseKeys: string[] } | null {
  if (!body || !["kyyeu", "canhan"].includes(body.section)) return null;
  if (typeof body.categoryId !== "string" || !body.categoryId.trim() || body.categoryId.length > 256) return null;
  if (!Array.isArray(body.poseKeys) || body.poseKeys.length > 500 ||
    body.poseKeys.some((key: unknown) => typeof key !== "string" || key.length > 512)) return null;
  return {
    section: body.section,
    categoryId: body.categoryId,
    poseKeys: [...new Set([...(body.poseKeys as string[]), categoryGalleryKey(body.section, body.categoryId)])],
  };
}

function isTopicOwnedRecord(
  record: UserCloudRecord,
  section: "kyyeu" | "canhan",
  categoryId: string,
  poseKeys: Set<string>,
): boolean {
  const data = record.data || {};
  if ((record.type === "savedPose" || record.type === "favorite") && poseKeys.has(data.poseKey)) return true;
  if (record.type === "setting" && data.sectionKey === section && (
    (data.kind === "category" && data.targetId === categoryId) ||
    (data.kind === "pose" && poseKeys.has(data.targetId))
  )) return true;
  return (record.type === "collection" || record.type === "personalConcept") &&
    (record.id === `collection_${categoryId}` || record.id === `concept_${categoryId}` ||
      data.id === categoryId || data.categoryId === categoryId);
}

app.post("/api/cloud/category/preview-delete", asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const topic = getTopicDeleteRequest(req.body);
  if (!topic) return res.status(400).json({ success: false, error: "Thông tin chủ đề cần xóa không hợp lệ" });
  const poseKeys = new Set(topic.poseKeys);
  const customPoseCount = cloudStore.customPoses.filter((item) =>
    (item.section === topic.section && item.categoryId === topic.categoryId) || poseKeys.has(item.pose?.id)
  ).length;
  const relatedRecordCount = cloudStore.records.filter((record) =>
    isTopicOwnedRecord(record, topic.section, topic.categoryId, poseKeys)
  ).length;
  res.json({
    success: true,
    categoryFound: cloudStore.customCategories.some((category) => category?.id === topic.categoryId),
    photoCount: cloudStore.photos.filter((photo) => poseKeys.has(photo.poseKey)).length,
    customPoseCount,
    relatedRecordCount,
  });
}));

app.delete("/api/cloud/category/:id", asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (req.params.id === UNCATEGORIZED_CATEGORY_ID) {
    return res.status(400).json({ success: false, error: "Danh mục Chưa phân loại là danh mục hệ thống và không thể xóa." });
  }
  const topic = getTopicDeleteRequest({ ...req.body, categoryId: req.params.id });
  if (!topic) return res.status(400).json({ success: false, error: "Thông tin chủ đề cần xóa không hợp lệ" });

  const poseKeys = new Set(topic.poseKeys);
  const removed = {
    photos: cloudStore.photos.filter((photo) => poseKeys.has(photo.poseKey)).length,
    customPoses: cloudStore.customPoses.filter((item) =>
      (item.section === topic.section && item.categoryId === topic.categoryId) || poseKeys.has(item.pose?.id)
    ).length,
    records: cloudStore.records.filter((record) =>
      isTopicOwnedRecord(record, topic.section, topic.categoryId, poseKeys)
    ).length,
  };
  cloudStore.photos = cloudStore.photos.filter((photo) => !poseKeys.has(photo.poseKey));
  cloudStore.customPoses = cloudStore.customPoses.filter((item) =>
    !((item.section === topic.section && item.categoryId === topic.categoryId) || poseKeys.has(item.pose?.id))
  );
  cloudStore.customCategories = cloudStore.customCategories.filter((category) => category?.id !== topic.categoryId &&
    category?.id !== `category-gallery:${topic.section}:${topic.categoryId}` &&
    !(category?.kind === "userCategory" && category.section === topic.section && category.categoryId === topic.categoryId) &&
    !(category?.kind === "libraryRename" && category.section === topic.section && category.categoryId === topic.categoryId));
  cloudStore.records = cloudStore.records.filter((record) =>
    !isTopicOwnedRecord(record, topic.section, topic.categoryId, poseKeys)
  );
  const priorDeletion = cloudStore.deletedCategories.find((item) => item.section === topic.section && item.categoryId === topic.categoryId);
  if (priorDeletion) priorDeletion.poseKeys = [...new Set([...priorDeletion.poseKeys, ...topic.poseKeys])];
  else cloudStore.deletedCategories.push({ ...topic, poseKeys: [...poseKeys] });

  await saveStore();
  res.json({ success: true, removed });
}));

app.post("/api/cloud/library/rename", asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { kind, section, categoryId, poseId, label } = req.body || {};
  if (!(["section", "category", "pose"] as string[]).includes(kind) || !(["kyyeu", "canhan"] as string[]).includes(section) ||
    typeof label !== "string" || !label.trim() || label.trim().length > 100 ||
    (kind !== "section" && (typeof categoryId !== "string" || !categoryId)) ||
    (kind === "pose" && (typeof poseId !== "string" || !poseId))) {
    return res.status(400).json({ success: false, error: "Thông tin đổi tên không hợp lệ." });
  }
  if (kind === "category" && categoryId === UNCATEGORIZED_CATEGORY_ID) {
    return res.status(400).json({ success: false, error: "Danh mục Chưa phân loại là danh mục hệ thống và không thể đổi tên." });
  }
  const nextLabel = label.trim();
  const renameKey = `rename:${kind}:${section}:${categoryId || ""}:${poseId || ""}`;
  const overrides = cloudStore.customCategories.filter((item) => item?.kind === "libraryRename");
  const sectionCategories = section === "kyyeu" ? INITIAL_DATA_KYYEU : INITIAL_DATA_CANHAN;
  let siblingNames: string[] = [];
  if (kind === "section") {
    siblingNames = overrides.filter((item) => item.kind === "libraryRename" && item.targetKind === "section" && item.section !== section).map((item) => item.label);
    siblingNames.push(section === "kyyeu" ? "Concept & Bối Cảnh" : "Kỷ Yếu");
  } else if (kind === "category") {
    siblingNames = sectionCategories.filter((item) => item.id !== categoryId).map((item) =>
      overrides.find((entry) => entry.targetKind === "category" && entry.section === section && entry.categoryId === item.id)?.label || item.label);
    const customSiblings = cloudStore.customCategories.filter((item) => item?.section === section && item?.kind !== "libraryRename" && item?.id !== categoryId);
    siblingNames.push(...customSiblings.map((item) => item.label));
  } else {
    const category = sectionCategories.find((item) => item.id === categoryId);
    siblingNames = category?.poses.filter((pose) => pose.id !== poseId).map((pose) =>
      overrides.find((entry) => entry.targetKind === "pose" && entry.section === section && entry.categoryId === categoryId && entry.poseId === pose.id)?.label || pose.title) || [];
    siblingNames.push(...cloudStore.customPoses.filter((item) => item.section === section && item.categoryId === categoryId && item.pose?.id !== poseId).map((item) => item.pose?.title).filter(Boolean));
  }
  if (siblingNames.some((name) => String(name).trim().toLocaleLowerCase("vi-VN") === nextLabel.toLocaleLowerCase("vi-VN"))) {
    return res.status(409).json({ success: false, error: "Tên này đã được sử dụng trong cùng cấp." });
  }
  const override = { id: renameKey, kind: "libraryRename", targetKind: kind, section, categoryId, poseId, label: nextLabel, updatedAt: Date.now() };
  const existingIndex = cloudStore.customCategories.findIndex((item) => item?.id === renameKey);
  if (existingIndex >= 0) cloudStore.customCategories[existingIndex] = override;
  else cloudStore.customCategories.push(override);
  await saveStore();
  return res.json({ success: true, rename: override });
}));

app.post("/api/cloud/categories/republish", asyncRoute(async (req, res) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const { kyyeu, canhan } = req.body || {};
  if (!Array.isArray(kyyeu) || !Array.isArray(canhan) || kyyeu.length + canhan.length > 500) {
    return res.status(400).json({ success: false, error: "Danh sách danh mục không hợp lệ." });
  }
  const builtInIds = new Set([...INITIAL_DATA_KYYEU, ...INITIAL_DATA_CANHAN].map((category) => category.id));
  let upserted = 0;
  for (const [section, categories] of [["kyyeu", kyyeu], ["canhan", canhan]] as const) {
    for (const category of categories) {
      if (!category || typeof category !== "object" || Array.isArray(category) ||
        typeof category.id !== "string" || !category.id.trim() || category.id.length > 160 ||
        typeof category.label !== "string" || !category.label.trim() || category.label.length > 100 ||
        (category.images !== undefined && !Array.isArray(category.images)) ||
        (category.poses !== undefined && !Array.isArray(category.poses)) ||
        Buffer.byteLength(JSON.stringify(category) || "", "utf8") > 12 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: "Có danh mục không hợp lệ hoặc quá lớn." });
      }
      if (builtInIds.has(category.id) || category.id === UNCATEGORIZED_CATEGORY_ID) continue;
      const id = `user-category:${section}:${category.id}`;
      const existing = cloudStore.customCategories.find((item) => item?.id === id && item?.kind === "userCategory");
      const entry = createCloudCategoryEntry(section, category, admin.id, existing);
      if (existing) {
        const index = cloudStore.customCategories.indexOf(existing);
        cloudStore.customCategories[index] = entry;
      } else {
        cloudStore.customCategories.push(entry);
      }
      upserted++;
    }
  }
  await saveStore();
  return res.json({ success: true, upserted });
}));

app.delete("/api/cloud/pose/:id", asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { section, categoryId } = req.body || {};
  const poseKey = req.params.id;
  if (!(["kyyeu", "canhan"] as string[]).includes(section) || typeof categoryId !== "string" || !categoryId || !poseKey || poseKey.length > 256) {
    return res.status(400).json({ success: false, error: "Thông tin dáng cần xóa không hợp lệ." });
  }
  const photoIds = cloudStore.photos.filter((photo) => photo.poseKey === poseKey).map((photo) => photo.id);
  const removed = { photos: photoIds.length, customPoses: cloudStore.customPoses.filter((item) => item.pose?.id === poseKey).length };
  cloudStore.photos = cloudStore.photos.filter((photo) => photo.poseKey !== poseKey);
  cloudStore.customPoses = cloudStore.customPoses.filter((item) => item.pose?.id !== poseKey);
  cloudStore.records = cloudStore.records.filter((record) => {
    const data = record.data || {};
    if ((record.type === "favorite" || record.type === "savedPose") && data.poseKey === poseKey) return false;
    return !(record.type === "setting" && data.sectionKey === section && data.kind === "pose" && data.targetId === poseKey);
  });
  cloudStore.customCategories = cloudStore.customCategories.filter((item) => item?.id !== `rename:pose:${section}:${categoryId}:${poseKey}`);
  if (!cloudStore.deletedPoseKeys.includes(poseKey)) cloudStore.deletedPoseKeys.push(poseKey);
  await saveStore();
  return res.json({ success: true, removed });
}));

// 7. Delete Photo from Cloud Drive (STRICTLY REQUIRES ADMIN)
app.delete("/api/cloud/photo/:id", asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const initialLen = cloudStore.photos.length;
  cloudStore.photos = cloudStore.photos.filter((p) => p.id !== id);
  if (cloudStore.photos.length !== initialLen) {
    for (const gallery of cloudStore.customCategories) {
      if (gallery?.kind === "categoryGallery" && Array.isArray(gallery.images)) {
        gallery.images = gallery.images.filter((image: any) => image.photoId !== id);
      }
    }
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
const MINIMUM_SUPPORTED_VERSION = "1.0.0";
const ANDROID_DOWNLOAD_URL = (process.env.ANDROID_DOWNLOAD_URL || "").trim();

app.get("/api/version", (req, res) => {
  const clientVer = (req.query.clientVersion as string) || "1.0.0";
  const platform = (req.query.platform as string) || "web";

  const isClientOutdated = clientVer !== APP_VERSION;

  res.json({
    currentVersion: APP_VERSION,
    minimumVersion: MINIMUM_SUPPORTED_VERSION,
    releaseDate: APP_RELEASE_DATE,
    releaseNotes: CURRENT_RELEASE_NOTES,
    android: {
      updateAvailable: platform === "android" && isClientOutdated && Boolean(ANDROID_DOWNLOAD_URL),
      version: APP_VERSION,
      downloadUrl: ANDROID_DOWNLOAD_URL,
      instructions: "Tải file POSING_ART.apk, mở file và chọn Cài đặt (Cho phép cài đặt từ nguồn tin cậy nếu có yêu cầu).",
    },
    web: {
      updateAvailable: platform === "web" && isClientOutdated,
      version: APP_VERSION,
    },
  });
});

// ==========================================
// USER CLOUD DATA SYNCHRONIZATION (PHẦN 4, 5, 6, 7)
// Shared dataset across Web and Android
// ==========================================

// 1. Get all cloud records for user (incremental with ?since=timestamp)
app.get("/api/user/sync", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
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
          const acceptedRecord = {
            ...incoming,
            userId,
          };
          cloudStore.records[existingIdx] = acceptedRecord;
          applyCloudCategoryRecord(acceptedRecord, user);
          updatedCount++;
        } else {
          // Conflict: existing on server is newer
          conflicts.push(existing);
        }
      } else {
        const acceptedRecord = {
          ...incoming,
          userId,
        };
        cloudStore.records.push(acceptedRecord);
        applyCloudCategoryRecord(acceptedRecord, user);
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
        applyCloudCategoryRecord(itemToSave, user);
        await saveStore();
        operation = "updated";
      } else {
        operation = "ignored_older";
      }
    } else {
      cloudStore.records.push(itemToSave);
      applyCloudCategoryRecord(itemToSave, user);
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

// 1. Analyze Pose using gemini-3.1-pro-preview
app.post("/api/ai/creative-chat", async (req, res) => {
  let activeModel = "gemini-3.6-flash";
  try {
    const {
      model = "chatgpt",
      message,
      image,
      mimeType = "image/jpeg",
      task,
    } = req.body;
    const isQuickInspirationTask = task === "quick-inspiration-tags";

    if (task !== undefined && !isQuickInspirationTask) {
      return res.status(400).json({ error: "Loại yêu cầu sáng tạo không hợp lệ." });
    }

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
      if (isQuickInspirationTask) {
        return res.status(503).json({ error: "AI tạo gợi ý hiện chưa sẵn sàng." });
      }
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
        text: isQuickInspirationTask
          ? `Bạn đang tạo cụm từ tìm kiếm Pinterest cho ý tưởng chụp ảnh. Làm theo yêu cầu và dữ liệu concept sau; chỉ trả về 6-8 dòng, mỗi dòng một cụm 2-5 từ, không đánh số, không giải thích, không Markdown. Tạo các ý khác nhau về góc chụp, dáng, cảm xúc, đạo cụ và bối cảnh; tuyệt đối tránh những tag cũ hoặc gợi ý gần đây được liệt kê.\n\n${message}`
          : `Câu hỏi / yêu cầu ý tưởng từ người dùng: "${message}".\n\n${systemPrompt}`,
      });
    }

    let response: any = null;
    const chatModels = ["gemini-3.6-flash", "gemini-3.8-flash"];
    activeModel = chatModels[0];
    response = await withGeminiUnavailableRetry(
      () => withAiTimeout(ai.models.generateContent({ model: activeModel, contents: { parts } })),
      {
        onRetry: (retryNumber, delayMs) => {
          if (retryNumber === 2) activeModel = chatModels[1];
          console.warn(`[AI Creative] ${activeModel} retry ${retryNumber}/2 after Gemini 503/UNAVAILABLE; wait ${delayMs}ms`);
        },
      },
    );
    if (!response?.text) throw new Error("Gemini không trả về nội dung.");

    const reply = response.text || "Đã tạo ý tưởng thành công.";
    res.json({
      success: true,
      model,
      reply,
    });
  } catch (error: any) {
    console.error("[AI Creative] Gemini generateContent failed", {
      route: "/api/ai/creative-chat",
      model: activeModel,
      endpoint: `models/${activeModel}:generateContent`,
      upstreamStatus: error?.status || error?.code,
      message: error?.message,
    });
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
    let activeModelIndex = 0;
    const activeModel = () => modelsToTry[activeModelIndex];
    try {
      response = await withGeminiUnavailableRetry(
        () => withAiTimeout(ai.models.generateContent({
          model: activeModel(),
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
        })),
        {
          onRetry: (retryNumber, delayMs) => {
            activeModelIndex = Math.min(retryNumber, modelsToTry.length - 1);
            console.warn(`[AI Pose Advisor] ${activeModel()} retry ${retryNumber}/2 after Gemini 503/UNAVAILABLE; wait ${delayMs}ms`);
          },
        },
      );
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI Pose Advisor] ${activeModel()} failed:`, err?.status || err?.code, err?.message);
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
    app.use("/api", (_req, res) => {
      res.status(404).json({ success: false, error: "Không tìm thấy API endpoint" });
    });
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
