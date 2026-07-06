import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingCart, Users, Package, FileText, UserCog, Wrench, LogOut } from "lucide-react";
import { useSession } from "@/context/RoleContext";
import { cn } from "@/lib/utils";

const items = [
  { to: "/pos", label: "POS", icon: ShoppingCart, roles: ["admin", "cashier"] as const },
  { to: "/customers", label: "Customers", icon: Users, roles: ["admin", "cashier"] as const },
  { to: "/products", label: "Products", icon: Package, roles: ["admin"] as const },
  { to: "/reports", label: "Reports", icon: FileText, roles: ["admin", "cashier"] as const },
  { to: "/users", label: "Users", icon: UserCog, roles: ["admin"] as const },
];

export function AppSidebar() {
  const { session, setRole } = useSession();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const visible = items.filter((i) => (i.roles as readonly string[]).includes(session.role));

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-sidebar-primary">
          <Wrench className="h-6 w-6 text-sidebar-primary-foreground" />
        </div>
        <div>
          <div className="text-base font-bold leading-tight">OilPro POS</div>
          <div className="text-xs text-sidebar-foreground/60">Service Center</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {visible.map((item) => {
          const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 rounded-lg bg-sidebar-accent px-4 py-3">
          <div className="text-xs text-sidebar-foreground/60">Signed in as</div>
          <div className="text-sm font-semibold">{session.name}</div>
          <div className="mt-1 inline-block rounded bg-sidebar-primary px-2 py-0.5 text-xs uppercase tracking-wide text-sidebar-primary-foreground">
            {session.role}
          </div>
        </div>
        <button
          onClick={() => setRole(session.role === "admin" ? "cashier" : "admin")}
          className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          Switch to {session.role === "admin" ? "Cashier" : "Admin"}
        </button>
      </div>
    </aside>
  );
}
