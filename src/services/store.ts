import { mockCustomers } from "@/mock-data/customers";
import { mockProducts } from "@/mock-data/products";
import { mockSales } from "@/mock-data/sales";
import { mockUsers } from "@/mock-data/users";
import type { Customer, Product, Sale, User } from "@/types";

export interface AppSettings {
  companyNameAr: string;
  companyNameEn: string;
  sloganAr: string;
  sloganEn: string;
  phone: string;
  address: string;
  shiftMode: "single" | "multiple";
  receiptWidth?: number;
  receiptMargin?: number;
  receiptFontSize?: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  companyNameAr: "شركة أبو السعود علام",
  companyNameEn: "Abu Saud Allam Oils",
  sloganAr: "لجميع أنواع الزيوت والخدمات",
  sloganEn: "For All Types of Oils & Services",
  phone: "01021111666",
  address: "المحلة الكبرى، مصر",
  shiftMode: "multiple",
  receiptWidth: 80,
  receiptMargin: 4,
  receiptFontSize: 11,
};

const getLocal = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  const data = localStorage.getItem(key);
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
};

const setLocal = <T>(key: string, val: T): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(val));
  }
};

let _customers = getLocal<Customer[]>("pos_customers", mockCustomers);
let _products = getLocal<Product[]>("pos_products", mockProducts);
let _sales = getLocal<Sale[]>("pos_sales", mockSales);
let _users = getLocal<User[]>("pos_users", mockUsers);
let _settings = getLocal<AppSettings>("pos_settings", DEFAULT_SETTINGS);

export const store = {
  get customers() {
    return _customers;
  },
  set customers(val: Customer[]) {
    _customers = val;
    setLocal("pos_customers", val);
  },

  get products() {
    return _products;
  },
  set products(val: Product[]) {
    _products = val;
    setLocal("pos_products", val);
  },

  get sales() {
    return _sales;
  },
  set sales(val: Sale[]) {
    _sales = val;
    setLocal("pos_sales", val);
  },

  get users() {
    return _users;
  },
  set users(val: User[]) {
    _users = val;
    setLocal("pos_users", val);
  },

  get settings() {
    return _settings;
  },
  set settings(val: AppSettings) {
    _settings = val;
    setLocal("pos_settings", val);
  },

  reset() {
    this.customers = [...mockCustomers];
    this.products = [...mockProducts];
    this.sales = [...mockSales];
    this.users = [...mockUsers];
    this.settings = { ...DEFAULT_SETTINGS };
    localStorage.removeItem("app_shifts");
  },
};
export type { AppSettings };
