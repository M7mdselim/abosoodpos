import type { Sale, InvoiceItem } from "@/types";
import { mockCustomers } from "./customers";
import { mockProducts } from "./products";
import { mockUsers } from "./users";

const cashiers = mockUsers.filter((u) => u.role !== "admin" || u.id === "u1");
const oilProducts = mockProducts.filter((p) => p.category === "Engine Oil");
const oilFilters = mockProducts.filter((p) => p.category === "Oil Filter");
const airFilters = mockProducts.filter((p) => p.category === "Air Filter");
const cabinFilters = mockProducts.filter((p) => p.category === "Cabin Filter");
const accessories = mockProducts.filter((p) => p.category === "Accessories");

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function makeItems(seed: number): InvoiceItem[] {
  const items: InvoiceItem[] = [];
  const oil = pick(oilProducts, seed);
  items.push({ productId: oil.id, name: oil.name, brand: oil.brand, unitPrice: oil.sellingPrice, quantity: 4 + (seed % 2) });
  const of = pick(oilFilters, seed + 1);
  items.push({ productId: of.id, name: of.name, brand: of.brand, unitPrice: of.sellingPrice, quantity: 1 });
  if (seed % 3 === 0) {
    const af = pick(airFilters, seed);
    items.push({ productId: af.id, name: af.name, brand: af.brand, unitPrice: af.sellingPrice, quantity: 1 });
  }
  if (seed % 5 === 0) {
    const cf = pick(cabinFilters, seed);
    items.push({ productId: cf.id, name: cf.name, brand: cf.brand, unitPrice: cf.sellingPrice, quantity: 1 });
  }
  if (seed % 4 === 0) {
    const acc = pick(accessories, seed);
    items.push({ productId: acc.id, name: acc.name, brand: acc.brand, unitPrice: acc.sellingPrice, quantity: 1 });
  }
  return items;
}

export const mockSales: Sale[] = Array.from({ length: 300 }, (_, i) => {
  const customer = pick(mockCustomers, i * 3 + 1);
  const cashier = pick(cashiers, i);
  const items = makeItems(i);
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const discount = i % 10 === 0 ? Math.round(subtotal * 0.05) : 0;
  const taxable = subtotal - discount;
  const vat = Math.round(taxable * 0.14);
  const total = taxable + vat;
  const daysAgo = (i * 2) % 180;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(9 + (i % 10), (i * 7) % 60, 0, 0);
  const oil = items.find((it) => oilProducts.some((p) => p.id === it.productId));
  return {
    id: `s${i + 1}`,
    invoiceNumber: `${100000 + i}`,
    date: date.toISOString(),
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    carBrand: customer.carBrand,
    carModel: customer.carModel,
    km: customer.currentKm - ((i * 200) % 8000),
    cashierId: cashier.id,
    cashierName: cashier.name,
    items,
    subtotal,
    discount,
    vat,
    total,
    paymentMethod: i % 2 === 0 ? "Cash" : "Card",
    oilUsed: oil?.name,
    status: "active" as const,
  };
});
