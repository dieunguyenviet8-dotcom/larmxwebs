const DB_NAME = 'larmx-music-files';
const STORE_NAME = 'audio';
export const LOCAL_AUDIO_PREFIX = 'idb://';
const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME); };
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
export const saveAudioFile = async (id: string, file: File) => {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => { const transaction = database.transaction(STORE_NAME, 'readwrite'); transaction.objectStore(STORE_NAME).put(file, id); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
  database.close();
};
export const loadAudioFile = async (source: string) => {
  if (!source.startsWith(LOCAL_AUDIO_PREFIX)) return source;
  const database = await openDatabase();
  const file = await new Promise<Blob | undefined>((resolve, reject) => { const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get(source.slice(LOCAL_AUDIO_PREFIX.length)); request.onsuccess = () => resolve(request.result as Blob | undefined); request.onerror = () => reject(request.error); });
  database.close(); if (!file) throw new Error('Không tìm thấy file nhạc đã lưu'); return URL.createObjectURL(file);
};
export const removeAudioFile = async (source: string) => {
  if (!source.startsWith(LOCAL_AUDIO_PREFIX)) return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => { const transaction = database.transaction(STORE_NAME, 'readwrite'); transaction.objectStore(STORE_NAME).delete(source.slice(LOCAL_AUDIO_PREFIX.length)); transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
  database.close();
};
