import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useMemo, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { Printer, Download, FileSpreadsheet, FileText, CalendarDays, RefreshCw, Eye, Pencil, Filter, X, ChevronDown, ChevronLeft } from "lucide-react";
import { ReceiptViewDialog } from "./receipts";
import type { Sale } from "@/types";

import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saleService } from "@/services/saleService";
import { shiftService, type Shift } from "@/services/shiftService";
import { store } from "@/services/store";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { useSession } from "@/context/RoleContext";
import { authService } from "@/services/authService";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    const session = authService.getSession();
    const isAdminOrDev = session?.role === "admin" || session?.role === "developer";
    const isAllowedCashier = session?.role === "cashier" && session?.permissions?.canViewReports === true;

    if (!isAdminOrDev && !isAllowedCashier) {
      throw redirect({ to: "/pos" });
    }
  },
  component: ReportsPage,
});

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

// Function to export to Excel-friendly CSV with UTF-8 BOM to prevent encoding issues with Arabic characters in Excel
function exportExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = 
    "\ufeff" + // UTF-8 BOM
    [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function ReportsPage() {
  const { session } = useSession();
  const { language } = useLanguage();
  const isAdminOrDev = session?.role === "admin" || session?.role === "developer";

  return (
    <PageShell 
      title="تقارير المبيعات" 
      subtitle="استعراض ملخص العمليات اليومية والشهرية وتصديرها"
    >
      {/* Dynamic print container style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report-area, #printable-report-area *,
          #shift-print-area, #shift-print-area *,
          #receipt-print-only, #receipt-print-only * {
            visibility: visible;
          }
          #printable-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 10mm 15mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            direction: rtl !important;
            font-family: system-ui, -apple-system, sans-serif !important;
          }
          #printable-report-area table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
            border: 2px solid #1e293b !important;
          }
          #printable-report-area th, #printable-report-area td {
            border: 1px solid #94a3b8 !important;
            padding: 8px 10px !important;
            font-size: 11px !important;
            color: black !important;
            text-align: right !important;
          }
          #printable-report-area th {
            background-color: #f1f5f9 !important;
            font-weight: bold !important;
            border-bottom: 2px solid #1e293b !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #printable-report-area .summary-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 5px !important;
            margin-bottom: 15px !important;
            border: 1px solid #94a3b8 !important;
          }
          #printable-report-area .summary-table td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 10px !important;
            font-size: 11px !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <Tabs defaultValue="daily">
        <TabsList className="mb-4 bg-muted p-1 border border-border rounded-lg no-print">
          <TabsTrigger value="daily" className="font-semibold py-2 px-4 rounded-md">التقرير اليومي</TabsTrigger>
          {isAdminOrDev && (
            <TabsTrigger value="monthly" className="font-semibold py-2 px-4 rounded-md">التقرير الشهري</TabsTrigger>
          )}
          <TabsTrigger value="shifts" className="font-semibold py-2 px-4 rounded-md">جرد الورديات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily">
          <DailyReport />
        </TabsContent>
        
        {isAdminOrDev && (
          <TabsContent value="monthly">
            <MonthlyReport />
          </TabsContent>
        )}

        <TabsContent value="shifts">
          <ShiftsReport />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function DailyReport() {
  const { session } = useSession();
  const [date, setDate] = useState(todayISO());
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Much filters state hooks
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCashier, setSelectedCashier] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [productQuery, setProductQuery] = useState("");
  
  // Exclude voided sales defensively
  const allSales = useMemo(() => saleService.byDate(date), [date]);

  // Extract unique cashiers from that day's sales dynamically
  const cashiers = useMemo(() => {
    const unique = new Set<string>();
    allSales.forEach(s => {
      if (s.cashierName) unique.add(s.cashierName);
    });
    return Array.from(unique);
  }, [allSales]);

  // Apply filters
  const sales = useMemo(() => {
    return (allSales || []).filter(s => {
      if (!s) return false;
      if (s.status === "voided") return false;

      // General Search: Customer or Invoice number
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const invoiceNum = (s.invoiceNumber || "").replace("INV-", "").toLowerCase();
        const customer = (s.customerName || "").toLowerCase();
        if (!invoiceNum.includes(query) && !customer.includes(query)) {
          return false;
        }
      }

      // Cashier filter
      if (selectedCashier !== "all" && (s.cashierName || "") !== selectedCashier) {
        return false;
      }

      // Payment Method filter
      if (selectedPayment !== "all" && (s.paymentMethod || "") !== selectedPayment) {
        return false;
      }

      // Product/Brand filter
      if (productQuery) {
        const pQuery = productQuery.toLowerCase();
        const hasProduct = (s.items || []).some(item => 
          (item.name || "").toLowerCase().includes(pQuery) || 
          (item.brand && (item.brand || "").toLowerCase().includes(pQuery))
        );
        if (!hasProduct) return false;
      }

      // Min/Max Total filter
      if (minAmount && Number(s.total || 0) < Number(minAmount)) {
        return false;
      }
      if (maxAmount && Number(s.total || 0) > Number(maxAmount)) {
        return false;
      }

      return true;
    });
  }, [allSales, searchQuery, selectedCashier, selectedPayment, productQuery, minAmount, maxAmount]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCashier("all");
    setSelectedPayment("all");
    setMinAmount("");
    setMaxAmount("");
    setProductQuery("");
  };

  const totalCount = sales.length;
  const cash = sales.filter((s) => s.paymentMethod === "Cash").reduce((s, r) => s + Number(r.total || 0), 0);
  const card = sales.filter((s) => s.paymentMethod === "Card").reduce((s, r) => s + Number(r.total || 0), 0);
  const total = cash + card;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const headers = ["رقم الفاتورة", "وقت العملية", "اسم العميل", "الكاشير", "طريقة الدفع", "الإجمالي ج.م"];
    const rows = sales.map((s) => [
      `#${(s.invoiceNumber || "").replace("INV-", "")}`,
      s.date ? new Date(s.date).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "",
      s.customerName || "",
      s.cashierName || "",
      s.paymentMethod === "Cash" ? "نقدي" : "فيزا / كارت",
      Number(s.total || 0).toFixed(2)
    ]);
    exportExcel(`تقرير-يومي-${date}.csv`, headers, rows);
  };

  const settings = store.settings;

  return (
    <div id="printable-report-area">
      {/* Header for print only */}
      <div className="hidden print:flex justify-between items-center gap-4 mb-6 pb-4 border-b-2 border-slate-900 text-right">
        <div className="space-y-1">
          <div className="text-base font-black text-slate-800">تقرير المبيعات اليومي</div>
          <div className="text-[10px] text-muted-foreground font-semibold">تاريخ التقرير: {new Date(date).toLocaleDateString("ar-EG")}</div>
          <div className="text-[10px] text-muted-foreground font-semibold">تاريخ الطباعة: {new Date().toLocaleString("ar-EG")}</div>
        </div>
        
        {settings.logoUrl && (
          <div className="flex justify-center items-center">
            <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 rounded-full object-cover border border-slate-300 bg-white" />
          </div>
        )}

        <div className="space-y-1 text-left">
          <div className="text-sm font-extrabold text-slate-900">{settings.companyNameAr}</div>
          <div className="text-[10px] text-slate-600 font-semibold">{settings.sloganAr}</div>
          <div className="text-[9px] text-muted-foreground font-medium">
            {settings.phone && `ت: ${settings.phone}`}
            {settings.phone && settings.address && " | "}
            {settings.address && `${settings.address}`}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 justify-between no-print">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="h-11 w-52 font-semibold" 
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 px-4 gap-2 font-bold" onClick={handlePrint}>
            <FileText className="h-4 w-4 text-primary" /> تصدير PDF / طباعة
          </Button>
          <Button
            variant="outline"
            className="h-11 px-4 gap-2 font-bold text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10"
            onClick={handleExportExcel}
          >
            <FileSpreadsheet className="h-4 w-4" /> تصدير Excel
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5 shadow-xs no-print">
        <div className="flex items-center gap-2 mb-3 border-b border-border pb-2 text-slate-800 dark:text-slate-100">
          <Filter className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm">تصفية البيانات المتقدمة</span>
          {(searchQuery || selectedCashier !== "all" || selectedPayment !== "all" || minAmount || maxAmount || productQuery) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearFilters}
              className="mr-auto h-7 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
            >
              <X className="h-3 w-3" />
              إعادة تعيين
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Filter 1: Customer Name or Invoice Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">البحث العام</label>
            <Input 
              type="text"
              placeholder="العميل أو رقم الفاتورة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 text-xs font-medium"
            />
          </div>

          {/* Filter 2: Cashier */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">أمين الصندوق</label>
            <Select value={selectedCashier} onValueChange={setSelectedCashier}>
              <SelectTrigger className="h-10 text-xs font-medium">
                <SelectValue placeholder="اختر أمين الصندوق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {cashiers.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter 3: Payment Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">طريقة الدفع</label>
            <Select value={selectedPayment} onValueChange={setSelectedPayment}>
              <SelectTrigger className="h-10 text-xs font-medium">
                <SelectValue placeholder="طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Cash">نقدي</SelectItem>
                <SelectItem value="Card">فيزا / كارت</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter 4: Product Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">البحث بالمنتج / الماركة</label>
            <Input 
              type="text"
              placeholder="اسم المنتج أو الماركة..."
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className="h-10 text-xs font-medium"
            />
          </div>

          {/* Filter 5: Min Total */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">الحد الأدنى (ج.م)</label>
            <Input 
              type="number"
              placeholder="الأدنى..."
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="h-10 text-xs font-medium font-mono"
            />
          </div>

          {/* Filter 6: Max Total */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">الحد الأقصى (ج.م)</label>
            <Input 
              type="number"
              placeholder="الأقصى..."
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="h-10 text-xs font-medium font-mono"
            />
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <StatCard label="عدد الفواتير" value={String(totalCount)} />
        <StatCard label="المبيعات النقدية" value={formatCurrency(cash)} />
        <StatCard label="مبيعات الكروت والفيزا" value={formatCurrency(card)} />
        <StatCard label="إجمالي المبيعات" value={formatCurrency(total)} highlight />
      </div>

      {/* Print-only compact financial summary table */}
      <div className="hidden print:block mb-4">
        <div className="text-[10px] font-bold mb-1.5 text-slate-800 border-r-2 border-primary pr-2">ملخص البيانات المالية للتقرير</div>
        <table className="summary-table">
          <tbody>
            <tr className="bg-slate-50">
              <td className="font-bold p-2 text-right w-1/4">عدد الفواتير</td>
              <td className="p-2 text-right w-1/4 font-mono font-semibold">{totalCount}</td>
              <td className="font-bold p-2 text-right w-1/4">المبيعات النقدية</td>
              <td className="p-2 text-right w-1/4 font-mono font-semibold">{formatCurrency(cash)}</td>
            </tr>
            <tr>
              <td className="font-bold p-2 text-right w-1/4">مبيعات الفيزا والكروت</td>
              <td className="p-2 text-right w-1/4 font-mono font-semibold">{formatCurrency(card)}</td>
              <td className="font-bold p-2 text-right w-1/4 bg-slate-100 font-extrabold">إجمالي المبيعات</td>
              <td className="p-2 text-left w-1/4 font-black font-mono bg-slate-100 text-slate-900">{formatCurrency(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Report Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-sm print:border-none">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-right">رقم الفاتورة</TableHead>
              <TableHead className="text-right">وقت العملية</TableHead>
              <TableHead className="text-right">العميل</TableHead>
              <TableHead className="text-right">الكاشير</TableHead>
              <TableHead className="text-right">الدفع</TableHead>
              <TableHead className="text-left">الإجمالي</TableHead>
              <TableHead className="text-left no-print">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs font-semibold text-right">#{(s.invoiceNumber || "").replace("INV-", "")}</TableCell>
                <TableCell className="text-right">{s.date ? new Date(s.date).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : ""}</TableCell>
                <TableCell className="font-bold text-right">{s.customerName || ""}</TableCell>
                <TableCell className="text-right">{s.cashierName || ""}</TableCell>
                <TableCell className="text-right">{s.paymentMethod === "Cash" ? "نقدي" : "فيزا"}</TableCell>
                <TableCell className="text-left font-black text-primary">{formatCurrency(Number(s.total || 0))}</TableCell>
                <TableCell className="text-left no-print">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    onClick={() => setSelectedSale(s)}
                  >
                    <Eye className="h-3.5 w-3.5" /> عرض الفاتورة
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {sales.length > 0 && (
              <TableRow className="bg-muted/30 font-black border-t-2 border-slate-900 print:bg-slate-50">
                <TableCell colSpan={5} className="text-right font-extrabold text-slate-800">إجمالي التقرير</TableCell>
                <TableCell className="text-left text-slate-950 font-black">{formatCurrency(total)}</TableCell>
                <TableCell className="no-print" />
              </TableRow>
            )}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground font-semibold">
                  لا توجد عمليات مبيعات مسجلة في هذا التاريخ.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sign-off footer for print only */}
      <div className="hidden print:grid grid-cols-4 gap-4 mt-12 pt-8 text-center text-[10px] text-slate-800">
        <div className="space-y-4">
          <p className="font-bold">المسؤول (منشئ التقرير)</p>
          <div className="border-b border-dashed border-slate-400 w-28 mx-auto pt-4" />
          <p className="text-muted-foreground font-semibold">{session?.name || "اسم الموظف"}</p>
        </div>
        <div className="space-y-4">
          <p className="font-bold">المراجع (مدير القسم)</p>
          <div className="border-b border-dashed border-slate-400 w-28 mx-auto pt-4" />
          <p className="text-muted-foreground">التوقيع والتاريخ</p>
        </div>
        <div className="space-y-4">
          <p className="font-bold">الحسابات (المحاسب المالي)</p>
          <div className="border-b border-dashed border-slate-400 w-28 mx-auto pt-4" />
          <p className="text-muted-foreground">التوقيع والتاريخ</p>
        </div>
        <div className="space-y-4">
          <p className="font-bold">الاعتماد (المدير العام)</p>
          <div className="border-b border-dashed border-slate-400 w-28 mx-auto pt-4" />
          <p className="text-muted-foreground">موافق / معتمد</p>
        </div>
      </div>

      <ReceiptViewDialog
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
      />
    </div>
  );
}

function MonthlyReport() {
  const { session } = useSession();
  const [month, setMonth] = useState(thisMonth());
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const toggleDay = (day: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  // Much filters state hooks
  const [selectedCashier, setSelectedCashier] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState("all");
  const [productQuery, setProductQuery] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  
  // Exclude voided sales defensively
  const allSales = useMemo(() => saleService.byMonth(month), [month]);

  // Extract unique cashiers from that month's sales dynamically
  const cashiers = useMemo(() => {
    const unique = new Set<string>();
    (allSales || []).forEach(s => {
      if (s && s.cashierName) unique.add(s.cashierName);
    });
    return Array.from(unique);
  }, [allSales]);

  // Apply filters
  const sales = useMemo(() => {
    return (allSales || []).filter(s => {
      if (!s) return false;
      if (s.status === "voided") return false;

      // Cashier filter
      if (selectedCashier !== "all" && (s.cashierName || "") !== selectedCashier) {
        return false;
      }

      // Payment Method filter
      if (selectedPayment !== "all" && (s.paymentMethod || "") !== selectedPayment) {
        return false;
      }

      // Product/Brand filter
      if (productQuery) {
        const pQuery = productQuery.toLowerCase();
        const hasProduct = (s.items || []).some(item => 
          (item.name || "").toLowerCase().includes(pQuery) || 
          (item.brand && (item.brand || "").toLowerCase().includes(pQuery))
        );
        if (!hasProduct) return false;
      }

      // Min/Max Total filter
      if (minAmount && Number(s.total || 0) < Number(minAmount)) {
        return false;
      }
      if (maxAmount && Number(s.total || 0) > Number(maxAmount)) {
        return false;
      }

      return true;
    });
  }, [allSales, selectedCashier, selectedPayment, productQuery, minAmount, maxAmount]);

  const handleClearFilters = () => {
    setSelectedCashier("all");
    setSelectedPayment("all");
    setProductQuery("");
    setMinAmount("");
    setMaxAmount("");
  };

  // Summaries
  const totalCount = sales.length;
  const cash = sales.filter((s) => s.paymentMethod === "Cash").reduce((s, r) => s + Number(r.total || 0), 0);
  const card = sales.filter((s) => s.paymentMethod === "Card").reduce((s, r) => s + Number(r.total || 0), 0);
  const totalSales = cash + card;
  const totalVat = sales.reduce((s, r) => s + Number(r.vat || 0), 0);
  const netSales = totalSales - totalVat;

  const byDay = useMemo(() => {
    const map = new Map<string, { count: number; sales: number; vat: number }>();
    for (const s of sales) {
      if (!s || !s.date) continue;
      const day = s.date.split("T")[0];
      const cur = map.get(day) ?? { count: 0, sales: 0, vat: 0 };
      cur.count += 1;
      cur.sales += Number(s.total || 0);
      cur.vat += Number(s.vat || 0);
      map.set(day, cur);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [sales]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const headers = ["التاريخ", "عدد الفواتير", "إجمالي المبيعات ج.م", "الضريبة ج.م", "صافي المبيعات ج.م"];
    const rows = byDay.map(([day, v]) => [
      day,
      v.count,
      v.sales.toFixed(2),
      v.vat.toFixed(2),
      (v.sales - v.vat).toFixed(2)
    ]);
    exportExcel(`تقرير-شهري-${month}.csv`, headers, rows);
  };

  const settings = store.settings;

  return (
    <div id="printable-report-area">
      {/* Header for print only */}
      <div className="hidden print:flex justify-between items-center gap-4 mb-6 pb-4 border-b-2 border-slate-900 text-right">
        <div className="space-y-1">
          <div className="text-base font-black text-slate-800">تقرير المبيعات الشهري</div>
          <div className="text-[10px] text-muted-foreground font-semibold">شهر التقرير: {month}</div>
          <div className="text-[10px] text-muted-foreground font-semibold">تاريخ الطباعة: {new Date().toLocaleString("ar-EG")}</div>
        </div>
        
        {settings.logoUrl && (
          <div className="flex justify-center items-center">
            <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 rounded-full object-cover border border-slate-300 bg-white" />
          </div>
        )}

        <div className="space-y-1 text-left">
          <div className="text-sm font-extrabold text-slate-900">{settings.companyNameAr}</div>
          <div className="text-[10px] text-slate-600 font-semibold">{settings.sloganAr}</div>
          <div className="text-[9px] text-muted-foreground font-medium">
            {settings.phone && `ت: ${settings.phone}`}
            {settings.phone && settings.address && " | "}
            {settings.address && `${settings.address}`}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 justify-between no-print">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <Input 
            type="month" 
            value={month} 
            onChange={(e) => setMonth(e.target.value)} 
            className="h-11 w-52 font-semibold" 
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 px-4 gap-2 font-bold" onClick={handlePrint}>
            <FileText className="h-4 w-4 text-primary" /> تصدير PDF / طباعة
          </Button>
          <Button
            variant="outline"
            className="h-11 px-4 gap-2 font-bold text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10"
            onClick={handleExportExcel}
          >
            <FileSpreadsheet className="h-4 w-4" /> تصدير Excel
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5 shadow-xs no-print">
        <div className="flex items-center gap-2 mb-3 border-b border-border pb-2 text-slate-800 dark:text-slate-100">
          <Filter className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm">تصفية البيانات المتقدمة للتقرير الشهري</span>
          {(selectedCashier !== "all" || selectedPayment !== "all" || minAmount || maxAmount || productQuery) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearFilters}
              className="mr-auto h-7 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
            >
              <X className="h-3 w-3" />
              إعادة تعيين
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Filter 1: Cashier */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">أمين الصندوق</label>
            <Select value={selectedCashier} onValueChange={setSelectedCashier}>
              <SelectTrigger className="h-10 text-xs font-medium">
                <SelectValue placeholder="اختر أمين الصندوق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {cashiers.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter 2: Payment Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">طريقة الدفع</label>
            <Select value={selectedPayment} onValueChange={setSelectedPayment}>
              <SelectTrigger className="h-10 text-xs font-medium">
                <SelectValue placeholder="طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="Cash">نقدي</SelectItem>
                <SelectItem value="Card">فيزا / كارت</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter 3: Product Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">البحث بالمنتج / الماركة</label>
            <Input 
              type="text"
              placeholder="اسم المنتج أو الماركة..."
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className="h-10 text-xs font-medium"
            />
          </div>

          {/* Filter 4: Min Total */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">الحد الأدنى (ج.م)</label>
            <Input 
              type="number"
              placeholder="الأدنى..."
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="h-10 text-xs font-medium font-mono"
            />
          </div>

          {/* Filter 5: Max Total */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">الحد الأقصى (ج.م)</label>
            <Input 
              type="number"
              placeholder="الأقصى..."
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="h-10 text-xs font-medium font-mono"
            />
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <StatCard label="إجمالي الفواتير" value={String(totalCount)} />
        <StatCard label="إجمالي الضريبة" value={formatCurrency(totalVat)} />
        <StatCard label="صافي المبيعات" value={formatCurrency(netSales)} />
        <StatCard label="إجمالي المبيعات" value={formatCurrency(totalSales)} highlight />
      </div>

      {/* Print-only compact financial summary table */}
      <div className="hidden print:block mb-4">
        <div className="text-[10px] font-bold mb-1.5 text-slate-800 border-r-2 border-primary pr-2">ملخص البيانات المالية للشركة</div>
        <table className="summary-table">
          <tbody>
            <tr className="bg-slate-50">
              <td className="font-bold p-2 text-right w-1/4">إجمالي الفواتير</td>
              <td className="p-2 text-right w-1/4 font-mono font-semibold">{totalCount}</td>
              <td className="font-bold p-2 text-right w-1/4">إجمالي الضريبة</td>
              <td className="p-2 text-right w-1/4 font-mono font-semibold">{formatCurrency(totalVat)}</td>
            </tr>
            <tr>
              <td className="font-bold p-2 text-right w-1/4">صافي المبيعات</td>
              <td className="p-2 text-right w-1/4 font-mono font-semibold">{formatCurrency(netSales)}</td>
              <td className="font-bold p-2 text-right w-1/4 bg-slate-100 font-extrabold">إجمالي المبيعات</td>
              <td className="p-2 text-left w-1/4 font-black font-mono bg-slate-100 text-slate-900">{formatCurrency(totalSales)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Report Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-sm print:border-none">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-center">عدد الفواتير</TableHead>
              <TableHead className="text-left">إجمالي المبيعات</TableHead>
              <TableHead className="text-left">الضريبة</TableHead>
              <TableHead className="text-left">صافي المبيعات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byDay.map(([day, v]) => (
              <TableRow key={day}>
                <TableCell className="font-mono font-semibold text-right">{day}</TableCell>
                <TableCell className="text-center font-bold">{v.count}</TableCell>
                <TableCell className="text-left font-semibold text-primary">{formatCurrency(v.sales)}</TableCell>
                <TableCell className="text-left text-muted-foreground">{formatCurrency(v.vat)}</TableCell>
                <TableCell className="text-left font-black text-emerald-600">{formatCurrency(v.sales - v.vat)}</TableCell>
              </TableRow>
            ))}
            {byDay.length > 0 && (
              <TableRow className="bg-muted/30 font-black border-t-2 border-slate-900 print:bg-slate-50">
                <TableCell className="text-right font-extrabold text-slate-800">إجمالي التقرير</TableCell>
                <TableCell className="text-center text-slate-900">{totalCount}</TableCell>
                <TableCell className="text-left text-slate-950 font-black">{formatCurrency(totalSales)}</TableCell>
                <TableCell className="text-left text-slate-700">{formatCurrency(totalVat)}</TableCell>
                <TableCell className="text-left text-emerald-700 font-black">{formatCurrency(netSales)}</TableCell>
              </TableRow>
            )}
            {byDay.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground font-semibold">
                  لا توجد عمليات مبيعات مسجلة في هذا الشهر.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sign-off footer for print only */}
      <div className="hidden print:grid grid-cols-4 gap-4 mt-12 pt-8 text-center text-[10px] text-slate-800">
        <div className="space-y-4">
          <p className="font-bold">المسؤول (منشئ التقرير)</p>
          <div className="border-b border-dashed border-slate-400 w-28 mx-auto pt-4" />
          <p className="text-muted-foreground font-semibold">{session?.name || "اسم الموظف"}</p>
        </div>
        <div className="space-y-4">
          <p className="font-bold">المراجع (مدير القسم)</p>
          <div className="border-b border-dashed border-slate-400 w-28 mx-auto pt-4" />
          <p className="text-muted-foreground">التوقيع والتاريخ</p>
        </div>
        <div className="space-y-4">
          <p className="font-bold">الحسابات (المحاسب المالي)</p>
          <div className="border-b border-dashed border-slate-400 w-28 mx-auto pt-4" />
          <p className="text-muted-foreground">التوقيع والتاريخ</p>
        </div>
        <div className="space-y-4">
          <p className="font-bold">الاعتماد (المدير العام)</p>
          <div className="border-b border-dashed border-slate-400 w-28 mx-auto pt-4" />
          <p className="text-muted-foreground">موافق / معتمد</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div 
      className={`rounded-xl border border-border p-4 shadow-xs transition-all duration-200 ${
        highlight 
          ? "bg-primary text-primary-foreground border-primary/20 scale-[1.01]" 
          : "bg-card hover:border-muted-foreground/30"
      }`}
    >
      <div 
        className={`text-xs font-bold uppercase tracking-wider ${
          highlight ? "text-primary-foreground/80" : "text-muted-foreground"
        }`}
      >
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function ShiftsReport() {
  const { session } = useSession();
  const [printShift, setPrintShift] = useState<Shift | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [tick, setTick] = useState(0);

  const shifts = useMemo(() => {
    const list = shiftService.getShifts();
    if (session?.role === "cashier") {
      const getLocalDateString = (offsetDays = 0) => {
        const date = new Date();
        date.setDate(date.getDate() - offsetDays);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      const today = getLocalDateString(0);
      const yesterday = getLocalDateString(1);

      return list.filter((s) => {
        const isOwnShift = s.cashierId === session?.id;
        if (!isOwnShift) return false;
        
        const isTodayOrYesterday = s.shiftDay === today || s.shiftDay === yesterday;
        const isOpen = s.status === "open";
        
        return isTodayOrYesterday || isOpen;
      });
    }
    return list;
  }, [session, tick]);

  const forceRefresh = () => setTick((t) => t + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border no-print">
        <div className="text-right">
          <h3 className="font-bold text-sm text-foreground">جرد وتدقيق الورديات</h3>
          <p className="text-xs text-muted-foreground mt-0.5">استعراض تفاصيل الورديات المغلقة والنشطة وجرد الصندوق</p>
        </div>
        <Button variant="outline" size="sm" onClick={forceRefresh} className="font-semibold gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> تحديث البيانات
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-right">يوم الوردية</TableHead>
              <TableHead className="text-right">أمين الصندوق</TableHead>
              <TableHead className="text-right">وقت البدء</TableHead>
              <TableHead className="text-right">المبلغ الافتتاحي</TableHead>
              <TableHead className="text-right">النقدي المتوقع</TableHead>
              <TableHead className="text-right">الفعلي بالدرج</TableHead>
              <TableHead className="text-right">الفارق</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-center w-[150px]">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map((s) => {
              const variance = s.actualCash !== undefined ? s.actualCash - s.expectedCash : null;
              const canPrint = session?.role !== "cashier" || (s.cashierId === session.id && session?.permissions?.canPrintSpotCheck !== false);

              return (
                <TableRow key={s.id} className="hover:bg-muted/10">
                  <TableCell className="font-bold text-amber-700 font-mono text-right">{s.shiftDay}</TableCell>
                  <TableCell className="font-semibold text-right">{s.cashierName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right">
                    {s.startTime ? new Date(s.startTime).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' }) : ""}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(s.openingCash)}</TableCell>
                  <TableCell className="text-right">
                    {s.status === "open" && session?.role === "cashier"
                      ? "•••• ج.م"
                      : formatCurrency(s.expectedCash)}
                  </TableCell>
                  <TableCell className="text-right">{s.actualCash !== undefined ? formatCurrency(s.actualCash) : "-"}</TableCell>
                  <TableCell className="font-semibold text-right">
                    {s.status === "open" && session?.role === "cashier" ? (
                      "•••• ج.م"
                    ) : variance === null ? (
                      "-"
                    ) : variance === 0 ? (
                      <span className="text-emerald-600">0.00 ج.م</span>
                    ) : variance > 0 ? (
                      <span className="text-emerald-600">+{formatCurrency(variance)}</span>
                    ) : (
                      <span className="text-destructive">{formatCurrency(variance)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        s.status === "open"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.status === "open" ? "نشطة" : "مغلقة"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5 no-print">
                      {canPrint && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-700 hover:text-amber-800 hover:bg-amber-500/10"
                          onClick={() => setPrintShift(s)}
                          title="طباعة جرد الوردية"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      )}
                      {(session?.role === "admin" || session?.role === "developer") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={() => setEditingShift(s)}
                          title="تعديل يوم الوردية"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {!canPrint && !(session?.role === "admin" || session?.role === "developer") && "-"}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {shifts.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground font-semibold">
                  لا يوجد سجل ورديات متاح حالياً.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ShiftPrintDialog
        open={!!printShift}
        onClose={() => setPrintShift(null)}
        shift={printShift}
      />

      <EditShiftDayDialog
        open={!!editingShift}
        onClose={() => setEditingShift(null)}
        shift={editingShift}
        onSaved={forceRefresh}
      />
    </div>
  );
}

function ShiftPrintDialog({
  open,
  onClose,
  shift,
}: {
  open: boolean;
  onClose: () => void;
  shift: Shift | null;
}) {
  if (!shift) return null;
  const settings = store.settings;

  const hasActualCash = shift.actualCash !== undefined && shift.actualCash !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[360px] p-4 max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="pb-1 text-right">
          <DialogTitle className="text-sm">تقرير جرد الوردية (Spot Check)</DialogTitle>
        </DialogHeader>

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
            #root,
            [data-radix-portal],
            body > *:not(#receipt-print-only) {
              display: none !important;
            }
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
              font-family: monospace !important;
              font-size: ${settings.receiptFontSize || 11}px !important;
            }
            #receipt-print-only * {
              font-family: monospace !important;
              color: black !important;
              border-color: black !important;
              opacity: 1 !important;
            }
            #receipt-print-only table,
            #receipt-print-only td,
            #receipt-print-only th {
              border-color: black !important;
            }
          }
        `}</style>

        <div id="shift-print-area" className="rounded-md border border-border bg-white p-3 font-mono text-[11px] leading-normal text-black relative text-right">
          {/* Header */}
          <div className="text-center mb-1">
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover mx-auto mb-1.5 border border-border bg-white" />
            )}
            <div className="text-sm font-extrabold text-black">{settings.companyNameAr}</div>
            <div className="text-[10px] mt-0.5 text-black">{settings.sloganAr}</div>
            <div className="text-[11px] font-black mt-2 bg-black/5 py-1 text-black text-center rounded">تقرير جرد الوردية (Spot Check)</div>
          </div>
          
          <div className="my-1.5 border-t border-dashed border-black/60" />
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-0.5 text-[10px] text-black">
            <div>يوم الوردية:</div>
            <div className="text-left font-bold">{shift.shiftDay}</div>
            <div>أمين الصندوق:</div>
            <div className="text-left">{shift.cashierName}</div>
            <div>الحالة:</div>
            <div className="text-left font-bold">{shift.status === "open" ? "نشطة (مفتوحة)" : "مغلقة"}</div>
            <div>وقت البدء:</div>
            <div className="text-left">{new Date(shift.startTime).toLocaleString("ar-EG")}</div>
            {shift.endTime && (
              <>
                <div>وقت الإغلاق:</div>
                <div className="text-left">{new Date(shift.endTime).toLocaleString("ar-EG")}</div>
              </>
            )}
          </div>
          
          <div className="my-1.5 border-t border-dashed border-black/60" />
          
          {/* Statistics */}
          <div className="space-y-1 text-[10px] text-black">
            <div className="flex justify-between">
              <span>المبلغ الافتتاحي:</span>
              <span className="font-semibold">{formatCurrency(shift.openingCash)}</span>
            </div>
            <div className="flex justify-between">
              <span>المبيعات النقدية:</span>
              <span className="font-semibold">{formatCurrency(shift.cashSalesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>المبيعات بالبطاقة (كارت):</span>
              <span className="font-semibold">{formatCurrency(shift.cardSalesTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-black/20 pt-1">
              <span>إجمالي المبيعات:</span>
              <span className="font-bold">{formatCurrency(shift.salesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>عدد عمليات البيع:</span>
              <span className="font-semibold">{shift.salesCount}</span>
            </div>
            
            <div className="my-1.5 border-t border-dashed border-black/60" />
            
            <div className="flex justify-between text-xs font-bold bg-black/5 p-1 rounded">
              <span>النقدي المتوقع بالدرج:</span>
              <span>{formatCurrency(shift.expectedCash)}</span>
            </div>

            {hasActualCash && (
              <>
                <div className="flex justify-between text-xs font-bold pt-1">
                  <span>النقدي الفعلي بالدرج:</span>
                  <span>{formatCurrency(shift.actualCash!)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-t border-black/40 pt-1">
                  <span>الفارق (عجز/زيادة):</span>
                  <span>{formatCurrency(shift.actualCash! - shift.expectedCash)}</span>
                </div>
              </>
            )}
          </div>
          
          {shift.notes && (
            <>
              <div className="my-1.5 border-t border-dashed border-black/60" />
              <div className="text-[9px] text-right leading-normal text-black">
                <b>ملاحظات:</b> {shift.notes}
              </div>
            </>
          )}

          <div className="my-1.5 border-t border-dashed border-black/60" />
          <div className="text-center text-[9px] text-black/80 font-bold">
            تاريخ الطباعة: {new Date().toLocaleString("ar-EG")}
          </div>
        </div>
        
        <DialogFooter className="gap-1.5 mt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>إغلاق</Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> طباعة
          </Button>
        </DialogFooter>
      </DialogContent>

      {open && typeof document !== "undefined" && createPortal(
        <div id="receipt-print-only" dir="rtl" className="text-right">
          <div className="text-center mb-2">
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover mx-auto mb-1.5 border border-border bg-white" />
            )}
            <div className="text-sm font-extrabold">{settings.companyNameAr}</div>
            <div className="text-[10px] text-black/70">{settings.sloganAr}</div>
            <div className="text-[11px] font-black mt-1.5 border border-black/20 py-0.5 rounded text-center bg-black/5">
              تقرير جرد الوردية (Spot Check)
            </div>
          </div>

          <div className="my-2 border-t-2 border-dashed border-black" />

          <div className="grid grid-cols-2 gap-y-1 text-[10px] text-black">
            <div><b>يوم الوردية:</b></div>
            <div className="text-left font-bold">{shift.shiftDay}</div>
            <div><b>أمين الصندوق:</b></div>
            <div className="text-left">{shift.cashierName}</div>
            <div><b>الحالة:</b></div>
            <div className="text-left font-bold">{shift.status === "open" ? "نشطة (مفتوحة)" : "مغلقة"}</div>
            <div><b>وقت البدء:</b></div>
            <div className="text-left">{new Date(shift.startTime).toLocaleString("ar-EG")}</div>
            {shift.endTime && (
              <>
                <div><b>وقت الإغلاق:</b></div>
                <div className="text-left">{new Date(shift.endTime).toLocaleString("ar-EG")}</div>
              </>
            )}
          </div>

          <div className="my-2 border-t border-dashed border-black" />

          <div className="space-y-1 text-[10px] text-black">
            <div className="flex justify-between">
              <span>المبلغ الافتتاحي:</span>
              <span>{formatCurrency(shift.openingCash)}</span>
            </div>
            <div className="flex justify-between">
              <span>المبيعات النقدية:</span>
              <span>{formatCurrency(shift.cashSalesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>المبيعات بالبطاقة (كارت):</span>
              <span>{formatCurrency(shift.cardSalesTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-black/20 pt-1 font-bold">
              <span>إجمالي المبيعات:</span>
              <span>{formatCurrency(shift.salesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>عدد عمليات البيع:</span>
              <span>{shift.salesCount}</span>
            </div>
          </div>

          <div className="my-2 border-t border-dashed border-black" />

          <div className="space-y-1 text-[10px] text-black">
            <div className="flex justify-between font-bold bg-black/5 px-1.5 py-1 rounded">
              <span>النقدي المتوقع بالدرج:</span>
              <span>{formatCurrency(shift.expectedCash)}</span>
            </div>
            {hasActualCash && (
              <>
                <div className="flex justify-between font-bold pt-0.5">
                  <span>النقدي الفعلي بالدرج:</span>
                  <span>{formatCurrency(shift.actualCash!)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-black/30 pt-1">
                  <span>الفارق (عجز/زيادة):</span>
                  <span>{formatCurrency(shift.actualCash! - shift.expectedCash)}</span>
                </div>
              </>
            )}
          </div>

          {shift.notes && (
            <>
              <div className="my-2 border-t border-dashed border-black" />
              <div className="text-[9px] leading-normal text-black">
                <b>ملاحظات:</b> {shift.notes}
              </div>
            </>
          )}

          <div className="my-2 border-t border-dashed border-black" />
          <div className="text-center text-[9px] text-black font-bold">
            تاريخ الطباعة: {new Date().toLocaleString("ar-EG")}
          </div>
        </div>,
        document.body
      )}
    </Dialog>
  );
}

interface EditShiftDayDialogProps {
  open: boolean;
  onClose: () => void;
  shift: Shift | null;
  onSaved: () => void;
}

function EditShiftDayDialog({ open, onClose, shift, onSaved }: EditShiftDayDialogProps) {
  const [newDay, setNewDay] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shift) {
      setNewDay(shift.shiftDay);
    }
  }, [shift]);

  if (!shift) return null;

  const handleSave = async () => {
    const trimmed = newDay.trim();
    if (!trimmed) {
      toast.error("يرجى إدخال يوم الوردية");
      return;
    }
    // Simple validation for YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(trimmed)) {
      toast.error("صيغة التاريخ غير صحيحة، يرجى استخدام YYYY-MM-DD");
      return;
    }

    try {
      setSaving(true);
      await shiftService.updateShiftDay(shift.id, trimmed);
      toast.success("تم تعديل يوم الوردية وجميع المعاملات المرتبطة بها بنجاح");
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "فشل تعديل يوم الوردية");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-4" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-right">تعديل يوم الوردية</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 my-3 text-right">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3 text-xs text-amber-800 dark:text-amber-300">
            ⚠️ <b>تنبيه هام:</b> تعديل يوم الوردية سيقوم بنقل الوردية وتحديث تاريخ <b>جميع المبيعات والمعاملات المسجلة خلال هذه الوردية</b> تلقائياً في السحابة لتطابق اليوم الجديد والحفاظ على دقة التقارير.
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs border border-border p-2.5 rounded-lg bg-muted/20">
            <div>
              <span className="text-muted-foreground block">أمين الصندوق</span>
              <span className="font-bold text-foreground">{shift.cashierName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">تاريخ البدء</span>
              <span className="font-bold text-foreground font-mono">{formatDateTime(shift.startTime)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">يوم الوردية الجديد (التاريخ)</label>
            <Input
              type="date"
              value={newDay}
              onChange={(e) => setNewDay(e.target.value)}
              className="text-right font-mono"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 justify-start">
          <Button variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "جاري الحفظ..." : "حفظ التعديل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
