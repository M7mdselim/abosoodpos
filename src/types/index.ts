export type UserRole = "admin" | "cashier";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  status: "active" | "inactive";
}

export type ProductCategory =
  | "Engine Oil"
  | "Oil Filter"
  | "Air Filter"
  | "Cabin Filter"
  | "Fuel Filter"
  | "Additives"
  | "Accessories";

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  barcode: string;
  buyingPrice: number;
  sellingPrice: number;
  stock: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  carBrand: string;
  carModel: string;
  currentKm: number;
  lastServiceDate?: string;
  lastOilUsed?: string;
  notes?: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  brand: string;
  unitPrice: number;
  quantity: number;
}

export type PaymentMethod = "Cash" | "Card";

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string; // ISO
  customerId: string;
  customerName: string;
  customerPhone: string;
  carBrand: string;
  carModel: string;
  km: number;
  cashierId: string;
  cashierName: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  paymentMethod: PaymentMethod;
  oilUsed?: string;
}
