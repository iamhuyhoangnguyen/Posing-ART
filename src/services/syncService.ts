import { UserCloudRecord, CloudRecordType, UserCloudSyncResponse } from "../types/sync";
import { UserAccount } from "../types";
import { getCurrentUser, refreshCurrentUserSession } from "../utils/userAuth";
import { serverUrl } from "./apiUrl";

const LOCAL_RECORDS_KEY_PREFIX = "posing_art_cloud_cache_";
const OFFLINE_QUEUE_KEY = "posing_art_offline_sync_queue";
const LAST_SYNC_KEY_PREFIX = "posing_art_last_sync_timestamp_";
const TOKEN_REFRESH_BUFFER_SECONDS = 5 * 60;

function getTokenExpiration(token: string): number | null {
  try {
    const payload = token.split(".")[0];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return Number.isFinite(claims.exp) ? claims.exp : null;
  } catch {
    return null;
  }
}

async function fetchWithUserAuth(
  url: string,
  init: RequestInit,
  expectedUser: UserAccount,
): Promise<Response> {
  let user = getCurrentUser();
  if (!user || user.id !== expectedUser.id || !user.token) {
    throw new Error("Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.");
  }

  const expiration = getTokenExpiration(user.token);
  if (expiration === null || expiration <= Math.floor(Date.now() / 1000) + TOKEN_REFRESH_BUFFER_SECONDS) {
    const refreshedUser = await refreshCurrentUserSession(user);
    if (refreshedUser) {
      user = refreshedUser;
    } else if (expiration === null || expiration <= Math.floor(Date.now() / 1000)) {
      throw new Error("Không thể làm mới phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }

  const send = (activeUser: UserAccount) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${activeUser.token || ""}`);
    headers.set("x-user-id", activeUser.id);
    return fetch(url, { ...init, headers });
  };

  let response = await send(user);
  if (response.status === 401) {
    const refreshedUser = await refreshCurrentUserSession(user);
    if (refreshedUser && refreshedUser.token !== user.token) {
      response = await send(refreshedUser);
    }
  }
  return response;
}

/**
 * Read cached records for user
 */
export function getLocalCachedRecords(userId: string): Record<string, UserCloudRecord> {
  try {
    const raw = localStorage.getItem(`${LOCAL_RECORDS_KEY_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save cached records for user
 */
export function saveLocalCachedRecords(userId: string, records: Record<string, UserCloudRecord>): void {
  try {
    localStorage.setItem(`${LOCAL_RECORDS_KEY_PREFIX}${userId}`, JSON.stringify(records));
  } catch (err) {
    console.warn("Storage quota exceeded caching user records:", err);
  }
}

/**
 * Offline Sync Queue Management
 */
function getOfflineQueue(): UserCloudRecord[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: UserCloudRecord[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn("Error saving offline queue:", err);
  }
}

function enqueueOfflineRecord(record: UserCloudRecord): void {
  const queue = getOfflineQueue();
  const existingIdx = queue.findIndex((r) => r.id === record.id && r.userId === record.userId);
  if (existingIdx >= 0) {
    queue[existingIdx] = record;
  } else {
    queue.push(record);
  }
  saveOfflineQueue(queue);
}

/**
 * Bi-directional Sync:
 * 1. Pull user cloud records from server
 * 2. Resolve conflicts using updatedAt (Last-Write-Wins)
 * 3. Flush pending offline queue items
 * 4. Update local cache
 */
type FullSyncResult = {
  success: boolean;
  recordsCount: number;
  syncedOfflineCount: number;
  error?: string;
};

let fullSyncInFlight: Promise<FullSyncResult> | null = null;
let fullSyncUserId: string | null = null;

export function performFullSync(): Promise<FullSyncResult> {
  const requestedUserId = getCurrentUser()?.id || null;
  if (fullSyncInFlight) {
    if (requestedUserId !== fullSyncUserId) {
      return fullSyncInFlight.then(() => performFullSync());
    }
    return fullSyncInFlight;
  }

  fullSyncUserId = requestedUserId;
  const sync = performFullSyncInternal();
  const trackedSync = sync.finally(() => {
    if (fullSyncInFlight === trackedSync) {
      fullSyncInFlight = null;
      fullSyncUserId = null;
    }
  });
  fullSyncInFlight = trackedSync;
  return trackedSync;
}

async function performFullSyncInternal(): Promise<FullSyncResult> {
  const user = getCurrentUser();
  if (!user) {
    return { success: false, recordsCount: 0, syncedOfflineCount: 0, error: "Chưa đăng nhập" };
  }

  const userId = user.id;
  const localCache = getLocalCachedRecords(userId);
  const offlineQueue = getOfflineQueue().filter((r) => r.userId === userId);

  let syncedOfflineCount = 0;

  try {
    // 1. If we have offline queued records, push them first
    if (offlineQueue.length > 0) {
      const pushRes = await fetchWithUserAuth(serverUrl("/api/user/sync"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          records: offlineQueue,
          clientTime: Date.now(),
        }),
      }, user);

      if (pushRes.ok) {
        syncedOfflineCount = offlineQueue.length;
        // Only remove records that were actually included in this request and
        // have not been edited again while the request was in flight.
        const pushedVersions = new Map(offlineQueue.map((r) => [r.id, JSON.stringify(r)]));
        const remainingQueue = getOfflineQueue().filter((r) =>
          r.userId !== userId || pushedVersions.get(r.id) !== JSON.stringify(r)
        );
        saveOfflineQueue(remainingQueue);
      } else {
        let serverError = "";
        try {
          const responseBody = await pushRes.json();
          serverError = typeof responseBody.error === "string" ? responseBody.error : "";
        } catch {
          // Keep the status code as the useful diagnostic if the response is not JSON.
        }
        console.warn("[User Sync] Offline queue push failed:", {
          status: pushRes.status,
          error: serverError || pushRes.statusText,
          recordCount: offlineQueue.length,
        });
      }
    }

    // 2. Fetch full user cloud records from server
    const fetchRes = await fetchWithUserAuth(
      serverUrl(`/api/user/sync?userId=${encodeURIComponent(userId)}`),
      { headers: {} },
      user,
    );

    if (!fetchRes.ok) {
      throw new Error(`Server returned status ${fetchRes.status}`);
    }

    const data: UserCloudSyncResponse = await fetchRes.json();
    const serverRecords = data.records || [];

    // 3. Merge server records into local cache with Last-Write-Wins
    for (const serverRec of serverRecords) {
      const localRec = localCache[serverRec.id];
      if (!localRec || serverRec.updatedAt >= localRec.updatedAt) {
        localCache[serverRec.id] = serverRec;
      }
    }

    // Restore completion flags used by the home screen from this account's
    // synchronized records before notifying React to refresh its progress.
    for (const record of Object.values(localCache)) {
      if (record.type !== "savedPose") continue;
      const poseKey = (record.data as { poseKey?: unknown })?.poseKey;
      if (typeof poseKey !== "string" || !poseKey) continue;
      const completed = !record.isDeleted && (record.data as { isCompleted?: boolean })?.isCompleted === true;
      localStorage.setItem(`done-${poseKey}`, String(completed));
    }

    saveLocalCachedRecords(userId, localCache);
    localStorage.setItem(`${LAST_SYNC_KEY_PREFIX}${userId}`, String(Date.now()));

    // Broadcast sync update to app
    window.dispatchEvent(new CustomEvent("cloud_records_synced", { detail: { count: Object.keys(localCache).length } }));

    return {
      success: true,
      recordsCount: Object.keys(localCache).length,
      syncedOfflineCount,
    };
  } catch (err: any) {
    console.warn("Sync failed (running in offline mode):", err);
    return {
      success: false,
      recordsCount: Object.keys(localCache).length,
      syncedOfflineCount: 0,
      error: err.message,
    };
  }
}

/**
 * Generic syncRecord: saves to local cache and pushes to cloud or offline queue
 */
export async function syncRecord<T = any>(
  type: CloudRecordType,
  recordId: string,
  data: T,
  isDeleted: boolean = false
): Promise<UserCloudRecord<T>> {
  const user = getCurrentUser();
  const userId = user ? user.id : "guest";

  const now = Date.now();
  const localCache = getLocalCachedRecords(userId);

  const existing = localCache[recordId];
  const record: UserCloudRecord<T> = {
    id: recordId,
    userId,
    type,
    data,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    isDeleted,
  };

  // 1. Update local cache immediately
  localCache[recordId] = record;
  saveLocalCachedRecords(userId, localCache);

  // 2. If logged in, push to server or queue offline
  if (user) {
    try {
      const res = await fetchWithUserAuth(serverUrl("/api/user/record"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(record),
      }, user);

      if (!res.ok) {
        let serverError = "";
        try {
          const responseBody = await res.json();
          serverError = typeof responseBody.error === "string" ? responseBody.error : "";
        } catch {
          // Keep the status code as the useful diagnostic if the response is not JSON.
        }
        console.error("[User Sync] Record save rejected:", {
          recordId,
          type,
          status: res.status,
          error: serverError || res.statusText,
        });
        enqueueOfflineRecord(record);
      }
    } catch (error) {
      console.error("[User Sync] Record save request failed:", {
        recordId,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
      enqueueOfflineRecord(record);
    }
  }

  return record;
}

/**
 * Synchronize Favorite Pose
 */
export async function syncFavorite(poseKey: string, isFavorite: boolean): Promise<void> {
  const id = `fav_${poseKey}`;
  await syncRecord("favorite", id, { poseKey, isFavorite }, !isFavorite);
}

/**
 * Synchronize Saved Pose (Done or custom notes/photos)
 */
export async function syncSavedPose(poseKey: string, poseData: any, isCompleted?: boolean): Promise<void> {
  const id = `saved_pose_${poseKey}`;
  await syncRecord("savedPose", id, { poseKey, ...poseData, isCompleted });
}

/**
 * Synchronize Custom Collection
 */
export async function syncCollection(collectionId: string, collectionData: any, isDeleted: boolean = false): Promise<void> {
  const id = `collection_${collectionId}`;
  await syncRecord("collection", id, collectionData, isDeleted);
}

/**
 * Synchronize Personal Concept
 */
export async function syncConcept(conceptId: string, conceptData: any, isDeleted: boolean = false): Promise<void> {
  const id = `concept_${conceptId}`;
  await syncRecord("personalConcept", id, conceptData, isDeleted);
}

/**
 * Synchronize Generated AI Idea
 */
export async function syncGeneratedIdea(ideaId: string, ideaData: any): Promise<void> {
  const id = `idea_${ideaId}`;
  await syncRecord("generatedIdea", id, ideaData);
}

/**
 * Synchronize User Settings
 */
export async function syncSetting(settingKey: string, settingValue: any): Promise<void> {
  const id = `setting_${settingKey}`;
  await syncRecord("setting", id, { key: settingKey, value: settingValue });
}

/**
 * Get all active records of a specific type for current user
 */
export function getUserRecordsByType<T = any>(type: CloudRecordType): UserCloudRecord<T>[] {
  const user = getCurrentUser();
  const userId = user ? user.id : "guest";
  const localCache = getLocalCachedRecords(userId);

  return Object.values(localCache)
    .filter((r) => r.type === type && !r.isDeleted) as UserCloudRecord<T>[];
}

/**
 * Listen for network connectivity to auto-flush offline queue
 */
if (typeof window !== "undefined") {
  const syncWhenSignedIn = () => {
    if (!getCurrentUser()?.token) return;
    void performFullSync();
  };
  window.addEventListener("online", () => {
    console.log("[POSING ART] Network restored. Auto-syncing cloud records...");
    syncWhenSignedIn();
  });
  window.addEventListener("auth_state_changed", syncWhenSignedIn);
}
