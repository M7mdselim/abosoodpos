import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Terminal, Shield, User, Clock, Trash2, Search, Filter, RotateCcw } from "lucide-react";

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
import { authService } from "@/services/authService";
import { userLogService, type UserLog } from "@/services/userLogService";
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

function UserLogsPage() {
  const { session } = useSession();
  const { language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [tick, setTick] = useState(0);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const logs = useMemo(() => {
    return userLogService.getLogs();
  }, [tick]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole =
        roleFilter === "all" || log.userRole === roleFilter;

      return matchSearch && matchRole;
    });
  }, [logs, searchTerm, roleFilter]);

  // Reset page when filters change
  useState(() => {
    setCurrentPage(1);
  });
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const handleClearLogs = () => {
    if (confirm(language === "ar" ? "هل أنت متأكد من مسح جميع سجلات النظام؟" : "Are you sure you want to clear all logs?")) {
      userLogService.clearLogs();
      setTick((t) => t + 1);
      toast.success(language === "ar" ? "تم مسح السجلات بنجاح" : "Logs cleared successfully");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "developer":
        return "bg-purple-500/10 text-purple-600 border border-purple-500/20";
      case "admin":
        return "bg-blue-500/10 text-blue-600 border border-blue-500/20";
      default:
        return "bg-amber-500/10 text-amber-600 border border-amber-500/20";
    }
  };

  return (
    <PageShell
      title={language === "ar" ? "سجل العمليات" : "User Audit Logs"}
      subtitle={language === "ar" ? "مراقبة وتتبع جميع حركات وعمليات المستخدمين على النظام" : "Audit trails and user activity tracking across the system"}
      actions={
        session?.role === "developer" && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearLogs}
            className="font-bold gap-1"
          >
            <Trash2 className="h-4 w-4" />
            {language === "ar" ? "مسح السجل" : "Clear Logs"}
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-lg border border-border">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === "ar" ? "البحث بالاسم، الحركة أو التفاصيل..." : "Search by user, action or details..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9 h-10 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 w-40 rounded-md border border-input bg-card text-xs font-semibold px-2 focus:outline-none"
            >
              <option value="all">{language === "ar" ? "كل الصلاحيات" : "All Roles"}</option>
              <option value="developer">{language === "ar" ? "مطور النظام" : "System Developer"}</option>
              <option value="admin">{language === "ar" ? "المدير" : "Admin Manager"}</option>
              <option value="cashier">{language === "ar" ? "كاشير" : "Cashier"}</option>
            </select>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => {
                setSearchTerm("");
                setRoleFilter("all");
                setTick((t) => t + 1);
              }}
              title="إعادة تعيين"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Audit Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[180px]">{language === "ar" ? "التوقيت" : "Timestamp"}</TableHead>
                <TableHead className="w-[150px]">{language === "ar" ? "المستخدم" : "User"}</TableHead>
                <TableHead className="w-[100px]">{language === "ar" ? "الصلاحية" : "Role"}</TableHead>
                <TableHead className="w-[150px]">{language === "ar" ? "الحركة" : "Action"}</TableHead>
                <TableHead>{language === "ar" ? "التفاصيل" : "Details"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground font-semibold">
                    {language === "ar" ? "لا توجد حركات مسجلة حالياً." : "No audit logs found."}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/10">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString("ar-EG", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-bold flex items-center gap-1.5 py-3">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {log.userName}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${getRoleBadgeColor(log.userRole)}`}>
                        {log.userRole === "developer" ? "مطور" : log.userRole === "admin" ? "مدير" : "كاشير"}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-primary">{log.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-semibold leading-normal">{log.details}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-card p-3 rounded-lg border border-border mt-3 text-xs font-semibold">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              {language === "ar" ? "السابق" : "Previous"}
            </Button>
            <span className="text-muted-foreground">
              {language === "ar"
                ? `صفحة ${currentPage} من ${totalPages} (إجمالي ${filteredLogs.length} سجل)`
                : `Page ${currentPage} of ${totalPages} (${filteredLogs.length} total logs)`}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              {language === "ar" ? "التالي" : "Next"}
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
