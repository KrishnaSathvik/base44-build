const DB_NAME = 'feedback-inbox-local';
const DB_VERSION = 1;
export const LOCAL_STORE = 'local-state';

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is not available.'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LOCAL_STORE)) request.result.createObjectStore(LOCAL_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage could not be opened.'));
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(LOCAL_STORE, mode);
    const request = action(tx.objectStore(LOCAL_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage operation failed.'));
    tx.oncomplete = () => database.close();
    tx.onerror = () => reject(tx.error ?? new Error('Local storage transaction failed.'));
  });
}

export const localDatabase = {
  get: <T>(key: string) => transaction<T | undefined>('readonly', store => store.get(key)),
  set: <T>(key: string, value: T) => transaction<IDBValidKey>('readwrite', store => store.put(value, key)).then(() => undefined),
  delete: (key: string) => transaction<undefined>('readwrite', store => store.delete(key)).then(() => undefined),
  keys: () => transaction<IDBValidKey[]>('readonly', store => store.getAllKeys()),
};
