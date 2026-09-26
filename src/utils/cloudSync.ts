// Client-side Cloud Drive Sync manager
// Coordinates synchronization between local IndexedDB and server-backed Cloud Drive
import { getAllPhotos, addPhoto, openDatabase, updatePhotoCloudState } from "./db";
import { getAdminToken } from "./adminAuth";
import { getCurrentUser, refreshCurrentUserSession } from "./userAuth";
import { serverUrl } from "../services/apiUrl";

export interface CloudPhotoItem {
  id: string;
  localPhotoId?: string;
  poseKey: string;
  dataUrl?: string;
  note?: string;
  uploadedBy?: string;
  uploaderRole?: "admin" | "member";
  status?: "approved";
  createdAt: number;
}

export interface CloudSyncResponse {
  success: boolean;
  photos: CloudPhotoItem[];
  customPoses: any[];
  customCategories: any[];
  updatedAt: number;
}

/**
 * Converts a Blob to a Base64 data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads a photo to Cloud Drive
 * Photos from every authenticated account are shared immediately.
 */
export async function uploadPhotoToCloud(
  poseKey: string,
  blobOrDataUrl: Blob | string,
  note?: string,
  uploadedBy?: string,
  uploaderRole?: "admin" | "member",
  localPhotoId?: string,
  expectedUserId?: string,
): Promise<{ success: boolean; cloudId?: string }> {
  try {
    const user = getCurrentUser();
    if (!user?.token || (expectedUserId && user.id !== expectedUserId)) return { success: false };
    let dataUrl = typeof blobOrDataUrl === "string" ? blobOrDataUrl : await blobToDataUrl(blobOrDataUrl);

    const upload = (token: string) => fetch(serverUrl("/api/cloud/upload-photo"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        poseKey,
        dataUrl,
        note: note || "",
        uploadedBy: uploadedBy || "Người dùng",
        uploaderRole: uploaderRole || "member",
        status: "approved",
        localPhotoId,
      }),
    });
    let res = await upload(user.token);
    if (res.status === 401) {
      const refreshedUser = await refreshCurrentUserSession(user);
      if (refreshedUser?.token && refreshedUser.id === user.id) {
        res = await upload(refreshedUser.token);
      }
    }

    if (res.ok) {
      const json = await res.json();
      return { success: true, cloudId: json.photo?.id };
    }
    return { success: false };
  } catch (err) {
    console.warn("Cloud upload deferred or offline:", err);
    return { success: false };
  }
}

const photoUploadsInFlight = new Set<number>();

/** Upload unsynced IndexedDB photos with stable IDs so retries cannot create duplicate cloud photos. */
export async function syncPendingLocalPhotos(): Promise<number> {
  const currentUser = getCurrentUser();
  if (!currentUser?.token) return 0;
  let uploaded = 0;
  const photos = await getAllPhotos();
  for (const photo of photos) {
    if (photo.cloudId || photoUploadsInFlight.has(photo.id)) continue;
    if (photo.ownerUserId && photo.ownerUserId !== currentUser.id) continue;
    const syncId = photo.syncId || (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `photo-${photo.id}-${photo.createdAt}`);
    if (!photo.syncId || !photo.ownerUserId) {
      await updatePhotoCloudState(photo.id, syncId, undefined, currentUser.id);
    }
    photoUploadsInFlight.add(photo.id);
    try {
      const result = await uploadPhotoToCloud(
        photo.poseKey,
        photo.blob,
        photo.note,
        photo.uploadedBy,
        photo.uploaderRole,
        syncId,
        currentUser.id,
      );
      if (result.success && result.cloudId) {
        await updatePhotoCloudState(photo.id, syncId, result.cloudId);
        uploaded += 1;
      }
    } catch (err) {
      console.warn("Photo upload deferred; it will retry after the next connection:", err);
    } finally {
      photoUploadsInFlight.delete(photo.id);
    }
  }
  return uploaded;
}

/**
 * Reject / Delete a photo from Cloud Drive (STRICTLY REQUIRES ADMIN)
 */
export async function deletePhotoFromCloud(cloudId: string): Promise<boolean> {
  try {
    const token = getAdminToken();
    const res = await fetch(serverUrl(`/api/cloud/photo/${encodeURIComponent(cloudId)}`), {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || ""}`,
      },
    });

    return res.ok;
  } catch (err) {
    console.error("Cloud photo delete error:", err);
    return false;
  }
}

/**
 * Upload a custom pose/category to Cloud Drive (Free for all)
 */
export async function addCustomPoseToCloud(section: string, categoryId: string, pose: any): Promise<boolean> {
  try {
    const user = getCurrentUser();
    if (!user?.token) return false;
    const res = await fetch(serverUrl("/api/cloud/add-pose"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({ section, categoryId, pose }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Full bi-directional sync between local IndexedDB and Cloud Drive
 * Downloads photos from Cloud Drive to local device so they work offline!
 */
type CloudSyncResult = {
  connected: boolean;
  downloaded: number;
  uploaded: number;
  totalCloudPhotos: number;
};

let cloudSyncInFlight: Promise<CloudSyncResult> | null = null;

export function performCloudSync(): Promise<CloudSyncResult> {
  if (cloudSyncInFlight) return cloudSyncInFlight;
  cloudSyncInFlight = performCloudSyncInternal().finally(() => {
    cloudSyncInFlight = null;
  });
  return cloudSyncInFlight;
}

async function performCloudSyncInternal(): Promise<CloudSyncResult> {
  let downloaded = 0;
  let uploaded = 0;
  let totalCloudPhotos = 0;
  let connected = false;

  try {
    // Retry local photos first. Each upload uses a stable client ID for safe retries.
    uploaded = await syncPendingLocalPhotos();

    // Fetch cloud data after uploads so this device sees its newly shared photos.
    const res = await fetch(serverUrl("/api/cloud/sync?metadataOnly=true"));
    if (!res.ok) {
      return { connected: false, downloaded: 0, uploaded, totalCloudPhotos: 0 };
    }
    connected = true;

    const cloudData: CloudSyncResponse = await res.json();
    totalCloudPhotos = cloudData.photos?.length || 0;

    // 2. Get local photos
    const localPhotos = await getAllPhotos();
    const localCloudIds = new Set(localPhotos.map((photo) => photo.cloudId).filter((id): id is string => Boolean(id)));

    // 3. Download photos from Cloud that aren't yet in local IndexedDB
    if (cloudData.photos && cloudData.photos.length > 0) {
      const db = await openDatabase();
      for (const cp of cloudData.photos) {
        if (!localCloudIds.has(cp.id)) {
          try {
            const contentRes = await fetch(serverUrl(`/api/cloud/photo/${encodeURIComponent(cp.id)}/content`));
            if (!contentRes.ok) throw new Error(`Cloud photo content request failed (${contentRes.status})`);
            const contentData = await contentRes.json() as { photo?: { dataUrl?: string } };
            if (!contentData.photo?.dataUrl) throw new Error("Cloud photo response did not include image data");
            const photoRes = await fetch(contentData.photo.dataUrl);
            const blob = await photoRes.blob();
            await new Promise<void>((resolve, reject) => {
              const tx = db.transaction("photos", "readwrite");
              const store = tx.objectStore("photos");
              const req = store.add({
                poseKey: cp.poseKey,
                blob,
                note: cp.note || "",
                createdAt: cp.createdAt || Date.now(),
                cloudId: cp.id,
                syncId: typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `cloud-${cp.id}`,
              });
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            });
            downloaded++;
            localCloudIds.add(cp.id);
          } catch (e) {
            console.warn("Failed caching cloud photo to indexeddb", e);
          }
        }
      }
    }

    // 4. Also merge custom categories / poses from Cloud into localStorage if any
    if (cloudData.customPoses && cloudData.customPoses.length > 0) {
      // Handled in App.tsx merge logic
    }
  } catch (err) {
    console.warn("Cloud sync paused (offline mode)", err);
  }

  return { connected, downloaded, uploaded, totalCloudPhotos };
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { void performCloudSync(); });
  window.addEventListener("auth_state_changed", () => { void performCloudSync(); });
}

/**
 * Check Cloud Server Status
 */
export async function getCloudStatus(): Promise<{
  connected: boolean;
  photosCount: number;
  updatedAt?: number;
}> {
  try {
    const res = await fetch(serverUrl("/api/cloud/status"), { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      return {
        connected: true,
        photosCount: json.photosCount || 0,
        updatedAt: json.updatedAt,
      };
    }
    return { connected: false, photosCount: 0 };
  } catch {
    return { connected: false, photosCount: 0 };
  }
}
