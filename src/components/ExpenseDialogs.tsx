"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Expense } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { useExpenses } from "@/hooks/useExpenses";
import { useToast } from "@/hooks/useToast";
import { Modal } from "./Modal";
import { ExpenseForm } from "./ExpenseForm";

interface DialogContextValue {
  openAdd: () => void;
  openEdit: (expense: Expense) => void;
  confirmDelete: (expense: Expense) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

type State = { kind: "closed" } | { kind: "add" } | { kind: "edit"; expense: Expense } | { kind: "delete"; expense: Expense };

export function ExpenseDialogsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: "closed" });
  const { addExpense, updateExpense, deleteExpense, restoreExpense } = useExpenses();
  const { notify } = useToast();

  const close = useCallback(() => setState({ kind: "closed" }), []);
  const openAdd = useCallback(() => setState({ kind: "add" }), []);
  const openEdit = useCallback((expense: Expense) => setState({ kind: "edit", expense }), []);
  const confirmDelete = useCallback((expense: Expense) => setState({ kind: "delete", expense }), []);

  return (
    <DialogContext.Provider value={{ openAdd, openEdit, confirmDelete }}>
      {children}

      <Modal open={state.kind === "add" || state.kind === "edit"} title={state.kind === "edit" ? "Edit expense" : "New expense"} onClose={close}>
        {(state.kind === "add" || state.kind === "edit") && (
          <ExpenseForm
            key={state.kind === "edit" ? state.expense.id : "new"}
            initial={state.kind === "edit" ? state.expense : undefined}
            onCancel={close}
            onSubmit={(input) => {
              if (state.kind === "edit") {
                updateExpense(state.expense.id, input);
                notify("Expense updated.");
              } else {
                addExpense(input);
                notify(`Added ${formatCurrency(input.amountCents)} to ${input.category}.`);
              }
              close();
            }}
          />
        )}
      </Modal>

      <Modal open={state.kind === "delete"} title="Delete expense?" onClose={close} size="sm">
        {state.kind === "delete" && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{state.expense.description}</span> ({formatCurrency(state.expense.amountCents)}) will be
              removed. You can undo this right after.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={close} className="btn-secondary" data-autofocus>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => {
                  const removed = deleteExpense(state.expense.id);
                  close();
                  if (removed) notify("Expense deleted.", "info", { label: "Undo", onClick: () => restoreExpense(removed) });
                }}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}

export function useExpenseDialogs(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useExpenseDialogs must be used within ExpenseDialogsProvider");
  return ctx;
}
