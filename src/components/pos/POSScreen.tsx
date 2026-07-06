import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Minus, Trash2, X, Printer, CreditCard, Banknote, CheckCircle2, UserPlus, Zap } from "lucide-react";
import { toast } from "sonner";

import { productService } from "@/services/productService";
import { customerService } from "@/services/customerService";
import { saleService } from "@/services/saleService";
import { useSession } from "@/context/RoleContext";
import type { Customer, InvoiceItem, PaymentMethod, Product, ProductCategory } from "@/types";
import { formatCurrency, nextOilChangeKm } from "@/utils/format";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES: (ProductCategory | "All")[] = [
  "All",
  "Engine Oil",
  "Oil Filter",
  "Air Filter",
  "Cabin Filter",
  "Fuel Filter",
  "Additives",
  "Accessories",
];

const VAT_RATE = 0.15;

interface QuickService {
  label: string;
  productIds: string[];
}

const QUICK_SERVICES: QuickService[] = [
  { label: "Oil Change", productIds: ["p1", "p11"] },
  { label: "Oil + Filter", productIds: ["p2", "p12"] },
  { label: "Oil + Air Filter", productIds: ["p1", "p11", "p17"] },
  { label: "Oil + Cabin Filter", productIds: ["p1", "p11", "p22"] },
  { label: "Full Service", productIds: ["p2", "p12", "p17", "p22", "p27"] },
];

export function POSScreen() {
  const { session } = useSession();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "All">("All");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState(0);

  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  const [currentKm, setCurrentKm] = useState<number | "">("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<ReturnType<typeof saleService.create> | null>(null);

  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    phoneRef.current?.focus();
  }, []);

  // Auto-search customer on phone change
  useEffect(() => {
    if (phone.trim().length >= 6) {
      const found = customerService.findByPhone(phone);
      if (found) {
        setCustomer(found);
        setNotFound(false);
        setCurrentKm(found.currentKm);
      } else {
        setCustomer(null);
        setNotFound(true);
      }
    } else {
      setCustomer(null);
      setNotFound(false);
    }
  }, [phone]);

  const products = useMemo(() => {
    let list = productService.byCategory(category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.barcode.includes(q),
      );
    }
    return list;
  }, [query, category]);

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const taxable = Math.max(0, subtotal - discount);
  const vat = +(taxable * VAT_RATE).toFixed(2);
  const total = +(taxable + vat).toFixed(2);

  function addProduct(p: Product) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        { productId: p.id, name: p.name, brand: p.brand, unitPrice: p.sellingPrice, quantity: 1 },
      ];
    });
  }

  function changeQty(productId: string, delta: number) {
    setItems((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function clearInvoice() {
    setItems([]);
    setDiscount(0);
    setPhone("");
    setCustomer(null);
    setNotFound(false);
    setCurrentKm("");
    phoneRef.current?.focus();
  }

  function runQuickService(qs: QuickService) {
    qs.productIds.forEach((pid) => {
      const p = productService.get(pid);
      if (p) addProduct(p);
    });
    toast.success(`Added: ${qs.label}`);
  }

  function completeSale(method: PaymentMethod) {
    if (items.length === 0) {
      toast.error("Add products first");
      return;
    }
    if (!customer) {
      toast.error("Select or create a customer");
      return;
    }
    const km = typeof currentKm === "number" ? currentKm : customer.currentKm;
    const oilItem = items.find((i) => {
      const p = productService.get(i.productId);
      return p?.category === "Engine Oil";
    });
    const sale = saleService.create({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      carBrand: customer.carBrand,
      carModel: customer.carModel,
      km,
      cashierId: session.userId,
      cashierName: session.name,
      items,
      subtotal,
      discount,
      vat,
      total,
      paymentMethod: method,
      oilUsed: oilItem?.name,
    });
    customerService.update(customer.id, {
      currentKm: km,
      lastServiceDate: new Date().toISOString().split("T")[0],
      lastOilUsed: oilItem?.name ?? customer.lastOilUsed,
    });
    setLastSale(sale);
    setReceiptOpen(true);
    toast.success(`Sale completed — ${sale.invoiceNumber}`);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* LEFT: Products */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-border">
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search product by name, brand, or barcode..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-14 rounded-xl border-2 pl-12 text-base"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                  category === c
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-secondary text-secondary-foreground hover:bg-accent",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Quick services */}
        <div className="border-b border-border bg-accent/40 px-6 py-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Zap className="h-4 w-4" /> Quick Services
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_SERVICES.map((qs) => (
              <button
                key={qs.label}
                onClick={() => runQuickService(qs)}
                className="rounded-lg bg-primary/10 px-4 py-3 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground"
              >
                {qs.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="group flex h-32 flex-col justify-between rounded-xl border-2 border-border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md active:scale-[0.98]"
              >
                <div>
                  <div className="text-sm font-bold leading-tight text-foreground line-clamp-2">
                    {p.name}
                  </div>
                  <div className="mt-1 text-xs font-medium text-muted-foreground">{p.brand}</div>
                </div>
                <div className="flex items-end justify-between">
                  <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-secondary-foreground">
                    {p.category}
                  </span>
                  <span className="text-lg font-extrabold text-primary">
                    {p.sellingPrice.toFixed(0)}
                  </span>
                </div>
              </button>
            ))}
            {products.length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                No products found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Invoice */}
      <div className="flex w-[420px] flex-col overflow-hidden bg-card">
        {/* Customer section */}
        <div className="border-b border-border p-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Customer
          </div>
          <Input
            ref={phoneRef}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number..."
            className="h-12 rounded-lg border-2 text-base font-medium"
            inputMode="tel"
          />
          {customer && (
            <div className="mt-3 space-y-1.5 rounded-lg bg-primary/5 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">{customer.name}</span>
                <button
                  onClick={() => {
                    setCustomer(null);
                    setPhone("");
                    setCurrentKm("");
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="text-muted-foreground">
                {customer.carBrand} {customer.carModel}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Current KM</Label>
                  <Input
                    type="number"
                    value={currentKm}
                    onChange={(e) =>
                      setCurrentKm(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <div className="text-xs">
                  <div className="text-muted-foreground">Last Visit</div>
                  <div className="font-semibold">{customer.lastServiceDate ?? "—"}</div>
                  <div className="mt-1 text-muted-foreground">Last Oil</div>
                  <div className="truncate font-semibold" title={customer.lastOilUsed}>
                    {customer.lastOilUsed ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          )}
          {notFound && !customer && (
            <div className="mt-3 rounded-lg border-2 border-dashed border-destructive/40 bg-destructive/5 p-3 text-sm">
              <div className="mb-2 font-semibold text-destructive">Customer not found</div>
              <Button
                onClick={() => setNewCustomerOpen(true)}
                className="w-full"
                size="sm"
              >
                <UserPlus className="mr-2 h-4 w-4" /> Create New Customer
              </Button>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <div className="text-4xl">🧾</div>
              <div className="mt-2 text-sm">No items yet.<br />Tap a product to add.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <div
                  key={it.productId}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{it.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(it.unitPrice)} each
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(it.productId)}
                      className="grid h-9 w-9 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => changeQty(it.productId, -1)}
                        className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-secondary-foreground hover:bg-accent"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center text-lg font-bold">{it.quantity}</span>
                      <button
                        onClick={() => changeQty(it.productId, 1)}
                        className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-secondary-foreground hover:bg-accent"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-base font-extrabold">
                      {formatCurrency(it.quantity * it.unitPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-border bg-background p-4">
          <div className="space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatCurrency(subtotal)} />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Discount</span>
              <Input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="h-8 w-24 text-right"
              />
            </div>
            <Row label="VAT (15%)" value={formatCurrency(vat)} />
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-2xl font-extrabold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => completeSale("Cash")}
              className="flex h-16 items-center justify-center gap-2 rounded-xl bg-green-600 text-lg font-bold text-white shadow hover:bg-green-700 active:scale-[0.98]"
            >
              <Banknote className="h-6 w-6" /> Cash
            </button>
            <button
              onClick={() => completeSale("Card")}
              className="flex h-16 items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow hover:bg-primary/90 active:scale-[0.98]"
            >
              <CreditCard className="h-6 w-6" /> Card
            </button>
            <button
              onClick={() => lastSale && setReceiptOpen(true)}
              disabled={!lastSale}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-bold text-secondary-foreground hover:bg-accent disabled:opacity-40"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            <button
              onClick={clearInvoice}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-destructive/10 text-sm font-bold text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          </div>
        </div>
      </div>

      <NewCustomerDialog
        open={newCustomerOpen}
        onOpenChange={setNewCustomerOpen}
        initialPhone={phone}
        onCreated={(c) => {
          setCustomer(c);
          setNotFound(false);
          setPhone(c.phone);
          setCurrentKm(c.currentKm);
        }}
      />

      <ReceiptDialog
        open={receiptOpen}
        onOpenChange={(o) => {
          setReceiptOpen(o);
          if (!o) clearInvoice();
        }}
        sale={lastSale}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function NewCustomerDialog({
  open,
  onOpenChange,
  initialPhone,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialPhone: string;
  onCreated: (c: Customer) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [km, setKm] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setPhone(initialPhone);
      setName("");
      setCarBrand("");
      setCarModel("");
      setKm("");
      setNotes("");
    }
  }, [open, initialPhone]);

  function save() {
    if (!name || !phone || !carBrand || !carModel || km === "") {
      toast.error("Fill all required fields");
      return;
    }
    const created = customerService.create({
      name,
      phone,
      carBrand,
      carModel,
      currentKm: Number(km),
      notes,
    });
    onCreated(created);
    onOpenChange(false);
    toast.success("Customer created");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label="Customer Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
          </Field>
          <Field label="Phone Number">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Car Brand">
              <Input value={carBrand} onChange={(e) => setCarBrand(e.target.value)} className="h-11" />
            </Field>
            <Field label="Car Model">
              <Input value={carModel} onChange={(e) => setCarModel(e.target.value)} className="h-11" />
            </Field>
          </div>
          <Field label="Current Kilometer">
            <Input
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value === "" ? "" : Number(e.target.value))}
              className="h-11"
            />
          </Field>
          <Field label="Notes (optional)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save & Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ReceiptDialog({
  open,
  onOpenChange,
  sale,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sale: ReturnType<typeof saleService.create> | null;
}) {
  if (!sale) return null;
  const nextKm = nextOilChangeKm(sale.km);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" /> Sale Completed
          </DialogTitle>
        </DialogHeader>
        <div id="receipt-print" className="rounded-lg border border-border bg-white p-5 font-mono text-sm text-black">
          <div className="text-center">
            <div className="text-lg font-bold">OilPro Service Center</div>
            <div className="text-xs">Automotive Oil & Filter Services</div>
          </div>
          <div className="my-3 border-t border-dashed border-black" />
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div>Invoice:</div><div className="text-right">{sale.invoiceNumber}</div>
            <div>Date:</div><div className="text-right">{new Date(sale.date).toLocaleString("en-GB")}</div>
            <div>Cashier:</div><div className="text-right">{sale.cashierName}</div>
          </div>
          <div className="my-3 border-t border-dashed border-black" />
          <div className="text-xs">
            <div><b>{sale.customerName}</b> — {sale.customerPhone}</div>
            <div>{sale.carBrand} {sale.carModel} — {sale.km.toLocaleString()} KM</div>
          </div>
          <div className="my-3 border-t border-dashed border-black" />
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-black">
                <th className="text-left">Item</th>
                <th className="text-center">Qty</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((it) => (
                <tr key={it.productId}>
                  <td className="py-1 pr-1">{it.name}</td>
                  <td className="text-center">{it.quantity}</td>
                  <td className="text-right">{(it.quantity * it.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="my-3 border-t border-dashed border-black" />
          <div className="space-y-1 text-xs">
            <Row label="Subtotal" value={sale.subtotal.toFixed(2)} />
            {sale.discount > 0 && <Row label="Discount" value={`-${sale.discount.toFixed(2)}`} />}
            <Row label="VAT (15%)" value={sale.vat.toFixed(2)} />
            <div className="flex justify-between border-t border-black pt-1 text-base font-bold">
              <span>TOTAL</span>
              <span>{sale.total.toFixed(2)} SAR</span>
            </div>
            <Row label="Paid by" value={sale.paymentMethod} />
          </div>
          <div className="my-3 border-t border-dashed border-black" />
          <div className="text-center text-xs">
            <div className="font-bold">Recommended Next Oil Change</div>
            <div className="mt-1 text-lg font-extrabold">{nextKm.toLocaleString()} KM</div>
            <div className="mt-3">Thank you — Drive safe!</div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
