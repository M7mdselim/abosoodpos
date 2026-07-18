export interface SyncItem {
  id: string;
  type: "create_sale" | "create_customer" | "update_customer" | "open_shift" | "close_shift" | "void_sale" | "update_payment" | "create_log" | "create_product" | "update_product" | "delete_product";
  payload: any;
  createdAt: string;
}

class OfflineDb {
  private dbName = "abosood_offline_db";
  private dbVersion = 2; // Bumped to version 2 to support customers, products, and sales tables

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
        if (!db.objectStoreNames.contains("customers")) {
          db.createObjectStore("customers", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("products")) {
          db.createObjectStore("products", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("sales")) {
          db.createObjectStore("sales", { keyPath: "id" });
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
        request.onsuccess = async () => {
          if (typeof window !== "undefined") {
            try {
              const queue = await this.getQueue();
              localStorage.setItem("has_unsynced_items", queue.length > 0 ? "true" : "false");
            } catch (e) {
              console.error(e);
            }
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
        request.onsuccess = async () => {
          if (typeof window !== "undefined") {
            try {
              const queue = await this.getQueue();
              localStorage.setItem("has_unsynced_items", queue.length > 0 ? "true" : "false");
            } catch (e) {
              console.error(e);
            }
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

  private obfuscate(obj: any): any {
    try {
      const json = JSON.stringify(obj);
      const encoded = btoa(unescape(encodeURIComponent(json)));
      return { id: obj.id, data: encoded };
    } catch (e) {
      console.error("Obfuscation error:", e);
      return obj;
    }
  }

  private deobfuscate(record: any): any {
    if (!record || !record.data) return record;
    try {
      const decoded = decodeURIComponent(escape(atob(record.data)));
      return JSON.parse(decoded);
    } catch (e) {
      console.error("Deobfuscation error:", e);
      return record;
    }
  }

  async saveList(storeName: "customers" | "products" | "sales", list: any[]): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        
        const clearReq = store.clear();
        clearReq.onerror = () => reject(clearReq.error);
        
        clearReq.onsuccess = () => {
          if (list.length === 0) {
            resolve();
            return;
          }
          let count = 0;
          list.forEach((item) => {
            const processedItem = storeName === "customers" ? this.obfuscate(item) : item;
            const putReq = store.put(processedItem);
            putReq.onerror = () => reject(putReq.error);
            putReq.onsuccess = () => {
              count++;
              if (count === list.length) {
                resolve();
              }
            };
          });
        };
      });
    } catch (err) {
      console.error(`IndexedDB error saving list to ${storeName}:`, err);
    }
  }

  async getList(storeName: "customers" | "products" | "sales"): Promise<any[]> {
    try {
      const db = await this.getDB();
      return new Promise<any[]>((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => {
          const results = request.result || [];
          if (storeName === "customers") {
            resolve(results.map((r) => this.deobfuscate(r)));
          } else {
            resolve(results);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error(`IndexedDB error getting list from ${storeName}:`, err);
      return [];
    }
  }
}

export const offlineDb = new OfflineDb();
