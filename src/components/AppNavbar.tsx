import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  UserCog,
  Wrench,
  LogOut,
  CalendarDays,
  Terminal,
  FileText,
  ChevronDown,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useSession } from "@/context/RoleContext";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { store } from "@/services/store";

interface NavItem {
  to: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  roles: readonly ("developer" | "admin" | "cashier")[];
}

interface NavCategory {
  key: string;
  label: string;
  items: NavItem[];
}

const categories: NavCategory[] = [
  {
    key: "sales",
    label: "Sales",
    items: [
      {
        to: "/pos",
        label: "POS",
        description: "Open checkout counter to sell products & services.",
        icon: ShoppingCart,
        roles: ["developer", "admin", "cashier"],
      },
      {
        to: "/receipts",
        label: "Receipts",
        description: "View sales history, reprint, or void receipts.",
        icon: FileText,
        roles: ["developer", "admin"],
      },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    items: [
      {
        to: "/shifts",
        label: "Shifts",
        description: "Manage register shifts and drawer cash counts.",
        icon: CalendarDays,
        roles: ["developer", "admin", "cashier"],
      },
      {
        to: "/customers",
        label: "Customers",
        description: "View customer details and vehicle service logs.",
        icon: Users,
        roles: ["developer", "admin"],
      },
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    items: [
      {
        to: "/products",
        label: "Products",
        description: "Manage inventory stock, pricing, and barcodes.",
        icon: Package,
        roles: ["developer", "admin"],
      },
    ],
  },
  {
    key: "management",
    label: "Management",
    items: [
      {
        to: "/reports",
        label: "Reports",
        description: "View sales reports, graphs, and summaries.",
        icon: TrendingUp,
        roles: ["developer", "admin", "cashier"],
      },
      {
        to: "/users",
        label: "Users",
        description: "Manage cashiers, admins, and permissions.",
        icon: UserCog,
        roles: ["developer", "admin"],
      },
      {
        to: "/logs",
        label: "Audit Logs",
        description: "Track user audit logs and system actions.",
        icon: Terminal,
        roles: ["developer", "admin"],
      },
      {
        to: "/settings",
        label: "Settings",
        description: "Configure receipt printer dimensions and print layouts.",
        icon: Settings,
        roles: ["developer"],
      },
      {
        to: "/developer",
        label: "Developer",
        description: "Database seeding and developer settings.",
        icon: Terminal,
        roles: ["developer"],
      },
    ],
  },
];

export function AppNavbar() {
  const { session, logout } = useSession();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  const handleMouseEnter = (key: string) => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setActiveDropdown(key);
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = window.setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  if (!session) return null;

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login" });
  };

  const settings = store.settings;

  return (
    <>
      <header className="h-16 w-full shrink-0 border-b border-border bg-background px-6 flex items-center justify-between shadow-sm z-30 sticky top-0">
      {/* Left side: Hamburger Button (mobile) + Logo & Brand + Categorized Horizontal Menu */}
      <div className="flex items-center gap-4 md:gap-8">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex md:hidden items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none transition-colors"
          aria-label="Toggle Menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <Link to="/pos" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-9 w-9 object-cover rounded-full shadow-sm border border-border bg-white" />
          ) : (
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Wrench className="h-5 w-5" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-tight leading-none text-foreground">{settings.companyNameEn}</span>
            <span className="text-[9px] text-muted-foreground font-semibold mt-1 tracking-wider uppercase leading-none">{settings.sloganEn}</span>
          </div>
        </Link>

        {/* Horizontal Categorized Menus */}
        <nav className="hidden md:flex items-center gap-1">
          {categories.map((cat) => {
            // Filter category items by user role and permissions
            const visibleItems = cat.items.filter((item) => {
              if (item.to === "/receipts" || item.to === "/reports") {
                return (
                  session.role !== "cashier" || session.permissions?.canViewReceipts === true
                );
              }
              return item.roles.includes(session.role);
            });

            if (visibleItems.length === 0) return null;

            const isAnyActive = visibleItems.some(
              (item) =>
                pathname === item.to ||
                (item.to !== "/" && pathname.startsWith(item.to))
            );

            return (
              <div
                key={cat.key}
                className="relative"
                onMouseEnter={() => handleMouseEnter(cat.key)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-200",
                    isAnyActive
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span>{cat.label}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", activeDropdown === cat.key ? "rotate-180" : "")} />
                </button>

                {/* Dropdown Card */}
                {activeDropdown === cat.key && (
                  <div className="absolute top-full left-0 w-80 pt-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="rounded-xl bg-card border border-border shadow-xl p-2 grid gap-1">
                      {visibleItems.map((item) => {
                        const active =
                          pathname === item.to ||
                          (item.to !== "/" && pathname.startsWith(item.to));
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => {
                              if (closeTimeoutRef.current) {
                                window.clearTimeout(closeTimeoutRef.current);
                                closeTimeoutRef.current = null;
                              }
                              setActiveDropdown(null);
                            }}
                            className={cn(
                              "flex items-start gap-3.5 rounded-lg p-3 text-left transition-all duration-200",
                              active
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-sm font-bold tracking-tight">{item.label}</div>
                              <div
                                className={cn(
                                  "text-[11px] mt-1 leading-snug font-medium",
                                  active
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground"
                                )}
                              >
                                {item.description}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Right side: User information & Logout */}
      <div className="flex items-center gap-4">
        {/* User profile capsule */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg bg-muted border border-border/30 px-3 py-1.5 text-xs">
          <div className="text-right">
            <div className="font-bold leading-tight text-foreground">{session.name}</div>
            <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
              {session.role}
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>

    {/* Mobile Sidebar Menu Drawer */}
    {mobileMenuOpen && (
      <div className="fixed inset-0 z-50 flex md:hidden" dir="rtl">
        {/* Overlay background */}
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
        
        {/* Menu Drawer Content */}
        <div className="relative flex w-80 max-w-[85vw] flex-col bg-card border-l border-border p-5 text-right shadow-2xl h-full overflow-y-auto animate-in slide-in-from-right duration-200">
          {/* Header: Logo, Company Name, and Close Button */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              {settings.logoUrl && (
                <img src={settings.logoUrl} alt="Logo" className="h-8 w-8 object-cover rounded-full" />
              )}
              <div className="flex flex-col text-right">
                <span className="font-black text-xs text-foreground leading-none">{settings.companyNameAr}</span>
                <span className="text-[8px] text-muted-foreground font-bold mt-1.5 leading-none">{settings.sloganAr}</span>
              </div>
            </div>
            
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Profile Info on Mobile */}
          <div className="mb-6 rounded-xl bg-muted p-3.5 text-right border border-border/30">
            <div className="font-bold text-sm text-foreground">{session.name}</div>
            <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
              {session.role}
            </div>
          </div>

          {/* List of Navigation Links Grouped by Category */}
          <div className="space-y-6 flex-1 text-right">
            {categories.map((cat) => {
              const visibleItems = cat.items.filter((item) => {
                if (item.to === "/receipts" || item.to === "/reports") {
                  return (
                    session.role !== "cashier" || session.permissions?.canViewReceipts === true
                  );
                }
                return item.roles.includes(session.role);
              });

              if (visibleItems.length === 0) return null;

              return (
                <div key={cat.key} className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground text-right px-2">
                    {cat.label}
                  </div>
                  <div className="grid gap-1">
                    {visibleItems.map((item) => {
                      const active =
                        pathname === item.to ||
                        (item.to !== "/" && pathname.startsWith(item.to));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3.5 rounded-lg px-3.5 py-2.5 text-right transition-all duration-200",
                            active
                              ? "bg-primary text-primary-foreground font-bold shadow-sm"
                              : "hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:font-semibold"
                          )}
                        >
                          <Icon className="h-4.5 w-4.5 shrink-0" />
                          <span className="text-sm font-semibold">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Mobile Logout Button */}
          <div className="mt-auto pt-6 border-t border-border">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="flex items-center justify-center gap-2 rounded-lg w-full py-3 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors border border-dashed border-destructive/20"
            >
              <LogOut className="h-4.5 w-4.5" />
              <span>Sign Out / تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
