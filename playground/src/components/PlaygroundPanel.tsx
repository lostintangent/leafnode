import type { ReactNode } from "react";

export function PlaygroundPanel({
  heading,
  status,
  children,
}: {
  heading: string;
  status: string;
  children: ReactNode;
}) {
  return (
    <section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl border border-foreground/15 shadow-xl shadow-foreground/10">
      <div className="flex min-h-11 items-center justify-between border-b border-foreground/15 bg-foreground/5 px-4 text-xs font-semibold text-muted">
        <span className="uppercase tracking-widest">{heading}</span>
        <span className="text-accent">{status}</span>
      </div>

      <div className="relative min-h-0 min-w-0">{children}</div>
    </section>
  );
}
