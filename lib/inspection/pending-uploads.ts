// On-device queue for photos that haven't reached the server yet.
//
// Photos taken with the in-app camera on iPhone are NOT saved to the camera
// roll, so if an upload fails (attic, crawlspace, rural signal) and the page is
// closed, the photo used to be gone. Each photo is written here before upload
// and removed once it's stored, so the capture screen can resend it the next
// time it opens or when the connection comes back.
//
// Browser-only. Every call is best-effort: if IndexedDB is unavailable (private
// mode, old browser) the app behaves exactly as before.

export type PendingUpload = {
  photoId: string;
  inspectionId: string;
  sectionId: string;
  storagePath: string;
  file: Blob;
  fileName: string;
  createdAt: number;
};

const DB_NAME = "lookover";
const STORE = "pending-uploads";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "photoId" }).createIndex(
            "inspectionId",
            "inspectionId",
          );
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// True when the photo is safely on the device.
export async function savePending(item: PendingUpload): Promise<boolean> {
  return (await run("readwrite", (s) => s.put(item))) !== null;
}

export async function removePending(photoId: string): Promise<void> {
  await run("readwrite", (s) => s.delete(photoId));
}

export async function listPending(inspectionId: string): Promise<PendingUpload[]> {
  const rows = await run("readonly", (s) => s.index("inspectionId").getAll(inspectionId));
  return ((rows as PendingUpload[] | null) ?? []).sort((a, b) => b.createdAt - a.createdAt);
}
