import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Search, Eye, Pencil, Trash2, Plus, UserPlus, Car } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { customerService } from "@/services/customerService";
import { saleService } from "@/services/saleService";
import type { Customer, CustomerCar } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/customers")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    const session = authService.getSession();
    if (session?.role !== "admin" && session?.role !== "developer") {
      throw redirect({ to: "/pos" });
    }
  },
  component: CustomersPage,
});

function CustomersPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

  const list = useMemo(() => customerService.search(query), [query, tick]);

  const handleDelete = (c: Customer) => {
    if (confirm(`هل أنت متأكد من حذف العميل "${c.name}" نهائياً من النظام؟`)) {
      customerService.remove(c.id);
      toast.success("تم حذف العميل بنجاح.");
      if (selected?.id === c.id) setSelected(null);
      refresh();
    }
  };

  return (
    <PageShell
      title="إدارة العملاء والسيارات"
      subtitle={`${list.length} من إجمالي ${customerService.list().length} عميل مسجل`}
    >
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم، رقم الجوال، أو ماركة السيارة..."
          className="h-12 pl-10 text-base"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table className="min-w-[850px]">
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>رقم الجوال</TableHead>
              <TableHead>السيارات المسجلة</TableHead>
              <TableHead>آخر زيارة</TableHead>
              <TableHead className="text-right">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => {
              const vehicleString = c.cars && c.cars.length > 0
                ? c.cars.map((car) => `${car.brand} ${car.model}`).join(" / ")
                : `${c.carBrand} ${c.carModel}`;

              return (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold text-foreground">{c.name}</TableCell>
                  <TableCell dir="ltr" className="text-right font-mono">{c.phone}</TableCell>
                  <TableCell className="max-w-xs truncate font-medium text-xs text-muted-foreground" title={vehicleString}>
                    {vehicleString}
                  </TableCell>
                  <TableCell className="text-xs">{c.lastServiceDate ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setSelected(c)}>
                        <Eye className="h-3.5 w-3.5" /> معاينة
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingCustomer(c)} title="تعديل">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c)} title="حذف">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  لم يتم العثور على عملاء مطابقتين للبحث
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CustomerDetails
        customer={selected}
        onClose={() => setSelected(null)}
        onEdit={(c) => {
          setSelected(null);
          setEditingCustomer(c);
        }}
        onDelete={(c) => {
          handleDelete(c);
        }}
      />

      <EditCustomerDialog
        customer={editingCustomer}
        open={!!editingCustomer}
        onOpenChange={(o) => !o && setEditingCustomer(null)}
        onSaved={refresh}
      />
    </PageShell>
  );
}

function EditCustomerDialog({
  customer,
  open,
  onOpenChange,
  onSaved,
}: {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  if (!customer) return null;

  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [notes, setNotes] = useState(customer.notes || "");
  const [cars, setCars] = useState<CustomerCar[]>(() => customer.cars || [
    {
      id: "default",
      brand: customer.carBrand || "",
      model: customer.carModel || "",
      currentKm: customer.currentKm || 0,
    }
  ]);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setNotes(customer.notes || "");
      setCars(customer.cars && customer.cars.length > 0 ? customer.cars : [
        {
          id: "default",
          brand: customer.carBrand || "",
          model: customer.carModel || "",
          currentKm: customer.currentKm || 0,
        }
      ]);
    }
  }, [customer, open]);

  const handleUpdateCar = (id: string, field: keyof CustomerCar, value: any) => {
    setCars((prev) =>
      prev.map((car) => (car.id === id ? { ...car, [field]: value } : car))
    );
  };

  const handleAddCar = () => {
    setCars((prev) => [
      ...prev,
      {
        id: `car_${Date.now()}`,
        brand: "",
        model: "",
        currentKm: 0,
      },
    ]);
  };

  const handleRemoveCar = (id: string) => {
    if (cars.length <= 1) {
      toast.error("يجب الإبقاء على سيارة واحدة على الأقل للعميل");
      return;
    }
    setCars((prev) => prev.filter((car) => car.id !== id));
  };

  const handleSave = () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("يرجى إدخال اسم العميل ورقم الجوال");
      return;
    }

    customerService.update(customer.id, {
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      cars: cars,
    });

    toast.success("تم تعديل بيانات العميل بنجاح");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>تعديل بيانات العميل: {customer.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 text-right">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">اسم العميل</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">رقم الهاتف</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-muted-foreground">ملاحظات العميل</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-xs" />
          </div>

          {/* Cars management */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-muted-foreground">السيارات المسجلة للعميل ({cars.length})</Label>
              <Button type="button" size="sm" variant="outline" onClick={handleAddCar} className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" /> إضافة سيارة أخرى
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {cars.map((car, idx) => (
                <div key={car.id} className="p-3 border border-border rounded-lg bg-card space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">سيارة #{idx + 1}</span>
                    {cars.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveCar(car.id)}
                        className="h-6 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" /> حذف
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">الماركة</Label>
                      <Input
                        value={car.brand}
                        onChange={(e) => handleUpdateCar(car.id, "brand", e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">الطراز (الموديل)</Label>
                      <Input
                        value={car.model}
                        onChange={(e) => handleUpdateCar(car.id, "model", e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">العداد الحالي (كم)</Label>
                      <Input
                        type="number"
                        value={car.currentKm}
                        onChange={(e) => handleUpdateCar(car.id, "currentKm", Number(e.target.value) || 0)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground font-bold">حفظ التعديلات</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetails({
  customer,
  onClose,
  onEdit,
  onDelete,
}: {
  customer: Customer | null;
  onClose: () => void;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}) {
  if (!customer) return null;
  const history = saleService.byCustomer(customer.id);

  return (
    <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right flex flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="text-base font-bold">{customer.name}</DialogTitle>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => onEdit(customer)}>
              <Pencil className="h-3.5 w-3.5" /> تعديل البيانات
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={() => onDelete(customer)}>
              <Trash2 className="h-3.5 w-3.5" /> حذف
            </Button>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6 pt-2">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              بيانات العميل
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm bg-accent/40 p-3 rounded-lg border border-border">
              <Info label="رقم الجوال" value={customer.phone} />
              <Info label="إجمالي الفواتير والزيارات" value={`${history.length} زيارة`} />
              {customer.notes && <Info label="ملاحظات" value={customer.notes} />}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              السيارات المسجلة ({customer.cars?.length || 1})
            </h3>
            <div className="rounded-lg border border-border bg-background overflow-x-auto">
              <Table className="min-w-[650px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>الماركة</TableHead>
                    <TableHead>الموديل</TableHead>
                    <TableHead>العداد الحالي</TableHead>
                    <TableHead>آخر زيارة</TableHead>
                    <TableHead>آخر زيت مستخدم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(customer.cars || [
                    {
                      id: "default",
                      brand: customer.carBrand,
                      model: customer.carModel,
                      currentKm: customer.currentKm,
                      lastServiceDate: customer.lastServiceDate,
                      lastOilUsed: customer.lastOilUsed,
                    },
                  ]).map((car) => (
                    <TableRow key={car.id}>
                      <TableCell className="font-semibold">{car.brand}</TableCell>
                      <TableCell>{car.model}</TableCell>
                      <TableCell>{car.currentKm.toLocaleString()} كم</TableCell>
                      <TableCell>{car.lastServiceDate ?? "—"}</TableCell>
                      <TableCell className="text-xs">{car.lastOilUsed ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              سجل الزيارات والفواتير ({history.length})
            </h3>
            <div className="max-h-60 overflow-auto rounded-lg border border-border">
              <Table className="min-w-[650px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>السيارة</TableHead>
                    <TableHead>العداد</TableHead>
                    <TableHead>الزيت المستخدم</TableHead>
                    <TableHead>المنتجات</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{formatDateTime(s.date)}</TableCell>
                      <TableCell className="font-medium text-xs">
                        {s.carBrand} {s.carModel}
                      </TableCell>
                      <TableCell>{s.km.toLocaleString()} كم</TableCell>
                      <TableCell className="text-xs">{s.oilUsed ?? "—"}</TableCell>
                      <TableCell className="text-xs">{s.items.length} صنف</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(s.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                        لا توجد فواتير سابقة لهذا العميل
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between w-full">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
