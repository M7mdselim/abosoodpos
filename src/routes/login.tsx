import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import { store } from "@/services/store";
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
import { Lock, User, KeyRound } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const { login } = useSession();
  const { t } = useLanguage();
  const settings = store.settings;

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


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-slate-100 via-slate-50 to-blue-50/30 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-border bg-card/90 backdrop-blur-md relative overflow-hidden transition-all duration-300 hover:shadow-slate-200/50 dark:hover:shadow-black/25">
        {/* Subtle decorative top bar gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600" />
        
        <CardHeader className="text-center pb-4 pt-8 animate-in fade-in slide-in-from-top-4 duration-500">
          {settings.logoUrl ? (
            <div className="relative inline-block mx-auto mb-4 p-1 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-md">
              <img src={settings.logoUrl} alt="Logo" className="h-20 w-20 object-cover rounded-full bg-white" />
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner">
              <Lock className="h-6 w-6" />
            </div>
          )}
          <CardTitle className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
            أهلاً بك في {settings.companyNameAr || "OilPro POS"}
          </CardTitle>
          <CardDescription className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1.5">
            أدخل حسابك لإدارة الخدمات ومبيعات نقطة البيع
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-8 px-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="font-bold text-slate-700 dark:text-slate-300">{t("username")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder="اسم الحساب"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 h-12 text-sm font-semibold rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-bold text-slate-700 dark:text-slate-300">{t("password")}</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-12 text-sm font-semibold rounded-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-800"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-bold mt-4 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all" disabled={loading}>
              {loading ? "جاري التحقق من الحساب..." : t("sign_in")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
