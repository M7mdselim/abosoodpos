import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import { authService } from "@/services/authService";
import { store, DEFAULT_CAR_BRANDS } from "@/services/store";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, ArrowUp, ArrowDown, Plus, Layers, CarFront } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"categories" | "brands">("categories");

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
    const label = `${newBrandAr.trim()} (${newBrandEn.trim()})`;
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

  return (
    <PageShell
      title={language === "ar" ? "إعدادات الأقسام والماركات" : "System Categories & Brands"}
      subtitle={language === "ar" ? "إدارة أقسام المنتجات وماركات السيارات الفعالة بالنظام" : "Manage system product categories and active car brands"}
    >
      {/* Tab Switcher */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("categories")}
          className={cn(
            "pb-3 pt-1 px-2 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-initial",
            activeTab === "categories"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Layers className="h-4 w-4" />
          {language === "ar" ? "أقسام المنتجات (الفئات)" : "Product Categories"}
        </button>
        <button
          onClick={() => setActiveTab("brands")}
          className={cn(
            "pb-3 pt-1 px-2 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-initial",
            activeTab === "brands"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <CarFront className="h-4 w-4" />
          {language === "ar" ? "ماركات السيارات" : "Car Brands"}
        </button>
      </div>

      {activeTab === "categories" ? (
        <div className="grid gap-6 md:grid-cols-5 items-start">
          {/* Add New Category Card (Columns 4-5 on desktop, order-1/top on mobile) */}
          <div className="md:col-span-2 space-y-4 order-1 md:order-2 animate-in fade-in duration-200">
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground text-base">
                  {language === "ar" ? "إضافة قسم جديد" : "Add New Category"}
                </CardTitle>
                <CardDescription>
                  {language === "ar" ? "أدخل اسم القسم (الفئة) لتصنيف المنتجات" : "Enter category name to classify products"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-right">
                  <Label>{language === "ar" ? "اسم القسم" : "Category Name"}</Label>
                  <input
                    type="text"
                    placeholder="مثال: فلاتر، إكسسوارات"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm text-right"
                    dir="rtl"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCategory();
                    }}
                  />
                </div>
                <Button onClick={handleAddCategory} className="w-full h-10 font-bold flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  {language === "ar" ? "إضافة وحفظ" : "Add and Save"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Categories List (Columns 1-3 on desktop, order-2/bottom on mobile) */}
          <div className="md:col-span-3 space-y-4 order-2 md:order-1">
            <Card className="border border-border bg-card shadow-sm animate-in fade-in duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground text-base">
                  {language === "ar" ? "قائمة الأقسام الحالية" : "Active Categories"}
                </CardTitle>
                <CardDescription>
                  {language === "ar"
                    ? "الأقسام المضافة تظهر في شاشة البيع وتصنيف المنتجات. يمكنك إعادة ترتيبها بالأسهم."
                    : "Categories shown on the POS sales screen and product catalog. Reorder them using the arrows."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={language === "ar" ? "البحث عن قسم..." : "Search categories..."}
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  />
                </div>

                {/* Categories Grid */}
                <div className="border border-border rounded-lg max-h-[400px] overflow-y-auto divide-y divide-border">
                  {categories
                    .filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase()))
                    .map((c, idx) => (
                      <div key={c} className="flex items-center justify-between p-3 bg-card hover:bg-accent/40 transition-colors">
                        <span className="font-semibold text-sm text-right flex-1">{c}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={idx === 0}
                            onClick={() => handleMoveCategoryUp(idx)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={idx === categories.length - 1}
                            onClick={() => handleMoveCategoryDown(idx)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(c)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  {categories.filter((c) => c.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      {language === "ar" ? "لا توجد أقسام تطابق البحث" : "No categories match your search"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-5 items-start">
          {/* Add New Brand Card (Columns 4-5 on desktop, order-1/top on mobile) */}
          <div className="md:col-span-2 space-y-4 order-1 md:order-2 animate-in fade-in duration-200">
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-foreground text-base">
                  {language === "ar" ? "إضافة ماركة جديدة" : "Add New Brand"}
                </CardTitle>
                <CardDescription>
                  {language === "ar" ? "أدخل اسم ماركة السيارة بالعربية والإنجليزية" : "Enter car brand name in Arabic and English"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-right">
                  <Label>{language === "ar" ? "الاسم بالعربية" : "Name in Arabic"}</Label>
                  <input
                    type="text"
                    placeholder="مثال: تويوتا، هيونداي"
                    value={newBrandAr}
                    onChange={(e) => setNewBrandAr(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2 text-right">
                  <Label>{language === "ar" ? "الاسم بالإنجليزية" : "Name in English"}</Label>
                  <input
                    type="text"
                    placeholder="e.g. Toyota, Hyundai"
                    value={newBrandEn}
                    onChange={(e) => setNewBrandEn(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm text-left"
                  />
                </div>
                <Button onClick={handleAddBrand} className="w-full h-10 font-bold flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  {language === "ar" ? "إضافة وحفظ" : "Add and Save"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Brand Listing (Columns 1-3 on desktop, order-2/bottom on mobile) */}
          <div className="md:col-span-3 space-y-4 order-2 md:order-1">
            <Card className="border border-border bg-card shadow-sm animate-in fade-in duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground text-base">
                  {language === "ar" ? "قائمة ماركات السيارات" : "Car Brands List"}
                </CardTitle>
                <CardDescription>
                  {language === "ar"
                    ? "هذه القائمة تظهر للكاشير عند تسجيل العملاء أو إضافة مركبات جديدة"
                    : "This list is shown to cashiers when registering customers or adding new vehicles"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={language === "ar" ? "البحث عن ماركة..." : "Search brands..."}
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  />
                </div>

                {/* Brands Grid */}
                <div className="border border-border rounded-lg max-h-[400px] overflow-y-auto divide-y divide-border">
                  {carBrands
                    .filter((b) =>
                      b.label.toLowerCase().includes(brandSearch.toLowerCase()) ||
                      b.value.toLowerCase().includes(brandSearch.toLowerCase())
                    )
                    .map((b) => (
                      <div key={b.value} className="flex items-center justify-between p-3 bg-card hover:bg-accent/40 transition-colors">
                        <div className="flex flex-col text-right">
                          <span className="font-semibold text-sm">{b.label}</span>
                          <span className="text-xs text-muted-foreground">Code/Value: {b.value}</span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteBrand(b.value)}
                          className="h-8 px-3 text-xs"
                        >
                          {language === "ar" ? "حذف" : "Delete"}
                        </Button>
                      </div>
                    ))}
                  {carBrands.filter((b) =>
                    b.label.toLowerCase().includes(brandSearch.toLowerCase()) ||
                    b.value.toLowerCase().includes(brandSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      {language === "ar" ? "لا توجد ماركات تطابق البحث" : "No car brands match your search"}
                    </div>
                  )}
                </div>

                <div className="flex justify-start">
                  <Button variant="outline" size="sm" onClick={handleResetBrands} className="text-xs text-destructive hover:bg-destructive/10 border-destructive/20">
                    {language === "ar" ? "استعادة القائمة الافتراضية" : "Restore Defaults"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageShell>
  );
}
