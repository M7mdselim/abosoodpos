import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer, Download, FileSpreadsheet, FileText, CalendarDays } from "lucide-react";

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
import { saleService } from "@/services/saleService";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { useSession } from "@/context/RoleContext";
import { authService } from "@/services/authService";
import { useLanguage } from "@/context/LanguageContext";

export const Route = createFileRoute("/reports")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
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
          #printable-report-area, #printable-report-area * {
            visibility: visible;
          }
          #printable-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 20px !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
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
        </TabsList>
        
        <TabsContent value="daily">
          <DailyReport />
        </TabsContent>
        
        {isAdminOrDev && (
          <TabsContent value="monthly">
            <MonthlyReport />
          </TabsContent>
        )}
      </Tabs>
    </PageShell>
  );
}

function DailyReport() {
  const [date, setDate] = useState(todayISO());
  
  // Exclude voided sales defensively
  const allSales = useMemo(() => saleService.byDate(date), [date]);
  const sales = useMemo(() => allSales.filter(s => s.status !== "voided"), [allSales]);

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
      s.invoiceNumber,
      new Date(s.date).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      s.customerName,
      s.cashierName,
      s.paymentMethod === "Cash" ? "نقدي" : "فيزا / كارت",
      Number(s.total || 0).toFixed(0)
    ]);
    exportExcel(`تقرير-يومي-${date}.csv`, headers, rows);
  };

  return (
    <div id="printable-report-area">
      {/* Header for print only */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">تقرير المبيعات اليومي</h1>
        <p className="text-xs text-muted-foreground mt-1">تاريخ التقرير: {new Date(date).toLocaleDateString("ar-EG")}</p>
        <div className="border-b border-dashed border-black/40 my-3" />
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

      {/* Analytics Summary */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="عدد الفواتير" value={String(totalCount)} />
        <StatCard label="المبيعات النقدية" value={formatCurrency(cash)} />
        <StatCard label="مبيعات الكروت والفيزا" value={formatCurrency(card)} />
        <StatCard label="إجمالي المبيعات" value={formatCurrency(total)} highlight />
      </div>

      {/* Report Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>رقم الفاتورة</TableHead>
              <TableHead>وقت العملية</TableHead>
              <TableHead>العميل</TableHead>
              <TableHead>الكاشير</TableHead>
              <TableHead>الدفع</TableHead>
              <TableHead className="text-right">الإجمالي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs font-semibold">{s.invoiceNumber}</TableCell>
                <TableCell>{new Date(s.date).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                <TableCell className="font-bold">{s.customerName}</TableCell>
                <TableCell>{s.cashierName}</TableCell>
                <TableCell>{s.paymentMethod === "Cash" ? "نقدي" : "فيزا"}</TableCell>
                <TableCell className="text-right font-black text-primary">{formatCurrency(Number(s.total || 0))}</TableCell>
              </TableRow>
            ))}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground font-semibold">
                  لا توجد عمليات مبيعات مسجلة في هذا التاريخ.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MonthlyReport() {
  const [month, setMonth] = useState(thisMonth());
  
  // Exclude voided sales defensively
  const allSales = useMemo(() => saleService.byMonth(month), [month]);
  const sales = useMemo(() => allSales.filter(s => s.status !== "voided"), [allSales]);

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
      v.sales.toFixed(0),
      v.vat.toFixed(0),
      (v.sales - v.vat).toFixed(0)
    ]);
    exportExcel(`تقرير-شهري-${month}.csv`, headers, rows);
  };

  return (
    <div id="printable-report-area">
      {/* Header for print only */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-xl font-bold">تقرير المبيعات الشهري</h1>
        <p className="text-xs text-muted-foreground mt-1">شهر: {month}</p>
        <div className="border-b border-dashed border-black/40 my-3" />
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

      {/* Analytics Summary */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="إجمالي الفواتير" value={String(totalCount)} />
        <StatCard label="إجمالي الضريبة" value={formatCurrency(totalVat)} />
        <StatCard label="صافي المبيعات" value={formatCurrency(netSales)} />
        <StatCard label="إجمالي المبيعات" value={formatCurrency(totalSales)} highlight />
      </div>

      {/* Report Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead className="text-center">عدد الفواتير</TableHead>
              <TableHead className="text-right">إجمالي المبيعات</TableHead>
              <TableHead className="text-right">الضريبة</TableHead>
              <TableHead className="text-right">صافي المبيعات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byDay.map(([day, v]) => (
              <TableRow key={day}>
                <TableCell className="font-mono font-semibold">{day}</TableCell>
                <TableCell className="text-center font-bold">{v.count}</TableCell>
                <TableCell className="text-right font-semibold text-primary">{formatCurrency(v.sales)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(v.vat)}</TableCell>
                <TableCell className="text-right font-black text-emerald-600">{formatCurrency(v.sales - v.vat)}</TableCell>
              </TableRow>
            ))}
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
