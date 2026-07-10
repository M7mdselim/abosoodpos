import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, Star, Package, AlertCircle, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productService } from "@/services/productService";
import type { Product, ProductCategory } from "@/types";
import { formatCurrency } from "@/utils/format";

import { authService } from "@/services/authService";

export const Route = createFileRoute("/products")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    const session = authService.getSession();
    if (session?.role !== "admin" && session?.role !== "developer") {
      throw redirect({ to: "/pos" });
    }
  },
  component: ProductsPage,
});

import { store } from "@/services/store";

function ProductsPage() {
  const [categories, setCategories] = useState<string[]>(() => store.categories);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "low_stock" | "out_of_stock">("all");

  const allProducts = useMemo(() => productService.list(), [tick]);
  
  const outOfStockCount = useMemo(() => {
    return allProducts.filter((p) => !p.isUnlimited && p.stock <= 0).length;
  }, [allProducts]);

  const lowStockCount = useMemo(() => {
    return allProducts.filter((p) => !p.isUnlimited && p.stock > 0 && p.stock <= 5).length;
  }, [allProducts]);

  const list = useMemo(() => {
    let searched = productService.search(query);
    if (filterType === "out_of_stock") {
      searched = searched.filter((p) => !p.isUnlimited && p.stock <= 0);
    } else if (filterType === "low_stock") {
      searched = searched.filter((p) => !p.isUnlimited && p.stock > 0 && p.stock <= 5);
    }
    return searched;
  }, [query, filterType, tick]);

  const refresh = () => setTick((t) => t + 1);

  return (
    <PageShell
      title="المنتجات والمخزن"
      subtitle={`${list.length} منتج مسجل بالكامل`}
      actions={
        <div className="flex gap-2">
          <Button size="lg" variant="outline" onClick={() => setManageCategoriesOpen(true)}>
            <Package className="mr-2 h-5 w-5" /> إدارة الأقسام
          </Button>
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-5 w-5" /> إضافة منتج جديد
          </Button>
        </div>
      }
    >
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Total Products Card */}
        <button
          onClick={() => setFilterType("all")}
          className={`flex items-center justify-between p-4 rounded-xl border transition-all text-right ${
            filterType === "all"
              ? "bg-primary/10 border-primary shadow-sm scale-[1.02]"
              : "bg-card border-border hover:border-muted-foreground/30 hover:shadow-xs"
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground block">إجمالي المنتجات</span>
            <span className="text-2xl font-black text-foreground">{allProducts.length}</span>
          </div>
          <div className={`p-3 rounded-lg ${filterType === "all" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
            <Package className="h-5 w-5" />
          </div>
        </button>

        {/* Low Stock Card */}
        <button
          onClick={() => setFilterType("low_stock")}
          className={`flex items-center justify-between p-4 rounded-xl border transition-all text-right ${
            filterType === "low_stock"
              ? "bg-amber-500/10 border-amber-500 shadow-sm scale-[1.02]"
              : "bg-card border-border hover:border-amber-500/30 hover:shadow-xs"
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">منتجات منخفضة المخزون</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{lowStockCount}</span>
          </div>
          <div className={`p-3 rounded-lg ${filterType === "low_stock" ? "bg-amber-500/20 text-amber-500" : "bg-amber-500/10 text-amber-500/80"}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </button>

        {/* Out of Stock Card */}
        <button
          onClick={() => setFilterType("out_of_stock")}
          className={`flex items-center justify-between p-4 rounded-xl border transition-all text-right ${
            filterType === "out_of_stock"
              ? "bg-destructive/10 border-destructive shadow-sm scale-[1.02]"
              : "bg-card border-border hover:border-destructive/30 hover:shadow-xs"
          }`}
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-destructive block">منتجات نفذت الكمية</span>
            <span className="text-2xl font-black text-destructive">{outOfStockCount}</span>
          </div>
          <div className={`p-3 rounded-lg ${filterType === "out_of_stock" ? "bg-destructive/20 text-destructive" : "bg-destructive/10 text-destructive/80"}`}>
            <AlertCircle className="h-5 w-5" />
          </div>
        </button>
      </div>

      {filterType !== "all" && (
        <div className="mb-4 flex items-center justify-between bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400">
          <span>
            {filterType === "low_stock" 
              ? "يتم الآن عرض المنتجات ذات المخزون المنخفض فقط (5 قطع أو أقل)." 
              : "يتم الآن عرض المنتجات التي نفذت كميتها فقط."}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setFilterType("all")}
            className="h-7 px-2 font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
          >
            إلغاء التصفية
          </Button>
        </div>
      )}

      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم، الماركة، أو الباركود..."
          className="h-12 pl-10"
        />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المنتج</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الفئة</TableHead>
              <TableHead>الماركة</TableHead>
              <TableHead>الباركود</TableHead>
              <TableHead className="text-right">سعر الشراء</TableHead>
              <TableHead className="text-right">سعر البيع</TableHead>
              <TableHead className="text-right">الكمية بالمخزن</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((p) => (
              <TableRow key={p.id} className={p.isActive === false ? "opacity-60 bg-muted/20" : ""}>
                <TableCell className="font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>{p.name}</span>
                    {p.isPopular && (
                      <span title="شائع / سريع الوصول">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    p.isActive !== false
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-muted text-muted-foreground border border-muted"
                  }`}>
                    {p.isActive !== false ? "نشط" : "غير نشط"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span>
                      {p.category === "Engine Oil"
                        ? "زيت محرك"
                        : p.category === "Oil Filter"
                        ? "فلتر زيت"
                        : p.category === "Air Filter"
                        ? "فلتر هواء"
                        : p.category === "Cabin Filter"
                        ? "فلتر تكييف"
                        : p.category === "Fuel Filter"
                        ? "فلتر بنزين"
                        : p.category === "Additives"
                        ? "إضافات"
                        : p.category}
                    </span>
                    {(p.category === "Engine Oil" || p.category === "زيوت محركات") && p.oilMileage && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-extrabold uppercase">
                        {p.oilMileage.toLocaleString()} KM
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{p.brand}</TableCell>
                <TableCell className="font-mono text-xs">{p.barcode}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.buyingPrice)}</TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {formatCurrency(p.sellingPrice)}
                </TableCell>
                <TableCell className="text-right">
                  {p.isUnlimited ? (
                    <span className="text-muted-foreground font-semibold">غير محدود</span>
                  ) : (
                    <span className={`font-bold ${
                      p.stock === 0 ? "text-destructive" : p.stock <= 5 ? "text-amber-600 dark:text-amber-400" : ""
                    }`}>
                      {p.stock}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("هل تريد بالتأكيد حذف هذا المنتج؟")) {
                          productService.remove(p.id);
                          toast.success("تم حذف المنتج بنجاح.");
                          refresh();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProductDialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        product={editing}
        onSaved={refresh}
      />

      <ManageCategoriesDialog
        open={manageCategoriesOpen}
        onClose={() => setManageCategoriesOpen(false)}
        categories={categories}
        onUpdate={(newCategories) => {
          store.categories = newCategories;
          setCategories(newCategories);
        }}
      />
    </PageShell>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: Product | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Omit<Product, "id">>({
    name: "",
    brand: "",
    category: "Engine Oil",
    barcode: "",
    buyingPrice: 0,
    sellingPrice: 0,
    stock: 0,
    oilMileage: undefined,
    isPopular: false,
    isUnlimited: false,
    isActive: true,
  });

  const categories = store.categories;

  useEffect(() => {
    if (product) {
      const { id: _id, ...rest } = product;
      setForm({
        ...rest,
        oilMileage: rest.oilMileage || undefined,
        isPopular: rest.isPopular || false,
        isUnlimited: rest.isUnlimited || false,
        isActive: rest.isActive !== false,
      });
    } else {
      setForm({
        name: "",
        brand: "",
        category: "Engine Oil",
        barcode: "",
        buyingPrice: 0,
        sellingPrice: 0,
        stock: 0,
        oilMileage: undefined,
        isPopular: false,
        isUnlimited: false,
        isActive: true,
      });
    }
  }, [product, open]);

  function save() {
    if (!form.name || !form.brand) {
      toast.error("يرجى ملء اسم المنتج والماركة");
      return;
    }
    // Clean up mileage if not oil product
    const cleanForm = { ...form };
    if (cleanForm.category !== "Engine Oil" && cleanForm.category !== "زيوت محركات") {
      delete cleanForm.oilMileage;
    }
    if (cleanForm.isUnlimited) {
      cleanForm.stock = 0;
    }

    if (product) {
      productService.update(product.id, cleanForm);
      toast.success("تم تعديل المنتج بنجاح.");
    } else {
      productService.create(cleanForm);
      toast.success("تم إضافة المنتج بنجاح.");
    }
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? "تعديل بيانات المنتج" : "إضافة منتج جديد"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2 text-left">
          <div>
            <Label>اسم المنتج</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الفئة</Label>
              <Select
                value={form.category}
                onValueChange={(v) => {
                  const cat = v as ProductCategory;
                  setForm({
                    ...form,
                    category: cat,
                    oilMileage: (cat === "Engine Oil" || cat === "زيوت محركات") ? 5000 : undefined,
                  });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "Engine Oil"
                        ? "زيت محرك"
                        : c === "Oil Filter"
                        ? "فلتر زيت"
                        : c === "Air Filter"
                        ? "فلتر هواء"
                        : c === "Cabin Filter"
                        ? "فلتر تكييف"
                        : c === "Fuel Filter"
                        ? "فلتر بنزين"
                        : c === "Additives"
                        ? "إضافات"
                        : c === "Accessories"
                        ? "إكسسوارات"
                        : c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الماركة</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
          </div>

          {(form.category === "Engine Oil" || form.category === "زيوت محركات") && (
            <div>
              <Label>صلاحية الزيت (المسافة بالكم)</Label>
              <Select
                value={form.oilMileage ? String(form.oilMileage) : "none"}
                onValueChange={(v) =>
                  setForm({ ...form, oilMileage: v === "none" ? undefined : Number(v) })
                }
              >
                <SelectTrigger><SelectValue placeholder="اختر صلاحية الزيت..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">غير محدد (يستخدم الحساب الافتراضي)</SelectItem>
                  <SelectItem value="5000">5,000 كم</SelectItem>
                  <SelectItem value="10000">10,000 كم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>الباركود</Label>
            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>سعر الشراء</Label>
              <Input type="number" value={form.buyingPrice} onChange={(e) => setForm({ ...form, buyingPrice: Number(e.target.value) })} />
            </div>
            <div>
              <Label>سعر البيع</Label>
              <Input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} />
            </div>
            <div>
              <Label>الكمية المتاحة</Label>
              <Input
                type="number"
                value={form.stock}
                disabled={form.isUnlimited}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Unlimited Stock toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20 mt-2">
            <div className="space-y-0.5">
              <Label className="font-semibold text-sm">مخزون غير محدود / خدمات</Label>
              <span className="text-xs text-muted-foreground block">
                قم بتفعيل هذا الخيار للمنتجات أو الخدمات التي لا تحتاج لمتابعة كمية مخزونها.
              </span>
            </div>
            <Switch
              checked={form.isUnlimited || false}
              onCheckedChange={(checked) => setForm({ ...form, isUnlimited: checked, stock: checked ? 0 : form.stock })}
            />
          </div>

          {/* Popular toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
            <div className="space-y-0.5">
              <Label className="font-semibold text-sm">منتج شائع / سريع الوصول</Label>
              <span className="text-xs text-muted-foreground block">
                سيظهر هذا المنتج في شريط المنتجات الشائعة للكاشير للوصول السريع بدون بحث.
              </span>
            </div>
            <Switch
              checked={form.isPopular || false}
              onCheckedChange={(checked) => setForm({ ...form, isPopular: checked })}
            />
          </div>

          {/* Active Status toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20">
            <div className="space-y-0.5">
              <Label className="font-semibold text-sm">حالة المنتج (نشط / معطل)</Label>
              <span className="text-xs text-muted-foreground block">
                عند إلغاء تفعيل هذا الخيار، لن يظهر هذا المنتج في شاشة الكاشير (نقطة البيع) ولن يكون متاحاً للبيع.
              </span>
            </div>
            <Switch
              checked={form.isActive !== false}
              onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ManageCategoriesDialogProps {
  open: boolean;
  onClose: () => void;
  categories: string[];
  onUpdate: (cats: string[]) => void;
}

function ManageCategoriesDialog({
  open,
  onClose,
  categories,
  onUpdate,
}: ManageCategoriesDialogProps) {
  const [newCat, setNewCat] = useState("");

  const handleAdd = () => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("هذا القسم موجود بالفعل");
      return;
    }
    const updated = [...categories, trimmed];
    onUpdate(updated);
    setNewCat("");
    toast.success("تم إضافة القسم بنجاح");
  };

  const handleDelete = (catToDelete: string) => {
    if (confirm(`هل أنت متأكد من حذف قسم "${catToDelete}"؟`)) {
      const updated = categories.filter((c) => c !== catToDelete);
      onUpdate(updated);
      toast.success("تم حذف القسم بنجاح");
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onUpdate(updated);
  };

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onUpdate(updated);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-4">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-right">إدارة الأقسام (الفئات)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 my-2 text-right">
          {/* Add Category Form */}
          <div className="flex gap-2">
            <Button onClick={handleAdd}>إضافة قسم</Button>
            <Input
              placeholder="اسم القسم الجديد..."
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              className="text-right"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
            />
          </div>

          {/* List of Categories */}
          <div className="border border-border rounded-lg max-h-60 overflow-y-auto divide-y divide-border">
            {categories.map((c, idx) => (
              <div key={c} className="flex items-center justify-between p-2.5 hover:bg-muted/30">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(c)}
                    title="حذف القسم"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted"
                    disabled={idx === 0}
                    onClick={() => moveUp(idx)}
                    title="تحريك لأعلى"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted"
                    disabled={idx === categories.length - 1}
                    onClick={() => moveDown(idx)}
                    title="تحريك لأسفل"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {c === "Engine Oil"
                    ? "زيت محرك"
                    : c === "Oil Filter"
                    ? "فلتر زيت"
                    : c === "Air Filter"
                    ? "فلتر هواء"
                    : c === "Cabin Filter"
                    ? "فلتر تكييف"
                    : c === "Fuel Filter"
                    ? "فلتر بنزين"
                    : c === "Additives"
                    ? "إضافات"
                    : c === "Accessories"
                    ? "إكسسوارات"
                    : c}
                  {c !== "Engine Oil" &&
                    c !== "Oil Filter" &&
                    c !== "Air Filter" &&
                    c !== "Cabin Filter" &&
                    c !== "Fuel Filter" &&
                    c !== "Additives" &&
                    c !== "Accessories" && (
                      <span className="text-[10px] text-muted-foreground mr-1.5">(مخصص)</span>
                    )}
                </span>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground">لا توجد أقسام مضافة</div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
