import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Eye, Trash2, Printer, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
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
import { store } from "@/services/store";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Sale } from "@/types";

export const Route = createFileRoute("/receipts")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    const session = authService.getSession();
    if (session?.role !== "admin" && session?.role !== "developer") {
      throw redirect({ to: "/pos" });
    }
  },
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "voided">("all");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [voidConfirmSale, setVoidConfirmSale] = useState<Sale | null>(null);
  const [tick, setTick] = useState(0);

  const sales = useMemo(() => {
    let list = saleService.list();
    
    // Search filter
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.invoiceNumber.toLowerCase().includes(q) ||
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
  }, [query, statusFilter, tick]);

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
            {sales.map((s) => {
              const isVoided = s.status === "voided";
              return (
                <TableRow key={s.id} className={isVoided ? "opacity-60 bg-muted/20" : ""}>
                  <TableCell className="font-mono text-sm font-semibold">{s.invoiceNumber}</TableCell>
                  <TableCell>{formatDateTime(s.date)}</TableCell>
                  <TableCell className="font-semibold">{s.customerName}</TableCell>
                  <TableCell>{s.customerPhone}</TableCell>
                  <TableCell>{s.cashierName}</TableCell>
                  <TableCell>{s.paymentMethod === "Cash" ? "نقدي" : "فيزا"}</TableCell>
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
                      {!isVoided && (
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

      {/* View thermal receipt dialog */}
      <ReceiptViewDialog
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
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
              هل أنت متأكد من إلغاء الفاتورة رقم <b>{voidConfirmSale?.invoiceNumber}</b> التابعة للعميل <b>{voidConfirmSale?.customerName}</b>؟
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

function ReceiptViewDialog({
  open,
  onClose,
  sale,
}: {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
}) {
  if (!sale) return null;
  const settings = store.settings;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-4">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-sm">فاتورة المبيعات التفصيلية</DialogTitle>
        </DialogHeader>

        {/* Print Styles for thermal rolls */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #receipt-print-admin, #receipt-print-admin * {
              visibility: visible;
            }
            #receipt-print-admin {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              color: black !important;
            }
          }
        `}</style>

        <div id="receipt-print-admin" className="rounded-md border border-border bg-white p-3 font-mono text-[11px] leading-normal text-black relative">
          {sale.status === "voided" && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none z-10">
              <div className="border-4 border-destructive text-destructive font-black text-xl px-4 py-1.5 rotate-12 rounded uppercase tracking-widest">
                فاتورة ملغاة
              </div>
            </div>
          )}
          
          {/* Header */}
          <div className="text-center">
            <div className="text-sm font-extrabold">{settings.companyNameAr}</div>
            <div className="text-[10px] mt-0.5">{settings.sloganAr}</div>
            <div className="text-[9px] mt-0.5">
              {settings.phone && `ت: ${settings.phone}`}
              {settings.phone && settings.address && " | "}
              {settings.address && `${settings.address}`}
            </div>
          </div>
          
          <div className="my-1.5 border-t border-dashed border-black/60" />
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-0.5 text-[10px]">
            <div>رقم الفاتورة:</div>
            <div className="text-right font-bold">{sale.invoiceNumber}</div>
            <div>التاريخ:</div>
            <div className="text-right">{new Date(sale.date).toLocaleDateString("ar-EG")}</div>
            <div>أمين الصندوق:</div>
            <div className="text-right">{sale.cashierName}</div>
          </div>
          
          <div className="my-1.5 border-t border-dashed border-black/60" />
          
          {/* Customer info */}
          <div className="text-[10px] text-left leading-tight">
            <div><b>العميل:</b> {sale.customerName}</div>
            <div><b>الهاتف:</b> {sale.customerPhone}</div>
            <div><b>السيارة:</b> {sale.carBrand} {sale.carModel} — {sale.km.toLocaleString()} كم</div>
          </div>
          
          <div className="my-1.5 border-t border-dashed border-black/60" />
          
          {/* Table */}
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-black/60 text-left">
                <th className="py-0.5">البند</th>
                <th className="text-center">الكمية</th>
                <th className="text-right">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((it) => (
                <tr key={it.productId}>
                  <td className="py-0.5">{it.name}</td>
                  <td className="text-center">{it.quantity}</td>
                  <td className="text-right">{(it.quantity * it.unitPrice).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="my-1.5 border-t border-dashed border-black/60" />
          
          {/* Totals */}
          <div className="space-y-0.5 text-[10px]">
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
                <span>الضريبة (15%)</span>
                <span>{sale.vat.toFixed(0)} ج.م</span>
              </div>
            )}
            <div className="flex justify-between border-t border-black/40 pt-1 text-xs font-bold">
              <span>الإجمالي الكلي</span>
              <span>{sale.total.toFixed(0)} ج.م</span>
            </div>
            <div className="flex justify-between">
              <span>طريقة الدفع</span>
              <span>{sale.paymentMethod === "Cash" ? "نقدي" : "كارت"}</span>
            </div>
          </div>
          
          {/* Next Change calculation conditional display */}
          {sale.oilUsed && sale.oilMileage && (
            <>
              <div className="my-1.5 border-t border-dashed border-black/60" />
              <div className="text-center text-[10px]">
                <div className="font-bold">تغيير الزيت القادم الموصى به ({sale.oilMileage.toLocaleString()} كم)</div>
                <div className="mt-0.5 text-sm font-extrabold text-black">
                  {(sale.km + sale.oilMileage).toLocaleString()} كم
                </div>
              </div>
            </>
          )}

          <div className="my-1.5 border-t border-dashed border-black/60" />
          <div className="text-center text-[9px] text-black/80 font-bold">
            شكراً لزيارتكم — رافقتكم السلامة!
          </div>
        </div>
        
        <DialogFooter className="gap-1.5 mt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>إغلاق</Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> طباعة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
