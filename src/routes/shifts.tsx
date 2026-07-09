import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
import { Play, Square, CircleDollarSign, Calendar, RefreshCw, User, CalendarDays, Printer, AlertTriangle } from "lucide-react";

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

  const [openingCash, setOpeningCash] = useState<string>("0");
  const [actualCash, setActualCash] = useState<string>("");
  const [closeNotes, setCloseNotes] = useState<string>("");
  const [startNewDay, setStartNewDay] = useState<boolean>(true);
  const [tick, setTick] = useState<number>(0);
  const [printShift, setPrintShift] = useState<Shift | null>(null);

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
      return shifts.filter((s) => s.cashierId === session?.id);
    }
    return shifts;
  }, [tick, session]);

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

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(actualCash);
    if (isNaN(amount) || amount < 0) {
      toast.error("يرجى إدخال مبلغ إغلاق صحيح");
      return;
    }

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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Square className="h-5 w-5" /> {t("close_shift")} ({t("active_shift")})
                </CardTitle>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 font-bold border-amber-600/30 text-amber-700 hover:bg-amber-600/10 hover:text-amber-800"
                  onClick={() => setPrintShift(activeShift)}
                >
                  <Printer className="h-4 w-4" /> طباعة الجرد (Spot Check)
                </Button>
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
                      {formatCurrency(activeShift.expectedCash)}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleCloseShift} className="space-y-4">
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
              </CardContent>
            </Card>
          )}

          {/* Shift History Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold tracking-tight text-foreground">{t("shift_history")}</h3>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
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
                    <TableHead className="w-[80px] text-center">طباعة</TableHead>
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
                      const variance = s.actualCash !== undefined ? s.actualCash - s.expectedCash : null;
                      const canPrint = session?.role !== "cashier" || s.cashierId === session.id;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-bold text-amber-700 font-mono">{s.shiftDay}</TableCell>
                          <TableCell className="font-semibold">{s.cashierName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(s.startTime).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell>{formatCurrency(s.openingCash)}</TableCell>
                          <TableCell>{formatCurrency(s.expectedCash)}</TableCell>
                          <TableCell>{s.actualCash !== undefined ? formatCurrency(s.actualCash) : "-"}</TableCell>
                          <TableCell className="font-semibold">
                            {variance === null ? (
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
                                title="طباعة تقرير الوردية"
                              >
                                <Printer className="h-4 w-4" />
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
                    المبيعات النقدية
                  </span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(activeShift ? activeShift.cashSalesTotal : 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CircleDollarSign className="h-4 w-4 text-sky-500" />
                    المبيعات بالبطاقة
                  </span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(activeShift ? activeShift.cardSalesTotal : 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">
                    إجمالي المبيعات
                  </span>
                  <span className="font-extrabold text-primary">
                    {formatCurrency(activeShift ? activeShift.salesTotal : 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    عدد العمليات
                  </span>
                  <span className="font-semibold text-foreground">
                    {activeShift ? activeShift.salesCount : 0}
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-4">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-sm">تقرير جرد الوردية (Spot Check)</DialogTitle>
        </DialogHeader>

        {/* Print Styles for thermal rolls */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #shift-print-area, #shift-print-area * {
              visibility: visible;
            }
            #shift-print-area {
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

        <div id="shift-print-area" className="rounded-md border border-border bg-white p-3 font-mono text-[11px] leading-normal text-black relative">
          {/* Header */}
          <div className="text-center">
            <div className="text-sm font-extrabold text-black">{settings.companyNameAr}</div>
            <div className="text-[10px] mt-0.5 text-black">{settings.sloganAr}</div>
            <div className="text-[11px] font-black mt-2 bg-black/5 py-1 text-black">تقرير جرد الوردية (Spot Check)</div>
          </div>
          
          <div className="my-1.5 border-t border-dashed border-black/60" />
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-0.5 text-[10px] text-black">
            <div>يوم الوردية:</div>
            <div className="text-right font-bold">{shift.shiftDay}</div>
            <div>أمين الصندوق:</div>
            <div className="text-right">{shift.cashierName}</div>
            <div>الحالة:</div>
            <div className="text-right font-bold">{shift.status === "open" ? "نشطة (مفتوحة)" : "مغلقة"}</div>
            <div>وقت البدء:</div>
            <div className="text-right">{new Date(shift.startTime).toLocaleString("ar-EG")}</div>
            {shift.endTime && (
              <>
                <div>وقت الإغلاق:</div>
                <div className="text-right">{new Date(shift.endTime).toLocaleString("ar-EG")}</div>
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

            {shift.actualCash !== undefined && (
              <>
                <div className="flex justify-between text-xs font-bold pt-1">
                  <span>النقدي الفعلي بالدرج:</span>
                  <span>{formatCurrency(shift.actualCash)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-t border-black/40 pt-1">
                  <span>الفارق (عجز/زيادة):</span>
                  <span>{formatCurrency(shift.actualCash - shift.expectedCash)}</span>
                </div>
              </>
            )}
          </div>
          
          {shift.notes && (
            <>
              <div className="my-1.5 border-t border-dashed border-black/60" />
              <div className="text-[9px] text-left leading-normal text-black">
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
    </Dialog>
  );
}
