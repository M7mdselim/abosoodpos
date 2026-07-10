import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Eye, Trash2, Printer, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saleService } from "@/services/saleService";
import { authService } from "@/services/authService";
import { shiftService } from "@/services/shiftService";
import { useSession } from "@/context/RoleContext";
import { store } from "@/services/store";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Sale, PaymentMethod } from "@/types";

export const Route = createFileRoute("/receipts")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    const session = authService.getSession();
    const isAdminOrDev = session?.role === "admin" || session?.role === "developer";
    const isAllowedCashier = session?.role === "cashier" && session?.permissions?.canViewReceipts === true;

    if (!isAdminOrDev && !isAllowedCashier) {
      throw redirect({ to: "/pos" });
    }
  },
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const { session } = useSession();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "voided">("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [voidConfirmSale, setVoidConfirmSale] = useState<Sale | null>(null);
  const [tick, setTick] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const sales = useMemo(() => {
    let list = saleService.list();
    
    // Cashier filter: only see their own shift receipts
    if (session?.role === "cashier") {
      const activeShift = shiftService.getActiveShift();
      if (activeShift && activeShift.cashierId === session.id) {
        list = list.filter((s) => s.cashierId === session.id && s.shiftDay === activeShift.shiftDay);
      } else {
        const cashierShifts = shiftService.getShifts().filter((sh) => sh.cashierId === session.id);
        const lastShiftDay = cashierShifts[0]?.shiftDay;
        if (lastShiftDay) {
          list = list.filter((s) => s.cashierId === session.id && s.shiftDay === lastShiftDay);
        } else {
          list = list.filter((s) => s.cashierId === session.id);
        }
      }
    }

    // Search filter
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.invoiceNumber.toLowerCase().replace("inv-", "").includes(q.replace("#", "")) ||
          s.customerName.toLowerCase().includes(q) ||
          s.customerPhone.includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((s) => {
        const isVoided = s.status === "voided";
        return statusFilter === "voided" ? isVoided : !isVoided;
      });
    }

    return list;
  }, [query, statusFilter, session, tick]);

  // Reset page when search or status filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter]);

  const totalPages = Math.ceil(sales.length / itemsPerPage) || 1;
  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sales.slice(startIndex, startIndex + itemsPerPage);
  }, [sales, currentPage]);

  const handleVoidSale = (id: string) => {
    const success = saleService.voidSale(id);
    if (success) {
      toast.success("تم إلغاء الفاتورة وإعادة المنتجات إلى المخزن بنجاح.");
      setTick((t) => t + 1);
      setVoidConfirmSale(null);
    } else {
      toast.error("حدث خطأ أثناء إلغاء الفاتورة.");
    }
  };

  return (
    <PageShell
      title="إدارة فواتير المبيعات"
      subtitle={`${sales.length} فاتورة مسجلة بالنظام`}
    >
      {/* Search & Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث برقم الفاتورة، اسم العميل أو التليفون..."
            className="h-12 pr-10 text-base"
          />
        </div>
        <div className="w-48">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as any)}
          >
            <SelectTrigger className="h-12 text-sm">
              <SelectValue placeholder="حالة الفاتورة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفواتير</SelectItem>
              <SelectItem value="active">الفواتير النشطة</SelectItem>
              <SelectItem value="voided">الفواتير الملغاة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الفاتورة</TableHead>
              <TableHead>التاريخ والوقت</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>رقم الجوال</TableHead>
              <TableHead>الكاشير</TableHead>
              <TableHead>الدفع</TableHead>
              <TableHead>الإجمالي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.map((s) => {
              const isVoided = s.status === "voided";
              return (
                <TableRow key={s.id} className={isVoided ? "opacity-60 bg-muted/20" : ""}>
                  <TableCell className="font-mono text-sm font-semibold">#{s.invoiceNumber.replace("INV-", "")}</TableCell>
                  <TableCell>{formatDateTime(s.date)}</TableCell>
                  <TableCell className="font-semibold">{s.customerName}</TableCell>
                  <TableCell>{s.customerPhone}</TableCell>
                  <TableCell>{s.cashierName}</TableCell>
                  <TableCell className="font-semibold">
                    {s.paymentMethod === "Cash"
                      ? "نقدي"
                      : s.paymentMethod === "Card"
                      ? "كارت"
                      : `مختلط (${s.cashAmount?.toFixed(0)} نقدي + ${s.cardAmount?.toFixed(0)} كارت)`}
                  </TableCell>
                  <TableCell className="font-bold text-primary">{formatCurrency(s.total)}</TableCell>
                  <TableCell>
                    <Badge variant={isVoided ? "destructive" : "default"}>
                      {isVoided ? "ملغاة" : "نشطة"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSale(s)}
                      >
                        <Eye className="mr-1 h-4 w-4" /> عرض
                      </Button>
                      {!isVoided && (session?.role === "admin" || session?.role === "developer" || session?.permissions?.canVoidReceipts === true) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setVoidConfirmSale(s)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> إلغاء
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-16 text-center text-muted-foreground">
                  لم يتم العثور على فواتير تطابق شروط البحث.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-card p-3 rounded-lg border border-border mt-3 text-xs font-semibold">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            السابق
          </Button>
          <span className="text-muted-foreground">
            صفحة {currentPage} من {totalPages} (إجمالي {sales.length} فاتورة)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            التالي
          </Button>
        </div>
      )}

      {/* View thermal receipt dialog */}
      <ReceiptViewDialog
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
        onUpdated={() => setTick((t) => t + 1)}
      />

      {/* Confirm void dialog */}
      <Dialog open={!!voidConfirmSale} onOpenChange={(o) => !o && setVoidConfirmSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> إلغاء الفاتورة وإرجاع المخزن
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground space-y-2">
            <p>
              هل أنت متأكد من إلغاء الفاتورة رقم <b>#{voidConfirmSale?.invoiceNumber.replace("INV-", "")}</b> التابعة للعميل <b>{voidConfirmSale?.customerName}</b>؟
            </p>
            <p className="bg-destructive/10 text-destructive p-3 rounded-lg border border-destructive/20 font-medium">
              سيتم إعادة كامل المنتجات المباعة في هذه الفاتورة ({voidConfirmSale?.items.length} أصناف) إلى كميات المخزن تلقائياً.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setVoidConfirmSale(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => voidConfirmSale && handleVoidSale(voidConfirmSale.id)}
            >
              تأكيد الإلغاء وإعادة المخزن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export function ReceiptViewDialog({
  open,
  onClose,
  sale,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
  onUpdated?: () => void;
}) {
  if (!sale) return null;
  const settings = store.settings;
  const { session } = useSession();

  const [isEditing, setIsEditing] = useState(false);
  const [editMethod, setEditMethod] = useState<PaymentMethod>("Cash");
  const [editCash, setEditCash] = useState<number>(0);
  const [editCard, setEditCard] = useState<number>(0);

  useEffect(() => {
    if (sale) {
      setEditMethod(sale.paymentMethod);
      setEditCash(sale.cashAmount || 0);
      setEditCard(sale.cardAmount || 0);
      setIsEditing(false);
    }
  }, [sale]);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-sm p-4">
          <div className="space-y-3">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-sm">فاتورة المبيعات التفصيلية</DialogTitle>
            </DialogHeader>

            <div 
              id="receipt-print-admin" 
              dir="rtl"
              className="rounded-md border border-border bg-white p-3 font-sans text-[11px] leading-normal text-black relative"
            >
              {sale.status === "voided" && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none z-10">
                  <div className="border-4 border-destructive text-destructive font-black text-xl px-4 py-1.5 rotate-12 rounded uppercase tracking-widest">
                    فاتورة ملغاة
                  </div>
                </div>
              )}
              
              {/* Copy Indicator */}
              <div className="text-center font-black text-xs border border-black py-1.5 mb-3 rounded uppercase tracking-wider bg-black/5 text-black">
                *** نسخة — COPY ***
              </div>
              
              <div className="text-center mb-1">
                {settings.logoUrl && (
                  <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover mx-auto mb-1.5 border border-border bg-white" />
                )}
                <div className="text-sm font-black text-black">{settings.companyNameAr}</div>
                <div className="text-[10px] mt-0.5 font-semibold text-black">{settings.sloganAr}</div>
                <div className="text-[9px] mt-1 text-black font-medium">
                  {settings.phone && `ت: ${settings.phone}`}
                  {settings.phone && settings.address && " | "}
                  {settings.address && `${settings.address}`}
                </div>
              </div>
              
              <div className="my-2 border-t-2 border-dashed border-black" />
              
              <div className="grid grid-cols-2 gap-y-1 text-[10px] text-black">
                <div><b>رقم الفاتورة:</b></div>
                <div className="text-left font-bold">#{sale.invoiceNumber.replace("INV-", "")}</div>
                <div><b>التاريخ والوقت:</b></div>
                <div className="text-left">
                  {new Date(sale.date).toLocaleDateString("ar-EG")} {new Date(sale.date).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div><b>أمين الصندوق:</b></div>
                <div className="text-left">{sale.cashierName}</div>
              </div>
              
              <div className="my-2 border-t border-dashed border-black" />
              
              <div className="text-[10px] text-right leading-tight space-y-0.5 bg-black/[0.01] p-1.5 border border-dashed border-black rounded">
                <div><b>العميل:</b> {sale.customerName}</div>
                <div><b>الهاتف:</b> {sale.customerPhone}</div>
                <div><b>السيارة:</b> {sale.carBrand} {sale.carModel} — {sale.km.toLocaleString()} كم</div>
              </div>
              
              <div className="my-2 border-t border-dashed border-black" />
              
              <table className="w-full text-[10px] text-black border-collapse">
                <thead>
                  <tr className="border-b border-black text-right font-bold">
                    <th className="py-1 text-right w-[45%]">البند</th>
                    <th className="py-1 text-center w-[15%]">الكمية</th>
                    <th className="py-1 text-left w-[20%] font-bold">السعر</th>
                    <th className="py-1 text-left w-[20%] font-bold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {sale.items.map((it) => (
                    <tr key={it.productId} className="border-b border-dashed border-black/20">
                      <td className="py-1 text-right">{it.name}</td>
                      <td className="py-1 text-center">{it.quantity}</td>
                      <td className="py-1 text-left">{it.unitPrice.toFixed(0)}</td>
                      <td className="py-1 text-left font-bold">{(it.quantity * it.unitPrice).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="my-2 border-t border-dashed border-black" />
              
              <div className="space-y-1 text-[10px] text-black">
                <div className="flex justify-between">
                  <span>الإجمالي الفرعي</span>
                  <span>{sale.subtotal.toFixed(0)} ج.م</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>الخصم</span>
                    <span>-{sale.discount.toFixed(0)} ج.م</span>
                  </div>
                )}
                {sale.vat > 0 && (
                  <div className="flex justify-between">
                    <span>الضريبة (14%)</span>
                    <span>{sale.vat.toFixed(0)} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between border-y-2 border-black py-1 text-xs font-extrabold my-1 text-black">
                  <span>الإجمالي الكلي</span>
                  <span>{sale.total.toFixed(0)} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span>طريقة الدفع</span>
                  <span>
                    {sale.paymentMethod === "Mixed"
                      ? "مختلط"
                      : sale.paymentMethod === "Cash"
                      ? "نقدي"
                      : "كارت"}
                  </span>
                </div>
                {sale.paymentMethod === "Mixed" && (
                  <div className="text-[9px] text-muted-foreground flex justify-between pr-2 border-r border-dashed border-black/40">
                    <span>نقدي: {sale.cashAmount?.toFixed(0)} ج.م</span>
                    <span>كارت: {sale.cardAmount?.toFixed(0)} ج.م</span>
                  </div>
                )}
              </div>
              
              {sale.oilUsed && sale.oilMileage && (
                <>
                  <div className="my-2 border-t border-dashed border-black" />
                  <div className="border border-black p-2 rounded text-center text-[10px] bg-black/[0.01]">
                    <div className="font-bold text-black">تغيير الزيت القادم الموصى به ({sale.oilMileage.toLocaleString()} كم)</div>
                    <div className="mt-1 text-base font-extrabold text-black tracking-wide">
                      {(sale.km + sale.oilMileage).toLocaleString()} كم
                    </div>
                  </div>
                </>
              )}

              <div className="my-2 border-t border-dashed border-black" />
              <div className="text-center text-[10px] text-black font-bold">
                شكراً لزيارتكم — رافقتكم السلامة!
              </div>
            </div>
            
            {/* Admin/Cashier Edit Payment Method Section */}
            {(session?.role === "admin" || session?.role === "developer" || session?.permissions?.canEditPaymentMethods === true) && !isEditing && (
              <div className="mt-4 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 flex items-center justify-between gap-2 text-right">
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-primary">تعديل طريقة الدفع</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">يمكنك تعديل طريقة الدفع لتسوية هذه الفاتورة</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>تعديل طريقة الدفع</Button>
              </div>
            )}

            {isEditing && (
              <div className="mt-4 p-3 rounded-lg border border-primary/40 bg-accent/20 space-y-3 text-right">
                <span className="font-bold text-xs text-primary block">تعديل طريقة دفع الفاتورة</span>
                
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground">اختر الطريقة الجديدة</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      type="button"
                      variant={editMethod === "Cash" ? "default" : "outline"}
                      className="h-8 text-xs font-bold px-1"
                      onClick={() => {
                        setEditMethod("Cash");
                        setEditCash(sale.total);
                        setEditCard(0);
                      }}
                    >
                      نقدي
                    </Button>
                    <Button
                      type="button"
                      variant={editMethod === "Card" ? "default" : "outline"}
                      className="h-8 text-xs font-bold px-1"
                      onClick={() => {
                        setEditMethod("Card");
                        setEditCash(0);
                        setEditCard(sale.total);
                      }}
                    >
                      كارت
                    </Button>
                    <Button
                      type="button"
                      variant={editMethod === "Mixed" ? "default" : "outline"}
                      className="h-8 text-xs font-bold px-1"
                      onClick={() => {
                        setEditMethod("Mixed");
                        setEditCash(Math.round(sale.total / 2));
                        setEditCard(sale.total - Math.round(sale.total / 2));
                      }}
                    >
                      مختلط
                    </Button>
                  </div>
                </div>

                {editMethod === "Mixed" && (
                  <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-green-700">المبلغ النقدي</Label>
                      <Input
                        type="number"
                        value={editCash === 0 ? "" : editCash}
                        onChange={(e) => {
                          const val = Math.min(Number(e.target.value) || 0, sale.total);
                          setEditCash(val);
                          setEditCard(+(sale.total - val).toFixed(2));
                        }}
                        className="h-8 text-xs text-center font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-primary">المبلغ بالكارت</Label>
                      <Input
                        type="number"
                        value={editCard === 0 ? "" : editCard}
                        onChange={(e) => {
                          const val = Math.min(Number(e.target.value) || 0, sale.total);
                          setEditCard(val);
                          setEditCash(+(sale.total - val).toFixed(2));
                        }}
                        className="h-8 text-xs text-center font-bold"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-1">
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsEditing(false)}>إلغاء</Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-primary text-primary-foreground font-bold"
                    onClick={() => {
                      if (editMethod === "Mixed" && Math.abs(editCash + editCard - sale.total) > 0.01) {
                        toast.error("مجموع المبالغ يجب أن يساوي إجمالي الفاتورة");
                        return;
                      }
                      const success = saleService.updatePaymentMethod(
                        sale.id,
                        editMethod,
                        editMethod === "Mixed" ? editCash : undefined,
                        editMethod === "Mixed" ? editCard : undefined
                      );
                      if (success) {
                        toast.success("تم تحديث طريقة الدفع بنجاح.");
                        setIsEditing(false);
                        if (onUpdated) onUpdated();
                        onClose();
                      } else {
                        toast.error("فشل التحديث. الفاتورة قد تكون ملغاة.");
                      }
                    }}
                  >
                    حفظ التغييرات
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter className="gap-1.5 mt-3">
              <Button variant="ghost" size="sm" onClick={onClose}>إغلاق</Button>
              {(session?.role !== "cashier" || session?.permissions?.canReprintReceipts === true) && (
                <Button size="sm" onClick={() => window.print()}>
                  <Printer className="mr-1.5 h-3.5 w-3.5" /> طباعة
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {open && typeof document !== "undefined" && createPortal(
        <div 
          id="receipt-print-only" 
          dir="rtl"
        >
          {/* Print Styles for thermal rolls (nested here so they are not inside a display:none container) */}
          <style>{`
            #receipt-print-only {
              display: none;
            }
            @media print {
              @page {
                size: ${settings.receiptWidth || 80}mm auto;
                margin: 0 !important;
              }
              html, body {
                width: ${settings.receiptWidth || 80}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                height: auto !important;
                background: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              /* Hide the main application container and all dialog portals */
              #root,
              [data-radix-portal],
              body > *:not(#receipt-print-only) {
                display: none !important;
              }
              /* Show only the flat print-only sibling container */
              #receipt-print-only {
                display: block !important;
                position: static !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 6mm ${settings.receiptMargin !== undefined ? settings.receiptMargin : 4}mm !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                direction: rtl !important;
                font-family: system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif !important;
                font-size: ${settings.receiptFontSize || 11}px !important;
              }
              #receipt-print-only * {
                font-family: system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif !important;
                color: black !important;
                border-color: black !important;
                opacity: 1 !important;
              }
              #receipt-print-only table,
              #receipt-print-only td,
              #receipt-print-only th,
              #receipt-print-only .grid {
                font-size: 0.95em !important;
              }
              #receipt-print-only h1,
              #receipt-print-only .text-sm {
                font-size: 1.1em !important;
              }
              #receipt-print-only .text-base {
                font-size: 1.25em !important;
              }
            }
          `}</style>

          {sale.status === "voided" && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none z-10">
              <div className="border-4 border-destructive text-destructive font-black text-xl px-4 py-1.5 rotate-12 rounded uppercase tracking-widest">
                فاتورة ملغاة
              </div>
            </div>
          )}
          
          {/* Copy Indicator */}
          <div className="text-center font-black text-xs border border-black py-1.5 mb-3 rounded uppercase tracking-wider bg-black/5 text-black">
            *** نسخة — COPY ***
          </div>
          
          {/* Header */}
          <div className="text-center mb-1">
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover mx-auto mb-1.5 border border-border bg-white" />
            )}
            <div className="text-sm font-black text-black">{settings.companyNameAr}</div>
            <div className="text-[10px] mt-0.5 font-semibold text-black">{settings.sloganAr}</div>
            <div className="text-[9px] mt-1 text-black font-medium">
              {settings.phone && `ت: ${settings.phone}`}
              {settings.phone && settings.address && " | "}
              {settings.address && `${settings.address}`}
            </div>
          </div>
          
          <div className="my-2 border-t-2 border-dashed border-black" />
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-y-1 text-[10px] text-black">
            <div><b>رقم الفاتورة:</b></div>
            <div className="text-left font-bold">#{sale.invoiceNumber.replace("INV-", "")}</div>
            <div><b>التاريخ والوقت:</b></div>
            <div className="text-left">
              {new Date(sale.date).toLocaleDateString("ar-EG")} {new Date(sale.date).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div><b>أمين الصندوق:</b></div>
            <div className="text-left">{sale.cashierName}</div>
          </div>
          
          <div className="my-2 border-t border-dashed border-black" />
          
          {/* Customer info */}
          <div className="text-[10px] text-right leading-tight space-y-0.5 bg-black/[0.01] p-1.5 border border-dashed border-black rounded">
            <div><b>العميل:</b> {sale.customerName}</div>
            <div><b>الهاتف:</b> {sale.customerPhone}</div>
            <div><b>السيارة:</b> {sale.carBrand} {sale.carModel} — {sale.km.toLocaleString()} كم</div>
          </div>
          
          <div className="my-2 border-t border-dashed border-black" />
          
          {/* Table */}
          <table className="w-full text-[10px] text-black border-collapse">
            <thead>
              <tr className="border-b border-black text-right font-bold">
                <th className="py-1 text-right w-[45%]">البند</th>
                <th className="py-1 text-center w-[15%]">الكمية</th>
                <th className="py-1 text-left w-[20%] font-bold">السعر</th>
                <th className="py-1 text-left w-[20%] font-bold">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((it) => (
                <tr key={it.productId} className="border-b border-dashed border-black/20">
                  <td className="py-1 text-right">{it.name}</td>
                  <td className="py-1 text-center">{it.quantity}</td>
                  <td className="py-1 text-left">{it.unitPrice.toFixed(0)}</td>
                  <td className="py-1 text-left font-bold">{(it.quantity * it.unitPrice).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="my-2 border-t border-dashed border-black" />
          
          {/* Totals */}
          <div className="space-y-1 text-[10px] text-black">
            <div className="flex justify-between">
              <span>الإجمالي الفرعي</span>
              <span>{sale.subtotal.toFixed(0)} ج.م</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>الخصم</span>
                <span>-{sale.discount.toFixed(0)} ج.م</span>
              </div>
            )}
            {sale.vat > 0 && (
              <div className="flex justify-between">
                <span>الضريبة (14%)</span>
                <span>{sale.vat.toFixed(0)} ج.م</span>
              </div>
            )}
            <div className="flex justify-between border-y-2 border-black py-1 text-xs font-extrabold my-1 text-black">
              <span>الإجمالي الكلي</span>
              <span>{sale.total.toFixed(0)} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>طريقة الدفع</span>
              <span>
                {sale.paymentMethod === "Mixed"
                  ? "مختلط"
                  : sale.paymentMethod === "Cash"
                  ? "نقدي"
                  : "كارت"}
              </span>
            </div>
            {sale.paymentMethod === "Mixed" && (
              <div className="text-[9px] text-muted-foreground flex justify-between pr-2 border-r border-dashed border-black/40">
                <span>نقدي: {sale.cashAmount?.toFixed(0)} ج.م</span>
                <span>كارت: {sale.cardAmount?.toFixed(0)} ج.م</span>
              </div>
            )}
          </div>
          
          {/* Next Change calculation conditional display */}
          {sale.oilUsed && sale.oilMileage && (
            <>
              <div className="my-2 border-t border-dashed border-black" />
              <div className="border border-black p-2 rounded text-center text-[10px] bg-black/[0.01]">
                <div className="font-bold text-black">تغيير الزيت القادم الموصى به ({sale.oilMileage.toLocaleString()} كم)</div>
                <div className="mt-1 text-base font-extrabold text-black tracking-wide">
                  {(sale.km + sale.oilMileage).toLocaleString()} كم
                </div>
              </div>
            </>
          )}

          <div className="my-2 border-t border-dashed border-black" />
          <div className="text-center text-[10px] text-black font-bold">
            شكراً لزيارتكم — رافقتكم السلامة!
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
