import { backendService } from "./backendService";

export interface UserLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
}

export type UserLogEntry = UserLog;

const STORAGE_KEY_LOGS = "app_user_logs";

export const userLogService = {
  getLogs(): UserLog[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!stored) return [];
    try {
      return JSON.parse(stored) as UserLog[];
    } catch {
      return [];
    }
  },

  log(userId: string, userName: string, userRole: string, action: string, details: string) {
    if (typeof window === "undefined") return;
    const logs = this.getLogs();
    const newLog: UserLog = {
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      userId,
      userName,
      userRole,
      action,
      details,
    };
    logs.unshift(newLog);
    // Keep last 1000 logs to avoid localStorage bloating
    const trimmed = logs.slice(0, 1000);
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(trimmed));
    backendService.createUserLog(newLog).catch((err) => console.error("Error creating log in backend:", err));
  },

  clearLogs() {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify([]));
    backendService.clearUserLogs().catch((err) => console.error("Error clearing logs in backend:", err));
  }
};
