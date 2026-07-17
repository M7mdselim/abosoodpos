import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import { authService } from "@/services/authService";
import { store } from "@/services/store";
import { backendService } from "@/services/backendService";
import { shiftService } from "@/services/shiftService";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  ToggleLeft,
  Coins,
  ShieldAlert,
  Code2,
  Building2,
  Printer,
  Sliders,
  Eye,
  Wrench,
  CalendarDays,
  Pencil,
  Check,
  X,
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
  const [lowStockThreshold, setLowStockThreshold] = useState(() => {
    return currentSettings.lowStockThreshold !== undefined ? currentSettings.lowStockThreshold : 5;
  });

  // Shift day management state
  const [shiftTick, setShiftTick] = useState(0);
  const allShifts = useMemo(() => shiftService.getShifts(), [shiftTick]);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editingShiftDay, setEditingShiftDay] = useState<string>("");
  const [shiftPage, setShiftPage] = useState(1);
  const SHIFTS_PER_PAGE = 10;
  const shiftTotalPages = Math.ceil(allShifts.length / SHIFTS_PER_PAGE) || 1;
  const paginatedShifts = useMemo(() => {
    const start = (shiftPage - 1) * SHIFTS_PER_PAGE;
    return allShifts.slice(start, start + SHIFTS_PER_PAGE);
  }, [allShifts, shiftPage]);

  const handleEditShiftDay = (shiftId: string, currentDay: string) => {
    setEditingShiftId(shiftId);
    setEditingShiftDay(currentDay);
  };

  const handleSaveShiftDay = (shiftId: string) => {
    if (!editingShiftDay.trim()) {
      toast.error("يرجى إدخال تاريخ صحيح");
      return;
    }
    const shifts = shiftService.getShifts();
    const index = shifts.findIndex((s) => s.id === shiftId);
    if (index === -1) {
      toast.error("لم يتم العثور على الوردية");
      return;
    }
    const oldDay = shifts[index].shiftDay;
    shifts[index].shiftDay = editingShiftDay;
    shiftService.saveShifts(shifts);
    toast.success(`تم تعديل يوم الوردية من ${oldDay} إلى ${editingShiftDay}`);
    setEditingShiftId(null);
    setShiftTick((t) => t + 1);
  };

  const handleToggleShiftStatus = (shiftId: string) => {
    const shifts = shiftService.getShifts();
    const index = shifts.findIndex((s) => s.id === shiftId);
    if (index === -1) {
      toast.error("لم يتم العثور على الوردية");
      return;
    }
    const oldStatus = shifts[index].status;
    const newStatus = oldStatus === "open" ? "closed" : "open";
    shifts[index].status = newStatus;
    if (newStatus === "closed" && !shifts[index].closedAt) {
      shifts[index].closedAt = new Date().toISOString();
    }
    if (newStatus === "open") {
      shifts[index].closedAt = undefined as any;
    }
    shiftService.saveShifts(shifts);
    toast.success(`تم تغيير حالة الوردية من "${oldStatus === "open" ? "نشطة" : "مغلقة"}" إلى "${newStatus === "open" ? "نشطة" : "مغلقة"}"`);
    setShiftTick((t) => t + 1);
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

  const handleUpdateStockThreshold = (val: number) => {
    setLowStockThreshold(val);
    const updated = {
      ...currentSettings,
      lowStockThreshold: val,
    };
    store.settings = updated;
    backendService.saveSettings(updated).catch((err) => console.error("Error saving low stock threshold:", err));
    router.invalidate();
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
  };

  // Receipt Printer & Page Layout state
  const [receiptWidth, setReceiptWidth] = useState(currentSettings.receiptWidth || 80);
  const [receiptMargin, setReceiptMargin] = useState(currentSettings.receiptMargin !== undefined ? currentSettings.receiptMargin : 4);
  const [receiptFontSize, setReceiptFontSize] = useState(currentSettings.receiptFontSize || 11);
  const [receiptFooter, setReceiptFooter] = useState(currentSettings.receiptFooter || "شكراً لزيارتكم — رافقتكم السلامة!");
  const [directPrint, setDirectPrint] = useState(currentSettings.directPrint ?? false);

  const handleSavePrinterSettings = () => {
    const updated = {
      ...currentSettings,
      receiptWidth,
      receiptMargin,
      receiptFontSize,
      receiptFooter,
      directPrint,
    };
    store.settings = updated;
    backendService.saveSettings(updated).catch((err) => console.error("Error saving printer settings in backend:", err));
    toast.success(
      language === "ar" ? "تم حفظ إعدادات الطابعة بنجاح وتحديث النظام" : "Receipt printer settings saved successfully!"
    );
    router.invalidate();
  };

  const handleApplyPreset = (width: number, margin: number, fontSize: number) => {
    setReceiptWidth(width);
    setReceiptMargin(margin);
    setReceiptFontSize(fontSize);
    toast.success(
      language === "ar"
        ? `تم تطبيق الإعداد المسبق: عرض ${width}مم`
        : `Applied preset for ${width}mm width`
    );
  };

  const handleResetPrinterSettings = () => {
    setReceiptWidth(80);
    setReceiptMargin(4);
    setReceiptFontSize(11);
    setReceiptFooter("شكراً لزيارتكم — رافقتكم السلامة!");
    setDirectPrint(false);
    toast.success(
      language === "ar" ? "تم إعادة ضبط إعدادات الطابعة إلى الافتراضية" : "Receipt settings reset to default"
    );
  };

  // Mock sale data for the receipt preview
  const mockPreviewSale = {
    invoiceNumber: "20269999",
    date: new Date(),
    cashierName: session?.username || "الكاشير",
    customerName: "محمد سليم (تجريبي)",
    customerPhone: "01021111666",
    carBrand: "تويوتا",
    carModel: "كامري",
    km: 145000,
    items: [
      { productId: "p1", name: "زيت تويوتا الأصلي 5W-30 (4L)", quantity: 1, unitPrice: 150 },
      { productId: "p2", name: "فلتر زيت ممتاز", quantity: 1, unitPrice: 45 },
    ],
    subtotal: 195,
    discount: 0,
    vat: 27.3,
    total: 222.3,
    paymentMethod: "Cash",
    oilUsed: "Toyota 5W-30",
    oilMileage: 10000,
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

        {/* Printer & Receipt Settings Section */}
        <Card className="border-primary/25 shadow-sm bg-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2 text-base">
              <Printer className="h-5 w-5 text-primary" />
              {language === "ar" ? "أبعاد الورق وحجم الخط للطباعة" : "Paper Dimensions & Font Size"}
            </CardTitle>
            <CardDescription>
              {language === "ar"
                ? "تخصيص عرض الورق، الهوامش وحجم الخط ليلائم طابعتك الحرارية ومراجعة الشكل النهائي للإيصال."
                : "Customize thermal roll width, padding spacing, and font sizes to fit your receipt printer."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-5 items-start">
              {/* Left Control Panel: Columns 1-3 */}
              <div className="md:col-span-3 space-y-6">
                <div className="space-y-4">
                  {/* Presets */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground">
                      {language === "ar" ? "إعدادات جاهزة سريعة" : "Quick Presets"}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplyPreset(80, 4, 11)}
                        className="text-xs font-semibold"
                      >
                        80mm (Standard)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplyPreset(58, 2, 9.5)}
                        className="text-xs font-semibold"
                      >
                        58mm (Compact Mobile)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplyPreset(110, 6, 12)}
                        className="text-xs font-semibold"
                      >
                        110mm (Wide Desktop)
                      </Button>
                    </div>
                  </div>

                  <div className="my-2 border-t border-border" />

                  {/* Width Slider */}
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-foreground">
                        {language === "ar" ? "عرض الورق" : "Receipt Width"}
                      </span>
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {receiptWidth}mm
                      </span>
                    </div>
                    <Slider
                      value={[receiptWidth]}
                      onValueChange={(val) => setReceiptWidth(val[0])}
                      min={40}
                      max={120}
                      step={1}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {language === "ar"
                        ? "عرض بكرة الورق الحراري المطبوع. القيمة القياسية هي 80 مم أو 58 مم."
                        : "The width of physical paper roll. Standard values are 80mm or 58mm."}
                    </p>
                  </div>

                  {/* Margin Slider */}
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-foreground">
                        {language === "ar" ? "الهوامش الجانبية" : "Horizontal Margins"}
                      </span>
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {receiptMargin}mm
                      </span>
                    </div>
                    <Slider
                      value={[receiptMargin]}
                      onValueChange={(val) => setReceiptMargin(val[0])}
                      min={0}
                      max={20}
                      step={1}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {language === "ar"
                        ? "المسافة الفارغة على الجانبين لتفادي اقتطاع النصوص في طابعات معينة."
                        : "Space on both sides of the printout to prevent text clipping."}
                    </p>
                  </div>

                  {/* Font Size Slider */}
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-foreground">
                        {language === "ar" ? "حجم الخط الافتراضي" : "Default Font Size"}
                      </span>
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {receiptFontSize}px
                      </span>
                    </div>
                    <Slider
                      value={[receiptFontSize]}
                      onValueChange={(val) => setReceiptFontSize(val[0])}
                      min={8}
                      max={20}
                      step={0.5}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {language === "ar"
                        ? "حجم خط المحتوى الإجمالي للفاتورة وتفاصيل المنتجات."
                        : "Baseline size for receipt textual content and line items."}
                    </p>
                  </div>

                  {/* Receipt Footer Textarea */}
                  <div className="space-y-2 text-left">
                    <Label className="text-xs font-bold text-muted-foreground">
                      {language === "ar" ? "نص تذييل الفاتورة (متعدد الأسطر)" : "Receipt Footer (Multi-line)"}
                    </Label>
                    <textarea
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                      rows={3}
                      placeholder={language === "ar" ? "شكراً لزيارتكم\nنسعد بخدمتكم دائماً" : "Thank you for your visit"}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-right"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {language === "ar"
                        ? "النص الذي يظهر في نهاية الإيصال. يدعم أسطر متعددة."
                        : "Text displayed at the end of the receipt. Supports multiple lines."}
                    </p>
                  </div>

                  {/* Direct Print Toggle */}
                  <div className="flex items-center justify-between py-3 border-t border-border mt-3">
                    <div className="space-y-0.5 text-right">
                      <Label htmlFor="direct-print-toggle" className="font-bold text-xs text-muted-foreground">
                        {language === "ar" ? "الطباعة المباشرة بعد الدفع" : "Direct Print on Checkout"}
                      </Label>
                      <span className="text-[10px] text-muted-foreground block">
                        {language === "ar"
                          ? "عند التفعيل، سيتم فتح نافذة الطباعة فوراً وتخطي عرض الفاتورة بعد الدفع."
                          : "Immediately open print dialog and bypass showing invoice preview after payment."}
                      </span>
                    </div>
                    <Switch
                      id="direct-print-toggle"
                      checked={directPrint}
                      onCheckedChange={(checked) => setDirectPrint(checked)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSavePrinterSettings}
                    className="flex-1 bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90 h-11"
                  >
                    {language === "ar" ? "حفظ إعدادات الأبعاد" : "Save Layout Settings"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResetPrinterSettings}
                    className="h-11 px-4 text-xs font-bold"
                  >
                    {language === "ar" ? "إعادة افتراضي" : "Reset Defaults"}
                  </Button>
                </div>
              </div>

              {/* Right Live Preview: Columns 2 */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                  <Eye className="h-4 w-4 text-primary" />
                  <span>{language === "ar" ? "معاينة حية للمقاسات الحالية" : "Live Layout Preview"}</span>
                </div>
                <div className="w-full bg-muted border border-dashed border-border rounded-xl p-4 flex justify-center items-start overflow-x-auto min-h-[480px]">
                  <div
                    className="bg-white text-black p-3 shadow-md rounded border border-border transition-all duration-300"
                    style={{
                      width: `${receiptWidth * 3.8}px`,
                      paddingLeft: `${receiptMargin * 3.8}px`,
                      paddingRight: `${receiptMargin * 3.8}px`,
                    }}
                    dir="rtl"
                  >
                    {/* Header */}
                    <div className="text-center mb-1">
                      {currentSettings.logoUrl && (
                        <img
                          src={currentSettings.logoUrl}
                          alt="Logo"
                          className="w-10 h-10 rounded-full object-cover mx-auto mb-1 border border-border bg-white"
                        />
                      )}
                      <div className="font-black text-black leading-tight" style={{ fontSize: `${receiptFontSize * 1.2}px` }}>
                        {currentSettings.companyNameAr}
                      </div>
                      <div className="font-semibold text-black/80" style={{ fontSize: `${receiptFontSize * 0.9}px` }}>
                        {currentSettings.sloganAr}
                      </div>
                      <div className="text-black/70 font-medium" style={{ fontSize: `${receiptFontSize * 0.8}px` }}>
                        {currentSettings.phone && `ت: ${currentSettings.phone}`}
                        {currentSettings.phone && currentSettings.address && " | "}
                        {currentSettings.address && `${currentSettings.address}`}
                      </div>
                    </div>

                    <div className="my-1.5 border-t border-dashed border-black" />

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-y-0.5 text-black" style={{ fontSize: `${receiptFontSize * 0.8}px` }}>
                      <div><b>رقم الفاتورة:</b></div>
                      <div className="text-left font-bold">#20269999</div>
                      <div><b>التاريخ والوقت:</b></div>
                      <div className="text-left">
                        {mockPreviewSale.date.toLocaleDateString("ar-EG")} {mockPreviewSale.date.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div><b>أمين الصندوق:</b></div>
                      <div className="text-left">{mockPreviewSale.cashierName}</div>
                    </div>

                    <div className="my-1.5 border-t border-dashed border-black" />

                    {/* Customer */}
                    <div
                      className="text-right leading-tight space-y-0.5 bg-black/[0.01] p-1 border border-dashed border-black rounded"
                      style={{ fontSize: `${receiptFontSize * 0.8}px` }}
                    >
                      <div><b>العميل:</b> {mockPreviewSale.customerName}</div>
                      <div><b>الهاتف:</b> {mockPreviewSale.customerPhone}</div>
                      <div><b>السيارة:</b> {mockPreviewSale.carBrand} {mockPreviewSale.carModel} — {mockPreviewSale.km.toLocaleString()} كم</div>
                    </div>

                    <div className="my-1.5 border-t border-dashed border-black" />

                    {/* Product Items Table */}
                    <table className="w-full text-black border-collapse" style={{ fontSize: `${receiptFontSize * 0.8}px` }}>
                      <thead>
                        <tr className="border-b border-black text-right font-bold">
                          <th className="py-0.5 text-right w-[45%]">البند</th>
                          <th className="py-0.5 text-center w-[15%]">الكمية</th>
                          <th className="py-0.5 text-left w-[20%]">السعر</th>
                          <th className="py-0.5 text-left w-[20%]">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockPreviewSale.items.map((it, idx) => (
                          <tr key={idx} className="border-b border-dashed border-black/20">
                            <td className="py-0.5 text-right">{it.name}</td>
                            <td className="py-0.5 text-center">{it.quantity}</td>
                            <td className="py-0.5 text-left">{it.unitPrice.toFixed(0)}</td>
                            <td className="py-0.5 text-left font-bold">{(it.quantity * it.unitPrice).toFixed(0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="my-1.5 border-t border-dashed border-black" />

                    {/* Totals */}
                    <div className="space-y-0.5 text-black" style={{ fontSize: `${receiptFontSize * 0.8}px` }}>
                      <div className="flex justify-between">
                        <span className="text-black/80">الإجمالي الفرعي</span>
                        <span className="font-semibold">{mockPreviewSale.subtotal.toFixed(0)} ج.م</span>
                      </div>
                      {mockPreviewSale.discount > 0 && (
                        <div className="flex justify-between text-black">
                          <span>الخصم</span>
                          <span>-{mockPreviewSale.discount.toFixed(0)} ج.م</span>
                        </div>
                      )}
                      {mockPreviewSale.vat > 0 && (
                        <div className="flex justify-between">
                          <span>الضريبة (14%)</span>
                          <span>{mockPreviewSale.vat.toFixed(1)} ج.م</span>
                        </div>
                      )}
                      <div
                        className="flex justify-between border-y border-black py-0.5 font-extrabold my-1 text-black"
                        style={{ fontSize: `${receiptFontSize * 0.9}px` }}
                      >
                        <span>الإجمالي الكلي</span>
                        <span>{mockPreviewSale.total.toFixed(0)} ج.م</span>
                      </div>
                      <div className="flex justify-between">
                        <span>طريقة الدفع</span>
                        <span>{mockPreviewSale.paymentMethod === "Cash" ? "نقدي" : "كارت"}</span>
                      </div>
                    </div>

                    {/* Next Recommended Change */}
                    {mockPreviewSale.oilUsed && mockPreviewSale.oilMileage && (
                      <>
                        <div className="my-1.5 border-t border-dashed border-black" />
                        <div className="border border-black p-1.5 rounded text-center bg-black/[0.01]">
                          <div className="font-bold text-black" style={{ fontSize: `${receiptFontSize * 0.75}px` }}>
                            تغيير الزيت القادم الموصى به ({mockPreviewSale.oilMileage.toLocaleString()} كم)
                          </div>
                          <div
                            className="mt-0.5 font-extrabold text-black tracking-wide"
                            style={{ fontSize: `${receiptFontSize * 1.1}px` }}
                          >
                            {(mockPreviewSale.km + mockPreviewSale.oilMileage).toLocaleString()} كم
                          </div>
                        </div>
                      </>
                    )}

                    <div className="my-1.5 border-t border-dashed border-black" />
                    <div className="text-center text-black font-bold whitespace-pre-line" style={{ fontSize: `${receiptFontSize * 0.8}px` }}>
                      {receiptFooter}
                    </div>
                  </div>
                </div>
              </div>
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

            {stockAlerts && (
              <div className="mt-3 p-3 bg-muted/40 rounded-lg border border-border space-y-2 text-left animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex justify-between items-center">
                  <Label htmlFor="stock-threshold" className="text-xs font-bold text-muted-foreground">
                    {language === "ar" ? "حد التنبيه للمخزون المنخفض" : "Low Stock Alert Threshold"}
                  </Label>
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {lowStockThreshold}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    id="stock-threshold"
                    type="number"
                    min={1}
                    max={100}
                    value={lowStockThreshold}
                    onChange={(e) => handleUpdateStockThreshold(Number(e.target.value))}
                    className="h-10 text-xs w-24 text-center font-bold"
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight flex-1">
                    {language === "ar"
                      ? "سيتم إظهار تنبيه باللون البرتقالي عندما تكون كمية المنتج أقل من أو تساوي هذه القيمة."
                      : "An orange warning badge will appear when a product's stock is less than or equal to this number."}
                  </p>
                </div>
              </div>
            )}
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

        {/* ── Shift Day Management ──────────────────────────────── */}
        <Card className="border-violet-500/25 shadow-sm bg-card md:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-violet-600" />
                  إدارة وتعديل أيام الورديات
                </CardTitle>
                <CardDescription className="mt-1">
                  تعديل يوم الوردية لأي وردية ماضية أو حالية. هذا التعديل محلي فقط ولا يؤثر على البيانات المحفوظة في السيرفر.
                </CardDescription>
              </div>
              {allShifts.length > 0 && (
                <span className="shrink-0 text-xs text-muted-foreground font-semibold bg-muted rounded-lg px-2.5 py-1 border border-border">
                  {allShifts.length} وردية
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {allShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">لا توجد ورديات مسجلة حتى الآن.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-right px-4 py-2.5 font-bold text-xs text-muted-foreground whitespace-nowrap">#</th>
                        <th className="text-right px-4 py-2.5 font-bold text-xs text-muted-foreground whitespace-nowrap">رقم الوردية</th>
                        <th className="text-right px-4 py-2.5 font-bold text-xs text-muted-foreground whitespace-nowrap">الكاشير</th>
                        <th className="text-right px-4 py-2.5 font-bold text-xs text-muted-foreground whitespace-nowrap">يوم الوردية</th>
                        <th className="text-right px-4 py-2.5 font-bold text-xs text-muted-foreground whitespace-nowrap">الحالة</th>
                        <th className="text-right px-4 py-2.5 font-bold text-xs text-muted-foreground whitespace-nowrap">تعديل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedShifts.map((s, i) => {
                        const globalIndex = (shiftPage - 1) * SHIFTS_PER_PAGE + i + 1;
                        return (
                          <tr key={s.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-card" : "bg-muted/20"}`}>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground font-semibold">{globalIndex}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.id.slice(-8)}</td>
                            <td className="px-4 py-2.5 font-semibold">{s.cashierName}</td>
                            <td className="px-4 py-2.5">
                              {editingShiftId === s.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="date"
                                    value={editingShiftDay}
                                    onChange={(e) => setEditingShiftDay(e.target.value)}
                                    className="h-8 text-xs w-36"
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10"
                                    onClick={() => handleSaveShiftDay(s.id)}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                    onClick={() => setEditingShiftId(null)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="font-bold text-violet-700 dark:text-violet-400 font-mono">{s.shiftDay}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => handleToggleShiftStatus(s.id)}
                                title="اضغط لتغيير الحالة"
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold cursor-pointer transition-all hover:scale-105 hover:shadow-sm ${
                                  s.status === "open"
                                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                {s.status === "open" ? "نشطة ↻" : "مغلقة ↻"}
                              </button>
                            </td>
                            <td className="px-4 py-2.5">
                              {editingShiftId !== s.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs gap-1 text-violet-700 hover:bg-violet-500/10"
                                  onClick={() => handleEditShiftDay(s.id, s.shiftDay)}
                                >
                                  <Pencil className="h-3 w-3" />
                                  تعديل
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {shiftTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      disabled={shiftPage === 1}
                      onClick={() => { setShiftPage((p) => Math.max(1, p - 1)); setEditingShiftId(null); }}
                    >
                      → السابق
                    </Button>
                    <span className="text-xs text-muted-foreground font-semibold">
                      صفحة <span className="text-foreground font-black">{shiftPage}</span> من <span className="text-foreground font-black">{shiftTotalPages}</span>
                      <span className="text-muted-foreground/70 mr-2">({allShifts.length} وردية)</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      disabled={shiftPage === shiftTotalPages}
                      onClick={() => { setShiftPage((p) => Math.min(shiftTotalPages, p + 1)); setEditingShiftId(null); }}
                    >
                      التالي ←
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </PageShell>
  );
}
