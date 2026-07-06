import { store } from "./store";
import type { Product, ProductCategory } from "@/types";

export const productService = {
  list: () => store.products,
  byCategory: (cat: ProductCategory | "All") =>
    cat === "All" ? store.products : store.products.filter((p) => p.category === cat),
  search: (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return store.products;
    return store.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.barcode.includes(q),
    );
  },
  get: (id: string) => store.products.find((p) => p.id === id),
  create: (data: Omit<Product, "id">): Product => {
    const product: Product = { ...data, id: `p${Date.now()}` };
    store.products = [product, ...store.products];
    return product;
  },
  update: (id: string, patch: Partial<Product>) => {
    store.products = store.products.map((p) => (p.id === id ? { ...p, ...patch } : p));
  },
  remove: (id: string) => {
    store.products = store.products.filter((p) => p.id !== id);
  },
};
