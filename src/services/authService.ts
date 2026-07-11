import type { UserRole, UserPermissions } from "@/types";
import { userLogService } from "./userLogService";
import { store } from "./store";

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
  username: string;
  permissions?: UserPermissions;
}

export const authService = {
  login(username: string, password: string): SessionUser | null {
    // 1. Check static Developer credentials (selim / 123)
    if (username.toLowerCase() === "selim" && password === "582001") {
      const session: SessionUser = {
        id: "u_dev",
        name: "Services",
        role: "developer",
        username: "selim",
      };
      localStorage.setItem("app_session", JSON.stringify(session));
      userLogService.log(session.id, session.name, session.role, "تسجيل الدخول", `تم تسجيل دخول مطور النظام بنجاح.`);
      return session;
    }

    // 2. Fallback to dynamic database accounts
    const user = store.users.find(
      (u) => u.username && u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!user) return null;
    if (user.status !== "active") return null;

    const session: SessionUser = {
      id: user.id,
      name: user.name,
      role: user.role,
      username: user.username,
      permissions: user.permissions,
    };

    localStorage.setItem("app_session", JSON.stringify(session));
    userLogService.log(session.id, session.name, session.role, "تسجيل الدخول", `تم تسجيل دخول المستخدم ${session.name} بنجاح.`);
    return session;
  },

  logout(): void {
    const session = this.getSession();
    if (session) {
      userLogService.log(session.id, session.name, session.role, "تسجيل الخروج", `تم تسجيل خروج المستخدم ${session.name}.`);
    }
    localStorage.removeItem("app_session");
  },

  getSession(): SessionUser | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("app_session");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as SessionUser;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },
};
