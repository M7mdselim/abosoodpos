import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Printer, Download } from "lucide-react";

import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { saleService } from "@/services/saleService";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { useSession } from "@/context/RoleContext";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function todayISO() {
  return new Date().toISOString().split("T")[0];
}
function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

function exportCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function ReportsPage() {
  const { session } = useSession();
  const isAdmin = session.role === "admin";

  return (
    <PageShell title="Reports" subtitle="Daily and monthly sales overview">
      <Tabs defaultValue="daily">
        <TabsList className="mb-4">
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          {isAdmin && <TabsTrigger value="monthly">Monthly Report</TabsTrigger>}
        </TabsList>
        <TabsContent value="daily"><DailyReport /></TabsContent>
        {isAdmin && (
          <TabsContent value="monthly"><MonthlyReport /></TabsContent>
        )}
      </Tabs>
    </PageShell>
  );
}

function DailyReport() {
  const [date, setDate] = useState(todayISO());
  const sales = useMemo(() => saleService.byDate(date), [date]);

  const totalCount = sales.length;
  const cash = sales.filter((s) => s.paymentMethod === "Cash").reduce((s, r) => s + r.total, 0);
  const card = sales.filter((s) => s.paymentMethod === "Card").reduce((s, r) => s + r.total, 0);
  const total = cash + card;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-52" />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              exportCSV(`daily-${date}.csv`, [
                ["Invoice", "Customer", "Cashier", "Payment", "Total"],
                ...sales.map((s) => [s.invoiceNumber, s.customerName, s.cashierName, s.paymentMethod, s.total.toFixed(2)]),
              ])
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-3">
        <Stat label="Invoices" value={String(totalCount)} />
        <Stat label="Cash Sales" value={formatCurrency(cash)} />
        <Stat label="Card Sales" value={formatCurrency(card)} />
        <Stat label="Total Sales" value={formatCurrency(total)} highlight />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.invoiceNumber}</TableCell>
                <TableCell>{formatDateTime(s.date)}</TableCell>
                <TableCell>{s.customerName}</TableCell>
                <TableCell>{s.cashierName}</TableCell>
                <TableCell>{s.paymentMethod}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(s.total)}</TableCell>
              </TableRow>
            ))}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No sales on this date
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
  const sales = useMemo(() => saleService.byMonth(month), [month]);

  const byDay = useMemo(() => {
    const map = new Map<string, { count: number; sales: number; vat: number }>();
    for (const s of sales) {
      const day = s.date.split("T")[0];
      const cur = map.get(day) ?? { count: 0, sales: 0, vat: 0 };
      cur.count += 1;
      cur.sales += s.total;
      cur.vat += s.vat;
      map.set(day, cur);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [sales]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Month</label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-11 w-52" />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              exportCSV(`monthly-${month}.csv`, [
                ["Date", "Invoices", "Sales", "VAT", "Net"],
                ...byDay.map(([d, v]) => [d, v.count, v.sales.toFixed(2), v.vat.toFixed(2), (v.sales - v.vat).toFixed(2)]),
              ])
            }
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Invoices</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">VAT</TableHead>
              <TableHead className="text-right">Net Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byDay.map(([day, v]) => (
              <TableRow key={day}>
                <TableCell>{day}</TableCell>
                <TableCell className="text-right">{v.count}</TableCell>
                <TableCell className="text-right">{formatCurrency(v.sales)}</TableCell>
                <TableCell className="text-right">{formatCurrency(v.vat)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(v.sales - v.vat)}</TableCell>
              </TableRow>
            ))}
            {byDay.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No sales in this month
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border border-border p-4 ${highlight ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <div className={`text-xs font-semibold uppercase ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
