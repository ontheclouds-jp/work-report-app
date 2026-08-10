"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/logs", label: "日報一覧", icon: "📝" },
  { href: "/work-types", label: "作業名", icon: "👥" },
  { href: "/periods", label: "集計", icon: "📊" },
];

const SETTINGS_HREF = "/settings";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function NavBar() {
  const pathname = usePathname();
  const settingsActive = isActive(pathname, SETTINGS_HREF);

  return (
    <>
      <header className="sticky top-0 z-40 hidden border-b border-slate-800 bg-slate-900/95 backdrop-blur sm:block">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold text-slate-50">
            作業日報帳
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 h-11 flex items-center text-base font-medium transition-colors ${
                  isActive(pathname, item.href)
                    ? "bg-blue-500/15 text-blue-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={SETTINGS_HREF}
              aria-label="設定"
              title="設定"
              className={`flex h-11 w-11 items-center justify-center rounded-lg text-lg transition-colors ${
                settingsActive
                  ? "bg-blue-500/15 text-blue-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              ⚙️
            </Link>
          </nav>
        </div>
      </header>

      <header className="sticky top-0 z-40 relative flex h-14 items-center justify-center border-b border-slate-800 bg-slate-900/95 backdrop-blur sm:hidden">
        <span className="text-lg font-bold text-slate-50">作業日報帳</span>
        <Link
          href={SETTINGS_HREF}
          aria-label="設定"
          className={`absolute right-3 flex h-9 w-9 items-center justify-center rounded-lg text-lg ${
            settingsActive ? "text-blue-300" : "text-slate-400"
          }`}
        >
          ⚙️
        </Link>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-800 bg-slate-900/95 backdrop-blur sm:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
              isActive(pathname, item.href) ? "text-blue-300" : "text-slate-500"
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
