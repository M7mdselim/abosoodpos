import type { ReactNode } from "react";

export function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 sm:px-8 py-4 sm:py-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="flex-1 overflow-auto p-4 sm:p-6">{children}</div>
    </div>
  );
}
