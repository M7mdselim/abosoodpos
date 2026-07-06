import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "ar";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  currency: string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Sidebar / Navbar
    pos: "شاشة المبيعات",
    products: "المنتجات والمخزن",
    customers: "العملاء",
    reports: "التقارير",
    users: "الموظفين",
    shifts: "الورديات",
    developer: "المطور",
    logout: "خروج",
    login: "تسجيل الدخول",
    receipts: "الفواتير",
    
    // POS Screen
    search_products: "ابحث باسم المنتج، الماركة، أو الباركود...",
    search_customers: "ابحث برقم التليفون أو الاسم...",
    cart_empty: "سلة المشتريات فارغة",
    total: "الإجمالي النهائي",
    subtotal: "الإجمالي الفرعي",
    discount: "خصم خاص",
    vat: "ضريبة القيمة المضافة",
    pay_cash: "دفع نقدي",
    pay_card: "دفع فيزا",
    customer: "العميل",
    car: "السيارة",
    km: "قراءة العداد (كم)",
    oil_used: "الزيت المستخدم",
    add_custom_item: "إضافة خدمة أو زيت مخصص",
    custom_service_name: "اسم الخدمة / المنتج",
    custom_service_price: "سعر الخدمة",
    add: "إضافة",
    checkout: "إنهاء العملية",
    success_sale: "تمت عملية البيع وحفظ الفاتورة بنجاح",
    
    // Shift Management
    open_shift: "فتح الوردية (الخزنة)",
    close_shift: "إغلاق الوردية وجرد الدرج",
    active_shift: "الوردية النشطة",
    opening_cash: "رصيد الافتتاح الكاش",
    closing_cash: "رصيد الإغلاق الفعلي",
    expected_cash: "المبلغ المتوقع بالخزينة",
    actual_cash: "المبلغ الفعلي بالدرج",
    cash_variance: "الفارق (عجز/زيادة)",
    shift_status: "حالة الوردية",
    shift_history: "سجل ورديات الخزينة",
    no_active_shift: "لا توجد وردية نشطة حالياً",
    must_open_shift: "يجب فتح وردية جديدة في الخزينة وتحديد مبلغ الافتتاح للبدء في إجراء المبيعات.",
    enter_opening_cash: "أدخل الرصيد النقدي المبدئي بالدرج...",
    enter_closing_cash: "أدخل الرصيد الفعلي بعد جرد الدرج...",
    shift_opened: "تم فتح وردية الخزينة بنجاح",
    shift_closed: "تم إغلاق الوردية بنجاح",
    cashier: "الكاشير / الموظف",
    start_time: "بداية الوردية",
    end_time: "نهاية الوردية",
    sales_total: "إجمالي المبيعات",
    
    // Login
    username: "اسم المستخدم",
    password: "كلمة المرور",
    role: "اختر الصلاحية",
    sign_in: "دخول",
    invalid_credentials: "بيانات الدخول غير صحيحة",
    welcome: "أهلاً بك في OilPro POS",
    
    // Common
    save: "حفظ البيانات",
    cancel: "إلغاء",
    actions: "الإجراءات",
    edit: "تعديل",
    delete: "حذف",
    name: "الاسم",
    phone: "رقم التليفون",
    brand: "الماركة",
    barcode: "الباركود",
    price: "السعر",
    stock: "الكمية المتاحة",
    category: "الفئة",
    new_product: "إضافة منتج جديد",
    edit_product: "تعديل بيانات المنتج",

    // Receipts
    invoice_no: "رقم الفاتورة",
    date: "التاريخ والوقت",
    payment_method: "طريقة الدفع",
    void: "إلغاء الفاتورة",
    voided: "ملغاة",
    active: "نشطة",
    reprint: "طباعة الفاتورة",
    void_confirm: "هل أنت متأكد من إلغاء هذه الفاتورة؟ سيتم إعادة الكميات المباعة إلى المخزن.",
    void_success: "تم إلغاء الفاتورة وإعادة المنتجات إلى المخزن بنجاح.",
  },
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language: Language = "ar";

  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.setAttribute("lang", "ar");
      root.setAttribute("dir", "ltr"); // Lock entire website layout to LTR
      localStorage.setItem("app_lang", "ar");
    }
  }, []);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const currency = "ج.م";

  return (
    <LanguageContext.Provider value={{ language, setLanguage: () => {}, t, currency }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
