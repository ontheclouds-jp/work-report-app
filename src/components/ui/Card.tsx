import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-sm shadow-black/20 ${className}`}
    >
      {children}
    </div>
  );
}
