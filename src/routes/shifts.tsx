import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import { authService } from "@/services/authService";
import { shiftService, Shift } from "@/services/shiftService";
import { store } from "@/services/store";
import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/format";
import { Play, Square, CircleDollarSign, Calendar, RefreshCw, User, CalendarDays, Printer, AlertTriangle, FileText } from "lucide-react";

export const Route = createFileRoute("/shifts")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: ShiftsPage,
});

function ShiftsPage() {
  const { session } = useSession();
  const { t } = useLanguage();
  const settings = store.settings;

  const hasOpenPermission = session?.role !== "cashier" || session?.permissions?.canOpenShift !== false;
  const hasClosePermission = session?.role !== "cashier" || session?.permissions?.canCloseShift !== false;
  const hasPrintSpotPermission = session?.role !== "cashier" || session?.permissions?.canPrintSpotCheck !== false;

  const [openingCash, setOpeningCash] = useState<string>("0");
  const [actualCash, setActualCash] = useState<string>("");
  const [closeNotes, setCloseNotes] = useState<string>("");
  const [startNewDay, setStartNewDay] = useState<boolean>(true);
  const [tick, setTick] = useState<number>(0);
  const [printShift, setPrintShift] = useState<Shift | null>(null);
  const [printSalesShift, setPrintSalesShift] = useState<Shift | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const forceRefresh = () => setTick((t) => t + 1);

  const activeShift = useMemo(() => {
    return shiftService.getActiveShift();
  }, [tick]);

  const isOwnActiveShift = useMemo(() => {
    return activeShift && activeShift.cashierId === session?.id;
  }, [activeShift, session]);

  const canManageActiveShift = useMemo(() => {
    return session?.role !== "cashier" || isOwnActiveShift;
  }, [session, isOwnActiveShift]);

  const history = useMemo(() => {
    const shifts = shiftService.getShifts();
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

      return shifts.filter((s) => {
        const isOwnShift = s.cashierId === session?.id;
        if (!isOwnShift) return false;
        
        const isTodayOrYesterday = s.shiftDay === today || s.shiftDay === yesterday;
        const isOpen = s.status === "open";
        
        return isTodayOrYesterday || isOpen;
      });
    }
    return shifts;
  }, [tick, session]);

  // For cashiers: find the ID of their most-recently closed shift
  // so we can restrict spot-check printing to only active + last closed
  const cashierLastClosedShiftId = useMemo(() => {
    if (session?.role !== "cashier") return null;
    const closed = history.filter((s) => s.status === "closed");
    return closed.length > 0 ? closed[0].id : null;
  }, [history, session]);

  const proposedShiftDay = useMemo(() => {
    return shiftService.getNextProposedShiftDay(startNewDay);
  }, [startNewDay, history]);

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const amount = parseFloat(openingCash);
    if (isNaN(amount) || amount < 0) {
      toast.error("يرجى إدخال مبلغ افتتاح صحيح");
      return;
    }

    shiftService.openShift(session.id, session.name, amount, startNewDay);
    toast.success(t("shift_opened"));
    setOpeningCash("0");
    setStartNewDay(true);
    forceRefresh();
  };

  const handleRequestCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(actualCash);
    if (isNaN(amount) || amount < 0) {
      toast.error("يرجى إدخال مبلغ إغلاق صحيح");
      return;
    }
    // Open confirmation dialog instead of closing immediately
    setShowCloseConfirm(true);
  };

  const handleConfirmCloseShift = () => {
    const amount = parseFloat(actualCash);
    const closed = shiftService.closeShift(amount, closeNotes);
    if (closed) {
      const variance = amount - closed.expectedCash;
      if (variance === 0) {
        toast.success(t("shift_closed"));
      } else if (variance > 0) {
        toast.warning(`تم إغلاق الوردية بوجود فائض: ${formatCurrency(variance)}`);
      } else {
        toast.error(`تم إغلاق الوردية بوجود عجز: ${formatCurrency(variance)}`);
      }
    }
    setActualCash("");
    setCloseNotes("");
    setShowCloseConfirm(false);
    forceRefresh();
  };

  return (
    <PageShell
      title={t("shifts")}
      subtitle="إدارة وتتبع ورديات الصندوق النقدي والدرج"
      actions={
        <Button variant="outline" size="sm" onClick={forceRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" /> تحديث البيانات
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        {/* Active Shift Card or Drawer Operations */}
        <div className="md:col-span-2 space-y-6">
          {!activeShift ? (
            !hasOpenPermission ? (
              <Card className="border-destructive/20 bg-destructive/5 animate-in fade-in duration-200">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> بدء وردية جديدة (غير مصرح)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-destructive/85 font-semibold leading-relaxed">
                    تنبيه: لا تملك الصلاحية لفتح وبدء وردية جديدة. يرجى الاستعانة بمدير النظام أو تسجيل الدخول بالحساب الصحيح.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader>
                  <CardTitle className="text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <Play className="h-5 w-5" /> {t("open_shift")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-emerald-800/80 dark:text-emerald-400/80 mb-4">
                    {t("must_open_shift")}
                  </p>
                  <form onSubmit={handleOpenShift} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4 items-end">
                      <div className="space-y-2">
                        <Label htmlFor="openingCash" className="text-emerald-900 dark:text-emerald-300 font-bold">
                          {t("opening_cash")} (ج.م)
                        </Label>
                        <Input
                          id="openingCash"
                          type="number"
                          value={openingCash}
                          onChange={(e) => setOpeningCash(e.target.value)}
                          placeholder="0"
                          className="bg-card h-12 text-lg font-bold"
                          required
                        />
                      </div>

                      <div className="bg-card p-3 rounded-lg border border-emerald-500/20 flex flex-col justify-center h-12">
                        <span className="text-[10px] text-muted-foreground">يوم الوردية القادم:</span>
                        <span className="font-bold text-sm text-emerald-700">{proposedShiftDay}</span>
                      </div>
                    </div>

                    {settings.shiftMode === "multiple" && (
                      <div className="flex items-center space-x-2 space-x-reverse bg-card/50 p-3 rounded-lg border border-border">
                        <Checkbox
                          id="startNewDay"
                          checked={startNewDay}
                          onCheckedChange={(checked) => setStartNewDay(!!checked)}
                        />
                        <label
                          htmlFor="startNewDay"
                          className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
                        >
                          بدء يوم وردية جديد؟ (زيادة يوم الوردية بمقدار +1 من آخر وردية)
                        </label>
                      </div>
                    )}

                    <Button type="submit" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-12 font-bold">
                      {t("open_shift")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )
          ) : !canManageActiveShift ? (
            <Card className="border-destructive/20 bg-destructive/5 animate-in fade-in duration-200">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> وردية نشطة لمستخدم آخر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive/85 font-semibold leading-relaxed">
                  تنبيه: هناك وردية مفتوحة حالياً باسم الكاشير <b>{activeShift.cashierName}</b>.
                  لا تملك الصلاحية لعرض تفاصيلها أو إغلاقها. يرجى تسجيل الدخول بالحساب الصحيح أو مراجعة مدير النظام.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:space-y-0 pb-4">
                <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2 text-base sm:text-lg">
                  <Square className="h-5 w-5" /> {t("close_shift")} ({t("active_shift")})
                </CardTitle>
                {hasPrintSpotPermission && (
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    className="gap-1.5 font-bold border-amber-600/30 text-amber-700 hover:bg-amber-600/10 hover:text-amber-800"
                    onClick={() => setPrintShift(activeShift)}
                  >
                    <Printer className="h-4 w-4" /> طباعة الجرد (Spot Check)
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Active Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 bg-card p-4 rounded-xl border border-border">
                  <div>
                    <span className="text-xs text-muted-foreground block">يوم الوردية</span>
                    <span className="font-bold text-amber-700 flex items-center gap-1 mt-0.5 text-sm">
                      <CalendarDays className="h-3.5 w-3.5" /> {activeShift.shiftDay}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">{t("cashier")}</span>
                    <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                      <User className="h-3 w-3 text-muted-foreground" /> {activeShift.cashierName}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">{t("start_time")}</span>
                    <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {new Date(activeShift.startTime).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">{t("opening_cash")}</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {formatCurrency(activeShift.openingCash)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">{t("expected_cash")}</span>
                    <span className="font-bold text-primary mt-0.5 block">
                      {session?.role !== "cashier" ? formatCurrency(activeShift.expectedCash) : "•••• ج.م"}
                    </span>
                  </div>
                </div>

                {!hasClosePermission ? (
                  <div className="bg-destructive/5 border border-destructive/20 text-destructive p-4 rounded-xl text-center font-bold text-sm">
                    لا تملك صلاحية لإغلاق الوردية الحالية. يرجى مراجعة مدير النظام.
                  </div>
                ) : (
                  <form onSubmit={handleRequestCloseShift} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="actualCash" className="text-amber-900 dark:text-amber-300">
                          {t("actual_cash")} (ج.م)
                        </Label>
                        <Input
                          id="actualCash"
                          type="number"
                          placeholder="0"
                          value={actualCash}
                          onChange={(e) => setActualCash(e.target.value)}
                          className="bg-card h-12 text-lg font-bold"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes" className="text-amber-900 dark:text-amber-300">
                          ملاحظات الإغلاق وجرد الدرج
                        </Label>
                        <Input
                          id="notes"
                          type="text"
                          placeholder="اكتب أي ملاحظات هنا..."
                          value={closeNotes}
                          onChange={(e) => setCloseNotes(e.target.value)}
                          className="bg-card h-12"
                        />
                      </div>
                    </div>
                    <Button type="submit" size="lg" className="w-full bg-amber-600 hover:bg-amber-500 text-white h-12 font-bold">
                      {t("close_shift")}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shift History Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold tracking-tight text-foreground">{t("shift_history")}</h3>
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>يوم الوردية</TableHead>
                    <TableHead>{t("cashier")}</TableHead>
                    <TableHead>{t("start_time")}</TableHead>
                    <TableHead>{t("opening_cash")}</TableHead>
                    <TableHead>{t("expected_cash")}</TableHead>
                    <TableHead>{t("actual_cash")}</TableHead>
                    <TableHead>{t("cash_variance")}</TableHead>
                    <TableHead>{t("shift_status")}</TableHead>
                    <TableHead className="w-[80px] text-center">جرد</TableHead>
                    <TableHead className="w-[90px] text-center">المبيعات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 text-muted-foreground font-semibold">
                        لا يوجد سجل ورديات سابق
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((s) => {
                      const variance = s.actualCash !== undefined && s.actualCash !== null ? s.actualCash - s.expectedCash : null;
                      // Cashiers can only print spot-check for:
                      //  1. The currently active shift (their own)
                      //  2. Their single most-recently closed shift
                      // Admins/developers can print any shift's spot check
                      const isAllowedShiftForCashier =
                        s.status === "open" // active shift
                        || s.id === cashierLastClosedShiftId; // most recent closed
                      const canPrint =
                        hasPrintSpotPermission &&
                        (session?.role !== "cashier" || (s.cashierId === session.id && isAllowedShiftForCashier));
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-bold text-amber-700 font-mono">{s.shiftDay}</TableCell>
                          <TableCell className="font-semibold">{s.cashierName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(s.startTime).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>{formatCurrency(s.openingCash)}</TableCell>
                          <TableCell>
                            {s.status === "open" && session?.role === "cashier"
                              ? "•••• ج.م"
                              : formatCurrency(s.expectedCash)}
                          </TableCell>
                          <TableCell>{s.actualCash !== undefined && s.actualCash !== null ? formatCurrency(s.actualCash) : "-"}</TableCell>
                          <TableCell className="font-semibold">
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
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                s.status === "open"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {s.status === "open" ? "نشطة" : "مغلقة"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {canPrint ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-700 hover:text-amber-800 hover:bg-amber-500/10"
                                onClick={() => setPrintShift(s)}
                                title="طباعة جرد الوردية (Spot Check)"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {canPrint ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-sky-700 hover:text-sky-800 hover:bg-sky-500/10"
                                onClick={() => setPrintSalesShift(s)}
                                title="طباعة المبيعات المنفذة في الوردية"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Shift Details Statistics Sidebar */}
        <div className="space-y-6">
          {canManageActiveShift && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
                  إحصائيات الصندوق النقدي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CircleDollarSign className="h-4 w-4 text-emerald-500" />
                    مبيعات نقدي (كاش)
                  </span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(activeShift ? (Number(activeShift.cashSalesTotal) || 0) : 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CircleDollarSign className="h-4 w-4 text-sky-500" />
                    مبيعات فيزا/كارت
                  </span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(activeShift ? (Number(activeShift.cardSalesTotal) || 0) : 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">إجمالي المبيعات</span>
                  <span className="font-extrabold text-primary">
                    {formatCurrency(activeShift ? (Number(activeShift.salesTotal) || 0) : 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">عدد العمليات</span>
                  <span className="font-semibold text-foreground">
                    {activeShift ? (activeShift.salesCount ?? 0) : 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ShiftPrintDialog
        open={!!printShift}
        onClose={() => setPrintShift(null)}
        shift={printShift}
      />
      <ShiftSalesPrintDialog
        open={!!printSalesShift}
        onClose={() => setPrintSalesShift(null)}
        shift={printSalesShift}
      />

      {/* ── Close Shift Confirmation Dialog ─────────────────── */}
      {activeShift && (
        <Dialog open={showCloseConfirm} onOpenChange={(o) => !o && setShowCloseConfirm(false)}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                تأكيد إغلاق الوردية
              </DialogTitle>
            </DialogHeader>

            {/* Shift Summary */}
            <div className="space-y-3 py-2">
              {/* Shift Day */}
              <div className="flex items-center justify-between rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
                <span className="text-sm font-bold text-amber-800 dark:text-amber-300">يوم نهاية الوردية</span>
                <span className="font-black text-amber-700 dark:text-amber-400 tracking-wider">{activeShift.shiftDay}</span>
              </div>

              {/* Financial Summary Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-border p-3 text-center space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold block">المبلغ المتوقع</span>
                  <span className="font-black text-sm text-foreground">{formatCurrency(activeShift.expectedCash)}</span>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-border p-3 text-center space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold block">المبلغ الفعلي</span>
                  <span className="font-black text-sm text-primary">{formatCurrency(parseFloat(actualCash) || 0)}</span>
                </div>
                <div className={`rounded-xl border p-3 text-center space-y-1 ${
                  (parseFloat(actualCash) || 0) - activeShift.expectedCash === 0
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : (parseFloat(actualCash) || 0) - activeShift.expectedCash > 0
                    ? "bg-blue-500/10 border-blue-500/30"
                    : "bg-destructive/10 border-destructive/30"
                }`}>
                  <span className="text-[10px] text-muted-foreground font-bold block">الفارق</span>
                  <span className={`font-black text-sm ${
                    (parseFloat(actualCash) || 0) - activeShift.expectedCash === 0
                      ? "text-emerald-600"
                      : (parseFloat(actualCash) || 0) - activeShift.expectedCash > 0
                      ? "text-blue-600"
                      : "text-destructive"
                  }`}>
                    {formatCurrency((parseFloat(actualCash) || 0) - activeShift.expectedCash)}
                  </span>
                </div>
              </div>

              {/* Status message */}
              {(() => {
                const variance = (parseFloat(actualCash) || 0) - activeShift.expectedCash;
                if (variance === 0) return (
                  <p className="text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 font-semibold text-center">
                    ✅ الصندوق متطابق — لا يوجد فارق
                  </p>
                );
                if (variance > 0) return (
                  <p className="text-xs text-blue-700 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 font-semibold text-center">
                    📈 يوجد فائض بقيمة {formatCurrency(variance)} — يرجى التحقق
                  </p>
                );
                return (
                  <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 font-semibold text-center">
                    ⚠️ يوجد عجز بقيمة {formatCurrency(Math.abs(variance))} — يرجى التحقق قبل الإغلاق
                  </p>
                );
              })()}

              {closeNotes && (
                <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3 border border-border">
                  <span className="font-bold text-foreground">ملاحظات: </span>{closeNotes}
                </div>
              )}

              <p className="text-sm text-muted-foreground font-medium text-center pt-1">
                هل أنت متأكد من إغلاق الوردية الحالية؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1"
              >
                إلغاء — العودة للتعديل
              </Button>
              <Button
                variant="default"
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold"
                onClick={handleConfirmCloseShift}
              >
                <Square className="h-4 w-4 mr-1" />
                نعم، أغلق الوردية
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PageShell>
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

  // Null-safe numeric values (can be null when synced from DB with no sales yet)
  const cashSalesTotal = Number(shift.cashSalesTotal) || 0;
  const cardSalesTotal = Number(shift.cardSalesTotal) || 0;
  const salesTotal = Number(shift.salesTotal) || 0;
  const openingCash = Number(shift.openingCash) || 0;
  const expectedCash = Number(shift.expectedCash) || 0;
  const actualCash = shift.actualCash !== null && shift.actualCash !== undefined ? Number(shift.actualCash) : null;
  const variance = actualCash !== null ? actualCash - expectedCash : null;

  // Get all active sales for this shift to show in spot check
  const shiftSales = store.sales.filter(
    (s) => s.shiftDay === shift.shiftDay && s.cashierId === shift.cashierId && s.status === "active"
  );

  const itemsMap = new Map<string, { name: string; brand: string; qty: number; unitPrice: number; total: number }>();
  shiftSales.forEach((sale) => {
    sale.items.forEach((item) => {
      const key = item.productId;
      if (itemsMap.has(key)) {
        const existing = itemsMap.get(key)!;
        existing.qty += item.quantity;
        existing.total += item.unitPrice * item.quantity;
      } else {
        itemsMap.set(key, {
          name: item.name,
          brand: item.brand,
          qty: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
        });
      }
    });
  });
  const aggregatedItems = Array.from(itemsMap.values());

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

        <div id="shift-print-area" className="rounded-md border border-border bg-white p-3 font-mono text-[11px] leading-relaxed text-black">
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

          <div className="border-t border-dashed border-black/50 my-1.5" />

          <div className="grid grid-cols-2 gap-y-0.5 text-[10px]">
            <span className="text-black/60">يوم الوردية:</span>
            <span className="text-left font-bold">{shift.shiftDay}</span>
            <span className="text-black/60">أمين الصندوق:</span>
            <span className="text-left">{shift.cashierName}</span>
            <span className="text-black/60">الحالة:</span>
            <span className="text-left font-bold">{shift.status === "open" ? "نشطة (مفتوحة)" : "مغلقة"}</span>
            <span className="text-black/60">وقت البدء:</span>
            <span className="text-left">{new Date(shift.startTime).toLocaleString("ar-EG")}</span>
            {shift.endTime && (
              <>
                <span className="text-black/60">وقت الإغلاق:</span>
                <span className="text-left">{new Date(shift.endTime).toLocaleString("ar-EG")}</span>
              </>
            )}
          </div>

          <div className="border-t border-dashed border-black/50 my-1.5" />

          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-black/70">المبلغ الافتتاحي:</span>
              <span className="font-semibold">{formatCurrency(openingCash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/70">مبيعات نقدي (كاش):</span>
              <span className="font-semibold">{formatCurrency(cashSalesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/70">مبيعات فيزا/كارت:</span>
              <span className="font-semibold">{formatCurrency(cardSalesTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-black/20 pt-1 font-bold">
              <span>إجمالي المبيعات:</span>
              <span>{formatCurrency(salesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/70">عدد عمليات البيع:</span>
              <span className="font-semibold">{shift.salesCount ?? 0}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-black/50 my-1.5" />

          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between font-bold bg-black/5 px-1.5 py-1 rounded">
              <span>النقدي المتوقع بالدرج:</span>
              <span>{formatCurrency(expectedCash)}</span>
            </div>
            {actualCash !== null && (
              <>
                <div className="flex justify-between font-bold pt-0.5">
                  <span>النقدي الفعلي بالدرج:</span>
                  <span>{formatCurrency(actualCash)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-black/30 pt-1">
                  <span>الفارق (عجز/زيادة):</span>
                  <span>{variance! >= 0 ? "+" : ""}{formatCurrency(variance!)}</span>
                </div>
              </>
            )}
          </div>

          {/* Aggregated Sold Items */}
          <div className="border-t border-dashed border-black/50 my-1.5" />
          <div className="text-[10px] font-bold mb-1">📦 المنتجات المباعة في الوردية:</div>
          {aggregatedItems.length === 0 ? (
            <div className="text-[9px] text-black/50 text-center py-1">لا توجد مبيعات</div>
          ) : (
            <table className="w-full text-[9px] border-collapse mb-1">
              <thead>
                <tr className="border-b border-black/30">
                  <th className="text-right py-0.5 font-bold">المنتج</th>
                  <th className="text-center py-0.5 font-bold w-8">الكمية</th>
                  <th className="text-left py-0.5 font-bold">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedItems.map((item, i) => (
                  <tr key={i} className="border-b border-black/10">
                    <td className="py-0.5 leading-tight text-right">
                      <div>{item.name}</div>
                      <div className="text-[8px] text-black/50">{item.brand}</div>
                    </td>
                    <td className="text-center py-0.5 font-bold">{item.qty}</td>
                    <td className="text-left py-0.5 font-semibold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {shift.notes && (
            <>
              <div className="border-t border-dashed border-black/50 my-1.5" />
              <div className="text-[9px] leading-normal">
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
              <span>{formatCurrency(openingCash)}</span>
            </div>
            <div className="flex justify-between">
              <span>مبيعات نقدي (كاش):</span>
              <span>{formatCurrency(cashSalesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>مبيعات فيزا/كارت:</span>
              <span>{formatCurrency(cardSalesTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-black/20 pt-1 font-bold">
              <span>إجمالي المبيعات:</span>
              <span>{formatCurrency(salesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>عدد عمليات البيع:</span>
              <span>{shift.salesCount ?? 0}</span>
            </div>
          </div>

          <div className="my-2 border-t border-dashed border-black" />

          <div className="space-y-1 text-[10px] text-black">
            <div className="flex justify-between font-bold bg-black/5 px-1.5 py-1 rounded">
              <span>النقدي المتوقع بالدرج:</span>
              <span>{formatCurrency(expectedCash)}</span>
            </div>
            {actualCash !== null && (
              <>
                <div className="flex justify-between font-bold pt-0.5">
                  <span>النقدي الفعلي بالدرج:</span>
                  <span>{formatCurrency(actualCash)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-black/30 pt-1">
                  <span>الفارق (عجز/زيادة):</span>
                  <span>{variance! >= 0 ? "+" : ""}{formatCurrency(variance!)}</span>
                </div>
              </>
            )}
          </div>

          {/* Aggregated Sold Items */}
          <div className="my-2 border-t border-dashed border-black" />
          <div className="text-[10px] font-bold mb-1">📦 المنتجات المباعة في الوردية:</div>
          {aggregatedItems.length === 0 ? (
            <div className="text-[9px] text-black/50 text-center py-1">لا توجد مبيعات</div>
          ) : (
            <table className="w-full text-[9px] border-collapse mb-1">
              <thead>
                <tr className="border-b border-black text-right font-bold">
                  <th className="text-right py-0.5 w-[50%]">المنتج</th>
                  <th className="text-center py-0.5 w-[20%]">الكمية</th>
                  <th className="text-left py-0.5 w-[30%]">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedItems.map((item, i) => (
                  <tr key={i} className="border-b border-dashed border-black/20">
                    <td className="py-0.5 text-right">
                      <div>{item.name}</div>
                      <div className="text-[8px] text-black/50">{item.brand}</div>
                    </td>
                    <td className="text-center py-0.5">{item.qty}</td>
                    <td className="text-left font-bold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

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

function ShiftSalesPrintDialog({
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

  // Get all active sales for this shift
  const shiftSales = store.sales.filter(
    (s) => s.shiftDay === shift.shiftDay && s.cashierId === shift.cashierId && s.status === "active"
  );

  // Aggregate sold items across all invoices
  const itemsMap = new Map<string, { name: string; brand: string; qty: number; unitPrice: number; total: number }>();
  shiftSales.forEach((sale) => {
    sale.items.forEach((item) => {
      const key = item.productId;
      if (itemsMap.has(key)) {
        const existing = itemsMap.get(key)!;
        existing.qty += item.quantity;
        existing.total += item.unitPrice * item.quantity;
      } else {
        itemsMap.set(key, {
          name: item.name,
          brand: item.brand,
          qty: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
        });
      }
    });
  });
  const aggregatedItems = Array.from(itemsMap.values());

  const grandTotal = shiftSales.reduce((s, inv) => s + inv.total, 0);
  const cashTotal = shiftSales.reduce((s, inv) => {
    return s + (inv.cashAmount !== undefined && inv.cashAmount !== null ? inv.cashAmount : (inv.paymentMethod === "Cash" ? inv.total : 0));
  }, 0);
  const cardTotal = shiftSales.reduce((s, inv) => {
    return s + (inv.cardAmount !== undefined && inv.cardAmount !== null ? inv.cardAmount : (inv.paymentMethod === "Card" ? inv.total : 0));
  }, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[420px] p-4 max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="pb-1 text-right">
          <DialogTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-600" />
            تقرير المبيعات المنفذة — الوردية {shift.shiftDay} ({shift.cashierName})
          </DialogTitle>
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

        <div id="sales-print-area" className="rounded-md border border-border bg-white p-3 font-mono text-[11px] leading-relaxed text-black">
          {/* Header */}
          <div className="text-center mb-2">
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover mx-auto mb-1.5 border border-border bg-white" />
            )}
            <div className="text-sm font-extrabold">{settings.companyNameAr}</div>
            <div className="text-[10px] text-black/70">{settings.sloganAr}</div>
            <div className="text-[11px] font-black mt-1.5 border border-black/20 py-0.5 rounded bg-black/5 text-center">
              تقرير المبيعات المنفذة
            </div>
          </div>

          <div className="border-t border-dashed border-black/50 my-1.5" />

          {/* Shift Info */}
          <div className="grid grid-cols-2 gap-y-0.5 text-[10px] mb-1">
            <span className="text-black/60">يوم الوردية:</span>
            <span className="text-left font-bold">{shift.shiftDay}</span>
            <span className="text-black/60">أمين الصندوق:</span>
            <span className="text-left">{shift.cashierName}</span>
            <span className="text-black/60">عدد الفواتير:</span>
            <span className="text-left font-bold">{shiftSales.length}</span>
            <span className="text-black/60">تاريخ الطباعة:</span>
            <span className="text-left">{new Date().toLocaleString("ar-EG")}</span>
          </div>

          <div className="border-t border-dashed border-black/50 my-1.5" />

          {/* Aggregated Items Table */}
          <div className="text-[10px] font-bold mb-0.5">📦 المنتجات المباعة (مجمعة)</div>
          {aggregatedItems.length === 0 ? (
            <div className="text-[10px] text-black/50 text-center py-2">لا توجد مبيعات في هذه الوردية</div>
          ) : (
            <table className="w-full text-[9.5px] border-collapse">
              <thead>
                <tr className="border-b border-black/30">
                  <th className="text-right py-0.5 font-bold">المنتج</th>
                  <th className="text-center py-0.5 font-bold w-8">الكمية</th>
                  <th className="text-left py-0.5 font-bold">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedItems.map((item, i) => (
                  <tr key={i} className="border-b border-black/10">
                    <td className="py-0.5 leading-tight text-right">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-black/50">{item.brand}</div>
                    </td>
                    <td className="text-center py-0.5 font-bold">{item.qty}</td>
                    <td className="text-left py-0.5 font-semibold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="border-t border-dashed border-black/50 my-1.5" />

          {/* Invoices List */}
          <div className="text-[10px] font-bold mb-0.5">🧾 قائمة الفواتير</div>
          {shiftSales.length === 0 ? (
            <div className="text-[10px] text-black/50 text-center py-1">لا توجد فواتير</div>
          ) : (
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr className="border-b border-black/30 text-right">
                  <th className="text-right py-0.5 font-bold">رقم الفاتورة</th>
                  <th className="text-right py-0.5 font-bold">العميل</th>
                  <th className="text-center py-0.5 font-bold">الدفع</th>
                  <th className="text-left py-0.5 font-bold">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {shiftSales.map((inv) => (
                  <tr key={inv.id} className="border-b border-black/10">
                    <td className="py-0.5 font-mono text-[8.5px] text-right">#{inv.invoiceNumber.replace("INV-", "")}</td>
                    <td className="py-0.5 text-right">{inv.customerName}</td>
                    <td className="text-center py-0.5">
                      {inv.paymentMethod === "Cash" ? "نقدي" : inv.paymentMethod === "Card" ? "كارت" : "مختلط"}
                    </td>
                    <td className="text-left py-0.5 font-semibold">{formatCurrency(inv.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="border-t border-dashed border-black/50 my-1.5" />

          {/* Summary Totals */}
          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-black/70">إجمالي نقدي (كاش):</span>
              <span className="font-semibold">{formatCurrency(cashTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/70">إجمالي فيزا/كارت:</span>
              <span className="font-semibold">{formatCurrency(cardTotal)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-black/30 pt-1">
              <span>الإجمالي الكلي للوردية:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-1.5 mt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>إغلاق</Button>
          <Button size="sm" className="bg-sky-600 hover:bg-sky-500" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> طباعة المبيعات
          </Button>
        </DialogFooter>
      </DialogContent>

      {open && typeof document !== "undefined" && createPortal(
        <div id="receipt-print-only" dir="rtl" className="text-right">
          {/* Header */}
          <div className="text-center mb-2">
            {settings.logoUrl && (
              <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover mx-auto mb-1.5 border border-border bg-white" />
            )}
            <div className="text-sm font-extrabold">{settings.companyNameAr}</div>
            <div className="text-[10px] text-black/70">{settings.sloganAr}</div>
            <div className="text-[11px] font-black mt-1.5 border border-black/20 py-0.5 rounded bg-black/5 text-center">
              تقرير المبيعات المنفذة
            </div>
          </div>

          <div className="my-2 border-t-2 border-dashed border-black" />

          {/* Shift Info */}
          <div className="grid grid-cols-2 gap-y-1 text-[10px] text-black">
            <div><b>يوم الوردية:</b></div>
            <div className="text-left font-bold">{shift.shiftDay}</div>
            <div><b>أمين الصندوق:</b></div>
            <div className="text-left">{shift.cashierName}</div>
            <div><b>عدد الفواتير:</b></div>
            <div className="text-left font-bold">{shiftSales.length}</div>
            <div><b>تاريخ الطباعة:</b></div>
            <div className="text-left">{new Date().toLocaleString("ar-EG")}</div>
          </div>

          <div className="my-2 border-t border-dashed border-black" />

          {/* Aggregated Items Table */}
          <div className="text-[10px] font-bold mb-1">📦 المنتجات المباعة (مجمعة)</div>
          {aggregatedItems.length === 0 ? (
            <div className="text-[10px] text-black/50 text-center py-2">لا توجد مبيعات في هذه الوردية</div>
          ) : (
            <table className="w-full text-[9.5px] border-collapse mb-1">
              <thead>
                <tr className="border-b border-black text-right font-bold">
                  <th className="text-right py-0.5 w-[50%]">المنتج</th>
                  <th className="text-center py-0.5 w-[20%]">الكمية</th>
                  <th className="text-left py-0.5 w-[30%]">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedItems.map((item, i) => (
                  <tr key={i} className="border-b border-dashed border-black/20">
                    <td className="py-0.5 text-right">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-[8.5px] text-black/50">{item.brand}</div>
                    </td>
                    <td className="text-center py-0.5">{item.qty}</td>
                    <td className="text-left font-bold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="my-2 border-t border-dashed border-black" />

          {/* Invoices List */}
          <div className="text-[10px] font-bold mb-1">🧾 قائمة الفواتير</div>
          {shiftSales.length === 0 ? (
            <div className="text-[10px] text-black/50 text-center py-1">لا توجد فواتير</div>
          ) : (
            <table className="w-full text-[9px] border-collapse mb-1">
              <thead>
                <tr className="border-b border-black text-right font-bold">
                  <th className="text-right py-0.5 w-[30%]">رقم الفاتورة</th>
                  <th className="text-right py-0.5 w-[35%]">العميل</th>
                  <th className="text-center py-0.5 w-[15%]">الدفع</th>
                  <th className="text-left py-0.5 w-[20%]">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {shiftSales.map((inv) => (
                  <tr key={inv.id} className="border-b border-dashed border-black/20">
                    <td className="py-0.5 font-mono text-[8.5px] text-right">#{inv.invoiceNumber.replace("INV-", "")}</td>
                    <td className="py-0.5 text-right">{inv.customerName}</td>
                    <td className="text-center py-0.5">
                      {inv.paymentMethod === "Cash" ? "نقدي" : inv.paymentMethod === "Card" ? "كارت" : "مختلط"}
                    </td>
                    <td className="text-left font-bold">{formatCurrency(inv.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="my-2 border-t border-dashed border-black" />

          {/* Summary Totals */}
          <div className="space-y-1 text-[10px] text-black">
            <div className="flex justify-between">
              <span>إجمالي نقدي (كاش):</span>
              <span>{formatCurrency(cashTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>إجمالي فيزا/كارت:</span>
              <span>{formatCurrency(cardTotal)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-black/30 pt-1">
              <span>الإجمالي الكلي للوردية:</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Dialog>
  );
}
