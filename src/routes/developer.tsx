import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import { authService } from "@/services/authService";
import { store } from "@/services/store";
import { backendService } from "@/services/backendService";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Database,
  RefreshCw,
  Trash2,
  ToggleLeft,
  Coins,
  ShieldAlert,
  Code2,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/developer")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: DeveloperControlsPage,
});

function DeveloperControlsPage() {
  const { session } = useSession();
  const { t, language } = useLanguage();
  const router = useRouter();

  // If logged in, check if user is developer
  const isDeveloper = session?.role === "developer";

  // Feature Flags state
  const [vatEnabled, setVatEnabled] = useState(() => {
    return localStorage.getItem("dev_feature_vat") !== "false";
  });
  const [stockAlerts, setStockAlerts] = useState(() => {
    return localStorage.getItem("dev_feature_stock_alerts") === "true";
  });

  // App settings state
  const currentSettings = store.settings;
  const [companyNameAr, setCompanyNameAr] = useState(currentSettings.companyNameAr);
  const [companyNameEn, setCompanyNameEn] = useState(currentSettings.companyNameEn);
  const [sloganAr, setSloganAr] = useState(currentSettings.sloganAr);
  const [sloganEn, setSloganEn] = useState(currentSettings.sloganEn);
  const [phone, setPhone] = useState(currentSettings.phone);
  const [address, setAddress] = useState(currentSettings.address);
  const [shiftMode, setShiftMode] = useState<"single" | "multiple">(currentSettings.shiftMode || "multiple");
  const [logoUrl, setLogoUrl] = useState(currentSettings.logoUrl || "");

  const handleResetDatabase = () => {
    if (confirm(language === "ar" ? "هل أنت متأكد من تصفير وإعادة تعيين قاعدة البيانات؟" : "Are you sure you want to reset the database?")) {
      store.reset();
      toast.success(
        language === "ar"
          ? "تم تصفير وإعادة تعيين البيانات الافتراضية"
          : "Database reset to defaults successfully!"
      );
      router.invalidate();
    }
  };

  const handleSeedMockData = () => {
    const mockSeedSales = [
      {
        id: `s_mock_${Date.now()}_1`,
        invoiceNumber: "999991",
        date: new Date().toISOString(),
        customerId: "c1",
        customerName: "Mohamed Selim",
        customerPhone: "0500000001",
        carBrand: "Toyota",
        carModel: "Camry",
        km: 120000,
        cashierId: "u_cashier",
        cashierName: "Ahmed (Cashier)",
        items: [
          { productId: "p1", name: "Fully Synthetic Oil 5W-30", brand: "Castrol", unitPrice: 150, quantity: 4 },
          { productId: "p2", name: "Premium Oil Filter", brand: "Toyota", unitPrice: 35, quantity: 1 }
        ],
        subtotal: 635,
        discount: 35,
        vat: 90,
        total: 690,
        paymentMethod: "Cash" as const,
        oilUsed: "Castrol 5W-30",
        shiftDay: new Date().toISOString().split("T")[0],
        status: "active" as const,
      },
      {
        id: `s_mock_${Date.now()}_2`,
        invoiceNumber: "999992",
        date: new Date().toISOString(),
        customerId: "c2",
        customerName: "Khalid Al-Ghamdi",
        customerPhone: "0500000002",
        carBrand: "Hyundai",
        carModel: "Elantra",
        km: 85000,
        cashierId: "u_cashier",
        cashierName: "Ahmed (Cashier)",
        items: [
          { productId: "p1", name: "Fully Synthetic Oil 5W-30", brand: "Castrol", unitPrice: 150, quantity: 3.5 },
          { productId: "p3", name: "Air Filter", brand: "Hyundai", unitPrice: 45, quantity: 1 }
        ],
        subtotal: 570,
        discount: 0,
        vat: 85.5,
        total: 655.5,
        paymentMethod: "Card" as const,
        oilUsed: "Castrol 5W-30",
        shiftDay: new Date().toISOString().split("T")[0],
        status: "active" as const,
      }
    ];

    store.sales = [...mockSeedSales, ...store.sales];
    toast.success(
      language === "ar"
        ? "تم حقن بيانات مبيعات تجريبية إضافية بنجاح"
        : "Mock transactions seeded successfully!"
    );
    router.invalidate();
  };

  const handleToggleVat = (checked: boolean) => {
    setVatEnabled(checked);
    localStorage.setItem("dev_feature_vat", String(checked));
    toast.success(
      language === "ar"
        ? `تم ${checked ? "تفعيل" : "تعطيل"} ضريبة القيمة المضافة`
        : `VAT calculation ${checked ? "enabled" : "disabled"}`
    );
  };

  const handleToggleStockAlerts = (checked: boolean) => {
    setStockAlerts(checked);
    localStorage.setItem("dev_feature_stock_alerts", String(checked));
    toast.success(
      language === "ar"
        ? `تم ${checked ? "تفعيل" : "تعطيل"} تنبيهات المخزون المنخفض`
        : `Low stock alerts ${checked ? "enabled" : "disabled"}`
    );
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...currentSettings,
      companyNameAr,
      companyNameEn,
      sloganAr,
      sloganEn,
      phone,
      address,
      shiftMode,
      logoUrl,
    };
    store.settings = updated;
    backendService.saveSettings(updated).catch((err) => console.error("Error saving settings in backend:", err));
    toast.success(
      language === "ar" ? "تم حفظ إعدادات الهوية بنجاح وتحديث النظام" : "Identity settings saved successfully!"
    );
    router.invalidate();
  };

  if (!isDeveloper) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center p-4">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4 animate-bounce" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {language === "ar" ? "عذراً، غير مصرح بالدخول" : "Unauthorized Access"}
        </h1>
        <p className="mt-2 text-muted-foreground max-w-md">
          {language === "ar"
            ? "صفحة تحكم المطور مخصصة لحسابات المطورين والنظام فقط لتجربة وتهيئة التطبيق."
            : "Developer Controls are restricted to Developer role accounts only for staging and testing configurations."}
        </p>
      </div>
    );
  }

  return (
    <PageShell
      title={t("developer")}
      subtitle={language === "ar" ? "إعدادات المطور وإدارة بيانات التجربة" : "Staging config and local data controls"}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* App Settings Customization */}
        <Card className="border-primary/25 shadow-sm bg-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {language === "ar" ? "إعدادات هوية المؤسسة والفواتير" : "Company & Receipt Branding"}
            </CardTitle>
            <CardDescription>
              {language === "ar"
                ? "تغيير اسم وواجهة الشركة المطبوعة على إيصال المبيعات وعرضها بالكامل في لوحة النظام."
                : "Modify brand names, slogans, telephone numbers, and addresses printed on receipts and within the header."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="companyNameAr" className="text-xs font-bold text-muted-foreground">
                    اسم الشركة (بالعربية)
                  </Label>
                  <Input
                    id="companyNameAr"
                    value={companyNameAr}
                    onChange={(e) => setCompanyNameAr(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="companyNameEn" className="text-xs font-bold text-muted-foreground">
                    Company Name (English)
                  </Label>
                  <Input
                    id="companyNameEn"
                    value={companyNameEn}
                    onChange={(e) => setCompanyNameEn(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="sloganAr" className="text-xs font-bold text-muted-foreground">
                    شعار الفاتورة والموقع (بالعربية)
                  </Label>
                  <Input
                    id="sloganAr"
                    value={sloganAr}
                    onChange={(e) => setSloganAr(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="sloganEn" className="text-xs font-bold text-muted-foreground">
                    Slogan (English)
                  </Label>
                  <Input
                    id="sloganEn"
                    value={sloganEn}
                    onChange={(e) => setSloganEn(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground">
                    رقم الهاتف المطبوع
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="address" className="text-xs font-bold text-muted-foreground">
                    العنوان المطبوع
                  </Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="shiftMode" className="text-xs font-bold text-muted-foreground">
                    نظام الورديات (Shift Mode)
                  </Label>
                  <select
                    id="shiftMode"
                    value={shiftMode}
                    onChange={(e) => setShiftMode(e.target.value as any)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="multiple">ورديات متعددة يومياً (Multiple Shifts/Day)</option>
                    <option value="single">وردية واحدة يومياً (Single Shift/Day)</option>
                  </select>
                </div>
                <div className="space-y-2 text-left sm:col-span-2 border-t border-border pt-4">
                  <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                    <span>{language === "ar" ? "شعار الشركة (المطبوع والمعروض)" : "Company Logo (Receipts & UI)"}</span>
                  </Label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                    {logoUrl ? (
                      <div className="relative shrink-0 w-20 h-20 rounded-full border border-border bg-white flex items-center justify-center overflow-hidden">
                        <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="shrink-0 w-20 h-20 rounded-full border border-dashed border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        {language === "ar" ? "بدون شعار" : "No Logo"}
                      </div>
                    )}
                    <div className="space-y-1.5 flex-1 w-full">
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.readAsDataURL(file);
                              reader.onload = (event) => {
                                const img = new Image();
                                img.src = event.target?.result as string;
                                img.onload = () => {
                                  const canvas = document.createElement("canvas");
                                  // Target max dimensions for a logo
                                  const MAX_WIDTH = 250;
                                  const MAX_HEIGHT = 250;
                                  let width = img.width;
                                  let height = img.height;

                                  if (width > height) {
                                    if (width > MAX_WIDTH) {
                                      height = Math.round((height * MAX_WIDTH) / width);
                                      width = MAX_WIDTH;
                                    }
                                  } else {
                                    if (height > MAX_HEIGHT) {
                                      width = Math.round((width * MAX_HEIGHT) / height);
                                      height = MAX_HEIGHT;
                                    }
                                  }

                                  canvas.width = width;
                                  canvas.height = height;
                                  const ctx = canvas.getContext("2d");
                                  if (ctx) {
                                    ctx.drawImage(img, 0, 0, width, height);
                                    // Compress output to JPEG at 0.75 quality
                                    const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
                                    setLogoUrl(compressedBase64);
                                    toast.success(language === "ar" ? "تم تحميل وضغط الشعار بنجاح" : "Logo loaded and compressed successfully");
                                  } else {
                                    setLogoUrl(event.target?.result as string);
                                    toast.success(language === "ar" ? "تم تحميل الشعار بنجاح" : "Logo loaded successfully");
                                  }
                                };
                              };
                            }
                          }}
                          className="h-10 text-xs flex-1 cursor-pointer bg-background"
                        />
                        {logoUrl && (
                          <Button
                            type="button"
                            variant="destructive"
                            className="h-10 text-xs px-3"
                            onClick={() => {
                              setLogoUrl("");
                              toast.info(language === "ar" ? "تم إزالة الشعار" : "Logo removed");
                            }}
                          >
                            {language === "ar" ? "إزالة" : "Remove"}
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {language === "ar" 
                          ? "اختر صورة شعار المؤسسة (PNG, JPG). سيتم تخزين الصورة وتشفيرها في قاعدة البيانات السحابية مباشرة." 
                          : "Upload company logo (PNG, JPG). The image will be encoded and stored directly in the cloud database."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90 mt-2">
                حفظ التعديلات وتحديث النظام
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Local Storage Database Controls */}
        <Card className="border-amber-500/20 shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Database className="h-5 w-5 text-amber-500" />
              {language === "ar" ? "قاعدة البيانات المحلية (LocalStorage)" : "LocalStorage DB Actions"}
            </CardTitle>
            <CardDescription>
              {language === "ar"
                ? "إعادة ضبط أو تعبئة الصندوق والبيانات بالقيم الأولية للتجربة."
                : "Seeding, flushing or restoring demo data inside your browser storage."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 justify-center gap-2 h-12"
                onClick={handleSeedMockData}
              >
                <RefreshCw className="h-4 w-4 text-emerald-500" />
                <span>{language === "ar" ? "حقن عمليات تجريبية" : "Seed Staging Sales"}</span>
              </Button>
              <Button
                variant="destructive"
                className="flex-1 justify-center gap-2 h-12"
                onClick={handleResetDatabase}
              >
                <Trash2 className="h-4 w-4" />
                <span>{language === "ar" ? "تصفير وإعادة تهيئة" : "Wipe & Reset DB"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags / Toggles */}
        <Card className="shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <ToggleLeft className="h-5 w-5 text-primary" />
              {language === "ar" ? "مفاتيح الميزات التجريبية" : "Feature Toggle Flags"}
            </CardTitle>
            <CardDescription>
              {language === "ar"
                ? "تفعيل أو تعطيل محاكاة ميزات الحساب الفواتير ونظام الصندوق."
                : "Dynamically customize system logic behaviors for invoice details."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="space-y-0.5">
                <Label htmlFor="vat-toggle" className="font-semibold text-sm">
                  {language === "ar" ? "حساب ضريبة القيمة المضافة (14%)" : "Enable VAT (14%)"}
                </Label>
                <span className="text-xs text-muted-foreground block">
                  {language === "ar" ? "تطبيق وحساب الضريبة في الفواتير والتقارير" : "Apply tax calculation on checkout"}
                </span>
              </div>
              <Switch id="vat-toggle" checked={vatEnabled} onCheckedChange={handleToggleVat} />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <Label htmlFor="stock-toggle" className="font-semibold text-sm">
                  {language === "ar" ? "تنبهمات المخزون المنخفض" : "Low Stock Warnings"}
                </Label>
                <span className="text-xs text-muted-foreground block">
                  {language === "ar" ? "عرض تحذير للمنتجات ذات المخزون المحدود" : "Show alerts on low quantity products"}
                </span>
              </div>
              <Switch id="stock-toggle" checked={stockAlerts} onCheckedChange={handleToggleStockAlerts} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="border-muted bg-muted/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
              <Code2 className="h-4 w-4" />
              {language === "ar" ? "معلومات النظام الحالية" : "Current System Context"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs font-mono space-y-2 text-muted-foreground">
            <div>
              <strong>Active Cashier Shift:</strong>{" "}
              {localStorage.getItem("app_shifts") ? "Configured" : "None/Empty"}
            </div>
            <div>
              <strong>Total Sales Recorded:</strong> {store.sales.length} invoices
            </div>
            <div>
              <strong>Total Seed Products:</strong> {store.products.length} products
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
