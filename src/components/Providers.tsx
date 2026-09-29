"use client";

import type { ReactNode } from "react";
import { ExpensesProvider } from "@/hooks/useExpenses";
import { ToastProvider } from "@/hooks/useToast";
import { ExpenseDialogsProvider } from "./ExpenseDialogs";
import { Navbar } from "./Navbar";
import { StorageErrorBanner } from "./StorageErrorBanner";
import { CloudProvider } from "@/hooks/useCloud";
import { ActivityTray } from "./cloud/ActivityTray";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExpensesProvider>
        <CloudProvider>
          <ExpenseDialogsProvider>
            <Navbar />
            <StorageErrorBanner />
            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
            <ActivityTray />
          </ExpenseDialogsProvider>
        </CloudProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}
