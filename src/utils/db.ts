import { PhotoRecord } from "../types";
import { getCurrentUser } from "./userAuth";

const DB_NAME = "PosingArtDB";
const DB_VERSION = 1;
const STORE_NAME = "photos";

let dbInstance: IDBDatabase | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("poseKey", "poseKey", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function addPhoto(
  poseKey: string,
  blob: Blob | File,
  note?: string,
  cloudId?: string,
  extra?: {
    uploadedBy?: string;
    uploaderRole?: "admin" | "member";
  }
): Promise<number> {
  const [id] = await addPhotos(poseKey, [blob], note, cloudId, extra);
  return id;
}

export async function addPhotos(
  poseKey: string,
  blobs: Array<Blob | File>,
  note?: string,
  cloudId?: string,
  extra?: {
    uploadedBy?: string;
    uploaderRole?: "admin" | "member";
  },
): Promise<number[]> {
  if (!blobs.length) return [];
  const db = await openDatabase();
  const uploaderRole = extra?.uploaderRole || getCurrentUser()?.role || "member";
  const currentUser = getCurrentUser();
  const createdAt = Date.now();
  const items: Array<Omit<PhotoRecord, "id">> = blobs.map((blob, index) => ({
    poseKey,
    syncId: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `photo-${createdAt}-${index}-${Math.random().toString(36).slice(2)}`,
    blob,
    note: note || "",
    cloudId,
    ownerUserId: currentUser?.id,
    createdAt: createdAt + index,
    uploadedBy: extra?.uploadedBy,
    uploaderRole,
    status: "approved",
  }));

  const ids = await new Promise<number[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const addedIds = new Array<number>(items.length);
    items.forEach((item, index) => {
      const req = store.add(item);
      req.onsuccess = () => { addedIds[index] = req.result as number; };
      req.onerror = () => reject(req.error);
    });
    tx.oncomplete = () => resolve(addedIds);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Không thể lưu ảnh vào thiết bị."));
  });

  // Background sync retries this IndexedDB record later if the server is offline.
  if (!cloudId) {
    import("./cloudSync")
      .then(({ syncPendingLocalPhotos }) => syncPendingLocalPhotos())
      .catch((err) => console.warn("Photo sync deferred:", err));
  }

  return ids;
}

export async function updatePhotoCloudState(
  id: number,
  syncId: string,
  cloudId?: string,
  ownerUserId?: string,
): Promise<boolean> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result as PhotoRecord | undefined;
      if (!item) {
        resolve(false);
        return;
      }
      item.syncId = syncId;
      if (cloudId) item.cloudId = cloudId;
      if (ownerUserId) item.ownerUserId = ownerUserId;
      const putReq = store.put(item);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getPhotosForPose(poseKey: string): Promise<PhotoRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("poseKey");
    const req = index.getAll(poseKey);

    req.onsuccess = () => {
      const records = (req.result || []) as PhotoRecord[];
      // sort by newest first
      records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      resolve(records);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPhotos(): Promise<PhotoRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => resolve((req.result || []) as PhotoRecord[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(id: number, cloudId?: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  // Delete from Cloud Drive as well if it has a cloudId
  if (cloudId) {
    import("./cloudSync").then(({ deletePhotoFromCloud }) => {
      deletePhotoFromCloud(cloudId).catch((e) =>
        console.warn("Cloud photo delete sync warning:", e)
      );
    });
  }
}

export async function getPhotoCounts(): Promise<Record<string, number>> {
  const photos = await getAllPhotos();
  const counts: Record<string, number> = {};
  for (const p of photos) {
    counts[p.poseKey] = (counts[p.poseKey] || 0) + 1;
  }
  return counts;
}

export async function bulkImportPhotos(
  items: Array<{ poseKey: string; dataUrl: string; note?: string; createdAt?: number }>
): Promise<number> {
  const db = await openDatabase();
  let importedCount = 0;

  for (const item of items) {
    try {
      // convert dataUrl to Blob
      const res = await fetch(item.dataUrl);
      const blob = await res.blob();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.add({
          poseKey: item.poseKey,
          blob,
          note: item.note || "",
          createdAt: item.createdAt || Date.now(),
        });
        req.onsuccess = () => {
          importedCount++;
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error("Failed to import photo item", e);
    }
  }

  return importedCount;
}

export async function clearAllPhotos(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
