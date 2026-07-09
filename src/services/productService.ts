import { store } from "./store";
import type { Product, ProductCategory } from "@/types";
import { backendService } from "./backendService";

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
        (p.barcode && p.barcode.includes(q)),
    );
  },
  get: (id: string) => store.products.find((p) => p.id === id),
  create: (data: Omit<Product, "id">): Product => {
    const product: Product = { ...data, id: `p${Date.now()}` };
    store.products = [product, ...store.products];
    backendService.createProduct(product).catch((err) => console.error("Error creating product in backend:", err));
    return product;
  },
  update: (id: string, patch: Partial<Product>) => {
    let updatedProduct: Product | null = null;
    store.products = store.products.map((p) => {
      if (p.id === id) {
        const updated = { ...p, ...patch };
        updatedProduct = updated;
        return updated;
      }
      return p;
    });
    if (updatedProduct) {
      backendService.updateProduct(id, updatedProduct).catch((err) => console.error("Error updating product in backend:", err));
    }
  },
  remove: (id: string) => {
    store.products = store.products.filter((p) => p.id !== id);
    backendService.deleteProduct(id).catch((err) => console.error("Error deleting product from backend:", err));
  },
};
