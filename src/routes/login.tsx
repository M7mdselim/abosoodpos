import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import { store } from "@/services/store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User, KeyRound, LogIn } from "lucide-react";

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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#5470ff] overflow-hidden font-sans p-2 sm:p-6 md:p-10 select-none">
      
      {/* Background white decorative circles */}
      <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-white/10 pointer-events-none" />

      {/* Main card container (RTL direction to swap left/right panes) */}
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 shadow-2xl rounded-[20px] sm:rounded-[24px] overflow-hidden flex flex-col md:flex-row z-10" dir="rtl">
        
        {/* Right column: Login Credentials Form (Primary focus in RTL) */}
        <div className="w-full md:w-[45%] p-5 sm:p-12 flex flex-col justify-between bg-white dark:bg-slate-900 text-right">
          
          {/* Top Brand Name */}
          <div className="flex items-center gap-3 mb-5 sm:mb-10 justify-start">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                className="h-11 w-11 sm:h-16 sm:w-16 object-cover rounded-full bg-white border border-slate-100/80 shadow-md" 
              />
            ) : (
              <div className="h-10 w-10 sm:h-14 sm:w-14 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 shadow-sm">
                <Lock className="h-4.5 w-4.5 sm:h-6 sm:w-6" />
              </div>
            )}
            <span className="font-black text-lg sm:text-2xl md:text-3xl text-slate-850 dark:text-white tracking-tight leading-none">
              {settings.companyNameAr || "أبو السعود علام"}
            </span>
          </div>

          {/* Login tab header */}
          <div className="space-y-4 sm:space-y-6">
            <div className="border-b border-slate-100 dark:border-white/5 pb-2.5">
              <h3 className="text-lg sm:text-xl font-black text-slate-850 dark:text-white">
                تسجيل الدخول
              </h3>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              <div className="space-y-1 sm:space-y-1.5 text-right">
                <Label htmlFor="username" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t("username")}
                </Label>
                <div className="relative">
                  <User className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="أدخل اسم المستخدم"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pr-10 h-11 text-sm bg-slate-50/30 dark:bg-slate-950/40 border-slate-200 dark:border-white/10 focus:border-[#5470ff] focus:ring-[#5470ff]/20 text-slate-950 dark:text-white rounded-lg placeholder:text-slate-300 placeholder:font-normal"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1 sm:space-y-1.5 text-right">
                <Label htmlFor="password" className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t("password")}
                </Label>
                <div className="relative">
                  <KeyRound className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 h-11 text-sm bg-slate-50/30 dark:bg-slate-950/40 border-slate-200 dark:border-white/10 focus:border-[#5470ff] focus:ring-[#5470ff]/20 text-slate-950 dark:text-white rounded-lg placeholder:text-slate-300 placeholder:font-normal font-mono"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 px-8 text-sm font-extrabold bg-[#5470ff] hover:bg-[#435eeb] active:scale-[0.98] transition-all text-white rounded-lg shadow-md shadow-[#5470ff]/10 flex items-center justify-center gap-2 mt-4" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    جاري التحقق...
                  </span>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    دخول
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Footer attribution */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/5 mt-6 sm:mt-10" dir="ltr">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 justify-end">
              <span>Developed by</span>
              <a
                href="https://seliosolutions.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-extrabold text-slate-600 dark:text-slate-400 hover:text-[#5470ff] dark:hover:text-[#5470ff] transition-colors hover:underline underline-offset-2 cursor-pointer"
              >
                Selio Solutions
              </a>
            </div>
          </div>

        </div>

        {/* Left column: Blue Panel with Wavy divider & Dashboard Illustration (Desktop only) */}
        <div className="hidden md:flex md:w-[55%] bg-[#5470ff] text-white p-12 flex-col justify-between relative overflow-hidden" dir="ltr">
          
          {/* Wavy shape overlay that curves smoothly to separate columns, flipped to sit on the right of the panel */}
          <div className="absolute right-0 top-0 bottom-0 w-12 translate-x-[99%] pointer-events-none z-20">
            <svg className="h-full w-12 text-[#5470ff] fill-current" viewBox="0 0 100 1000" preserveAspectRatio="none">
              <path d="M0,0 C70,120 70,240 0,360 C70,480 70,620 0,740 C70,860 70,940 0,1000 L0,1000 L0,0 Z" />
            </svg>
          </div>

          {/* Decorative Vector Stems & Circles (matching leaves background) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 400 400" fill="none">
            <path d="M60 320 Q20 220 80 150" stroke="white" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="80" cy="150" r="14" fill="white" />
            <path d="M300 340 Q350 210 280 120" stroke="white" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="280" cy="120" r="20" fill="white" />
            <path d="M340 300 Q380 200 330 160" stroke="white" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="330" cy="160" r="10" fill="white" />
          </svg>

          {/* Illustration Container */}
          <div className="my-auto space-y-10 flex flex-col items-center">
            
            {/* Minimalist Graphic (Monitor & Dashboard Stats Graph) */}
            <div className="relative w-full max-w-[320px] aspect-[4/3] flex items-center justify-center">
              
              {/* Background glow behind dashboard */}
              <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl" />

              {/* Elegant Laptop/Monitor base frame */}
              <div className="relative w-[230px] h-[150px] bg-slate-900 rounded-xl p-2.5 shadow-2xl border-4 border-slate-800/90 flex flex-col justify-between z-10 transition-transform duration-500 hover:scale-105">
                {/* Screen area */}
                <div className="w-full h-full bg-[#1b263b] rounded-lg relative overflow-hidden flex flex-col justify-between p-2">
                  
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between opacity-[0.07] py-1.5 pointer-events-none">
                    <hr className="border-white" />
                    <hr className="border-white" />
                    <hr className="border-white" />
                    <hr className="border-white" />
                  </div>
                  
                  {/* Glowing line chart stats path */}
                  <svg className="w-full h-full absolute inset-0 z-10" viewBox="0 0 100 50">
                    <defs>
                      <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 35 Q 20 20 40 30 T 75 12 T 100 8 L 100 50 L 0 50 Z" fill="url(#chartGlow)" />
                    <path d="M 0 35 Q 20 20 40 30 T 75 12 T 100 8" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                    <circle cx="40" cy="30" r="2.5" fill="#38bdf8" />
                    <circle cx="75" cy="12" r="2.5" fill="#38bdf8" />
                  </svg>

                  {/* Small Screen HUD Indicators */}
                  <div className="absolute top-2 left-2 flex gap-1 z-20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </div>
                </div>
              </div>

              {/* Monitor Stand */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-7 h-10 bg-slate-800 border-x border-slate-700/80" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-2 bg-slate-700 rounded-full shadow-md" />

              {/* Floating Glassy Badge 1: Transactions success (top-left of screen) */}
              <div className="absolute -top-4 -left-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg p-2 flex items-center gap-2 shadow-lg z-25">
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-[8px] text-blue-100/60 font-bold">حالة النظام</div>
                  <div className="text-[10px] text-white font-extrabold">متصل وآمن</div>
                </div>
              </div>

              {/* Floating Glassy Badge 2: Growth Metrics (bottom-right of screen) */}
              <div className="absolute -bottom-2 -right-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg p-2.5 flex items-center gap-2 shadow-lg z-25">
                <div className="h-7 w-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-[8px] text-blue-100/60 font-bold">التقرير اليومي</div>
                  <div className="text-[10px] text-white font-extrabold">+24.8% نمو</div>
                </div>
              </div>

            </div>

            {/* Slogan details */}
            <div className="text-center space-y-3 px-4" dir="rtl">
              <h3 className="text-lg font-black tracking-wide">
                إدارة خدمات ومبيعات نقطة البيع في مكان واحد
              </h3>
              <p className="text-xs text-blue-100/70 font-bold leading-relaxed max-w-sm mx-auto">
                كل ما تحتاجه لإدارة وتتبع مبيعات الزيوت والخدمات وورديات الموظفين بنقرة زر واحدة.
              </p>
            </div>

            {/* Pagination Indicators / Slide Dots */}
            <div className="flex justify-center gap-2">
              <span className="h-1.5 w-6 rounded-full bg-white/40" />
              <span className="h-1.5 w-10 rounded-full bg-white" />
              <span className="h-1.5 w-6 rounded-full bg-white/40" />
            </div>

          </div>

          {/* Subtle bottom tagline */}
          <div className="text-center text-[10px] text-blue-200/50 font-bold">
            {settings.sloganAr || "لجميع أنواع الزيوت والخدمات"}
          </div>

        </div>

      </div>

    </div>
  );
}
