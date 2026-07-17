import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { authService, type SessionUser } from "@/services/authService";

interface RoleContextValue {
  session: SessionUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(() => authService.getSession());

  useEffect(() => {
    const handleSessionUpdate = () => {
      setSession(authService.getSession());
    };
    window.addEventListener("session_updated", handleSessionUpdate);
    window.addEventListener("storage", handleSessionUpdate);
    return () => {
      window.removeEventListener("session_updated", handleSessionUpdate);
      window.removeEventListener("storage", handleSessionUpdate);
    };
  }, []);

  const login = (username: string, password: string): boolean => {
    const user = authService.login(username, password);
    if (user) {
      setSession(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    authService.logout();
    setSession(null);
  };

  return (
    <RoleContext.Provider value={{ session, login, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useSession must be used within RoleProvider");
  return ctx;
}
