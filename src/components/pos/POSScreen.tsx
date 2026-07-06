import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Minus, Trash2, X, Printer, CreditCard, Banknote, CheckCircle2, UserPlus, Zap, Play, ShoppingCart, Star } from "lucide-react";
import { toast } from "sonner";

import { productService } from "@/services/productService";
import { customerService } from "@/services/customerService";
import { saleService } from "@/services/saleService";
import { shiftService } from "@/services/shiftService";
import { store } from "@/services/store";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import type { Customer, CustomerCar, InvoiceItem, PaymentMethod, Product, ProductCategory } from "@/types";
import { formatCurrency, nextOilChangeKm } from "@/utils/format";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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

const QUICK_SERVICES = [
  { labelKey: "تغيير زيت", productIds: ["p1", "p11"] },
  { labelKey: "تغيير زيت + فلتر", productIds: ["p2", "p12"] },
  { labelKey: "تغيير زيت + فلتر هواء", productIds: ["p1", "p11", "p17"] },
  { labelKey: "تغيير زيت + فلتر تكييف", productIds: ["p1", "p11", "p22"] },
  { labelKey: "صيانة كاملة للسيارة", productIds: ["p2", "p12", "p17", "p22", "p27"] },
];

export function POSScreen() {
  const { session } = useSession();
  const { t } = useLanguage();

  const [activeShift, setActiveShift] = useState(() => shiftService.getActiveShift());
  const [openingCash, setOpeningCash] = useState("0");

  const [cartOpen, setCartOpen] = useState(true);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "All">("All");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState(0);

  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [notFound, setNotFound] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [addCarOpen, setAddCarOpen] = useState(false);

  const [currentKm, setCurrentKm] = useState<number | "">("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<ReturnType<typeof saleService.create> | null>(null);

  const phoneRef = useRef<HTMLInputElement>(null);

  // Read feature flag for VAT
  const vatEnabled = localStorage.getItem("dev_feature_vat") !== "false";
  const VAT_RATE = vatEnabled ? 0.15 : 0.0;

  useEffect(() => {
    if (activeShift) {
      phoneRef.current?.focus();
    }
  }, [activeShift]);

  // Autocomplete Suggestions for Customers
  const customerSuggestions = useMemo(() => {
    if (phone.trim().length < 1 || customer) return [];
    const searchVal = phone.trim().toLowerCase();
    return customerService.list().filter(
      (c) => c.phone.includes(searchVal) || c.name.toLowerCase().includes(searchVal)
    ).slice(0, 5); // Limit suggestions list to top 5 matches
  }, [phone, customer]);

  // Auto-select exact matching phone number if 10/11 digits are typed
  useEffect(() => {
    if (phone.trim().length >= 10 && !customer) {
      const exactMatch = customerService.findByPhone(phone.trim());
      if (exactMatch) {
        setCustomer(exactMatch);
        setSelectedCarId(exactMatch.cars?.[0]?.id || "default");
        setNotFound(false);
        setCurrentKm(exactMatch.cars?.[0]?.currentKm ?? exactMatch.currentKm);
      }
    }
  }, [phone, customer]);

  // Determine if we should show customer not found notice
  useEffect(() => {
    if (phone.trim().length >= 6 && !customer && customerSuggestions.length === 0) {
      setNotFound(true);
    } else {
      setNotFound(false);
    }
  }, [phone, customer, customerSuggestions]);

  // Selected vehicle details memo
  const activeCar = useMemo(() => {
    if (!customer || !customer.cars) return null;
    return customer.cars.find((car) => car.id === selectedCarId) || customer.cars[0] || null;
  }, [customer, selectedCarId]);

  // Sync odometer reading when active car changes
  useEffect(() => {
    if (activeCar) {
      setCurrentKm(activeCar.currentKm);
    }
  }, [activeCar]);

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

  const popularProducts = useMemo(() => {
    return store.products.filter((p) => p.isPopular);
  }, [query, category, items]);

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

    // Automatically open the cart when an item is added
    setCartOpen(true);
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
    setSelectedCarId("");
    setNotFound(false);
    setCurrentKm("");
    phoneRef.current?.focus();
  }

  function runQuickService(qs: typeof QUICK_SERVICES[0]) {
    qs.productIds.forEach((pid) => {
      const p = productService.get(pid);
      if (p) addProduct(p);
    });
    toast.success(`تمت إضافة: ${qs.labelKey}`);
  }

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const amount = parseFloat(openingCash);
    if (isNaN(amount) || amount < 0) {
      toast.error("يرجى إدخال مبلغ افتتاح صحيح");
      return;
    }

    const newShift = shiftService.openShift(session.id, session.name, amount);
    setActiveShift(newShift);
    toast.success(t("shift_opened"));
  };

  function completeSale(method: PaymentMethod) {
    if (!activeShift) {
      toast.error(t("no_active_shift"));
      return;
    }
    if (items.length === 0) {
      toast.error("يرجى إضافة منتجات أولاً");
      return;
    }
    if (!customer || !activeCar) {
      toast.error("يرجى تحديد أو إنشاء عميل");
      return;
    }
    const km = typeof currentKm === "number" ? currentKm : activeCar.currentKm;
    const oilItem = items.find((i) => {
      const p = productService.get(i.productId);
      return p?.category === "Engine Oil";
    });
    const oilProduct = oilItem ? productService.get(oilItem.productId) : null;
    const oilMileage = oilProduct?.oilMileage;

    const sale = saleService.create({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      carBrand: activeCar.brand,
      carModel: activeCar.model,
      km,
      cashierId: session?.id || "unknown",
      cashierName: session?.name || "unknown",
      items,
      subtotal,
      discount,
      vat,
      total,
      paymentMethod: method,
      oilUsed: oilItem?.name,
      oilMileage: oilMileage,
    });
    
    // Update specific car properties under the customer list
    const updatedCars = customer.cars?.map((car) => {
      if (car.id === selectedCarId) {
        return {
          ...car,
          currentKm: km,
          lastServiceDate: new Date().toISOString().split("T")[0],
          lastOilUsed: oilItem?.name ?? car.lastOilUsed,
          lastOilMileage: oilMileage ?? car.lastOilMileage,
        };
      }
      return car;
    }) || [];

    customerService.update(customer.id, {
      cars: updatedCars,
    });

    // Record transaction in current active shift
    shiftService.recordSale(total, method);

    setLastSale(sale);
    setReceiptOpen(true);
    toast.success(`${t("success_sale")} — ${sale.invoiceNumber}`);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative">
      {/* LEFT: Products */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-border relative">
        <div className="border-b border-border bg-card px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("search_products")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 rounded-lg border pr-4 pl-10 text-sm w-full"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  category === c
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-secondary text-secondary-foreground hover:bg-accent",
                )}
              >
                {c === "All"
                  ? "الكل"
                  : c === "Engine Oil"
                  ? "زيت محرك"
                  : c === "Oil Filter"
                  ? "فلتر زيت"
                  : c === "Air Filter"
                  ? "فلتر هواء"
                  : c === "Cabin Filter"
                  ? "فلتر تكييف"
                  : c === "Fuel Filter"
                  ? "فلتر بنزين"
                  : c === "Additives"
                  ? "إضافات"
                  : "إكسسوارات"}
              </button>
            ))}
          </div>
        </div>

        {/* Quick services */}
        <div className="border-b border-border bg-accent/40 px-4 py-2 flex flex-wrap gap-y-2 justify-between items-center">
          <div className="flex flex-col">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Zap className="h-3 w-3 text-amber-500" /> الباقات السريعة
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SERVICES.map((qs) => (
                <button
                  key={qs.labelKey}
                  onClick={() => runQuickService(qs)}
                  className="rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {qs.labelKey}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Popular products list */}
        {popularProducts.length > 0 && (
          <div className="border-b border-border bg-amber-500/5 px-4 py-2">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> المنتجات الشائعة / سريعة الوصول
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="rounded-md border border-amber-500/20 bg-card hover:bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-foreground flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                >
                  <span>{p.name}</span>
                  <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1 py-0.2 rounded font-black">
                    {p.sellingPrice.toFixed(0)} ج.م
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="group flex h-26 flex-col justify-between rounded-lg border border-border bg-card p-2.5 text-left transition-all hover:border-primary hover:shadow-sm active:scale-[0.98]"
              >
                <div>
                  <div className="text-xs font-bold leading-snug text-foreground line-clamp-2">
                    {p.name}
                  </div>
                  <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">{p.brand}</div>
                </div>
                <div className="flex items-end justify-between w-full mt-1">
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-semibold text-secondary-foreground">
                    {p.category === "Engine Oil"
                      ? "زيت"
                      : p.category === "Oil Filter"
                      ? "فلتر زيت"
                      : p.category === "Air Filter"
                      ? "فلتر هواء"
                      : "أخرى"}
                  </span>
                  <span className="text-base font-black text-primary">
                    {p.sellingPrice.toFixed(0)}
                  </span>
                </div>
              </button>
            ))}
            {products.length === 0 && (
              <div className="col-span-full py-16 text-center text-muted-foreground">
                لم يتم العثور على منتجات
              </div>
            )}
          </div>
        </div>

        {/* Floating Cart Button when cart is collapsed */}
        {!cartOpen && (
          <button
            onClick={() => setCartOpen(true)}
            className="absolute bottom-6 right-6 z-30 flex h-14 items-center gap-3 rounded-full bg-emerald-600 px-6 font-bold text-white shadow-xl hover:bg-emerald-500 active:scale-95 transition-all border border-emerald-500/20"
          >
            <ShoppingCart className="h-6 w-6" />
            <span>عرض السلة ({items.length})</span>
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs">{formatCurrency(total)}</span>
          </button>
        )}
      </div>

      {/* RIGHT: Invoice (Cart) */}
      <div
        className={cn(
          "flex flex-col bg-card border-l border-border transition-all duration-300 ease-in-out overflow-hidden shrink-0",
          cartOpen ? "w-[330px]" : "w-0 border-l-0"
        )}
      >
        {/* Customer section */}
        <div className="border-b border-border p-3 relative">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>بحث وتعيين العميل</span>
            <button
              onClick={() => setCartOpen(false)}
              className="p-1 rounded hover:bg-accent text-muted-foreground"
              title="إخفاء السلة"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Input
              ref={phoneRef}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="اكتب اسم العميل أو رقم التليفون..."
              className="h-9 rounded-md border text-xs font-medium"
              inputMode="search"
            />
            {phone && (
              <button
                onClick={() => {
                  setPhone("");
                  setCustomer(null);
                  setNotFound(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {customerSuggestions.length > 0 && (
            <div className="absolute left-3 right-3 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg z-50 p-1 divide-y divide-border">
              {customerSuggestions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCustomer(c);
                    setPhone(c.phone);
                    setSelectedCarId(c.cars?.[0]?.id || "default");
                    setCurrentKm(c.cars?.[0]?.currentKm ?? c.currentKm);
                  }}
                  className="flex w-full flex-col p-2 text-left rounded hover:bg-accent text-[11px] transition-colors"
                >
                  <div className="font-bold text-foreground">{c.name}</div>
                  <div className="text-muted-foreground text-[10px] mt-0.5">
                    {c.phone} | {c.cars?.[0]?.brand} {c.cars?.[0]?.model}
                    {c.cars && c.cars.length > 1 && ` (+${c.cars.length - 1} سيارات أخرى)`}
                  </div>
                </button>
              ))}
            </div>
          )}

          {customer && (
            <div className="mt-2 space-y-1.5 rounded-md bg-primary/5 p-2 text-xs">
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
                  <X className="h-3 w-3" />
                </button>
              </div>

              {/* Vehicle selector for customer */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] text-muted-foreground font-bold">السيارة المختارة:</span>
                  <button
                    onClick={() => setAddCarOpen(true)}
                    className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> إضافة سيارة أخرى
                  </button>
                </div>
                {customer.cars && customer.cars.length > 1 ? (
                  <select
                    value={selectedCarId}
                    onChange={(e) => setSelectedCarId(e.target.value)}
                    className="h-8 rounded border border-border bg-card text-xs font-semibold w-full px-1.5 focus:outline-none"
                  >
                    {customer.cars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.brand} {car.model}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-foreground text-[11px] font-bold bg-card border border-border/50 rounded px-2 py-1 flex items-center justify-between">
                    <span>{activeCar?.brand} {activeCar?.model}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">السيارة الوحيدة</span>
                  </div>
                )}
              </div>

              <div className="text-muted-foreground text-[10px]">
                الهاتف: {customer.phone}
              </div>

              {activeCar && (
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/40 mt-1.5">
                  <div>
                    <Label className="text-[9px] uppercase text-muted-foreground">{t("km")}</Label>
                    <Input
                      type="number"
                      value={currentKm}
                      onChange={(e) =>
                        setCurrentKm(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="text-[10px] leading-tight flex flex-col justify-center">
                    <div className="text-muted-foreground">آخر زيارة: <span className="font-semibold text-foreground">{activeCar.lastServiceDate ?? "—"}</span></div>
                    <div className="mt-0.5 text-muted-foreground truncate" title={activeCar.lastOilUsed}>آخر زيت: <span className="font-semibold text-foreground">{activeCar.lastOilUsed ?? "—"}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}
          {notFound && !customer && (
            <div className="mt-2 rounded bg-destructive/5 border border-dashed border-destructive/30 p-2 text-xs">
              <div className="mb-1.5 font-semibold text-destructive">العميل غير مسجل</div>
              <Button
                onClick={() => setNewCustomerOpen(true)}
                className="w-full h-8 text-xs"
                size="sm"
              >
                <UserPlus className="mr-1 h-3.5 w-3.5" /> إنشاء عميل جديد
              </Button>
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <div className="text-3xl">🧾</div>
              <div className="mt-1.5 text-xs">{t("cart_empty")}.<br />انقر على منتج لإضافته.</div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((it) => (
                <div
                  key={it.productId}
                  className="rounded-md border border-border bg-background p-2"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1 text-left">
                      <div className="truncate text-xs font-bold leading-tight" title={it.name}>{it.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatCurrency(it.unitPrice)} للوحدة
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(it.productId)}
                      className="grid h-6 w-6 place-items-center rounded text-destructive hover:bg-destructive/10 shrink-0"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => changeQty(it.productId, -1)}
                        className="grid h-6 w-6 place-items-center rounded bg-secondary text-secondary-foreground hover:bg-accent"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold">{it.quantity}</span>
                      <button
                        onClick={() => changeQty(it.productId, 1)}
                        className="grid h-6 w-6 place-items-center rounded bg-secondary text-secondary-foreground hover:bg-accent"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-xs font-bold">
                      {formatCurrency(it.quantity * it.unitPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-border bg-background p-3">
          <div className="space-y-1 text-xs">
            <Row label={t("subtotal")} value={formatCurrency(subtotal)} />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("discount")}</span>
              <Input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="h-7 w-20 text-right font-bold text-xs"
              />
            </div>
            <Row label={vatEnabled ? t("vat") : "الضريبة (معطلة)"} value={formatCurrency(vat)} />
            <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-lg font-bold">
              <span>{t("total")}</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => completeSale("Cash")}
              className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-green-600 text-sm font-bold text-white shadow hover:bg-green-700 active:scale-[0.98]"
            >
              <Banknote className="h-4 w-4" /> {t("pay_cash")}
            </button>
            <button
              onClick={() => completeSale("Card")}
              className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow hover:bg-primary/90 active:scale-[0.98]"
            >
              <CreditCard className="h-4 w-4" /> {t("pay_card")}
            </button>
            <button
              onClick={() => lastSale && setReceiptOpen(true)}
              disabled={!lastSale}
              className="flex h-9 items-center justify-center gap-1 rounded-lg bg-secondary text-xs font-bold text-secondary-foreground hover:bg-accent disabled:opacity-40"
            >
              <Printer className="h-3.5 w-3.5" /> طباعة
            </button>
            <button
              onClick={clearInvoice}
              className="flex h-9 items-center justify-center gap-1 rounded-lg bg-destructive/10 text-xs font-bold text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" /> مسح
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
          setSelectedCarId(c.cars?.[0]?.id || "default");
          setCurrentKm(c.cars?.[0]?.currentKm || c.currentKm);
        }}
      />

      {/* Add New Car Dialog for existing customer */}
      <AddCarDialog
        open={addCarOpen}
        onOpenChange={setAddCarOpen}
        customerName={customer?.name || ""}
        onSave={(carData) => {
          if (customer) {
            const newCar = customerService.addCar(customer.id, carData);
            const updated = customerService.get(customer.id);
            if (updated) {
              setCustomer(updated);
              setSelectedCarId(newCar.id);
              setCurrentKm(newCar.currentKm);
            }
          }
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
      toast.error("يرجى ملء جميع الحقول المطلوبة");
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
    toast.success("تم تسجيل العميل بنجاح");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>تسجيل عميل جديد</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2 text-left">
          <Field label="اسم العميل">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
          </Field>
          <Field label="رقم الجوال">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ماركة السيارة">
              <Input value={carBrand} onChange={(e) => setCarBrand(e.target.value)} className="h-11" />
            </Field>
            <Field label="طراز السيارة">
              <Input value={carModel} onChange={(e) => setCarModel(e.target.value)} className="h-11" />
            </Field>
          </div>
          <Field label="عداد الكيلومتر الحالي">
            <Input
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value === "" ? "" : Number(e.target.value))}
              className="h-11"
            />
          </Field>
          <Field label="ملاحظات (اختياري)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save}>حفظ ومتابعة</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCarDialog({
  open,
  onOpenChange,
  customerName,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customerName: string;
  onSave: (car: Omit<CustomerCar, "id">) => void;
}) {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [km, setKm] = useState<number | "">("");

  useEffect(() => {
    if (open) {
      setBrand("");
      setModel("");
      setKm("");
    }
  }, [open]);

  function handleSave() {
    if (!brand || !model || km === "") {
      toast.error("يرجى ملء جميع حقول بيانات السيارة");
      return;
    }
    onSave({
      brand,
      model,
      currentKm: Number(km),
    });
    onOpenChange(false);
    toast.success("تم إضافة السيارة الجديدة للعميل");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة سيارة جديدة للعميل: {customerName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2 text-left">
          <Field label="ماركة السيارة">
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} className="h-11" placeholder="مثال: تويوتا، هيونداي" />
          </Field>
          <Field label="طراز السيارة">
            <Input value={model} onChange={(e) => setModel(e.target.value)} className="h-11" placeholder="مثال: كورولا، إلنترا" />
          </Field>
          <Field label="عداد الكيلومتر الحالي">
            <Input
              type="number"
              value={km}
              onChange={(e) => setKm(e.target.value === "" ? "" : Number(e.target.value))}
              className="h-11"
              placeholder="0"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSave}>حفظ وإضافة</Button>
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
  const settings = store.settings;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-4">
        <DialogHeader className="pb-1">
          <DialogTitle className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 className="h-4 w-4" /> اكتملت عملية البيع
          </DialogTitle>
        </DialogHeader>
        
        {/* Print Styles for thermal rolls */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #receipt-print, #receipt-print * {
              visibility: visible;
            }
            #receipt-print {
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

        {/* Compact Thermal Receipt Layout */}
        <div 
          id="receipt-print" 
          className="rounded-md border border-border bg-white p-3 font-mono text-[11px] leading-normal text-black"
        >
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
          
          {/* Customer */}
          <div className="text-[10px] text-left leading-tight">
            <div><b>العميل:</b> {sale.customerName}</div>
            <div><b>الهاتف:</b> {sale.customerPhone}</div>
            <div><b>السيارة:</b> {sale.carBrand} {sale.carModel} — {sale.km.toLocaleString()} كم</div>
          </div>
          
          <div className="my-1.5 border-t border-dashed border-black/60" />
          
          {/* Product Items Table */}
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
            <Row label="الإجمالي الفرعي" value={sale.subtotal.toFixed(0)} />
            {sale.discount > 0 && <Row label="الخصم" value={`-${sale.discount.toFixed(0)}`} />}
            {sale.vat > 0 && <Row label="الضريبة (15%)" value={sale.vat.toFixed(0)} />}
            <div className="flex justify-between border-t border-black/40 pt-1 text-xs font-bold">
              <span>الإجمالي الكلي</span>
              <span>{sale.total.toFixed(0)} ج.م</span>
            </div>
            <Row label="الدفع" value={sale.paymentMethod === "Cash" ? "نقدي" : "كارت"} />
          </div>
          
          {/* Conditional Next Recommended Change Calculation */}
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
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> طباعة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
