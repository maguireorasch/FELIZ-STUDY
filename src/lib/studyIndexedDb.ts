// IndexedDB persistence for lecture documents (PDF, PPT, PPTX, DOC, DOCX, JPG, PNG, TXT),
// assignment attachments, and rich-note inline media.

const DB_NAME = 'feliz_study_blobs_db';
const DB_VERSION = 1;
const STORE_NAME = 'files';

export interface StoredFileBlob {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string; // base64 DataURL for reliable storage, preview, download, and JSON backup
  savedAt: number;
}

function openStudyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBlobToIdb(item: StoredFileBlob): Promise<void> {
  const db = await openStudyDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getBlobFromIdb(id: string): Promise<StoredFileBlob | null> {
  const db = await openStudyDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve((req.result as StoredFileBlob | undefined) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllBlobsFromIdb(): Promise<Record<string, StoredFileBlob>> {
  const db = await openStudyDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const map: Record<string, StoredFileBlob> = {};
      for (const item of req.result as StoredFileBlob[]) {
        map[item.id] = item;
      }
      resolve(map);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBlobFromIdb(id: string): Promise<void> {
  const db = await openStudyDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllBlobsFromIdb(): Promise<void> {
  const db = await openStudyDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'));
    reader.readAsDataURL(file);
  });
}

export function triggerDataUrlDownload(dataUrl: string, fileName: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
