import type { Customer, Product, Sale, User } from "@/types";
import { offlineDb } from "./offlineDb";

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
  vatEnabled?: boolean;
  stockAlertsEnabled?: boolean;
  receiptCopies?: number;
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
  vatEnabled: true,
  stockAlertsEnabled: true,
  receiptCopies: 2,
};

const obfuscateText = (text: string): string => {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch {
    return text;
  }
};

const deobfuscateText = (text: string): string => {
  try {
    return decodeURIComponent(escape(atob(text)));
  } catch {
    return text;
  }
};

const getLocal = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  let data = localStorage.getItem(key);
  if (!data) return fallback;
  
  // Deobfuscate pos_users if it's currently encoded (does not start with plain JSON bracket)
  if (key === "pos_users" && !data.startsWith("[")) {
    data = deobfuscateText(data);
  }
  
  try {
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
};

const setLocal = <T>(key: string, val: T): void => {
  if (typeof window !== "undefined") {
    let dataStr = JSON.stringify(val);
    if (key === "pos_users") {
      dataStr = obfuscateText(dataStr);
    }
    localStorage.setItem(key, dataStr);
  }
};

let _customers: Customer[] = [];
let _products: Product[] = [];
let _sales: Sale[] = [];
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
          canCloseAnyShift: u.permissions?.canCloseAnyShift ?? false,
        }
      : undefined
  };
});

// Instantly obfuscate pos_users in local storage if it was loaded as plain text
if (typeof window !== "undefined" && localStorage.getItem("pos_users")?.startsWith("[")) {
  setLocal("pos_users", _users);
}

let _settings = getLocal<AppSettings>("pos_settings", DEFAULT_SETTINGS);

const DEFAULT_CATEGORIES: string[] = [];
let _categories = getLocal<string[]>("pos_categories", []);

export const DEFAULT_CAR_BRANDS = [
  // --- اليابانية والكورية ---
  { label: "تويوتا (Toyota)", value: "Toyota" },
  { label: "هيونداي (Hyundai)", value: "Hyundai" },
  { label: "كيا (Kia)", value: "Kia" },
  { label: "نيسان (Nissan)", value: "Nissan" },
  { label: "ميتسوبيشي (Mitsubishi)", value: "Mitsubishi" },
  { label: "سوزوكي (Suzuki)", value: "Suzuki" },
  { label: "هوندا (Honda)", value: "Honda" },
  { label: "مازدا (Mazda)", value: "Mazda" },
  { label: "إيسوزو (Isuzu)", value: "Isuzu" },
  { label: "سوبارو (Subaru)", value: "Subaru" },
  { label: "لكزس (Lexus)", value: "Lexus" },
  { label: "سانج يونج / KGM (SsangYong)", value: "SsangYong" },
  { label: "جينيسيس (Genesis)", value: "Genesis" },

  // --- الصينية (مصر 2026) ---
  { label: "ام جي (MG)", value: "MG" },
  { label: "شيري (Chery)", value: "Chery" },
  { label: "بي واي دي (BYD)", value: "BYD" },
  { label: "جيلي (Geely)", value: "Geely" },
  { label: "هافال (Haval)", value: "Haval" },
  { label: "شانجان (Changan)", value: "Changan" },
  { label: "جيتور (Jetour)", value: "Jetour" },
  { label: "بايك (BAIC)", value: "BAIC" },
  { label: "جاك (JAC)", value: "JAC" },
  { label: "دونج فنج (Dongfeng)", value: "Dongfeng" },
  { label: "سوفايست (Soueast)", value: "Soueast" },
  { label: "فورثينج (Forthing)", value: "Forthing" },
  { label: "بيستون / فاو (Bestune)", value: "Bestune" },
  { label: "كايي (Kaiyi)", value: "Kaiyi" },
  { label: "اكسيد (Exeed)", value: "Exeed" },
  { label: "ديپال (Deepal)", value: "Deepal" },
  { label: "جي اي سي (GAC Motors)", value: "GAC" },

  // --- الأوروبية ---
  { label: "مرسيدس (Mercedes-Benz)", value: "Mercedes-Benz" },
  { label: "بي ام دبليو (BMW)", value: "BMW" },
  { label: "فولكس فاجن (Volkswagen)", value: "Volkswagen" },
  { label: "أوبل (Opel)", value: "Opel" },
  { label: "سكودا (Skoda)", value: "Skoda" },
  { label: "سيات (Seat)", value: "Seat" },
  { label: "فيات (Fiat)", value: "Fiat" },
  { label: "رينو (Renault)", value: "Renault" },
  { label: "بيجو (Peugeot)", value: "Peugeot" },
  { label: "ستروين (Citroën)", value: "Citroen" },
  { label: "أودي (Audi)", value: "Audi" },
  { label: "بورش (Porsche)", value: "Porsche" },
  { label: "لاند روفر (Land Rover)", value: "Land Rover" },
  { label: "جاكوار (Jaguar)", value: "Jaguar" },
  { label: "فولفو (Volvo)", value: "Volvo" },
  { label: "ألفا روميو (Alfa Romeo)", value: "Alfa Romeo" },
  { label: "كوبرا (Cupra)", value: "Cupra" },
  { label: "ميني (MINI)", value: "MINI" },
  { label: "دي اس (DS)", value: "DS" },

  // --- الأمريكية ---
  { label: "شيفروليه (Chevrolet)", value: "Chevrolet" },
  { label: "جيب (Jeep)", value: "Jeep" },
  { label: "فورد (Ford)", value: "Ford" },
  { label: "كاديلاك (Cadillac)", value: "Cadillac" },
  { label: "جي ام سي (GMC)", value: "GMC" },
  { label: "تسلا (Tesla)", value: "Tesla" },
  { label: "كرايسلر (Chrysler)", value: "Chrysler" },
  { label: "دودج (Dodge)", value: "Dodge" },
  { label: "رام (RAM)", value: "RAM" },

  // --- الدراجات النارية والسكوتر والتوكتوك (Motorcycles & Scooters) ---
  { label: "🏍️ دايون (Dayun)", value: "Dayun" },
  { label: "🏍️ حوا (Hawa)", value: "Hawa" },
  { label: "🏍️ حلاوة (Halawa)", value: "Halawa" },
  { label: "🏍️ بجاج / بوكسر (Bajaj / Boxer)", value: "Bajaj" },
  { label: "🏍️ تيفياس (TVS)", value: "TVS" },
  { label: "🛵 اس واي ام (SYM)", value: "SYM" },
  { label: "🛵 كيمكو (Kymco)", value: "Kymco" },
  { label: "🏍️ بنيلي (Benelli)", value: "Benelli" },
  { label: "🏍️ زونتس (Zontes)", value: "Zontes" },
  { label: "🏍️ ياماها (Yamaha)", value: "Yamaha" },
  { label: "🏍️ هوندا موتوسيكلات (Honda Motorcycle)", value: "Honda Motorcycle" },
  { label: "🏍️ كواساكي (Kawasaki)", value: "Kawasaki" },
  { label: "🏍️ سوزوكي موتوسيكلات (Suzuki Motorcycle)", value: "Suzuki Motorcycle" },
  { label: "🏍️ بي ام دبليو موتوسيكلات (BMW Motorrad)", value: "BMW Motorrad" },
  { label: "🛵 فيسبا / بياجيو (Vespa / Piaggio)", value: "Vespa" },
  { label: "🏍️ كاي واي (Keeway)", value: "Keeway" },
  { label: "🏍️ سي اف موتو (CFMoto)", value: "CFMoto" },
  { label: "🛺 توكتوك بجاج (Bajaj TukTuk)", value: "Bajaj TukTuk" },
  { label: "🛺 تروسيكل (Tricycle)", value: "Tricycle" },
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
    offlineDb.saveList("customers", val);
  },

  get products() {
    return _products;
  },
  set products(val: Product[]) {
    _products = val;
    offlineDb.saveList("products", val);
  },

  get sales() {
    return _sales;
  },
  set sales(val: Sale[]) {
    _sales = val;
    offlineDb.saveList("sales", val);
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
            canCloseAnyShift: u.permissions?.canCloseAnyShift ?? false,
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

  async initStore() {
    if (typeof window === "undefined") return;

    // 1. Check if we need to migrate from LocalStorage to IndexedDB
    const localCustomers = localStorage.getItem("pos_customers");
    const localProducts = localStorage.getItem("pos_products");
    const localSales = localStorage.getItem("pos_sales");

    if (localCustomers !== null || localProducts !== null || localSales !== null) {
      console.log("Migrating local storage data to IndexedDB...");
      
      let custs: Customer[] = [];
      let prods: Product[] = [];
      let sls: Sale[] = [];

      try {
        if (localCustomers) custs = JSON.parse(localCustomers);
      } catch (e) { console.error("Error parsing localCustomers for migration", e); }

      try {
        if (localProducts) prods = JSON.parse(localProducts);
      } catch (e) { console.error("Error parsing localProducts for migration", e); }

      try {
        if (localSales) sls = JSON.parse(localSales);
      } catch (e) { console.error("Error parsing localSales for migration", e); }

      // Save to IndexedDB
      await offlineDb.saveList("customers", custs);
      await offlineDb.saveList("products", prods);
      await offlineDb.saveList("sales", sls);

      // Clean up localStorage to reclaim 5 MB space
      localStorage.removeItem("pos_customers");
      localStorage.removeItem("pos_products");
      localStorage.removeItem("pos_sales");

      console.log("Migration to IndexedDB complete!");
    }

    // 2. Load lists from IndexedDB into memory
    _customers = await offlineDb.getList("customers");
    _products = await offlineDb.getList("products");
    _sales = await offlineDb.getList("sales");

    console.log("Store loaded from IndexedDB:", {
      customers: _customers.length,
      products: _products.length,
      sales: _sales.length,
    });
  },

  async updateSaleIdAndInvoice(oldId: string, newId: string, newInvoiceNumber: string) {
    _sales = _sales.map((s) =>
      s.id === oldId ? { ...s, id: newId, invoiceNumber: newInvoiceNumber } : s
    );
    await offlineDb.saveList("sales", _sales);
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
