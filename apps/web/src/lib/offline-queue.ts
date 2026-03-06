const DB_NAME = "taringuita-offline";
const DB_VERSION = 3;
const INVENTORY_STORE = "inventory-counts";
const PRODUCTION_STORE = "production-logs";
const TRANSFORMATION_STORE = "transformation-queue";

interface QueuedCount {
  id?: number;
  stationId: string;
  date: string;
  items: { productId: string; quantity: number }[];
  createdAt: string;
}

interface QueuedProduction {
  id?: number;
  stationId: string;
  date: string;
  items: { productId: string; quantityProduced: number; notes?: string }[];
  createdAt: string;
}

interface QueuedTransformation {
  id?: number;
  inputProductId: string;
  inputQuantity: number;
  date: string;
  outputs: { outputProductId: string; quantity: number }[];
  recipeId?: string;
  notes?: string;
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(INVENTORY_STORE)) {
        db.createObjectStore(INVENTORY_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains(PRODUCTION_STORE)) {
        db.createObjectStore(PRODUCTION_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains(TRANSFORMATION_STORE)) {
        db.createObjectStore(TRANSFORMATION_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Inventory queue
// ---------------------------------------------------------------------------

export async function queueCount(
  stationId: string,
  date: string,
  items: { productId: string; quantity: number }[]
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INVENTORY_STORE, "readwrite");
    const store = tx.objectStore(INVENTORY_STORE);
    store.add({
      stationId,
      date,
      items,
      createdAt: new Date().toISOString(),
    } satisfies Omit<QueuedCount, "id">);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueue(): Promise<QueuedCount[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INVENTORY_STORE, "readonly");
    const store = tx.objectStore(INVENTORY_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INVENTORY_STORE, "readwrite");
    const store = tx.objectStore(INVENTORY_STORE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteEntry(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INVENTORY_STORE, "readwrite");
    const store = tx.objectStore(INVENTORY_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(INVENTORY_STORE, "readonly");
    const store = tx.objectStore(INVENTORY_STORE);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Production queue
// ---------------------------------------------------------------------------

export async function queueProduction(
  stationId: string,
  date: string,
  items: { productId: string; quantityProduced: number; notes?: string }[]
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRODUCTION_STORE, "readwrite");
    const store = tx.objectStore(PRODUCTION_STORE);
    store.add({
      stationId,
      date,
      items,
      createdAt: new Date().toISOString(),
    } satisfies Omit<QueuedProduction, "id">);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProductionQueue(): Promise<QueuedProduction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRODUCTION_STORE, "readonly");
    const store = tx.objectStore(PRODUCTION_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProductionEntry(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRODUCTION_STORE, "readwrite");
    const store = tx.objectStore(PRODUCTION_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProductionQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRODUCTION_STORE, "readonly");
    const store = tx.objectStore(PRODUCTION_STORE);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Transformation queue
// ---------------------------------------------------------------------------

export async function queueTransformation(
  inputProductId: string,
  inputQuantity: number,
  date: string,
  outputs: { outputProductId: string; quantity: number }[],
  recipeId?: string,
  notes?: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSFORMATION_STORE, "readwrite");
    const store = tx.objectStore(TRANSFORMATION_STORE);
    store.add({
      inputProductId,
      inputQuantity,
      date,
      outputs,
      recipeId,
      notes,
      createdAt: new Date().toISOString(),
    } satisfies Omit<QueuedTransformation, "id">);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTransformationQueue(): Promise<QueuedTransformation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSFORMATION_STORE, "readonly");
    const store = tx.objectStore(TRANSFORMATION_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTransformationEntry(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSFORMATION_STORE, "readwrite");
    const store = tx.objectStore(TRANSFORMATION_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTransformationQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TRANSFORMATION_STORE, "readonly");
    const store = tx.objectStore(TRANSFORMATION_STORE);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Combined counts
// ---------------------------------------------------------------------------

export async function getTotalQueueCount(): Promise<number> {
  const [inv, prod, trans] = await Promise.all([
    getQueueCount(),
    getProductionQueueCount(),
    getTransformationQueueCount(),
  ]);
  return inv + prod + trans;
}
