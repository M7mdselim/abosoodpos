import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/customers")({
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

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Car Brand</TableHead>
              <TableHead>Car Model</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-semibold">{c.name}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>{c.carBrand}</TableCell>
                <TableCell>{c.carModel}</TableCell>
                <TableCell>{c.lastServiceDate ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelected(c)}>
                    <Eye className="mr-1 h-4 w-4" /> View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{customer.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              Customer Info
            </h3>
            <div className="space-y-1 text-sm">
              <Info label="Phone" value={customer.phone} />
              <Info label="Last Visit" value={customer.lastServiceDate ?? "—"} />
              <Info label="Last Oil Used" value={customer.lastOilUsed ?? "—"} />
            </div>
          </section>
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              Vehicle Info
            </h3>
            <div className="space-y-1 text-sm">
              <Info label="Brand" value={customer.carBrand} />
              <Info label="Model" value={customer.carModel} />
              <Info label="Current KM" value={customer.currentKm.toLocaleString()} />
            </div>
          </section>
        </div>
        <section className="mt-4">
          <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
            Service History ({history.length})
          </h3>
          <div className="max-h-64 overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Oil Used</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{formatDateTime(s.date)}</TableCell>
                    <TableCell>{s.km.toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{s.oilUsed ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.items.length} items</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(s.total)}
                    </TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No service history yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
