import { store } from "./store";
import { shiftService } from "./shiftService";
import type { Sale } from "@/types";

export const saleService = {
  list: () => store.sales,
  byCustomer: (customerId: string) =>
    store.sales
      .filter((s) => s.customerId === customerId)
      .sort((a, b) => b.date.localeCompare(a.date)),
  byDate: (dateISO: string) => {
    if (!dateISO) return [];
    const day = dateISO.split("T")[0];
    return store.sales.filter((s) => {
      const matchDay = s.shiftDay || (s.date && s.date.split("T")[0]);
      return matchDay === day;
    });
  },
  byMonth: (yearMonth: string) => {
    if (!yearMonth) return [];
    return store.sales.filter((s) => {
      const matchDay = s.shiftDay || (s.date && s.date.split("T")[0]);
      return matchDay && matchDay.startsWith(yearMonth);
    });
  },
  create: (sale: Omit<Sale, "id" | "invoiceNumber" | "date">): Sale => {
    const nextNum = 100000 + store.sales.length + 1;
    const activeShift = shiftService.getActiveShift();
    const created: Sale = {
      ...sale,
      id: `s${Date.now()}`,
      invoiceNumber: `INV-${String(nextNum).padStart(6, "0")}`,
      date: new Date().toISOString(),
      shiftDay: activeShift?.shiftDay || new Date().toISOString().split("T")[0],
      status: "active",
    };
    store.sales = [created, ...store.sales];
    return created;
  },
  voidSale: (id: string): boolean => {
    const sale = store.sales.find((s) => s.id === id);
    if (!sale || sale.status === "voided") return false;

    // 1. Mark sale as voided
    store.sales = store.sales.map((s) =>
      s.id === id ? { ...s, status: "voided" as const } : s
    );

    // 2. Restore products inventory stock
    sale.items.forEach((item) => {
      const prod = store.products.find((p) => p.id === item.productId);
      if (prod) {
        store.products = store.products.map((p) =>
          p.id === item.productId ? { ...p, stock: p.stock + item.quantity } : p
        );
      }
    });

    return true;
  },
};
