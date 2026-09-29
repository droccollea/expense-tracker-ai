"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Expense, ExpenseInput, CATEGORIES } from "@/lib/types";
import { generateId, loadExpenses, saveExpenses } from "@/lib/storage";
import { toISODate } from "@/lib/format";

interface ExpensesContextValue {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => Expense | undefined;
  restoreExpense: (expense: Expense) => void;
  loadSampleData: () => void;
  clearAll: () => void;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setExpenses(loadExpenses());
    } catch {
      setError("We couldn't read your saved expenses. Stored data may be corrupted.");
    } finally {
      setIsLoading(false);
      setHydrated(true);
    }
  }, []);

  // Persist after hydration so we never overwrite stored data with the initial empty array.
  useEffect(() => {
    if (!hydrated) return;
    try {
      saveExpenses(expenses);
    } catch {
      setError("Changes couldn't be saved — your browser storage may be full or disabled.");
    }
  }, [expenses, hydrated]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith("expense-tracker")) {
        try {
          setExpenses(loadExpenses());
        } catch {
          /* ignore malformed cross-tab writes */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addExpense = useCallback((input: ExpenseInput) => {
    const now = new Date().toISOString();
    const expense: Expense = { ...input, id: generateId(), createdAt: now, updatedAt: now };
    setExpenses((prev) => [expense, ...prev]);
    return expense;
  }, []);

  const updateExpense = useCallback((id: string, input: ExpenseInput) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...input, updatedAt: new Date().toISOString() } : e)),
    );
  }, []);

  const deleteExpense = useCallback(
    (id: string) => {
      const target = expenses.find((e) => e.id === id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      return target;
    },
    [expenses],
  );

  const restoreExpense = useCallback((expense: Expense) => {
    setExpenses((prev) => (prev.some((e) => e.id === expense.id) ? prev : [expense, ...prev]));
  }, []);

  const loadSampleData = useCallback(() => {
    setExpenses((prev) => [...buildSampleData(), ...prev]);
  }, []);

  const clearAll = useCallback(() => setExpenses([]), []);

  const value = useMemo(
    () => ({
      expenses,
      isLoading,
      error,
      addExpense,
      updateExpense,
      deleteExpense,
      restoreExpense,
      loadSampleData,
      clearAll,
    }),
    [expenses, isLoading, error, addExpense, updateExpense, deleteExpense, restoreExpense, loadSampleData, clearAll],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesContextValue {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error("useExpenses must be used within an ExpensesProvider");
  return ctx;
}

const SAMPLE: Record<(typeof CATEGORIES)[number], [string, number, number][]> = {
  // [description, min dollars, max dollars]
  Food: [["Groceries", 45, 140], ["Coffee shop", 4, 9], ["Dinner out", 30, 90], ["Lunch", 10, 22]],
  Transportation: [["Gas", 35, 65], ["Transit pass", 25, 25], ["Rideshare", 12, 38]],
  Entertainment: [["Movie tickets", 18, 32], ["Streaming subscription", 15, 15], ["Concert", 60, 120]],
  Shopping: [["Clothing", 25, 110], ["Home supplies", 15, 60], ["Electronics", 40, 200]],
  Bills: [["Electricity", 70, 120], ["Internet", 65, 65], ["Phone", 45, 45]],
  Other: [["Gift", 20, 80], ["Haircut", 30, 45], ["Donation", 10, 50]],
};

function buildSampleData(): Expense[] {
  const now = new Date();
  const out: Expense[] = [];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let m = 0; m < 6; m++) {
    for (const category of CATEGORIES) {
      const items = SAMPLE[category];
      const count = category === "Food" ? 6 : category === "Bills" ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const [description, min, max] = items[Math.floor(rand() * items.length)];
        const day = 1 + Math.floor(rand() * 27);
        const date = new Date(now.getFullYear(), now.getMonth() - m, day);
        if (date > now) continue;
        const stamp = new Date().toISOString();
        out.push({
          id: generateId(),
          date: toISODate(date),
          amountCents: Math.round((min + rand() * (max - min)) * 100),
          category,
          description,
          createdAt: stamp,
          updatedAt: stamp,
        });
      }
    }
  }
  return out;
}
