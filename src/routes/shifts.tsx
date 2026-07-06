import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import { authService } from "@/services/authService";
import { shiftService } from "@/services/shiftService";
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
import { toast } from "sonner";
import { formatCurrency } from "@/utils/format";
import { Play, Square, CircleDollarSign, Calendar, RefreshCw, User, CalendarDays } from "lucide-react";

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

  const forceRefresh = () => setTick((t) => t + 1);

  const activeShift = useMemo(() => {
    return shiftService.getActiveShift();
  }, [tick]);

  const history = useMemo(() => {
    return shiftService.getShifts();
  }, [tick]);

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
          ) : (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Square className="h-5 w-5" /> {t("close_shift")} ({t("active_shift")})
                </CardTitle>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6 text-muted-foreground font-semibold">
                        لا يوجد سجل ورديات سابق
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((s) => {
                      const variance = s.actualCash !== undefined ? s.actualCash - s.expectedCash : null;
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
        </div>
      </div>
    </PageShell>
  );
}
