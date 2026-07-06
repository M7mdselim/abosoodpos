import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User, Shield, Terminal, KeyRound } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const { login } = useSession();
  const { t } = useLanguage();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("يرجى تعبئة كافة الحقول المطلوب تسجيلها");
      return;
    }

    setLoading(true);
    // Add small delay to feel realistic
    setTimeout(() => {
      const success = login(username, password);
      setLoading(false);
      if (success) {
        toast.success("تم تسجيل الدخول بنجاح");
        router.navigate({ to: "/pos" });
      } else {
        toast.error(t("invalid_credentials"));
      }
    }, 400);
  };

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    toast.info(`تم ملء بيانات الدخول لـ ${user}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-border bg-card">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {t("welcome")}
          </CardTitle>
          <CardDescription>
            أدخل حسابك لإدارة الخدمات ومبيعات نقطة البيع
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("username")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="اسم الحساب"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loading}>
              {loading ? "جاري تسجيل الدخول..." : t("sign_in")}
            </Button>
          </form>

          {/* Quick Login Section */}
          <div className="mt-8 pt-6 border-t border-border">
            <Label className="text-muted-foreground text-xs block text-center mb-3">
              تسجيل دخول سريع للتجربة والتقييم
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex flex-col h-16 justify-center items-center text-xs gap-1 border-dashed"
                onClick={() => handleQuickLogin("cashier", "cashier")}
              >
                <User className="h-4 w-4 text-emerald-500" />
                <span>كاشير / موظف</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex flex-col h-16 justify-center items-center text-xs gap-1 border-dashed"
                onClick={() => handleQuickLogin("admin", "admin")}
              >
                <Shield className="h-4 w-4 text-primary" />
                <span>مسؤول / أدمن</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex flex-col h-16 justify-center items-center text-xs gap-1 border-dashed"
                onClick={() => handleQuickLogin("dev", "dev")}
              >
                <Terminal className="h-4 w-4 text-amber-500" />
                <span>مطور النظام</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
