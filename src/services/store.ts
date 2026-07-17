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
  receiptFooter?: string;
  lowStockThreshold?: number;
  directPrint?: boolean;
  autoBackupEnabled?: boolean;
  autoBackupTime?: string;
  lastAutoBackupDate?: string;
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
  receiptFooter: "شكراً لزيارتكم — رافقتكم السلامة!",
  lowStockThreshold: 5,
  directPrint: false,
  autoBackupEnabled: false,
  autoBackupTime: "22:00",
  lastAutoBackupDate: "",
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

let _customers = getLocal<Customer[]>("pos_customers", []);
let _products = getLocal<Product[]>("pos_products", []);
let _sales = getLocal<Sale[]>("pos_sales", []);
let _users = getLocal<User[]>("pos_users", []).map((u) => {
  return {
    ...u,
    username: u.username || "user",
    password: u.password || "123",
    permissions: u.role === "cashier" 
      ? {
          canDiscount: u.permissions?.canDiscount ?? true,
          canOpenShift: u.permissions?.canOpenShift ?? true,
          canCloseShift: u.permissions?.canCloseShift ?? true,
          canPrintSpotCheck: u.permissions?.canPrintSpotCheck ?? true,
          canViewReceipts: u.permissions?.canViewReceipts ?? false,
          canReprintReceipts: u.permissions?.canReprintReceipts ?? false,
          canEditPaymentMethods: u.permissions?.canEditPaymentMethods ?? false,
          canVoidReceipts: u.permissions?.canVoidReceipts ?? false,
          canViewReports: u.permissions?.canViewReports ?? false,
        }
      : undefined
  };
});
let _settings = getLocal<AppSettings>("pos_settings", DEFAULT_SETTINGS);

const DEFAULT_CATEGORIES: string[] = [];
let _categories = getLocal<string[]>("pos_categories", []);

export const DEFAULT_CAR_BRANDS = [
  { label: "تويوتا (Toyota)", value: "Toyota" },
  { label: "هيونداي (Hyundai)", value: "Hyundai" },
  { label: "كيا (Kia)", value: "Kia" },
  { label: "نيسان (Nissan)", value: "Nissan" },
  { label: "شيفروليه (Chevrolet)", value: "Chevrolet" },
  { label: "ميتسوبيشي (Mitsubishi)", value: "Mitsubishi" },
  { label: "ام جي (MG)", value: "MG" },
  { label: "شيري (Chery)", value: "Chery" },
  { label: "فيات (Fiat)", value: "Fiat" },
  { label: "رينو (Renault)", value: "Renault" },
  { label: "بيجو (Peugeot)", value: "Peugeot" },
  { label: "بي واي دي (BYD)", value: "BYD" },
  { label: "سوزوكي (Suzuki)", value: "Suzuki" },
  { label: "مرسيدس (Mercedes-Benz)", value: "Mercedes-Benz" },
  { label: "بي ام دبليو (BMW)", value: "BMW" },
  { label: "فولكس فاجن (Volkswagen)", value: "Volkswagen" },
  { label: "أوبل (Opel)", value: "Opel" },
  { label: "سكودا (Skoda)", value: "Skoda" },
  { label: "جيب (Jeep)", value: "Jeep" },
  { label: "فورد (Ford)", value: "Ford" },
  { label: "هوندا (Honda)", value: "Honda" },
  { label: "مازدا (Mazda)", value: "Mazda" },
  { label: "جيلي (Geely)", value: "Geely" }
];
let _carBrands = getLocal<{ label: string; value: string }[]>("pos_car_brands", DEFAULT_CAR_BRANDS);

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
    const normalized = val.map((u) => ({
      ...u,
      username: u.username || "user",
      password: u.password || "123",
      permissions: u.role === "cashier" 
        ? {
            canDiscount: u.permissions?.canDiscount ?? true,
            canOpenShift: u.permissions?.canOpenShift ?? true,
            canCloseShift: u.permissions?.canCloseShift ?? true,
            canPrintSpotCheck: u.permissions?.canPrintSpotCheck ?? true,
            canViewReceipts: u.permissions?.canViewReceipts ?? false,
            canReprintReceipts: u.permissions?.canReprintReceipts ?? false,
            canEditPaymentMethods: u.permissions?.canEditPaymentMethods ?? false,
            canVoidReceipts: u.permissions?.canVoidReceipts ?? false,
            canViewReports: u.permissions?.canViewReports ?? false,
          }
        : undefined
    }));
    _users = normalized;
    setLocal("pos_users", normalized);
  },

  get settings() {
    return _settings;
  },
  set settings(val: AppSettings) {
    _settings = val;
    setLocal("pos_settings", val);
    applyAppBranding(val);
  },

  get categories() {
    if (_categories && _categories.length > 0) {
      return _categories;
    }
    return Array.from(new Set(this.products.map((p) => p.category).filter(Boolean)));
  },
  set categories(val: string[]) {
    const isSame = JSON.stringify(_categories) === JSON.stringify(val);
    _categories = val;
    setLocal("pos_categories", val);
    if (!isSame && typeof window !== "undefined") {
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: val }),
      }).catch((err) =>
        console.error("Error saving categories to backend settings:", err)
      );
    }
  },

  setCategoriesFromSync(val: string[]) {
    _categories = val;
    setLocal("pos_categories", val);
  },

  get carBrands() {
    return _carBrands;
  },
  set carBrands(val: { label: string; value: string }[]) {
    const isSame = JSON.stringify(_carBrands) === JSON.stringify(val);
    _carBrands = val;
    setLocal("pos_car_brands", val);
    if (!isSame && typeof window !== "undefined") {
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carBrands: val }),
      }).catch((err) =>
        console.error("Error saving car brands to backend settings:", err)
      );
    }
  },

  setCarBrandsFromSync(val: { label: string; value: string }[]) {
    _carBrands = val;
    setLocal("pos_car_brands", val);
  },

  reset() {
    this.customers = [];
    this.products = [];
    this.sales = [];
    this.users = [];
    this.categories = [...DEFAULT_CATEGORIES];
    this.settings = { ...DEFAULT_SETTINGS };
    this.carBrands = [...DEFAULT_CAR_BRANDS];
    localStorage.removeItem("app_shifts");
  },
};
