import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, Star } from "lucide-react";
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

const CATEGORIES: ProductCategory[] = [
  "Engine Oil",
  "Oil Filter",
  "Air Filter",
  "Cabin Filter",
  "Fuel Filter",
  "Additives",
  "Accessories",
];

function ProductsPage() {
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useMemo(() => productService.search(query), [query, tick]);
  const refresh = () => setTick((t) => t + 1);

  return (
    <PageShell
      title="المنتجات والمخزن"
      subtitle={`${list.length} منتج مسجل بالكامل`}
      actions={
        <Button size="lg" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-5 w-5" /> إضافة منتج جديد
        </Button>
      }
    >
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
              <TableRow key={p.id}>
                <TableCell className="font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>{p.name}</span>
                    {p.isPopular && (
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" title="شائع / سريع الوصول" />
                    )}
                  </div>
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
                        : "إكسسوارات"}
                    </span>
                    {p.category === "Engine Oil" && p.oilMileage && (
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
                <TableCell className="text-right">{p.stock}</TableCell>
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
  });

  useEffect(() => {
    if (product) {
      const { id: _id, ...rest } = product;
      setForm({
        ...rest,
        oilMileage: rest.oilMileage || undefined,
        isPopular: rest.isPopular || false,
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
    if (cleanForm.category !== "Engine Oil") {
      delete cleanForm.oilMileage;
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
                    oilMileage: cat === "Engine Oil" ? 5000 : undefined,
                  });
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
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
                        : "إكسسوارات"}
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

          {form.category === "Engine Oil" && (
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
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </div>
          </div>

          {/* Popular toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/20 mt-2">
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
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
