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
  logoUrl?: string;
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
  logoUrl: "/logo.jpg",
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
let _users = getLocal<User[]>("pos_users", mockUsers).map((u) => {
  const match = mockUsers.find((mu) => mu.id === u.id);
  return {
    ...u,
    username: u.username || match?.username || u.name.toLowerCase().replace(/[^a-z0-9]/g, "") || "user",
    password: u.password || match?.password || "123",
    permissions: u.role === "cashier" 
      ? (u.permissions || match?.permissions || {
          canDiscount: true,
          canOpenShift: true,
          canCloseShift: true,
          canPrintSpotCheck: true
        }) 
      : undefined
  };
});
let _settings = getLocal<AppSettings>("pos_settings", DEFAULT_SETTINGS);

export function applyAppBranding(settings: AppSettings) {
  if (typeof window === "undefined") return;
  if (settings.companyNameAr) {
    document.title = settings.companyNameAr;
  }
  if (settings.logoUrl) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.logoUrl;
  }
}

if (typeof window !== "undefined") {
  setTimeout(() => applyAppBranding(_settings), 0);
}

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
    applyAppBranding(val);
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
