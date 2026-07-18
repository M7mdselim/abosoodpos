export interface SyncItem {
  id: string;
  type: "create_sale" | "create_customer" | "update_customer" | "open_shift" | "close_shift" | "void_sale" | "update_payment" | "create_log";
  payload: any;
  createdAt: string;
}

class OfflineDb {
  private dbName = "abosood_offline_db";
  private dbVersion = 1;

  private getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        reject(new Error("IndexedDB is not supported on this platform."));
        return;
      }
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("sync_queue")) {
          db.createObjectStore("sync_queue", { keyPath: "id" });
        }
      };
    });
  }

  async addToQueue(type: SyncItem["type"], payload: any): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction("sync_queue", "readwrite");
        const store = tx.objectStore("sync_queue");
        const item: SyncItem = {
          id: `q${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type,
          payload,
          createdAt: new Date().toISOString(),
        };
        const request = store.put(item);
        request.onsuccess = () => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("offline_queue_changed"));
          }
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("IndexedDB error adding to queue:", err);
    }
  }

  async getQueue(): Promise<SyncItem[]> {
    try {
      const db = await this.getDB();
      return new Promise<SyncItem[]>((resolve, reject) => {
        const tx = db.transaction("sync_queue", "readonly");
        const store = tx.objectStore("sync_queue");
        const request = store.getAll();
        request.onsuccess = () => {
          const items = request.result || [];
          // Sort chronologically
          items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          resolve(items);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("IndexedDB error getting queue:", err);
      return [];
    }
  }

  async removeFromQueue(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction("sync_queue", "readwrite");
        const store = tx.objectStore("sync_queue");
        const request = store.delete(id);
        request.onsuccess = () => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("offline_queue_changed"));
          }
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("IndexedDB error removing from queue:", err);
    }
  }
}

export const offlineDb = new OfflineDb();
