import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Plus, Trash2, Edit, Shield, User as UserIcon, ShieldAlert, Key, UserCheck, ToggleLeft } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { userService } from "@/services/userService";
import type { User, UserRole, UserPermissions } from "@/types";
import { useSession } from "@/context/RoleContext";
import { authService } from "@/services/authService";

export const Route = createFileRoute("/users")({
  beforeLoad: () => {
    if (!authService.isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
    const session = authService.getSession();
    if (session?.role !== "admin" && session?.role !== "developer") {
      throw redirect({ to: "/pos" });
    }
  },
  component: UsersPage,
});

function UsersPage() {
  const { session } = useSession();
  const [tick, setTick] = useState(0);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const list = useMemo(() => {
    return userService.list();
  }, [tick]);

  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [list, searchQuery]);

  const isAdminOrDev = session?.role === "admin" || session?.role === "developer";

  if (!isAdminOrDev) {
    return (
      <PageShell title="المستخدمين">
        <div className="text-center text-muted-foreground py-16 font-bold">
          غير مصرح بالدخول لغير المدراء.
        </div>
      </PageShell>
    );
  }

  const handleOpenCreate = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleDeleteUser = (id: string, name: string) => {
    const user = userService.list().find((u) => u.id === id);
    if (user?.role === "developer" && session?.role !== "developer") {
      toast.error("لا يمكن لحساب مدير النظام حذف حساب مطور النظام");
      return;
    }
    if (confirm(`هل أنت متأكد من حذف المستخدم ${name} نهائياً؟`)) {
      userService.remove(id);
      toast.success(`تم حذف المستخدم ${name} بنجاح`);
      setTick((t) => t + 1);
    }
  };

  return (
    <PageShell
      title="إدارة المستخدمين والصلاحيات"
      subtitle={`يوجد حالياً ${list.length} مستخدم نشط ومسجل بالدرج`}
      actions={
        <Button size="lg" onClick={handleOpenCreate} className="gap-1.5 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30">
          <Plus className="h-5 w-5" /> إضافة مستخدم جديد
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Search filter bar */}
        <div className="flex items-center bg-card p-4 rounded-xl border border-border">
          <div className="relative w-full max-w-md">
            <Input
              placeholder="ابحث باسم الموظف أو اسم المستخدم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-4 pl-10 h-11 text-sm font-semibold"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead className="text-right font-black text-slate-800">اسم الموظف</TableHead>
                <TableHead className="text-right font-black text-slate-800">اسم المستخدم</TableHead>
                <TableHead className="text-right font-black text-slate-800">دور المستخدم</TableHead>
                <TableHead className="text-right font-black text-slate-800">حالة الحساب</TableHead>
                <TableHead className="text-right font-black text-slate-800">صلاحيات البيع</TableHead>
                <TableHead className="text-left font-black text-slate-800 pl-6">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-semibold">
                    لا يوجد مستخدمين مسجلين يطابقون البحث
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-bold text-slate-800 dark:text-slate-100">{u.name}</TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-slate-600 dark:text-slate-400">{u.username}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={
                          u.role === "developer"
                            ? "border-purple-500 bg-purple-50/50 text-purple-700 font-bold dark:bg-purple-950/20"
                            : u.role === "admin" 
                            ? "border-blue-500 bg-blue-50/50 text-blue-700 font-bold dark:bg-blue-950/20" 
                            : "border-emerald-500 bg-emerald-50/50 text-emerald-700 font-bold dark:bg-emerald-950/20"
                        }
                      >
                        {u.role === "developer" 
                          ? "مطور النظام (Developer)" 
                          : u.role === "admin" 
                          ? "مدير نظام (Admin)" 
                          : "كاشير (Cashier)"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.status === "active"}
                          disabled={u.role === "developer" && session?.role !== "developer"}
                          onCheckedChange={(checked) => {
                            userService.update(u.id, { status: checked ? "active" : "inactive" });
                            toast.success(`تم ${checked ? "تفعيل" : "إلغاء تفعيل"} حساب المستخدم ${u.name}`);
                            setTick((t) => t + 1);
                          }}
                        />
                        <span className={`text-xs font-bold ${u.status === "active" ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {u.status === "active" ? "نشط" : "معطل"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {u.role !== "cashier" ? (
                        <span className={u.role === "developer" ? "text-purple-650 font-extrabold dark:text-purple-400" : "text-blue-600 font-bold"}>
                          صلاحيات كاملة {u.role === "developer" && "(مطور)"}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.permissions?.canDiscount && <Badge variant="secondary" className="text-[10px]">الخصم</Badge>}
                          {u.permissions?.canOpenShift && <Badge variant="secondary" className="text-[10px]">فتح وردية</Badge>}
                          {u.permissions?.canCloseShift && <Badge variant="secondary" className="text-[10px]">إغلاق وردية</Badge>}
                          {u.permissions?.canPrintSpotCheck && <Badge variant="secondary" className="text-[10px]">جرد الوردية</Badge>}
                          {u.permissions?.canViewReceipts && <Badge variant="secondary" className="text-[10px]">عرض الفواتير</Badge>}
                          {u.permissions?.canReprintReceipts && <Badge variant="secondary" className="text-[10px]">إعادة الطباعة</Badge>}
                          {u.permissions?.canViewReports && <Badge variant="secondary" className="text-[10px]">عرض التقارير</Badge>}
                          {u.permissions?.canEditPaymentMethods && <Badge variant="secondary" className="text-[10px]">تعديل الدفع</Badge>}
                          {u.permissions?.canVoidReceipts && <Badge variant="secondary" className="text-[10px]">إلغاء فواتير</Badge>}
                          {!u.permissions?.canDiscount && 
                           !u.permissions?.canOpenShift && 
                           !u.permissions?.canCloseShift && 
                           !u.permissions?.canPrintSpotCheck &&
                           !u.permissions?.canViewReceipts &&
                           !u.permissions?.canReprintReceipts &&
                           !u.permissions?.canViewReports &&
                           !u.permissions?.canEditPaymentMethods &&
                           !u.permissions?.canVoidReceipts && (
                             <span className="text-red-500 font-semibold">ممنوع من كل الصلاحيات</span>
                           )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-left pl-4">
                      {!(u.role === "developer" && session?.role !== "developer") ? (
                        <div className="flex items-center justify-start gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEdit(u)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="h-8 w-8 text-destructive hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-semibold px-2">غير قابل للتعديل</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UserFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        user={editingUser}
        onSaved={() => setTick((t) => t + 1)}
      />
    </PageShell>
  );
}

function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: User | null;
  onSaved: () => void;
}) {
  const { session } = useSession();
  const isEdit = !!user;
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("cashier");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  // Permissions state
  const [canDiscount, setCanDiscount] = useState(true);
  const [canOpenShift, setCanOpenShift] = useState(true);
  const [canCloseShift, setCanCloseShift] = useState(true);
  const [canPrintSpotCheck, setCanPrintSpotCheck] = useState(true);
  const [canViewReceipts, setCanViewReceipts] = useState(false);
  const [canReprintReceipts, setCanReprintReceipts] = useState(false);
  const [canEditPaymentMethods, setCanEditPaymentMethods] = useState(false);
  const [canVoidReceipts, setCanVoidReceipts] = useState(false);
  const [canViewReports, setCanViewReports] = useState(false);
  const [canCloseAnyShift, setCanCloseAnyShift] = useState(false);

  // Sync state when dialog opens or user changes
  useMemo(() => {
    if (open) {
      if (user) {
        setName(user.name);
        setUsername(user.username);
        setPassword(user.password || "");
        setRole(user.role);
        setStatus(user.status);
        setCanDiscount(user.permissions?.canDiscount ?? true);
        setCanOpenShift(user.permissions?.canOpenShift ?? true);
        setCanCloseShift(user.permissions?.canCloseShift ?? true);
        setCanPrintSpotCheck(user.permissions?.canPrintSpotCheck ?? true);
        setCanViewReceipts(user.permissions?.canViewReceipts ?? false);
        setCanReprintReceipts(user.permissions?.canReprintReceipts ?? false);
        setCanEditPaymentMethods(user.permissions?.canEditPaymentMethods ?? false);
        setCanVoidReceipts(user.permissions?.canVoidReceipts ?? false);
        setCanViewReports(user.permissions?.canViewReports ?? false);
        setCanCloseAnyShift(user.permissions?.canCloseAnyShift ?? false);
      } else {
        setName("");
        setUsername("");
        setPassword("");
        setRole("cashier");
        setStatus("active");
        setCanDiscount(true);
        setCanOpenShift(true);
        setCanCloseShift(true);
        setCanPrintSpotCheck(true);
        setCanViewReceipts(false);
        setCanReprintReceipts(false);
        setCanEditPaymentMethods(false);
        setCanVoidReceipts(false);
        setCanViewReports(false);
        setCanCloseAnyShift(false);
      }
    }
  }, [open, user]);

  function handleSave() {
    if (!name.trim()) {
      toast.error("يرجى إدخال اسم الموظف");
      return;
    }
    if (!username.trim()) {
      toast.error("يرجى إدخال اسم المستخدم");
      return;
    }
    if (!isEdit && !password.trim()) {
      toast.error("يرجى تعيين كلمة مرور للمستخدم الجديد");
      return;
    }

    if (user?.role === "developer" && session?.role !== "developer") {
      toast.error("لا يملك مدير النظام صلاحية تعديل حساب مطور النظام");
      return;
    }

    if (user?.role === "developer" && role !== "developer") {
      toast.error("لا يمكن تعديل دور مطور النظام");
      return;
    }

    // Check if trying to create or change to a developer user
    if (role === "developer" && (!user || user.role !== "developer")) {
      toast.error("لا يمكن تعيين دور مطور النظام للمستخدم");
      return;
    }

    const permissions: UserPermissions = {
      canDiscount,
      canOpenShift,
      canCloseShift,
      canPrintSpotCheck,
      canViewReceipts,
      canReprintReceipts,
      canEditPaymentMethods,
      canVoidReceipts,
      canViewReports,
      canCloseAnyShift,
    };

    if (isEdit && user) {
      userService.update(user.id, {
        name,
        username,
        password: password || user.password,
        role,
        status,
        permissions: role === "cashier" ? permissions : undefined,
      });
      toast.success("تم تحديث بيانات المستخدم بنجاح");
    } else {
      // Check duplicate usernames
      const users = userService.list();
      const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase().trim());
      if (exists) {
        toast.error("اسم المستخدم مسجل مسبقاً لموظف آخر، يرجى اختيار اسم مستخدم مختلف");
        return;
      }

      userService.create({
        name,
        username,
        password,
        role,
        status,
        permissions: role === "cashier" ? permissions : undefined,
      });
      toast.success("تم تسجيل المستخدم الجديد بالنجاح في قاعدة البيانات");
    }

    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* تمت إضافة max-h-[90vh] و overflow-y-auto و w-[95vw] لتناسب الجوال */}
      <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto text-right p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            {isEdit ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-primary" />}
            <span>{isEdit ? "تعديل بيانات الحساب" : "إضافة مستخدم جديد للنظام"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-3 text-right">
          {/* تحويل grid-cols-2 إلى grid-cols-1 sm:grid-cols-2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="font-bold">اسم الموظف كاملاً</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="أحمد علي..." 
                className="h-11"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-bold">اسم المستخدم (للإدخال)</Label>
              <Input 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="ahmed123" 
                className="h-11 font-mono text-left"
              />
            </div>
          </div>

          {/* تحويل grid-cols-2 إلى grid-cols-1 sm:grid-cols-2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="font-bold">كلمة المرور</Label>
              <Input 
                type="password"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder={isEdit ? "اتركها فارغة لعدم التغيير" : "اكتب كلمة المرور..."}
                className="h-11 font-mono text-left"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-bold">دور الحساب</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {/* Developer option is hidden because Admin can never create a Developer user account. The only developer user is the Selim user. */}
                  {role === "developer" && (
                    <SelectItem value="developer">مطور النظام (Developer)</SelectItem>
                  )}
                  <SelectItem value="admin">مدير نظام (Admin)</SelectItem>
                  <SelectItem value="cashier">كاشير / موظف (Cashier)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* جعل الحاوية تتجاوب وتتكدس عمودياً في الشاشات الصغيرة جداً إذا لزم الأمر */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-border dark:bg-slate-900/30">
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">تفعيل حساب المستخدم فوراً؟</span>
            <div className="flex items-center gap-2">
              <Switch
                checked={status === "active"}
                onCheckedChange={(checked) => setStatus(checked ? "active" : "inactive")}
              />
              <span className="text-xs font-bold">{status === "active" ? "حساب نشط" : "حساب معطل"}</span>
            </div>
          </div>

          {/* Cashier Permissions checklist */}
          {role === "cashier" && (
            <div className="border border-amber-500/20 bg-amber-500/5 p-4 rounded-xl space-y-3 animate-in fade-in duration-200">
              <h4 className="font-black text-sm text-amber-800 flex items-center gap-1.5 border-b border-amber-500/20 pb-1.5">
                <ShieldAlert className="h-4 w-4" /> صلاحيات الكاشير في نقطة البيع
              </h4>
              
              {/* تحويل grid-cols-2 إلى grid-cols-1 sm:grid-cols-2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="perm_discount" 
                    checked={canDiscount} 
                    onCheckedChange={(checked) => setCanDiscount(!!checked)}
                  />
                  <label htmlFor="perm_discount" className="font-semibold cursor-pointer select-none">
                    السماح بعمل خصومات على الفواتير
                  </label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="perm_spot" 
                    checked={canPrintSpotCheck} 
                    onCheckedChange={(checked) => setCanPrintSpotCheck(!!checked)}
                  />
                  <label htmlFor="perm_spot" className="font-semibold cursor-pointer select-none">
                    السماح بطباعة تقرير جرد الوردية (Spot Check)
                  </label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="perm_open" 
                    checked={canOpenShift} 
                    onCheckedChange={(checked) => setCanOpenShift(!!checked)}
                  />
                  <label htmlFor="perm_open" className="font-semibold cursor-pointer select-none">
                    السماح بفتح وبدء وردية جديدة
                  </label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="perm_close" 
                    checked={canCloseShift} 
                    onCheckedChange={(checked) => setCanCloseShift(!!checked)}
                  />
                  <label htmlFor="perm_close" className="font-semibold cursor-pointer select-none">
                    السماح بإغلاق وإنهاء الوردية
                  </label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="perm_close_any" 
                    checked={canCloseAnyShift} 
                    onCheckedChange={(checked) => setCanCloseAnyShift(!!checked)}
                  />
                  <label htmlFor="perm_close_any" className="font-semibold cursor-pointer select-none">
                    السماح بإغلاق وردية أي مستخدم آخر
                  </label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="perm_view_receipts" 
                    checked={canViewReceipts} 
                    onCheckedChange={(checked) => setCanViewReceipts(!!checked)}
                  />
                  <label htmlFor="perm_view_receipts" className="font-semibold cursor-pointer select-none">
                    عرض صفحة فواتير المبيعات
                  </label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="perm_view_reports" 
                    checked={canViewReports} 
                    onCheckedChange={(checked) => setCanViewReports(!!checked)}
                  />
                  <label htmlFor="perm_view_reports" className="font-semibold cursor-pointer select-none">
                    عرض صفحة التقارير والرسوم البيانية (Reports)
                  </label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="perm_reprint" 
                    checked={canReprintReceipts} 
                    onCheckedChange={(checked) => setCanReprintReceipts(!!checked)}
                  />
                  <label htmlFor="perm_reprint" className="font-semibold cursor-pointer select-none">
                    إعادة طباعة البونات/الفواتير
                  </label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="perm_edit_payment" 
                    checked={canEditPaymentMethods} 
                    onCheckedChange={(checked) => setCanEditPaymentMethods(!!checked)}
                  />
                  <label htmlFor="perm_edit_payment" className="font-semibold cursor-pointer select-none">
                    السماح بتعديل طريقة دفع الفاتورة
                  </label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="perm_void" 
                    checked={canVoidReceipts} 
                    onCheckedChange={(checked) => setCanVoidReceipts(!!checked)}
                  />
                  <label htmlFor="perm_void" className="font-semibold cursor-pointer select-none">
                    السماح بإلغاء الفواتير وإرجاع المخزن
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 justify-end sm:flex-row flex-col">
          <Button variant="ghost" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSave} className="font-bold px-6 w-full sm:w-auto">حفظ الحساب</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}