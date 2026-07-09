import { store } from "./store";
import type { Customer, Product, Sale } from "@/types";
import type { Shift } from "./shiftService";
import type { UserLogEntry } from "./userLogService";

export const backendService = {
  async syncFromBackend(): Promise<void> {
    try {
      // 1. Sync Products
      const prodRes = await fetch("/api/products");
      if (!prodRes.ok) throw new Error(`Products sync: ${prodRes.status}`);
      const products = await prodRes.json();
      if (products && products.length > 0) {
        store.products = products;
      }

      // 2. Sync Customers
      const custRes = await fetch("/api/customers");
      if (!custRes.ok) throw new Error(`Customers sync: ${custRes.status}`);
      const customers = await custRes.json();
      if (customers) {
        store.customers = customers;
      }

      // 3. Sync Sales
      const salesRes = await fetch("/api/sales");
      if (!salesRes.ok) throw new Error(`Sales sync: ${salesRes.status}`);
      const sales = await salesRes.json();
      if (sales) {
        store.sales = sales;
      }

      // 4. Sync Settings
      const settingsRes = await fetch("/api/settings");
      if (!settingsRes.ok) throw new Error(`Settings sync: ${settingsRes.status}`);
      const settings = await settingsRes.json();
      if (settings && Object.keys(settings).length > 0) {
        store.settings = { ...store.settings, ...settings };
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
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    });
  },

  async updateCustomer(id: string, customer: Customer): Promise<void> {
    await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    });
  },

  // Sales
  async createSale(sale: Sale): Promise<void> {
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sale),
    });
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

  async closeShift(actualCash: number, notes: string, endTime: string): Promise<void> {
    await fetch("/api/shifts/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualCash, notes, endTime }),
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
};
