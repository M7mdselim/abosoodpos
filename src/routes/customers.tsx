import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Eye } from "lucide-react";

import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { customerService } from "@/services/customerService";
import { saleService } from "@/services/saleService";
import type { Customer } from "@/types";
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
  const list = useMemo(() => customerService.search(query), [query]);

  return (
    <PageShell
      title="Customers"
      subtitle={`${list.length} of ${customerService.list().length} customers`}
    >
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by phone or name..."
          className="h-12 pl-10 text-base"
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Registered Vehicles</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => {
              const vehicleString = c.cars && c.cars.length > 0
                ? c.cars.map((car) => `${car.brand} ${car.model}`).join(" / ")
                : `${c.carBrand} ${c.carModel}`;

              return (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell className="max-w-xs truncate" title={vehicleString}>
                    {vehicleString}
                  </TableCell>
                  <TableCell>{c.lastServiceDate ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelected(c)}>
                      <Eye className="mr-1 h-4 w-4" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CustomerDetails customer={selected} onClose={() => setSelected(null)} />
    </PageShell>
  );
}

function CustomerDetails({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  if (!customer) return null;
  const history = saleService.byCustomer(customer.id);

  return (
    <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>{customer.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              Customer Info
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm bg-accent/40 p-3 rounded-lg border border-border">
              <Info label="Phone" value={customer.phone} />
              <Info label="Total Visits" value={`${history.length} services`} />
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              Registered Vehicles ({customer.cars?.length || 1})
            </h3>
            <div className="rounded-lg border border-border bg-background overflow-x-auto">
              <Table className="min-w-[650px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Current KM</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead>Last Oil Used</TableHead>
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
                      <TableCell>{car.currentKm.toLocaleString()} KM</TableCell>
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
              Service History ({history.length})
            </h3>
            <div className="max-h-60 overflow-auto rounded-lg border border-border">
              <Table className="min-w-[650px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Odometer</TableHead>
                    <TableHead>Oil Used</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{formatDateTime(s.date)}</TableCell>
                      <TableCell className="font-medium text-xs">
                        {s.carBrand} {s.carModel}
                      </TableCell>
                      <TableCell>{s.km.toLocaleString()} KM</TableCell>
                      <TableCell className="text-xs">{s.oilUsed ?? "—"}</TableCell>
                      <TableCell className="text-xs">{s.items.length} items</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(s.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                        No service history yet
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
