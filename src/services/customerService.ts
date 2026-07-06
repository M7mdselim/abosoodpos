import { store } from "./store";
import type { Customer } from "@/types";

export const customerService = {
  list: () => store.customers,
  findByPhone: (phone: string) =>
    store.customers.find((c) => c.phone === phone.trim()),
  search: (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return store.customers;
    return store.customers.filter(
      (c) => c.phone.includes(q) || c.name.toLowerCase().includes(q),
    );
  },
  get: (id: string) => store.customers.find((c) => c.id === id),
  create: (data: Omit<Customer, "id">): Customer => {
    const customer: Customer = { ...data, id: `c${Date.now()}` };
    store.customers.unshift(customer);
    return customer;
  },
  update: (id: string, patch: Partial<Customer>) => {
    const idx = store.customers.findIndex((c) => c.id === id);
    if (idx >= 0) store.customers[idx] = { ...store.customers[idx], ...patch };
  },
};
