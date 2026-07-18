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
    <div className="flex h-full w-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-border bg-card px-3 sm:px-8 py-2.5 sm:py-5 shrink-0 select-none">
        <div>
          <h1 className="text-base sm:text-2xl font-black text-foreground leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-[10px] sm:text-sm font-semibold text-muted-foreground mt-0.5 leading-none">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {children}
        <footer className="mt-10 pb-2 text-center print:hidden">
          <span className="text-[10px] font-semibold text-muted-foreground/50 tracking-wide">
            Powered by{" "}
            <a
              href="https://seliosolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-black text-muted-foreground/70 hover:text-primary transition-colors"
            >
              Selio Solutions
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}
