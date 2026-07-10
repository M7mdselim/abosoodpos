import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Plus, Minus, Trash2, X, Printer, CreditCard, Banknote, CheckCircle2, UserPlus, Zap, Play, ShoppingCart, Star, CalendarDays, Calendar, Eye } from "lucide-react";
import { toast } from "sonner";

import { productService } from "@/services/productService";
import { customerService } from "@/services/customerService";
import { saleService } from "@/services/saleService";
import { shiftService, type Shift } from "@/services/shiftService";
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
  const canMakeDiscount = session?.role !== "cashier" || session?.permissions?.canDiscount !== false;
  const categoriesList = useMemo(() => ["All", ...store.categories], [store.categories]);

  const [activeShift, setActiveShift] = useState(() => shiftService.getActiveShift());
  const [openingCash, setOpeningCash] = useState("0");

  const [cartOpen, setCartOpen] = useState(true);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "All">("All");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState(0);

  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerCollapsed, setCustomerCollapsed] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [notFound, setNotFound] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [addCarOpen, setAddCarOpen] = useState(false);

  const [currentKm, setCurrentKm] = useState<number | "">("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [draftReceiptOpen, setDraftReceiptOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lastSale, setLastSale] = useState<ReturnType<typeof saleService.create> | null>(null);

  const phoneRef = useRef<HTMLInputElement>(null);

  // Read feature flag for VAT
  const vatEnabled = localStorage.getItem("dev_feature_vat") !== "false";
  const VAT_RATE = vatEnabled ? 0.14 : 0.0;

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
    let list = productService.byCategory(category).filter((p) => p.isActive !== false);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q)),
      );
    }
    return list;
  }, [query, category]);

  const popularProducts = useMemo(() => {
    return store.products.filter((p) => p.isPopular && p.isActive !== false);
  }, [query, category, items]);

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const taxable = Math.max(0, subtotal - discount);
  const vat = +(taxable * VAT_RATE).toFixed(2);
  const total = +(taxable + vat).toFixed(2);

  const draftSale = useMemo(() => {
    if (items.length === 0) return null;
    return {
      id: "draft",
      invoiceNumber: "XXXXXX",
      date: new Date().toISOString(),
      customerId: customer?.id || "walkin",
      customerName: customer?.name || "عميل سفري",
      customerPhone: customer?.phone || "—",
      carBrand: activeCar?.brand || "—",
      carModel: activeCar?.model || "—",
      km: Number(currentKm) || 0,
      cashierId: session?.id || "u_cashier",
      cashierName: session?.name || "أمين الصندوق",
      items: items.map((it) => ({
        productId: it.productId,
        name: it.name,
        brand: it.brand,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      })),
      subtotal: subtotal,
      discount: discount,
      vat: vat,
      total: total,
      paymentMethod: "Cash" as const,
      status: "active" as const,
    };
  }, [items, customer, activeCar, currentKm, subtotal, discount, vat, total, session]);

  function addProduct(p: Product) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        if (!p.isUnlimited && existing.quantity >= p.stock) {
          toast.error(`عذراً، لا توجد كمية كافية بالمخزن. المتاح: ${p.stock}`);
          return prev;
        }
        return prev.map((i) =>
          i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      if (!p.isUnlimited && p.stock <= 0) {
        toast.error("عذراً، هذا المنتج نفذ من المخزن");
        return prev;
      }
      return [
        ...prev,
        { productId: p.id, name: p.name, brand: p.brand, unitPrice: p.sellingPrice, quantity: 1 },
      ];
    });

    // Automatically open the cart when an item is added (only on desktop to prevent blocking cashier on mobile)
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setCartOpen(true);
    } else {
      toast.success(`تمت إضافة "${p.name}" إلى السلة`, {
        position: "bottom-center",
        duration: 1200,
      });
    }
  }

  function changeQty(productId: string, delta: number) {
    const p = productService.get(productId);
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.productId === productId) {
            const nextQty = i.quantity + delta;
            if (p && !p.isUnlimited && nextQty > p.stock) {
              toast.error(`عذراً، لا يمكن تجاوز الكمية المتاحة في المخزن (${p.stock})`);
              return i;
            }
            return { ...i, quantity: nextQty };
          }
          return i;
        })
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

  function completeSale(method: PaymentMethod, cashAmount?: number, cardAmount?: number) {
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
      return p?.category === "Engine Oil" || p?.category === "زيوت محركات";
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
      cashAmount,
      cardAmount,
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
    shiftService.recordSale(total, method, cashAmount, cardAmount);

    setLastSale(sale);
    setReceiptOpen(true);
    toast.success(`${t("success_sale")} — #${sale.invoiceNumber.replace("INV-", "")}`);
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden relative">
      {/* LEFT: Products */}
      <div className="flex flex-1 flex-col overflow-hidden border-r border-border relative w-full">
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

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none snap-x snap-mandatory">
            {categoriesList.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "snap-start shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
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
                  : c === "Accessories"
                  ? "إكسسوارات"
                  : c}
              </button>
            ))}
          </div>
        </div>



        {/* Popular products list */}
        {popularProducts.length > 0 && (
          <div className="border-b border-border bg-amber-500/5 px-4 py-2">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> المنتجات الشائعة / سريعة الوصول
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularProducts.map((p) => {
                const isOutOfStock = !p.isUnlimited && p.stock <= 0;
                const stockAlertsEnabled = localStorage.getItem("dev_feature_stock_alerts") !== "false";
                
                return (
                  <button
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => addProduct(p)}
                    className={cn(
                      "rounded-md border bg-card px-3 py-1.5 text-xs font-bold text-foreground flex items-center gap-1.5 shadow-xs transition-all",
                      isOutOfStock 
                        ? "border-dashed opacity-40 cursor-not-allowed bg-muted" 
                        : "border-amber-500/20 hover:bg-amber-500/10 active:scale-95"
                    )}
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1 py-0.2 rounded font-black">
                      {p.sellingPrice.toFixed(0)} ج.م
                    </span>
                    {!p.isUnlimited && (
                      <span className={cn(
                        "text-[9px] px-1 rounded-sm font-black",
                        p.stock === 0 
                          ? "bg-destructive/15 text-destructive animate-pulse" 
                          : p.stock <= 5 && stockAlertsEnabled
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {p.stock === 0 ? "نفذ" : `متبقي ${p.stock}`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {products.map((p) => {
              const isOutOfStock = !p.isUnlimited && p.stock <= 0;
              const stockAlertsEnabled = localStorage.getItem("dev_feature_stock_alerts") !== "false";

              return (
                <button
                  key={p.id}
                  disabled={isOutOfStock}
                  onClick={() => addProduct(p)}
                  className={cn(
                    "group flex h-28 flex-col justify-between rounded-lg border border-border bg-card p-2.5 text-left transition-all hover:border-primary hover:shadow-sm",
                    isOutOfStock ? "opacity-40 cursor-not-allowed bg-muted/50 border-dashed" : "active:scale-[0.98]"
                  )}
                >
                  <div className="w-full">
                    <div className="text-xs font-bold leading-snug text-foreground line-clamp-2">
                      {p.name}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-1">
                      <span className="text-[10px] font-medium text-muted-foreground truncate">{p.brand}</span>
                      {!p.isUnlimited && (
                        <span className={cn(
                          "text-[9px] font-bold px-1 rounded-sm shrink-0",
                          p.stock === 0 
                            ? "bg-destructive/15 text-destructive" 
                            : p.stock <= 5 && stockAlertsEnabled
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {p.stock === 0 ? "نفذ" : `مخزن: ${p.stock}`}
                        </span>
                      )}
                      {p.isUnlimited && (
                        <span className="text-[9px] font-bold px-1 rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                          خدمة / ∞
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end justify-between w-full mt-1">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-semibold text-secondary-foreground">
                      {p.category === "Engine Oil"
                        ? "زيت"
                        : p.category === "Oil Filter"
                        ? "فلتر زيت"
                        : p.category === "Air Filter"
                        ? "فلتر هواء"
                        : p.category}
                    </span>
                    <span className="text-base font-black text-primary">
                      {p.sellingPrice.toFixed(0)}
                    </span>
                  </div>
                </button>
              );
            })}
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
          "flex flex-col bg-card transition-all duration-300 ease-in-out overflow-hidden shrink-0",
          cartOpen
            ? "fixed inset-0 z-40 w-full sm:w-[420px] md:w-[460px] lg:relative lg:inset-auto lg:z-0 lg:w-[460px] border-l border-border shadow-2xl lg:shadow-none"
            : "hidden lg:flex lg:relative lg:inset-auto lg:w-0 lg:border-l-0"
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
                    setCustomerCollapsed(false);
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

          {customer && customerCollapsed && (
            <div className="mt-2 flex items-center justify-between rounded-md bg-primary/5 px-2 py-1 text-xs">
              <div className="flex items-center gap-1.5 text-right font-medium truncate flex-1">
                <span className="font-bold text-foreground truncate">{customer.name}</span>
                <span className="text-muted-foreground text-[10px] shrink-0">({customer.phone})</span>
                {activeCar && (
                  <span className="text-muted-foreground text-[10px] truncate shrink-0">
                    - {activeCar.brand} ({currentKm} كم)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCustomerCollapsed(false)}
                  className="text-primary hover:underline text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-primary/10"
                >
                  توسيع
                </button>
                <button
                  onClick={() => {
                    setCustomer(null);
                    setPhone("");
                    setCurrentKm("");
                  }}
                  className="text-muted-foreground hover:text-destructive p-0.5 rounded hover:bg-destructive/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {customer && !customerCollapsed && (
            <div className="mt-2 space-y-2 rounded-md bg-primary/5 p-2 text-xs relative">
              {/* Header: Name and Phone side-by-side */}
              <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                <div className="flex flex-col text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground text-xs">{customer.name}</span>
                    <button
                      onClick={() => setCustomerCollapsed(true)}
                      className="text-primary hover:underline text-[9px] font-bold px-1 rounded bg-primary/10"
                    >
                      تقليص
                    </button>
                  </div>
                  <span className="text-muted-foreground text-[10px] mt-0.5">الهاتف: {customer.phone}</span>
                </div>
                <button
                  onClick={() => {
                    setCustomer(null);
                    setPhone("");
                    setCurrentKm("");
                  }}
                  className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Cars Selector and Odometer side-by-side */}
              <div className="grid grid-cols-2 gap-2 text-right">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] text-muted-foreground font-bold">السيارة المختارة:</span>
                    <button
                      onClick={() => setAddCarOpen(true)}
                      className="text-[9px] text-primary hover:underline font-bold"
                    >
                      + إضافة
                    </button>
                  </div>
                  {customer.cars && customer.cars.length > 1 ? (
                    <select
                      value={selectedCarId}
                      onChange={(e) => setSelectedCarId(e.target.value)}
                      className="h-8 rounded border border-border bg-card text-[11px] font-semibold w-full px-1 focus:outline-none"
                    >
                      {customer.cars.map((car) => (
                        <option key={car.id} value={car.id}>
                          {car.brand} {car.model}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-foreground text-[10px] font-bold bg-card border border-border/50 rounded px-1.5 py-1.5 flex items-center justify-between truncate h-8">
                      <span>{activeCar?.brand} {activeCar?.model}</span>
                    </div>
                  )}
                </div>

                {activeCar && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-bold block">{t("km")}</Label>
                    <Input
                      type="number"
                      value={currentKm}
                      onChange={(e) =>
                        setCurrentKm(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="h-8 text-xs font-bold text-center"
                    />
                  </div>
                )}
              </div>

              {/* Last service details */}
              {activeCar && (
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-border/40 text-[10px] text-right">
                  <div className="text-muted-foreground truncate">آخر زيارة: <span className="font-semibold text-foreground">{activeCar.lastServiceDate ?? "—"}</span></div>
                  <div className="text-muted-foreground truncate" title={activeCar.lastOilUsed}>آخر زيت: <span className="font-semibold text-foreground">{activeCar.lastOilUsed ?? "—"}</span></div>
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
                disabled={!canMakeDiscount}
                title={!canMakeDiscount ? "لا تملك صلاحية إجراء خصم" : ""}
                className="h-7 w-20 text-right font-bold text-xs disabled:opacity-50 disabled:bg-muted"
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
              onClick={() => {
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
                setCheckoutOpen(true);
              }}
              className="col-span-2 flex h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-sm font-bold text-white shadow hover:bg-emerald-700 active:scale-[0.98]"
            >
              <Banknote className="h-4 w-4" /> دفع وقبض الفاتورة (Checkout)
            </button>
            <button
              onClick={() => {
                if (items.length === 0) {
                  toast.error("يرجى إضافة منتجات أولاً");
                  return;
                }
                setDraftReceiptOpen(true);
              }}
              className="flex h-9 items-center justify-center gap-1 rounded-lg bg-blue-600/10 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white"
            >
              <Eye className="h-3.5 w-3.5" /> معاينة الفاتورة
            </button>
            <button
              onClick={clearInvoice}
              className="flex h-9 items-center justify-center gap-1 rounded-lg bg-destructive/10 text-xs font-bold text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" /> مسح الفاتورة
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
          setCustomerCollapsed(false);
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

      <ReceiptDialog
        open={draftReceiptOpen}
        onOpenChange={setDraftReceiptOpen}
        sale={draftSale}
        isDraft={true}
      />

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        total={total}
        onConfirm={completeSale}
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
              <CarBrandSelector value={carBrand} onChange={setCarBrand} />
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
            <CarBrandSelector value={brand} onChange={setBrand} />
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
  isDraft = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sale: ReturnType<typeof saleService.create> | null;
  isDraft?: boolean;
}) {
  if (!sale) return null;
  const settings = store.settings;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:max-w-sm p-4 max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-1 shrink-0">
            <DialogTitle className={cn(
              "flex items-center gap-2 text-sm",
              isDraft ? "text-blue-600" : "text-green-600"
            )}>
              {isDraft ? (
                <>
                  <Eye className="h-4 w-4" /> معاينة الفاتورة (مسودة)
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> اكتملت عملية البيع
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Screen receipt preview dialog container */}
          <div className="flex-1 overflow-y-auto my-2 border border-border rounded-md bg-white">
            <div 
              id="receipt-print" 
              dir="rtl"
              className="p-3 font-sans text-[11px] leading-normal text-black relative overflow-hidden"
            >
            {isDraft && (
              <>
                <div className="absolute inset-0 flex items-center justify-center bg-white/[0.02] pointer-events-none z-10 select-none overflow-hidden">
                  <div className="border-4 border-blue-500/10 text-blue-500/10 font-black text-2xl px-6 py-2 -rotate-12 rounded uppercase tracking-widest">
                    معاينة مسودة
                  </div>
                </div>
                <div className="mb-2 text-center bg-blue-50 border border-blue-100 text-blue-700 rounded p-1.5 font-bold text-[10px]">
                  معاينة فاتورة مبدئية — غير صالحة للتحصيل
                </div>
              </>
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
            
            {/* Customer */}
            <div className="text-[10px] text-right leading-tight space-y-0.5 bg-black/[0.01] p-1.5 border border-dashed border-black rounded">
              <div><b>العميل:</b> {sale.customerName}</div>
              <div><b>الهاتف:</b> {sale.customerPhone}</div>
              <div><b>السيارة:</b> {sale.carBrand} {sale.carModel} — {sale.km.toLocaleString()} كم</div>
            </div>
            
            <div className="my-2 border-t border-dashed border-black" />
            
            {/* Product Items Table */}
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
              <Row label="الإجمالي الفرعي" value={`${sale.subtotal.toFixed(0)} ج.م`} />
              {sale.discount > 0 && <Row label="الخصم" value={`-${sale.discount.toFixed(0)} ج.م`} />}
              {sale.vat > 0 && <Row label="الضريبة (14%)" value={`${sale.vat.toFixed(0)} ج.م`} />}
              <div className="flex justify-between border-y-2 border-black py-1 text-xs font-extrabold my-1 text-black">
                <span>الإجمالي الكلي</span>
                <span>{sale.total.toFixed(0)} ج.م</span>
              </div>
              <Row
                label="طريقة الدفع"
                value={
                  sale.paymentMethod === "Mixed"
                    ? "مختلط"
                    : sale.paymentMethod === "Cash"
                    ? "نقدي"
                    : "كارت"
                }
              />
              {sale.paymentMethod === "Mixed" && (
                <div className="text-[9px] text-muted-foreground flex justify-between pr-2 border-r border-dashed border-black/40">
                  <span>نقدي: {sale.cashAmount?.toFixed(0)} ج.م</span>
                  <span>كارت: {sale.cardAmount?.toFixed(0)} ج.م</span>
                </div>
              )}
            </div>
            
            {/* Conditional Next Recommended Change Calculation */}
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
        </div>

        <DialogFooter className="gap-1.5 mt-2 shrink-0">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              className={cn(isDraft ? "w-full" : "")}
            >
              إغلاق
            </Button>
            {!isDraft && (
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-3.5 w-3.5" /> طباعة
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Render the identical clean print-only receipt sibling container directly in body */}
      {open && typeof document !== "undefined" && createPortal(
        <div 
          id="receipt-print-only" 
          dir="rtl"
          className="relative overflow-hidden"
        >
          {isDraft && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 pointer-events-none z-10">
              <div className="border-4 border-blue-500 text-blue-500 font-black text-2xl px-6 py-2 rotate-12 rounded uppercase tracking-widest">
                معاينة مسودة
              </div>
            </div>
          )}

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
          
          {/* Customer */}
          <div className="text-[10px] text-right leading-tight space-y-0.5 bg-black/[0.01] p-1.5 border border-dashed border-black rounded">
            <div><b>العميل:</b> {sale.customerName}</div>
            <div><b>الهاتف:</b> {sale.customerPhone}</div>
            <div><b>السيارة:</b> {sale.carBrand} {sale.carModel} — {sale.km.toLocaleString()} كم</div>
          </div>
          
          <div className="my-2 border-t border-dashed border-black" />
          
          {/* Product Items Table */}
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
            <Row label="الإجمالي الفرعي" value={`${sale.subtotal.toFixed(0)} ج.م`} />
            {sale.discount > 0 && <Row label="الخصم" value={`-${sale.discount.toFixed(0)} ج.م`} />}
            {sale.vat > 0 && <Row label="الضريبة (14%)" value={`${sale.vat.toFixed(0)} ج.م`} />}
            <div className="flex justify-between border-y-2 border-black py-1 text-xs font-extrabold my-1 text-black">
              <span>الإجمالي الكلي</span>
              <span>{sale.total.toFixed(0)} ج.م</span>
            </div>
            <Row
              label="طريقة الدفع"
              value={
                sale.paymentMethod === "Mixed"
                  ? "مختلط"
                  : sale.paymentMethod === "Cash"
                  ? "نقدي"
                  : "كارت"
              }
            />
            {sale.paymentMethod === "Mixed" && (
              <div className="text-[9px] text-muted-foreground flex justify-between pr-2 border-r border-dashed border-black/40">
                <span>نقدي: {sale.cashAmount?.toFixed(0)} ج.م</span>
                <span>كارت: {sale.cardAmount?.toFixed(0)} ج.م</span>
              </div>
            )}
          </div>
          
          {/* Conditional Next Recommended Change Calculation */}
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

const CAR_BRANDS = [
  { label: "تويوتا (Toyota)", value: "Toyota" },
  { label: "هيونداي (Hyundai)", value: "Hyundai" },
  { label: "كيا (Kia)", value: "Kia" },
  { label: "نيسان (Nissan)", value: "Nissan" },
  { label: "شيفروليه (Chevrolet)", value: "Chevrolet" },
  { label: "ميتسوبيشي (Mitsubishi)", value: "Mitsubishi" },
  { label: "ام جي (MG)", value: "MG" },
  { label: "شيري (Chery)", value: "Chery" },
  { label: "فيات (Fiat)", value: "Fiat" },
  { label: "رينو (Renault)", value: "Renault" },
  { label: "بيجو (Peugeot)", value: "Peugeot" },
  { label: "بي واي دي (BYD)", value: "BYD" },
  { label: "سوزوكي (Suzuki)", value: "Suzuki" },
  { label: "مرسيدس (Mercedes-Benz)", value: "Mercedes-Benz" },
  { label: "بي ام دبليو (BMW)", value: "BMW" },
  { label: "فولكس فاجن (Volkswagen)", value: "Volkswagen" },
  { label: "أوبل (Opel)", value: "Opel" },
  { label: "سكودا (Skoda)", value: "Skoda" },
  { label: "جيب (Jeep)", value: "Jeep" },
  { label: "فورد (Ford)", value: "Ford" },
  { label: "هوندا (Honda)", value: "Honda" },
  { label: "مازدا (Mazda)", value: "Mazda" },
  { label: "جيلي (Geely)", value: "Geely" }
];

function CarBrandSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CAR_BRANDS;
    return CAR_BRANDS.filter(
      (b) => b.label.toLowerCase().includes(q) || b.value.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (brandVal: string) => {
    onChange(brandVal);
    setSearch("");
    setIsOpen(false);
  };

  const handleCustomAdd = () => {
    if (search.trim()) {
      onChange(search.trim());
      setSearch("");
      setIsOpen(false);
    }
  };

  const selectedBrand = CAR_BRANDS.find((b) => b.value === value || b.label === value);
  const displayValue = selectedBrand ? selectedBrand.label : value;

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer text-right font-medium"
      >
        <span>{displayValue || "اختر ماركة السيارة..."}</span>
        <span className="text-muted-foreground text-[10px]">▼</span>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full rounded-md border border-border bg-card shadow-lg p-1.5 animate-in fade-in duration-100 max-h-56 overflow-y-auto">
          <Input
            type="text"
            placeholder="ابحث عن ماركة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-1.5 h-8 text-xs font-semibold"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {filtered.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => handleSelect(b.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded px-2 py-1.5 text-right text-[11px] font-bold hover:bg-accent transition-colors",
                  value === b.value && "bg-accent text-accent-foreground"
                )}
              >
                <span>{b.label}</span>
              </button>
            ))}

            {search.trim() && !CAR_BRANDS.some((b) => b.value.toLowerCase() === search.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={handleCustomAdd}
                className="flex w-full items-center justify-start gap-1 rounded bg-primary/10 px-2 py-1.5 text-right text-[11px] font-black text-primary hover:bg-primary/20 transition-colors mt-1"
              >
                <span>+ إضافة ماركة مخصصة:</span>
                <span className="italic text-foreground">"{search.trim()}"</span>
              </button>
            )}

            {filtered.length === 0 && !search.trim() && (
              <div className="py-3 text-center text-[10px] text-muted-foreground">
                لا توجد نتائج
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckoutDialog({
  open,
  onOpenChange,
  total,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  total: number;
  onConfirm: (method: PaymentMethod, cashAmount?: number, cardAmount?: number) => void;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [cashAmount, setCashAmount] = useState<number>(total);
  const [cardAmount, setCardAmount] = useState<number>(0);

  useEffect(() => {
    if (open) {
      setPaymentMethod("Cash");
      setCashAmount(total);
      setCardAmount(0);
    }
  }, [open, total]);

  const handleMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === "Cash") {
      setCashAmount(total);
      setCardAmount(0);
    } else if (method === "Card") {
      setCashAmount(0);
      setCardAmount(total);
    } else if (method === "Mixed") {
      setCashAmount(Math.round(total / 2));
      setCardAmount(total - Math.round(total / 2));
    }
  };

  const handleCashChange = (val: number) => {
    const cashVal = Math.min(val, total);
    setCashAmount(cashVal);
    setCardAmount(+(total - cashVal).toFixed(2));
  };

  const handleCardChange = (val: number) => {
    const cardVal = Math.min(val, total);
    setCardAmount(cardVal);
    setCashAmount(+(total - cardVal).toFixed(2));
  };

  const isValid = () => {
    if (paymentMethod === "Mixed") {
      return Math.abs(cashAmount + cardAmount - total) < 0.01 && cashAmount >= 0 && cardAmount >= 0;
    }
    return true;
  };

  const submit = () => {
    if (!isValid()) return;
    onConfirm(paymentMethod, paymentMethod === "Mixed" ? cashAmount : undefined, paymentMethod === "Mixed" ? cardAmount : undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">دفع وقبض الفاتورة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-3 text-right">
          <div className="bg-muted/40 p-3 rounded-lg border border-border text-center">
            <span className="text-xs text-muted-foreground block">إجمالي المطلوب دفعه</span>
            <span className="text-2xl font-black text-primary">{total.toFixed(0)} ج.م</span>
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-xs">طريقة الدفع</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={paymentMethod === "Cash" ? "default" : "outline"}
                className="h-11 font-bold"
                onClick={() => handleMethodChange("Cash")}
              >
                <Banknote className="ml-1.5 h-4 w-4" /> نقدي
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "Card" ? "default" : "outline"}
                className="h-11 font-bold"
                onClick={() => handleMethodChange("Card")}
              >
                <CreditCard className="ml-1.5 h-4 w-4" /> كارت
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "Mixed" ? "default" : "outline"}
                className="h-11 font-bold"
                onClick={() => handleMethodChange("Mixed")}
              >
                مختلط (Split)
              </Button>
            </div>
          </div>

          {paymentMethod === "Mixed" && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/80 bg-accent/20 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <Label htmlFor="cashAmount" className="text-xs font-bold text-green-700">المبلغ النقدي (ج.م)</Label>
                <Input
                  id="cashAmount"
                  type="number"
                  min={0}
                  max={total}
                  value={cashAmount === 0 ? "" : cashAmount}
                  onChange={(e) => handleCashChange(Number(e.target.value) || 0)}
                  className="h-10 text-center font-bold text-sm border-green-600/30 focus-visible:ring-green-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cardAmount" className="text-xs font-bold text-primary">المبلغ بالكارت (ج.م)</Label>
                <Input
                  id="cardAmount"
                  type="number"
                  min={0}
                  max={total}
                  value={cardAmount === 0 ? "" : cardAmount}
                  onChange={(e) => handleCardChange(Number(e.target.value) || 0)}
                  className="h-10 text-center font-bold text-sm border-primary/30"
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={!isValid()} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">تأكيد الدفع</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

