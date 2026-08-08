import Link from "next/link";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  action?: ReactNode;
}

export function PageHeader({ title, backHref, action }: PageHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {backHref && (
          <Link
            href={backHref}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="戻る"
          >
            ←
          </Link>
        )}
        <h1 className="text-xl font-bold text-slate-50">{title}</h1>
      </div>
      {action}
    </div>
  );
}
