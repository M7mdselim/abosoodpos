import { store } from "./store";
import type { Sale } from "@/types";

export const saleService = {
  list: () => store.sales,
  byCustomer: (customerId: string) =>
    store.sales
      .filter((s) => s.customerId === customerId)
      .sort((a, b) => b.date.localeCompare(a.date)),
  byDate: (dateISO: string) => {
    const day = dateISO.split("T")[0];
    return store.sales.filter((s) => s.date.startsWith(day));
  },
  byMonth: (yearMonth: string) => // "YYYY-MM"
    store.sales.filter((s) => s.date.startsWith(yearMonth)),
  create: (sale: Omit<Sale, "id" | "invoiceNumber" | "date">): Sale => {
    const nextNum = 100000 + store.sales.length + 1;
    const created: Sale = {
      ...sale,
      id: `s${Date.now()}`,
      invoiceNumber: `INV-${String(nextNum).padStart(6, "0")}`,
      date: new Date().toISOString(),
    };
    store.sales.unshift(created);
    return created;
  },
};
