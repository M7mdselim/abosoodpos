import type { UserRole } from "@/types";

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
  username: string;
}

const MOCK_ACCOUNTS = [
  { id: "u_dev", username: "dev", password: "dev", name: "System Developer", role: "developer" as UserRole },
  { id: "u_admin", username: "admin", password: "admin", name: "Admin Manager", role: "admin" as UserRole },
  { id: "u_cashier", username: "cashier", password: "cashier", name: "Ahmed (Cashier)", role: "cashier" as UserRole },
];

export const authService = {
  login(username: string, password: string): SessionUser | null {
    const account = MOCK_ACCOUNTS.find(
      (a) => a.username.toLowerCase() === username.toLowerCase() && a.password === password
    );
    if (!account) return null;

    const session: SessionUser = {
      id: account.id,
      name: account.name,
      role: account.role,
      username: account.username,
    };

    localStorage.setItem("app_session", JSON.stringify(session));
    return session;
  },

  logout(): void {
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
