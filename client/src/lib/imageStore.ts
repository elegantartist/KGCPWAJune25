import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'KGC-App-DB';
const STORE_NAME = 'KGC-Key-Value-Store';
const IMAGE_KEY = 'motivational-image';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Saves the motivational image blob to IndexedDB.
 * @param imageBlob The image file/blob to save.
 */
export async function saveMotivationalImage(imageBlob: Blob): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_NAME, imageBlob, IMAGE_KEY);
    console.log('Motivational image saved to IndexedDB.');
  } catch (error) {
    console.error('Error saving image to IndexedDB:', error);
    throw error;
  }
}

/**
 * Retrieves the motivational image blob from IndexedDB.
 * @returns The image blob, or null if not found.
 */
export async function getMotivationalImage(): Promise<Blob | null> {
  try {
    const db = await getDb();
    const image = await db.get(STORE_NAME, IMAGE_KEY);
    console.log('Motivational image retrieved from IndexedDB.');
    return image || null;
  } catch (error) {
    console.error('Error retrieving image from IndexedDB:', error);
    return null;
  }
}