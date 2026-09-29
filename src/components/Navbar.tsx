"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartIcon, ListIcon, PlusIcon, WalletIcon } from "./Icons";
import { useExpenseDialogs } from "./ExpenseDialogs";

const LINKS = [
  { href: "/", label: "Dashboard", Icon: ChartIcon },
  { href: "/expenses", label: "Expenses", Icon: ListIcon },
];

export function Navbar() {
  const pathname = usePathname();
  const { openAdd } = useExpenseDialogs();

  return (
    <header className="sticky z-40 border-b border-slate-200 bg-white/85 backdrop-blur" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">
            <WalletIcon width={18} height={18} />
          </span>
          <span className="hidden sm:inline">Ledgerly</span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main">
          {LINKS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm sm:px-3 font-medium transition ${
                  active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon width={16} height={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <button onClick={openAdd} className="btn-primary ml-auto px-3 sm:px-4" aria-label="Add expense">
          <PlusIcon width={16} height={16} />
          <span className="hidden sm:inline">Add expense</span>
        </button>
      </div>
    </header>
  );
}
