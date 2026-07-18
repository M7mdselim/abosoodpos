import { store } from "./store";
import { offlineDb } from "./offlineDb";
import type { Customer, Product, Sale, User } from "@/types";
import type { Shift } from "./shiftService";
import type { UserLogEntry } from "./userLogService";

export const backendService = {
  async syncFromBackend(): Promise<void> {
    try {
      // 1. Sync Products
      const prodRes = await fetch("/api/products");
      if (!prodRes.ok) throw new Error(`Products sync: ${prodRes.status}`);
      const products = await prodRes.json();
      if (products && Array.isArray(products)) {
        store.products = products;
      }

      // 2. Sync Customers
      const custRes = await fetch("/api/customers");
      if (!custRes.ok) throw new Error(`Customers sync: ${custRes.status}`);
      let customers = await custRes.json();
      if (customers) {
        const queue = await offlineDb.getQueue();
        const pendingCustomers = queue
          .filter((item) => item.type === "create_customer")
          .map((item) => item.payload);
        const updatedCustomersMap = new Map(
          queue
            .filter((item) => item.type === "update_customer")
            .map((item) => [item.payload.id, item.payload])
        );
        customers = customers.map((c: any) => updatedCustomersMap.get(c.id) || c);
        store.customers = [...pendingCustomers, ...customers];
      }

      // 3. Sync Sales
      const salesRes = await fetch("/api/sales");
      if (!salesRes.ok) throw new Error(`Sales sync: ${salesRes.status}`);
      const sales = await salesRes.json();
      if (sales) {
        const queue = await offlineDb.getQueue();
        const pendingSales = queue
          .filter((item) => item.type === "create_sale")
          .map((item) => item.payload);
        store.sales = [...pendingSales, ...sales];
      }

      // 4. Sync Settings
      const settingsRes = await fetch("/api/settings");
      if (!settingsRes.ok) throw new Error(`Settings sync: ${settingsRes.status}`);
      const settings = await settingsRes.json();
      if (settings && Object.keys(settings).length > 0) {
        store.settings = { ...store.settings, ...settings };
        if (settings.categories && Array.isArray(settings.categories)) {
          store.setCategoriesFromSync(settings.categories);
        }
        if (settings.carBrands && Array.isArray(settings.carBrands)) {
          store.setCarBrandsFromSync(settings.carBrands);
        }
      }

      // 5. Sync Shifts
      const shiftsRes = await fetch("/api/shifts");
      if (!shiftsRes.ok) throw new Error(`Shifts sync: ${shiftsRes.status}`);
      const shifts = await shiftsRes.json();
      if (shifts) {
        localStorage.setItem("app_shifts", JSON.stringify(shifts));
      }

      // 6. Sync User Logs
      const logsRes = await fetch("/api/logs");
      if (!logsRes.ok) throw new Error(`Logs sync: ${logsRes.status}`);
      const logs = await logsRes.json();
      if (logs) {
        localStorage.setItem("app_user_logs", JSON.stringify(logs));
      }

      // 7. Sync Users
      const usersRes = await fetch("/api/users");
      if (!usersRes.ok) throw new Error(`Users sync: ${usersRes.status}`);
      const users = await usersRes.json();
      if (users && Array.isArray(users)) {
        store.users = users;
      }

      // Automatically refresh active session if current user details/permissions changed
      if (typeof window !== "undefined") {
        const storedSession = localStorage.getItem("app_session");
        if (storedSession && users) {
          try {
            const currentSession = JSON.parse(storedSession);
            const updatedMe = store.users.find((u: any) => u.id === currentSession.id);
            if (updatedMe) {
              const newSession = {
                ...currentSession,
                name: updatedMe.name,
                role: updatedMe.role,
                username: updatedMe.username,
                permissions: updatedMe.permissions,
              };
              localStorage.setItem("app_session", JSON.stringify(newSession));
              window.dispatchEvent(new Event("session_updated"));
            }
          } catch (e) {
            console.error("Error updating active session on sync:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error during backend synchronization:", error);
      throw error;
    }
  },

  // Products
  async createProduct(product: Product): Promise<void> {
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
  },

  async updateProduct(id: string, product: Product): Promise<void> {
    await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
  },

  async deleteProduct(id: string): Promise<void> {
    await fetch(`/api/products/${id}`, {
      method: "DELETE",
    });
  },

  // Customers
  async createCustomer(customer: Customer): Promise<void> {
    if (typeof window !== "undefined" && !navigator.onLine) {
      await offlineDb.addToQueue("create_customer", customer);
      return;
    }
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
      });
      if (!res.ok) throw new Error("Server rejected customer creation");
    } catch (err) {
      console.warn("Failed to create customer online, queueing offline:", err);
      await offlineDb.addToQueue("create_customer", customer);
    }
  },

  async updateCustomer(id: string, customer: Customer): Promise<void> {
    if (typeof window !== "undefined" && !navigator.onLine) {
      await offlineDb.addToQueue("update_customer", customer);
      return;
    }
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customer),
      });
      if (!res.ok) throw new Error("Server rejected customer update");
    } catch (err) {
      console.warn("Failed to update customer online, queueing offline:", err);
      await offlineDb.addToQueue("update_customer", customer);
    }
  },

  // Sales
  async createSale(sale: Sale): Promise<void> {
    if (typeof window !== "undefined" && !navigator.onLine) {
      await offlineDb.addToQueue("create_sale", sale);
      return;
    }
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sale),
      });
      if (!res.ok) throw new Error("Server rejected sale creation");
    } catch (err) {
      console.warn("Failed to create sale online, queueing offline:", err);
      await offlineDb.addToQueue("create_sale", sale);
    }
  },

  async voidSale(id: string): Promise<void> {
    await fetch(`/api/sales/${id}/void`, {
      method: "POST",
    });
  },

  async updatePaymentMethod(
    saleId: string,
    paymentMethod: "Cash" | "Card" | "Mixed",
    cashAmount?: number,
    cardAmount?: number
  ): Promise<void> {
    await fetch(`/api/sales/${saleId}/payment`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod, cashAmount, cardAmount }),
    });
  },

  // Shifts
  async openShift(shift: Shift): Promise<void> {
    await fetch("/api/shifts/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shift),
    });
  },

  async closeShift(shiftId: string, actualCash: number, notes: string, endTime: string): Promise<void> {
    await fetch("/api/shifts/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId, actualCash, notes, endTime }),
    });
  },

  // User Logs
  async createUserLog(log: UserLogEntry): Promise<void> {
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
  },

  async clearUserLogs(): Promise<void> {
    await fetch("/api/logs/clear", {
      method: "DELETE",
    });
  },

  // Settings
  async saveSettings(settings: Record<string, any>): Promise<void> {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
  },

  // Users
  async createUser(user: User): Promise<void> {
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
  },

  async updateUser(id: string, user: User): Promise<void> {
    await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
  },

  async deleteUser(id: string): Promise<void> {
    await fetch(`/api/users/${id}`, {
      method: "DELETE",
    });
  },

  async exportBackup(): Promise<any> {
    const res = await fetch("/api/backup/export");
    if (!res.ok) throw new Error("Failed to export backup");
    return await res.json();
  },

  async importBackup(backupData: any): Promise<void> {
    const res = await fetch("/api/backup/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backupData),
    });
    if (!res.ok) {
      let errMsg = "Failed to restore backup";
      try {
        const err = await res.json();
        errMsg = err.error || errMsg;
      } catch {
        try {
          errMsg = await res.text();
        } catch {}
      }
      throw new Error(errMsg);
    }
  },

  async resetDatabase(): Promise<void> {
    const res = await fetch("/api/dev/reset-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to reset database");
    }
  },

  async syncOfflineQueue(): Promise<void> {
    const queue = await offlineDb.getQueue();
    if (queue.length === 0) return;

    console.log(`Starting synchronization of ${queue.length} offline items...`);
    let syncedCount = 0;
    let failedCount = 0;
    
    for (const item of queue) {
      try {
        let res;
        if (item.type === "create_sale") {
          res = await fetch("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          });
        } else if (item.type === "create_customer") {
          res = await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          });
        } else if (item.type === "update_customer") {
          res = await fetch(`/api/customers/${item.payload.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          });
        }

        if (res && res.ok) {
          await offlineDb.removeFromQueue(item.id);
          syncedCount++;
        } else {
          // Check if the error is a duplicate key (item already synced previously)
          const errText = res ? await res.text() : "No response";
          const isDuplicate = errText.includes("duplicate key") || errText.includes("already exists") || errText.includes("unique constraint");
          
          if (isDuplicate) {
            // Item is already in the database — safely remove from queue
            console.warn(`Item ${item.id} already exists in database, removing from queue.`);
            await offlineDb.removeFromQueue(item.id);
            syncedCount++;
          } else {
            console.error(`Sync error on item ${item.id} (${item.type}): ${errText}`);
            failedCount++;
            // Continue to next item instead of aborting
          }
        }
      } catch (err) {
        console.error(`Network error syncing item ${item.id} of type ${item.type}:`, err);
        failedCount++;
        // Continue to next item instead of aborting
      }
    }

    console.log(`Sync complete: ${syncedCount} synced, ${failedCount} failed.`);

    // Refresh memory store from database after synchronization
    try {
      await this.syncFromBackend();
    } catch (err) {
      console.warn("Post-sync backend refresh failed:", err);
    }

    if (failedCount > 0) {
      throw new Error(`${failedCount} items failed to sync`);
    }
  }
};
