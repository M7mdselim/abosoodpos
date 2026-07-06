// Mock auth/role context. Replace with JWT + ASP.NET Core auth later.
import { createContext, useContext, useState, type ReactNode } from "react";
import type { UserRole } from "@/types";

interface Session {
  userId: string;
  name: string;
  role: UserRole;
}

interface RoleContextValue {
  session: Session;
  setRole: (role: UserRole) => void;
}

const defaultSession: Session = {
  userId: "u1",
  name: "Admin User",
  role: "admin",
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(defaultSession);
  const setRole = (role: UserRole) =>
    setSession(
      role === "admin"
        ? { userId: "u1", name: "Admin User", role: "admin" }
        : { userId: "u2", name: "Ahmed (Cashier)", role: "cashier" },
    );
  return (
    <RoleContext.Provider value={{ session, setRole }}>{children}</RoleContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useSession must be used within RoleProvider");
  return ctx;
}
