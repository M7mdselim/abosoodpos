import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Eye, Trash2, Printer, CheckCircle2, AlertTriangle, SlidersHorizontal, Calendar } from "lucide-react";
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
import { offlineDb } from "@/services/offlineDb";
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
  const isCashier = session?.role === "cashier";
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "2days" | "7days" | "30days" | "all">(isCashier ? "all" : "2days");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "Cash" | "Card" | "Mixed">("all");
  const [cashierFilter, setCashierFilter] = useState<string>("all");
  const [carBrandFilter, setCarBrandFilter] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [voidConfirmSale, setVoidConfirmSale] = useState<Sale | null>(null);
  const [tick, setTick] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [pendingSaleIds, setPendingSaleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const updatePending = async () => {
      try {
        const queue = await offlineDb.getQueue();
        const ids = new Set(
          queue.filter((item) => item.type === "create_sale").map((item) => item.payload.id)
        );
        setPendingSaleIds(ids);
      } catch (err) {
        console.error(err);
      }
    };
    updatePending();
    window.addEventListener("offline_queue_changed", updatePending);
    return () => window.removeEventListener("offline_queue_changed", updatePending);
  }, []);

  // Compute unique cashiers for filter dropdown
  const cashiers = useMemo(() => {
    const list = saleService.list();
    const unique = new Set(list.map((s) => s.cashierName).filter(Boolean));
    return Array.from(unique);
  }, [tick]);

  // Compute unique car brands for filter dropdown
  const carBrands = useMemo(() => {
    const list = saleService.list();
    const unique = new Set(list.map((s) => s.carBrand).filter(Boolean));
    return Array.from(unique);
  }, [tick]);

  const sales = useMemo(() => {
    let list = saleService.list();
    
    // Cashier filter: only see receipts of the active shift or their own last shift
    if (session?.role === "cashier") {
      const activeShift = shiftService.getActiveShift();
      if (activeShift) {
        list = list.filter((s) => s.shiftDay === activeShift.shiftDay);
      } else {
        const cashierShifts = shiftService.getShifts().filter((sh) => sh.cashierId === session.id);
        const currentOrLastShift = cashierShifts[0]; // Since shifts are sorted DESC
        if (currentOrLastShift) {
          list = list.filter((s) => s.cashierId === session.id && s.shiftDay === currentOrLastShift.shiftDay);
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

    // Date range filter (using shiftDay operational business date)
    const getShiftDayString = (offsetDays = 0) => {
      const d = new Date();
      d.setDate(d.getDate() - offsetDays);
      return d.toISOString().split("T")[0];
    };

    const todayStr = getShiftDayString(0);
    const yesterdayStr = getShiftDayString(1);
    const sevenDaysAgoStr = getShiftDayString(6);
    const thirtyDaysAgoStr = getShiftDayString(29);

    list = list.filter((s) => {
      if (!s.shiftDay) return true;
      if (dateFilter === "today") {
        return s.shiftDay === todayStr;
      }
      if (dateFilter === "yesterday") {
        return s.shiftDay === yesterdayStr;
      }
      if (dateFilter === "2days") {
        return s.shiftDay === todayStr || s.shiftDay === yesterdayStr;
      }
      if (dateFilter === "7days") {
        return s.shiftDay >= sevenDaysAgoStr;
      }
      if (dateFilter === "30days") {
        return s.shiftDay >= thirtyDaysAgoStr;
      }
      return true; // "all"
    });

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((s) => {
        const isVoided = s.status === "voided";
        return statusFilter === "voided" ? isVoided : !isVoided;
      });
    }

    // Payment method filter
    if (paymentFilter !== "all") {
      list = list.filter((s) => s.paymentMethod === paymentFilter);
    }

    // Cashier filter (admin/developer only)
    if (session?.role !== "cashier" && cashierFilter !== "all") {
      list = list.filter((s) => s.cashierName === cashierFilter);
    }

    // Car Brand filter
    if (carBrandFilter !== "all") {
      list = list.filter((s) => s.carBrand === carBrandFilter);
    }

    return list;
  }, [query, statusFilter, dateFilter, paymentFilter, cashierFilter, carBrandFilter, session, tick]);

  // Reset page when search or status filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, dateFilter, paymentFilter, cashierFilter, carBrandFilter]);

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
      <div className="mb-6 space-y-3">
        {/* Top row: search full width, then date + filter button side-by-side */}
        <div className="flex flex-col gap-3">
          {/* Search bar – always full width */}
          <div className="relative w-full">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث برقم الفاتورة، اسم العميل أو التليفون..."
              className="h-11 pr-10 text-sm border-slate-200 dark:border-white/10 rounded-xl"
            />
          </div>

          {/* Second row: date filter + advanced toggle (hidden for cashiers) */}
          {!isCashier && (
          <div className="flex gap-2">
            {/* Date range filter */}
            <div className="flex-1">
              <Select
                value={dateFilter}
                onValueChange={(v) => setDateFilter(v as any)}
              >
                <SelectTrigger className="h-10 text-sm border-slate-200 dark:border-white/10 rounded-xl bg-card">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0 text-[#5470ff]" />
                    <SelectValue placeholder="التاريخ" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">الفواتير اليوم</SelectItem>
                  <SelectItem value="yesterday">الفواتير أمس</SelectItem>
                  <SelectItem value="2days">آخر يومين</SelectItem>
                  <SelectItem value="7days">آخر 7 أيام</SelectItem>
                  <SelectItem value="30days">آخر 30 يوم</SelectItem>
                  <SelectItem value="all">كل الأوقات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Toggle Advanced Filters Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`h-10 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                showAdvancedFilters
                  ? "bg-[#5470ff]/10 text-[#5470ff] border-[#5470ff]/30 hover:bg-[#5470ff]/20"
                  : "bg-card border-slate-200 dark:border-white/10"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">تصفية متقدمة</span>
              <span className="inline sm:hidden">تصفية</span>
              {(statusFilter !== "all" || paymentFilter !== "all" || cashierFilter !== "all" || carBrandFilter !== "all") && (
                <span className="h-2 w-2 rounded-full bg-[#5470ff]" />
              )}
            </Button>
          </div>
          )}
        </div>

        {/* Collapsible Advanced Filters Section */}
        {!isCashier && showAdvancedFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-white/5 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Status Filter */}
            <div className="space-y-1 text-right" dir="rtl">
              <Label className="text-xs font-bold text-slate-500">حالة الفاتورة</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as any)}
              >
                <SelectTrigger className="h-10 text-xs rounded-lg bg-card">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشطة</SelectItem>
                  <SelectItem value="voided">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-1 text-right" dir="rtl">
              <Label className="text-xs font-bold text-slate-500">طريقة الدفع</Label>
              <Select
                value={paymentFilter}
                onValueChange={(v) => setPaymentFilter(v as any)}
              >
                <SelectTrigger className="h-10 text-xs rounded-lg bg-card">
                  <SelectValue placeholder="طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="Cash">نقدي</SelectItem>
                  <SelectItem value="Card">كارت</SelectItem>
                  <SelectItem value="Mixed">مختلط</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cashier Filter (Admins/Developers) */}
            {session?.role !== "cashier" && (
              <div className="space-y-1 text-right" dir="rtl">
                <Label className="text-xs font-bold text-slate-500">الكاشير</Label>
                <Select
                  value={cashierFilter}
                  onValueChange={setCashierFilter}
                >
                  <SelectTrigger className="h-10 text-xs rounded-lg bg-card">
                    <SelectValue placeholder="اختر الكاشير" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الموظفين</SelectItem>
                    {cashiers.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Car Brand Filter */}
            <div className="space-y-1 text-right" dir="rtl">
              <Label className="text-xs font-bold text-slate-500">ماركة السيارة</Label>
              <Select
                value={carBrandFilter}
                onValueChange={setCarBrandFilter}
              >
                <SelectTrigger className="h-10 text-xs rounded-lg bg-card">
                  <SelectValue placeholder="اختر الماركة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الماركات</SelectItem>
                  {carBrands.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Receipts Table (Desktop/Tablet View) */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">رقم الفاتورة</TableHead>
              <TableHead className="whitespace-nowrap">التاريخ والوقت</TableHead>
              <TableHead className="whitespace-nowrap">العميل</TableHead>
              <TableHead className="whitespace-nowrap hidden lg:table-cell">رقم الجوال</TableHead>
              <TableHead className="whitespace-nowrap hidden lg:table-cell">الكاشير</TableHead>
              <TableHead className="whitespace-nowrap">الدفع</TableHead>
              <TableHead className="whitespace-nowrap">الإجمالي</TableHead>
              <TableHead className="whitespace-nowrap">الحالة</TableHead>
              <TableHead className="text-left whitespace-nowrap">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.map((s) => {
              const isVoided = s.status === "voided";
              return (
                <TableRow key={s.id} className={isVoided ? "opacity-60 bg-muted/20" : ""}>
                  <TableCell className="font-mono text-sm font-semibold whitespace-nowrap">#{s.invoiceNumber.replace("INV-", "")}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{formatDateTime(s.date)}</TableCell>
                  <TableCell className="font-semibold">{s.customerName}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{s.customerPhone}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{s.cashierName}</TableCell>
                  <TableCell className="font-semibold text-sm">
                    {s.paymentMethod === "Cash"
                      ? "نقدي"
                      : s.paymentMethod === "Card"
                      ? "كارت"
                      : <span className="text-xs">مختلط</span>}
                  </TableCell>
                  <TableCell className="font-bold text-primary whitespace-nowrap">{formatCurrency(s.total)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant={isVoided ? "destructive" : "default"} className="text-[10px] py-0.5">
                        {isVoided ? "ملغاة" : "نشطة"}
                      </Badge>
                      {pendingSaleIds.has(s.id) && (
                        <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold whitespace-nowrap">
                          ⚠️ غير متزامن
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setSelectedSale(s)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden lg:inline mr-1">عرض</span>
                      </Button>
                      {!isVoided && (session?.role === "admin" || session?.role === "developer" || session?.permissions?.canVoidReceipts === true) && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2 text-xs"
                          onClick={() => setVoidConfirmSale(s)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden lg:inline mr-1">إلغاء</span>
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

      {/* Receipts Cards (Mobile View) */}
      <div className="md:hidden space-y-3">
        {paginatedSales.map((s) => {
          const isVoided = s.status === "voided";
          return (
            <div 
              key={s.id} 
              className={`rounded-xl border p-4 bg-card shadow-sm space-y-3.5 ${
                isVoided ? "opacity-60 bg-muted/20 border-slate-200/60 dark:border-white/5" : "border-slate-200/80 dark:border-white/10"
              }`}
            >
              {/* Card Header: Inv No & Status */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-white/5">
                <span className="font-mono text-sm font-black text-slate-800 dark:text-slate-250">
                  #{s.invoiceNumber.replace("INV-", "")}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={isVoided ? "destructive" : "default"} className="text-[10px] px-2 py-0.5 font-bold">
                    {isVoided ? "ملغاة" : "نشطة"}
                  </Badge>
                  {pendingSaleIds.has(s.id) && (
                    <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold">
                      ⚠️ غير متزامن
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {new Date(s.date).toLocaleDateString("ar-EG")}
                  </span>
                </div>
              </div>

              {/* Card Content Grid */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-right" dir="rtl">
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold block text-[10px]">العميل</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{s.customerName}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold block text-[10px]">رقم الجوال</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{s.customerPhone || "—"}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold block text-[10px]">السيارة</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350 text-xs">
                    {s.carBrand ? `${s.carBrand} ${s.carModel || ""}` : "—"}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold block text-[10px]">الكاشير</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{s.cashierName}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold block text-[10px]">طريقة الدفع</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {s.paymentMethod === "Cash"
                      ? "نقدي"
                      : s.paymentMethod === "Card"
                      ? "كارت"
                      : "مختلط"}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-bold block text-[10px]">الإجمالي</span>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400 text-xs">{formatCurrency(s.total)}</span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-9 text-xs font-bold gap-1"
                  onClick={() => setSelectedSale(s)}
                >
                  <Eye className="h-3.5 w-3.5" /> عرض الفاتورة
                </Button>
                {!isVoided && (session?.role === "admin" || session?.role === "developer" || session?.permissions?.canVoidReceipts === true) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 h-9 text-xs font-bold gap-1"
                    onClick={() => setVoidConfirmSale(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> إلغاء الفاتورة
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {sales.length === 0 && (
          <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl bg-card text-sm">
            لم يتم العثور على فواتير تطابق شروط البحث.
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-card p-3 rounded-lg border border-border mt-3 text-xs font-semibold">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            → السابق
          </Button>
          <span className="text-muted-foreground text-center">
            {currentPage} / {totalPages}
            <span className="hidden sm:inline"> (إجمالي {sales.length} فاتورة)</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            التالي ←
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
        <DialogContent className="w-[95vw] sm:max-w-md" dir="rtl">
          <DialogHeader className="text-right">
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
        <DialogContent className="w-[95vw] sm:max-w-md p-0 gap-0 overflow-hidden" dir="rtl">
          {/* Sticky Header */}
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0 text-right">
            <DialogTitle className="text-sm font-black">فاتورة المبيعات التفصيلية</DialogTitle>
          </DialogHeader>
          {/* Scrollable Body */}
          <div className="overflow-y-auto max-h-[80vh] px-4 pb-4 space-y-3">

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
              <div className="text-center text-[10px] text-black font-bold whitespace-pre-line">
                {settings.receiptFooter || "شكراً لزيارتكم — رافقتكم السلامة!"}
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

          </div>
          {/* Sticky Footer: always visible, outside the scroll area */}
          <div className="px-4 pb-4 pt-3 border-t border-border shrink-0 flex items-center justify-end gap-1.5">
            <Button variant="ghost" size="sm" onClick={onClose}>إغلاق</Button>
            {(session?.role !== "cashier" || session?.permissions?.canReprintReceipts === true) && (
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-3.5 w-3.5" /> طباعة
              </Button>
            )}
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

          {/* Copy 1 */}
          <div className="receipt-single-copy">
            {sale.status === "voided" && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none z-10">
                <div className="border-4 border-destructive text-destructive font-black text-xl px-4 py-1.5 rotate-12 rounded uppercase tracking-widest">
                  فاتورة ملغاة
                </div>
              </div>
            )}
            
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
            <div className="text-center text-[10px] text-black font-bold whitespace-pre-line">
              {settings.receiptFooter || "شكراً لزيارتكم — رافقتكم السلامة!"}
            </div>
          </div>

          {/* Page Break & Divider for Second Copy */}
          <div 
            className="my-6 border-t-2 border-dashed border-black" 
            style={{ pageBreakBefore: "always", breakBefore: "page" }} 
          />

          {/* Copy 2 */}
          <div className="receipt-single-copy">
            {sale.status === "voided" && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none z-10">
                <div className="border-4 border-destructive text-destructive font-black text-xl px-4 py-1.5 rotate-12 rounded uppercase tracking-widest">
                  فاتورة ملغاة
                </div>
              </div>
            )}
            
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
            <div className="text-center text-[10px] text-black font-bold whitespace-pre-line">
              {settings.receiptFooter || "شكراً لزيارتكم — رافقتكم السلامة!"}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
