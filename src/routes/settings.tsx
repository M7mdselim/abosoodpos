import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import { authService } from "@/services/authService";
import { store, DEFAULT_CAR_BRANDS } from "@/services/store";
import { backendService } from "@/services/backendService";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, ArrowUp, ArrowDown, Plus, Layers, CarFront, Database, Download, Upload, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    const session = authService.getSession();
    if (session?.role !== "developer" && session?.role !== "admin") {
      throw redirect({ to: "/pos" });
    }
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { language } = useLanguage();

  // Tab state
  const [activeTab, setActiveTab] = useState<"categories" | "brands" | "backup">("categories");

  // Loading states
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Auto Backup settings state
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(() => store.settings.autoBackupEnabled ?? false);
  const [autoBackupTime, setAutoBackupTime] = useState(() => store.settings.autoBackupTime ?? "22:00");
  const [isSavingAutoBackup, setIsSavingAutoBackup] = useState(false);

  // Category management state
  const [categories, setCategories] = useState<string[]>(() => store.categories || []);
  const [newCategory, setNewCategory] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  // Brand management state
  const [carBrands, setCarBrands] = useState(() => store.carBrands || []);
  const [newBrandAr, setNewBrandAr] = useState("");
  const [newBrandEn, setNewBrandEn] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

  // ----------------------------------------------------
  // Category Handlers
  // ----------------------------------------------------
  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) {
      toast.error(language === "ar" ? "يرجى كتابة اسم القسم" : "Please enter category name");
      return;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(language === "ar" ? "هذا القسم موجود بالفعل" : "This category already exists");
      return;
    }
    const updated = [...categories, trimmed];
    setCategories(updated);
    store.categories = updated;
    setNewCategory("");
    toast.success(language === "ar" ? "تم إضافة القسم بنجاح" : "Category added successfully");
  };

  const handleDeleteCategory = (catToDelete: string) => {
    if (confirm(language === "ar" ? `هل أنت متأكد من حذف قسم "${catToDelete}"؟` : `Are you sure you want to delete category "${catToDelete}"?`)) {
      const updated = categories.filter((c) => c !== catToDelete);
      setCategories(updated);
      store.categories = updated;
      toast.success(language === "ar" ? "تم حذف القسم بنجاح" : "Category deleted successfully");
    }
  };

  const handleMoveCategoryUp = (index: number) => {
    if (index === 0) return;
    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setCategories(updated);
    store.categories = updated;
  };

  const handleMoveCategoryDown = (index: number) => {
    if (index === categories.length - 1) return;
    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setCategories(updated);
    store.categories = updated;
  };

  // ----------------------------------------------------
  // Brand Handlers
  // ----------------------------------------------------
  const handleAddBrand = () => {
    if (!newBrandAr.trim() || !newBrandEn.trim()) {
      toast.error(language === "ar" ? "يرجى كتابة الاسم بالعربية والإنجليزية" : "Please fill both Arabic and English names");
      return;
    }
    const label = `${newBrandAr.trim()} ( ${newBrandEn.trim()} )`;
    const value = newBrandEn.trim();

    if (carBrands.some((b) => b.value.toLowerCase() === value.toLowerCase())) {
      toast.error(language === "ar" ? "هذه السيارة مسجلة بالفعل" : "This car brand already exists");
      return;
    }

    const updatedBrands = [...carBrands, { label, value }];
    setCarBrands(updatedBrands);
    store.carBrands = updatedBrands;
    setNewBrandAr("");
    setNewBrandEn("");
    toast.success(language === "ar" ? "تم إضافة الماركة بنجاح" : "Brand added successfully");
  };

  const handleDeleteBrand = (valueToDelete: string) => {
    if (confirm(language === "ar" ? "هل أنت متأكد من حذف هذه الماركة؟" : "Are you sure you want to delete this brand?")) {
      const updatedBrands = carBrands.filter((b) => b.value !== valueToDelete);
      setCarBrands(updatedBrands);
      store.carBrands = updatedBrands;
      toast.success(language === "ar" ? "تم حذف الماركة بنجاح" : "Brand deleted successfully");
    }
  };

  const handleResetBrands = () => {
    if (confirm(language === "ar" ? "هل أنت متأكد من استعادة القائمة الافتراضية للماركات؟" : "Are you sure you want to restore default car brands?")) {
      setCarBrands(DEFAULT_CAR_BRANDS);
      store.carBrands = DEFAULT_CAR_BRANDS;
      toast.success(language === "ar" ? "تم استعادة القائمة الافتراضية" : "Restored default car brands successfully");
    }
  };

  // ----------------------------------------------------
  // Backup & Restore Handlers
  // ----------------------------------------------------
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const data = await backendService.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `abosoodpos_backup_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(language === "ar" ? "تم تصدير النسخة الاحتياطية بنجاح" : "Backup exported successfully");
    } catch (err: any) {
      toast.error(language === "ar" ? `فشل التصدير: ${err.message}` : `Failed to export: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const confirmMsg = language === "ar"
      ? `تنبيه هام جداً:\nاستعادة نسخة احتياطية سيؤدي إلى مسح جميع البيانات الحالية بالكامل (المبيعات، المنتجات، العملاء، المستخدمين، الورديات، إلخ) واستبدالها ببيانات ملف النسخ الاحتياطي.\n\nهل أنت متأكد من الاستمرار في الاستعادة؟`
      : `CRITICAL WARNING:\nRestoring a backup will completely erase all current system database tables (Sales, Products, Customers, Users, Shifts, Logs, etc.) and replace them with the backup file data.\n\nAre you sure you want to proceed?`;

    if (!window.confirm(confirmMsg)) {
      e.target.value = ""; // reset input
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonText = event.target?.result as string;
        const backupData = JSON.parse(jsonText);

        await backendService.importBackup(backupData);

        toast.success(language === "ar" ? "تم استعادة البيانات بنجاح! جاري تحديث التطبيق..." : "Data restored successfully! Syncing app...");

        // Synchronize state from backend and refresh page
        await backendService.syncFromBackend();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        toast.error(language === "ar" ? `فشل الاستعادة: ${err.message}` : `Failed to restore: ${err.message}`);
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveAutoBackup = async () => {
    setIsSavingAutoBackup(true);
    try {
      const updatedSettings = {
        ...store.settings,
        autoBackupEnabled,
        autoBackupTime,
      };
      await backendService.saveSettings(updatedSettings);
      store.settings = updatedSettings;
      toast.success(
        language === "ar"
          ? "تم حفظ إعدادات النسخ الاحتياطية التلقائية بنجاح"
          : "Auto backup settings saved successfully"
      );
    } catch (err: any) {
      toast.error(
        language === "ar"
          ? `فشل الحفظ: ${err.message}`
          : `Failed to save: ${err.message}`
      );
    } finally {
      setIsSavingAutoBackup(false);
    }
  };

  return (
    <PageShell
      title={language === "ar" ? "إعدادات النظام والنسخ الاحتياطي" : "System Settings & Backup"}
      subtitle={language === "ar" ? "إدارة أقسام المنتجات، ماركات السيارات، والنسخ الاحتياطي لقاعدة البيانات" : "Manage product categories, car brands, and database backups"}
    >
      {/* Tab Switcher */}
      <div className="flex border-b border-border mb-6 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("categories")}
          className={cn(
            "pb-3 pt-1 px-2 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap",
            activeTab === "categories"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Layers className="h-4 w-4" />
          {language === "ar" ? "أقسام المنتجات" : "Product Categories"}
        </button>
        <button
          onClick={() => setActiveTab("brands")}
          className={cn(
            "pb-3 pt-1 px-2 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap",
            activeTab === "brands"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <CarFront className="h-4 w-4" />
          {language === "ar" ? "ماركات السيارات" : "Car Brands"}
        </button>
        <button
          onClick={() => setActiveTab("backup")}
          className={cn(
            "pb-3 pt-1 px-2 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap",
            activeTab === "backup"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Database className="h-4 w-4" />
          {language === "ar" ? "النسخ الاحتياطي والاستعادة" : "Backup & Restore"}
        </button>
      </div>

      {activeTab === "categories" && (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-5 items-start">
          {/* Add New Category Card */}
          <div className="md:col-span-2 space-y-4 order-1 md:order-2 animate-in fade-in duration-200">
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-4">
                <CardTitle className="text-foreground text-sm sm:text-base font-black">
                  {language === "ar" ? "إضافة قسم جديد" : "Add New Category"}
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs font-semibold">
                  {language === "ar" ? "أدخل اسم القسم (الفئة) لتصنيف المنتجات" : "Enter category name to classify products"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                <div className="space-y-1.5 text-right">
                  <Label className="text-[11px] sm:text-sm font-bold text-slate-600 dark:text-slate-400">{language === "ar" ? "اسم القسم" : "Category Name"}</Label>
                  <input
                    type="text"
                    placeholder="مثال: فلاتر، إكسسوارات"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-background border border-input rounded-md text-xs sm:text-sm text-right font-semibold"
                    dir="rtl"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCategory();
                    }}
                  />
                </div>
                <Button onClick={handleAddCategory} className="w-full h-9 sm:h-10 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm">
                  <Plus className="h-3.5 w-3.5" />
                  {language === "ar" ? "إضافة وحفظ" : "Add and Save"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Categories List */}
          <div className="md:col-span-3 space-y-4 order-2 md:order-1">
            <Card className="border border-border bg-card shadow-sm animate-in fade-in duration-200">
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="text-foreground text-sm sm:text-base font-black">
                  {language === "ar" ? "قائمة الأقسام الحالية" : "Active Categories"}
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs font-semibold">
                  {language === "ar"
                    ? "الأقسام المضافة تظهر في شاشة البيع وتصنيف المنتجات. يمكنك إعادة ترتيبها بالأسهم."
                    : "Categories shown on the POS sales screen and product catalog. Reorder them using the arrows."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={language === "ar" ? "البحث عن قسم..." : "Search categories..."}
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-background border border-input rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary text-right font-semibold"
                  />
                </div>

                {/* Categories Grid */}
                <div className="border border-border rounded-lg max-h-[280px] sm:max-h-[400px] overflow-y-auto divide-y divide-border">
                  {categories
                    .filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase()))
                    .map((c, idx) => (
                      <div key={c} className="flex items-center justify-between p-2 sm:p-3 bg-card hover:bg-accent/40 transition-colors">
                        <span className="font-semibold text-xs sm:text-sm text-right flex-1 pr-1">{c}</span>
                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={idx === 0}
                            onClick={() => handleMoveCategoryUp(idx)}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={idx === categories.length - 1}
                            onClick={() => handleMoveCategoryDown(idx)}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(c)}
                            className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  {categories.filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                    <div className="py-6 text-center text-muted-foreground text-xs sm:text-sm">
                      {language === "ar" ? "لا توجد أقسام تطابق البحث" : "No categories match your search"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "brands" && (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-5 items-start">
          {/* Add New Brand Card */}
          <div className="md:col-span-2 space-y-4 order-1 md:order-2 animate-in fade-in duration-200">
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-4">
                <CardTitle className="text-foreground text-sm sm:text-base font-black">
                  {language === "ar" ? "إضافة ماركة جديدة" : "Add New Brand"}
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs font-semibold">
                  {language === "ar" ? "أدخل اسم ماركة السيارة بالعربية والإنجليزية" : "Enter car brand name in Arabic and English"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                <div className="space-y-1.5 text-right">
                  <Label className="text-[11px] sm:text-sm font-bold text-slate-600 dark:text-slate-400">{language === "ar" ? "الاسم بالعربية" : "Name in Arabic"}</Label>
                  <input
                    type="text"
                    placeholder="مثال: تويوتا، هيونداي"
                    value={newBrandAr}
                    onChange={(e) => setNewBrandAr(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-background border border-input rounded-md text-xs sm:text-sm text-right font-semibold"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-1.5 text-right">
                  <Label className="text-[11px] sm:text-sm font-bold text-slate-600 dark:text-slate-400">{language === "ar" ? "الاسم بالإنجليزية" : "Name in English"}</Label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota, Hyundai"
                    value={newBrandEn}
                    onChange={(e) => setNewBrandEn(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-background border border-input rounded-md text-xs sm:text-sm text-left font-semibold"
                  />
                </div>
                <Button onClick={handleAddBrand} className="w-full h-9 sm:h-10 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm">
                  <Plus className="h-3.5 w-3.5" />
                  {language === "ar" ? "إضافة وحفظ" : "Add and Save"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Brand Listing */}
          <div className="md:col-span-3 space-y-4 order-2 md:order-1">
            <Card className="border border-border bg-card shadow-sm animate-in fade-in duration-200">
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="text-foreground text-sm sm:text-base font-black">
                  {language === "ar" ? "قائمة ماركات السيارات" : "Car Brands List"}
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs font-semibold">
                  {language === "ar"
                    ? "هذه القائمة تظهر للكاشير عند تسجيل العملاء أو إضافة مركبات جديدة"
                    : "This list is shown to cashiers when registering customers or adding new vehicles"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={language === "ar" ? "البحث عن ماركة..." : "Search brands..."}
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    className="w-full h-9 sm:h-10 px-3 bg-background border border-input rounded-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary text-right font-semibold"
                  />
                </div>

                {/* Brands Grid */}
                <div className="border border-border rounded-lg max-h-[280px] sm:max-h-[400px] overflow-y-auto divide-y divide-border">
                  {carBrands
                    .filter((b) =>
                      b.label.toLowerCase().includes(brandSearch.toLowerCase()) ||
                      b.value.toLowerCase().includes(brandSearch.toLowerCase())
                    )
                    .map((b) => (
                      <div key={b.value} className="flex items-center justify-between p-2 sm:p-3 bg-card hover:bg-accent/40 transition-colors">
                        <div className="flex flex-col text-right pr-1">
                          <span className="font-semibold text-xs sm:text-sm">{b.label}</span>
                          <span className="text-[10px] text-muted-foreground">Code/Value: {b.value}</span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteBrand(b.value)}
                          className="h-7 sm:h-8 px-2.5 sm:px-3 text-[10px] sm:text-xs shrink-0"
                        >
                          {language === "ar" ? "حذف" : "Delete"}
                        </Button>
                      </div>
                    ))}
                  {carBrands.filter((b) =>
                    b.label.toLowerCase().includes(brandSearch.toLowerCase()) ||
                    b.value.toLowerCase().includes(brandSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="py-6 text-center text-muted-foreground text-xs sm:text-sm">
                      {language === "ar" ? "لا توجد ماركات تطابق البحث" : "No car brands match your search"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "backup" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 animate-in fade-in duration-200">
            {/* Export Card */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground text-sm sm:text-base font-black flex items-center gap-2">
                  <Download className="h-5 w-5 text-emerald-600" />
                  {language === "ar" ? "تصدير نسخة احتياطية من البيانات" : "Export System Backup"}
                </CardTitle>
                <CardDescription className="text-xs font-semibold">
                  {language === "ar"
                    ? "تنزيل ملف يحتوي على كامل بيانات النظام الحالية (الفواتير، المنتجات، العملاء، الإعدادات، والورديات) لحفظها بأمان على جهاز الكمبيوتر الخاص بك."
                    : "Download a file containing all system data (receipts, products, customers, settings, shifts) to save safely on your computer."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-3 sm:p-4 text-right">
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed font-semibold">
                    {language === "ar"
                      ? "💡 نصيحة أمان: يُنصح بشدة بتصدير وحفظ نسخة احتياطية من مبيعاتك وبياناتك أسبوعياً أو شهرياً للرجوع إليها في أي وقت وتجنب فقدان البيانات."
                      : "💡 Security Tip: It is highly recommended to export and save a backup of your data weekly or monthly to avoid data loss."}
                  </p>
                </div>
                <Button
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="w-full h-11 text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-md"
                >
                  {isExporting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {language === "ar" ? "توليد وتنزيل النسخة الاحتياطية" : "Generate & Download Backup"}
                </Button>
              </CardContent>
            </Card>

            {/* Import Card */}
            <Card className="border border-rose-500/20 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-rose-600 text-sm sm:text-base font-black flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {language === "ar" ? "استعادة نسخة احتياطية من جهازك" : "Restore System Backup"}
                </CardTitle>
                <CardDescription className="text-xs font-semibold">
                  {language === "ar"
                    ? "رفع واستعادة قاعدة البيانات من ملف نسخة احتياطية JSON تم تصديره مسبقاً. سيتم استبدال جميع البيانات الحالية بالكامل."
                    : "Upload and restore database tables from a previously exported JSON backup file. All current data will be overwritten."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-3 sm:p-4 text-right">
                  <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed font-semibold">
                    {language === "ar"
                      ? "⚠️ تحذير خطير: عملية استعادة البيانات لا يمكن التراجع عنها. ستقوم بمسح وحذف كامل بيانات النظام الحالية (الفواتير، العملاء، المنتجات، إلخ) وتعويضها بالملف المختار."
                      : "⚠️ Critical Warning: Restoring database is irreversible. It will wipe out all current files & databases (invoices, products, clients) and replace them with the selected file."}
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    disabled={isImporting}
                    id="backup-upload-input"
                    className="hidden"
                  />
                  <Label
                    htmlFor="backup-upload-input"
                    className={cn(
                      "w-full h-11 rounded-lg border border-dashed border-rose-300 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-700 dark:text-rose-400 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm font-black transition-all shadow-sm",
                      isImporting && "opacity-50 pointer-events-none"
                    )}
                  >
                    {isImporting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {language === "ar" ? "اختر ملف النسخة الاحتياطية (.json)" : "Choose Backup File (.json)"}
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Auto Backup Configuration Card */}
          <Card className="border border-border bg-card shadow-sm animate-in fade-in duration-200">
            <CardHeader>
              <CardTitle className="text-foreground text-sm sm:text-base font-black flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                {language === "ar" ? "إعدادات النسخ الاحتياطي التلقائي اليومي" : "Daily Auto Backup Settings"}
              </CardTitle>
              <CardDescription className="text-xs font-semibold">
                {language === "ar"
                  ? "تفعيل خيار النسخ الاحتياطي التلقائي ليقوم النظام بتنزيل نسخة احتياطية من البيانات تلقائياً كل يوم عند توقيت محدد."
                  : "Enable auto-backup to let the system automatically trigger and download a backup file every day at a specific time."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Enable toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-border">
                  <div className="space-y-0.5 text-right">
                    <Label className="text-sm font-black text-foreground">
                      {language === "ar" ? "تفعيل النسخ الاحتياطي التلقائي" : "Enable Auto Backup"}
                    </Label>
                    <p className="text-xs text-muted-foreground font-semibold">
                      {language === "ar" ? "تشغيل أو إيقاف النسخ الاحتياطي التلقائي اليومي" : "Turn daily automatic backup download on or off"}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoBackupEnabled}
                      onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {/* Time picker */}
                <div className="flex flex-col justify-center p-4 bg-muted/40 rounded-lg border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-black text-foreground">
                      {language === "ar" ? "توقيت النسخ الاحتياطي اليومي" : "Daily Backup Time"}
                    </Label>
                    <span className="text-[10px] text-amber-600 font-bold px-2 py-0.5 bg-amber-500/10 rounded-full">
                      {autoBackupTime}
                    </span>
                  </div>
                  <input
                    type="time"
                    disabled={!autoBackupEnabled}
                    value={autoBackupTime}
                    onChange={(e) => setAutoBackupTime(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-xs sm:text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveAutoBackup}
                  disabled={isSavingAutoBackup}
                  className="w-full sm:w-auto px-6 h-11 text-xs sm:text-sm font-black bg-primary hover:bg-primary/95 flex items-center justify-center gap-2 shadow-md"
                >
                  {isSavingAutoBackup ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  {language === "ar" ? "حفظ إعدادات التوقيت التلقائي" : "Save Auto-Backup Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
