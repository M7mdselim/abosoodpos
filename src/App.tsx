import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { useEffect, useState } from "react";
import { backendService } from "./services/backendService";
import { toast } from "sonner";

const router = getRouter();

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    async function initDb() {
      try {
        await backendService.syncFromBackend();
      } catch (err) {
        console.warn("Initial database sync failed, using offline local fallback:", err);
        setTimeout(() => {
          toast.error(
            "⚠️ فشل الاتصال بقاعدة البيانات السحابية. يعمل النظام الآن في وضع التشغيل المحلي المؤقت لحين اتصال الخادم.",
            { duration: 7000 }
          );
        }, 1000);
      } finally {
        setSyncing(false);
      }
    }
    initDb();
  }, []);

  if (syncing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans" dir="rtl">
        <div className="flex flex-col items-center gap-4 max-w-sm px-6 text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-lg font-black tracking-wide text-amber-500">......Loading</h2>
          <p className="text-xs text-slate-400">Please wait while we sync the data</p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
