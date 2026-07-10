import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Terminal, Shield, User, Clock, Trash2, Search,
  RotateCcw, Calendar, ChevronDown, ChevronUp, SlidersHorizontal,
} from "lucide-react";

import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { authService } from "@/services/authService";
import { userLogService, type UserLog } from "@/services/userLogService";
import { store } from "@/services/store";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

export const Route = createFileRoute("/logs")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    const session = authService.getSession();
    if (session?.role !== "admin" && session?.role !== "developer") {
      throw redirect({ to: "/pos" });
    }
  },
  component: UserLogsPage,
});

// ── helpers ──────────────────────────────────────────────────────────────────

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function todayEnd() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function toIsoDate(ts: number) {
  return new Date(ts).toISOString().split("T")[0];
}

// ── component ─────────────────────────────────────────────────────────────────

function UserLogsPage() {
  const { session } = useSession();
  const { language } = useLanguage();

  // ── basic search ──
  const [searchTerm, setSearchTerm] = useState("");

  // ── date filter ── default = today
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "2days" | "7days" | "30days" | "custom" | "all">("today");
  const [customFrom, setCustomFrom] = useState(toIsoDate(todayStart()));
  const [customTo, setCustomTo] = useState(toIsoDate(todayEnd()));

  // ── field filters ──
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  // ── UI state ──
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tick, setTick] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // ── raw logs ──
  const allLogs = useMemo(() => userLogService.getLogs(), [tick]);

  // ── unique action & user lists for dropdowns ──
  const uniqueActions = useMemo(() => {
    const set = new Set(allLogs.map((l) => l.action));
    return Array.from(set).sort();
  }, [allLogs]);

  // Pull real active accounts from the store — exclude developers
  const uniqueUsers = useMemo(() => {
    return store.users
      .filter((u) => u.role !== "developer")
      .map((u) => u.name)
      .sort();
  }, [tick]);

  // ── date bounds ──
  const dateBounds = useMemo(() => {
    const now = new Date();
    const todayS = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    switch (dateFilter) {
      case "today":
        return { from: todayS, to: todayS + 86_400_000 - 1 };
      case "yesterday":
        return { from: todayS - 86_400_000, to: todayS - 1 };
      case "2days":
        return { from: todayS - 86_400_000, to: todayS + 86_400_000 - 1 };
      case "7days":
        return { from: todayS - 6 * 86_400_000, to: todayS + 86_400_000 - 1 };
      case "30days":
        return { from: todayS - 29 * 86_400_000, to: todayS + 86_400_000 - 1 };
      case "custom":
        return {
          from: new Date(customFrom + "T00:00:00").getTime(),
          to: new Date(customTo + "T23:59:59.999").getTime(),
        };
      default: // "all"
        return { from: 0, to: Infinity };
    }
  }, [dateFilter, customFrom, customTo]);

  // ── filtered logs ──
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      const ts = new Date(log.timestamp).getTime();
      if (ts < dateBounds.from || ts > dateBounds.to) return false;
      if (roleFilter !== "all" && log.userRole !== roleFilter) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (userFilter !== "all" && log.userName !== userFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (
          !log.userName.toLowerCase().includes(q) &&
          !log.action.toLowerCase().includes(q) &&
          !log.details.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [allLogs, dateBounds, roleFilter, actionFilter, userFilter, searchTerm]);

  // reset to page 1 on any filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, customFrom, customTo, roleFilter, actionFilter, userFilter]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  // count active advanced filters for badge
  const advancedActiveCount = [
    roleFilter !== "all",
    actionFilter !== "all",
    userFilter !== "all",
  ].filter(Boolean).length;

  const handleReset = () => {
    setSearchTerm("");
    setDateFilter("today");
    setCustomFrom(toIsoDate(todayStart()));
    setCustomTo(toIsoDate(todayEnd()));
    setRoleFilter("all");
    setActionFilter("all");
    setUserFilter("all");
    setTick((t) => t + 1);
  };

  const handleClearLogs = () => {
    if (confirm(language === "ar" ? "هل أنت متأكد من مسح جميع سجلات النظام؟" : "Are you sure you want to clear all logs?")) {
      userLogService.clearLogs();
      setTick((t) => t + 1);
      toast.success(language === "ar" ? "تم مسح السجلات بنجاح" : "Logs cleared successfully");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "developer": return "bg-purple-500/10 text-purple-600 border border-purple-500/20";
      case "admin":     return "bg-blue-500/10 text-blue-600 border border-blue-500/20";
      default:          return "bg-amber-500/10 text-amber-600 border border-amber-500/20";
    }
  };

  const roleLabel = (role: string) =>
    role === "developer" ? "مطور" : role === "admin" ? "مدير" : "كاشير";

  return (
    <PageShell
      title="سجل العمليات والتدقيق"
      subtitle={`${filteredLogs.length} سجل — ${allLogs.length} إجمالي`}
      actions={
        session?.role === "developer" && (
          <Button variant="destructive" size="sm" onClick={handleClearLogs} className="font-bold gap-1">
            <Trash2 className="h-4 w-4" /> مسح السجل
          </Button>
        )
      }
    >
      <div className="space-y-4">

        {/* ── Primary filter bar ─────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex flex-col gap-2">

            {/* Row 1: Search (full width) */}
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالمستخدم، الحركة، أو التفاصيل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9 h-10 text-sm rounded-xl border-slate-200 dark:border-white/10"
              />
            </div>

            {/* Row 2: Date filter + Advanced toggle + Reset */}
            <div className="flex gap-2">
              {/* Date filter */}
              <div className="flex-1">
                <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                  <SelectTrigger className="h-10 text-sm rounded-xl bg-card border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0 text-[#5470ff]" />
                      <SelectValue placeholder="النطاق الزمني" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">اليوم فقط</SelectItem>
                    <SelectItem value="yesterday">الأمس فقط</SelectItem>
                    <SelectItem value="2days">آخر يومين</SelectItem>
                    <SelectItem value="7days">آخر 7 أيام</SelectItem>
                    <SelectItem value="30days">آخر 30 يوم</SelectItem>
                    <SelectItem value="custom">نطاق مخصص</SelectItem>
                    <SelectItem value="all">كل السجلات</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced toggle */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`h-10 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 ${
                  showAdvanced || advancedActiveCount > 0
                    ? "bg-[#5470ff]/10 text-[#5470ff] border-[#5470ff]/30"
                    : "bg-card border-slate-200 dark:border-white/10"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">تصفية متقدمة</span>
                <span className="inline sm:hidden">تصفية</span>
                {advancedActiveCount > 0 && (
                  <span className="h-4 w-4 rounded-full bg-[#5470ff] text-white text-[9px] flex items-center justify-center font-black">
                    {advancedActiveCount}
                  </span>
                )}
                {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>

              {/* Reset */}
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl border-slate-200 dark:border-white/10"
                onClick={handleReset}
                title="إعادة تعيين الفلاتر"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Custom date range (shown when dateFilter === "custom") */}
          {dateFilter === "custom" && (
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#5470ff]/5 border border-[#5470ff]/20 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground">من تاريخ</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground">إلى تاريخ</Label>
                <Input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-9 text-xs rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Advanced filters panel */}
          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-white/5 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">

              {/* Role filter */}
              <div className="space-y-1.5" dir="rtl">
                <Label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <Shield className="h-3 w-3" /> الصلاحية
                </Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 text-xs rounded-lg bg-card">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الصلاحيات</SelectItem>
                    <SelectItem value="developer">مطور النظام</SelectItem>
                    <SelectItem value="admin">المدير</SelectItem>
                    <SelectItem value="cashier">كاشير</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action filter */}
              <div className="space-y-1.5" dir="rtl">
                <Label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <Terminal className="h-3 w-3" /> نوع الحركة
                </Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="h-9 text-xs rounded-lg bg-card">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحركات</SelectItem>
                    {uniqueActions.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User filter */}
              <div className="space-y-1.5" dir="rtl">
                <Label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <User className="h-3 w-3" /> المستخدم
                </Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="h-9 text-xs rounded-lg bg-card">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المستخدمين</SelectItem>
                    {uniqueUsers.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* ── Active filter summary chips ─────────────────────── */}
        {(dateFilter !== "today" || advancedActiveCount > 0 || searchTerm) && (
          <div className="flex flex-wrap gap-2 text-[11px]" dir="rtl">
            {searchTerm && (
              <span className="bg-slate-100 dark:bg-slate-800 text-foreground rounded-full px-3 py-1 font-semibold border border-border">
                🔍 "{searchTerm}"
              </span>
            )}
            {dateFilter !== "all" && (
              <span className="bg-[#5470ff]/10 text-[#5470ff] rounded-full px-3 py-1 font-semibold border border-[#5470ff]/20">
                📅 {dateFilter === "today" ? "اليوم" : dateFilter === "yesterday" ? "الأمس" : dateFilter === "2days" ? "آخر يومين" : dateFilter === "7days" ? "آخر 7 أيام" : dateFilter === "30days" ? "آخر 30 يوم" : `${customFrom} → ${customTo}`}
              </span>
            )}
            {roleFilter !== "all" && (
              <span className="bg-blue-500/10 text-blue-600 rounded-full px-3 py-1 font-semibold border border-blue-500/20">
                🛡 {roleLabel(roleFilter)}
              </span>
            )}
            {actionFilter !== "all" && (
              <span className="bg-emerald-500/10 text-emerald-600 rounded-full px-3 py-1 font-semibold border border-emerald-500/20">
                ⚡ {actionFilter}
              </span>
            )}
            {userFilter !== "all" && (
              <span className="bg-amber-500/10 text-amber-600 rounded-full px-3 py-1 font-semibold border border-amber-500/20">
                👤 {userFilter}
              </span>
            )}
          </div>
        )}

        {/* ── Audit Table ─────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="whitespace-nowrap">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> التوقيت</span>
                </TableHead>
                <TableHead className="whitespace-nowrap">
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> المستخدم</span>
                </TableHead>
                <TableHead className="whitespace-nowrap">الصلاحية</TableHead>
                <TableHead className="whitespace-nowrap">
                  <span className="flex items-center gap-1"><Terminal className="h-3.5 w-3.5" /> الحركة</span>
                </TableHead>
                <TableHead>التفاصيل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-16 text-center text-muted-foreground font-semibold">
                    <div className="flex flex-col items-center gap-2">
                      <Terminal className="h-8 w-8 opacity-20" />
                      <p>لا توجد سجلات تطابق الفلاتر المحددة.</p>
                      <button onClick={handleReset} className="text-xs text-[#5470ff] underline underline-offset-2 font-bold mt-1">
                        إعادة تعيين الفلاتر
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/10">
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      <div>{new Date(log.timestamp).toLocaleDateString("ar-EG")}</div>
                      <div className="text-[10px] opacity-70">
                        {new Date(log.timestamp).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-sm whitespace-nowrap">
                      {log.userName}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getRoleBadgeColor(log.userRole)}`}>
                        {roleLabel(log.userRole)}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-primary whitespace-nowrap text-xs">
                      {log.action}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                      {log.details}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ─────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-card p-3 rounded-lg border border-border text-xs font-semibold">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              → السابق
            </Button>
            <span className="text-muted-foreground text-center">
              صفحة <span className="text-foreground font-black">{currentPage}</span> من{" "}
              <span className="text-foreground font-black">{totalPages}</span>
              <span className="hidden sm:inline text-muted-foreground/70"> ({filteredLogs.length} سجل)</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              التالي ←
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
