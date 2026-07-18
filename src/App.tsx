import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { useEffect, useState } from "react";
import { backendService } from "./services/backendService";
import { store } from "./services/store";
import { toast } from "sonner";
import { offlineDb } from "./services/offlineDb";

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

  // Listen to network status to trigger auto-sync
  useEffect(() => {
    if (syncing) return;

    const triggerSync = async () => {
      if (typeof window === "undefined" || !navigator.onLine) return;
      try {
        const queue = await offlineDb.getQueue();
        if (queue.length > 0) {
          toast.info(`🔄 جاري مزامنة عدد ${queue.length} من العمليات المعلقة...`);
          await backendService.syncOfflineQueue();
          toast.success("✅ تم مزامنة جميع العمليات المعلقة بنجاح!");
        }
      } catch (err) {
        console.warn("Auto-sync of offline queue failed, will retry later:", err);
      }
    };

    window.addEventListener("online", triggerSync);
    // Trigger on startup if online
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener("online", triggerSync);
    };
  }, [syncing]);

  // Shared auto-backup download function
  const runAutoBackup = async () => {
    const settings = store.settings;
    const now = new Date();
    const todayDate = now.toLocaleDateString("en-CA");
    try {
      const data = await backendService.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `abosoodpos_auto_backup_${todayDate}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      toast.success(
        `💾 تم تنزيل النسخة الاحتياطية التلقائية اليومية بنجاح (${hh}:${mm})`,
        { duration: 8000 }
      );

      const updatedSettings = { ...settings, lastAutoBackupDate: todayDate };
      store.settings = updatedSettings;
      await backendService.saveSettings(updatedSettings);
    } catch (err: any) {
      console.error("Auto backup failed:", err);
    }
  };

  // On app load: check if today's backup was missed (scheduled time already passed)
  useEffect(() => {
    const checkMissedBackup = async () => {
      // Wait a moment for settings to be loaded from backend
      await new Promise(r => setTimeout(r, 3000));

      const settings = store.settings;
      if (!settings?.autoBackupEnabled || !settings?.autoBackupTime) return;

      const now = new Date();
      const todayDate = now.toLocaleDateString("en-CA");
      if (settings.lastAutoBackupDate === todayDate) return; // Already backed up today

      // Check if scheduled time has already passed
      const [schedH, schedM] = settings.autoBackupTime.split(":").map(Number);
      const scheduledMinutes = schedH * 60 + schedM;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      if (currentMinutes > scheduledMinutes) {
        // Missed backup — run it now
        console.log("⏰ Missed auto-backup detected, running now...");
        await runAutoBackup();
      }
    };
    checkMissedBackup();
  }, [syncing]); // Re-check after initial sync completes

  // Background check for Auto Backup every 30 seconds (for exact-time match)
  useEffect(() => {
    const interval = setInterval(async () => {
      const settings = store.settings;
      if (!settings?.autoBackupEnabled || !settings?.autoBackupTime) return;

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentHHMM = `${hours}:${minutes}`;
      const todayDate = now.toLocaleDateString("en-CA");

      if (currentHHMM === settings.autoBackupTime && settings.lastAutoBackupDate !== todayDate) {
        await runAutoBackup();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (syncing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans" dir="rtl">
        <div className="flex flex-col items-center gap-4 max-w-sm px-6 text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-lg font-black tracking-wide text-amber-500">...Loading</h2>
          <p className="text-xs text-slate-400">Please wait while we sync the data</p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}
