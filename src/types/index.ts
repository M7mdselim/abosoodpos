export type UserRole = "developer" | "admin" | "cashier";

export interface UserPermissions {
  canDiscount: boolean;
  canOpenShift: boolean;
  canCloseShift: boolean;
  canPrintSpotCheck: boolean;
  canViewReceipts?: boolean;
  canReprintReceipts?: boolean;
  canEditPaymentMethods?: boolean;
  canVoidReceipts?: boolean;
  canViewReports?: boolean;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  status: "active" | "inactive";
  permissions?: UserPermissions;
}

export type ProductCategory = string;

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  barcode: string;
  buyingPrice: number;
  sellingPrice: number;
  stock: number;
  oilMileage?: number; // Optional oil mileage (e.g. 5000, 10000)
  isPopular?: boolean; // Fast access for cashier
  isUnlimited?: boolean; // Unlimited stock flag
  isActive?: boolean; // Is product active/enabled
}

export interface CustomerCar {
  id: string;
  brand: string;
  model: string;
  currentKm: number;
  lastServiceDate?: string;
  lastOilUsed?: string;
  lastOilMileage?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  carBrand: string; // Default main car brand (for backward compatibility)
  carModel: string; // Default main car model (for backward compatibility)
  currentKm: number; // Default main car odometer (for backward compatibility)
  lastServiceDate?: string;
  lastOilUsed?: string;
  lastOilMileage?: number;
  notes?: string;
  cars?: CustomerCar[];
}

export interface InvoiceItem {
  productId: string;
  name: string;
  brand: string;
  unitPrice: number;
  quantity: number;
}

export type PaymentMethod = "Cash" | "Card" | "Mixed";

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string; // ISO
  shiftDay?: string; // The operational "date" of the shift this sale belongs to (e.g. "2026-07-01")
  customerId: string;
  customerName: string;
  customerPhone: string;
  carBrand: string;
  carModel: string;
  km: number;
  oilUsed?: string;
  oilMileage?: number; // Optional mileage calculation helper
  cashierId: string;
  cashierName: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  cardAmount?: number;
  status: "active" | "voided";
}

export interface Shift {
  id: string;
  openedAt: string;
  closedAt?: string;
  cashierId: string;
  cashierName: string;
  openingCash: number;
  salesCash: number;
  salesCard: number;
  totalSales: number;
  actualCash?: number;
  difference?: number;
  status: "open" | "closed";
}
