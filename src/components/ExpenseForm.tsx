"use client";

import { useState, type FormEvent } from "react";
import { CATEGORIES, CATEGORY_STYLES, Category, Expense, ExpenseInput, isCategory } from "@/lib/types";
import { centsToInput, isValidISODate, parseAmountToCents, todayISO } from "@/lib/format";

interface ExpenseFormProps {
  initial?: Expense;
  onSubmit: (input: ExpenseInput) => void;
  onCancel: () => void;
}

type Errors = Partial<Record<"date" | "amount" | "category" | "description", string>>;

const MAX_AMOUNT_CENTS = 100_000_000; // $1,000,000
const MAX_DESCRIPTION = 120;

export function ExpenseForm({ initial, onSubmit, onCancel }: ExpenseFormProps) {
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amountCents) : "");
  const [category, setCategory] = useState<Category | "">(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function validate(): { errors: Errors; cents: number | null } {
    const next: Errors = {};
    if (!date) next.date = "Date is required.";
    else if (!isValidISODate(date)) next.date = "Enter a valid date.";
    else if (date > todayISO()) next.date = "Date can't be in the future.";

    const cents = parseAmountToCents(amount);
    if (!amount.trim()) next.amount = "Amount is required.";
    else if (cents === null) next.amount = "Enter a number with up to 2 decimals.";
    else if (cents <= 0) next.amount = "Amount must be greater than $0.";
    else if (cents > MAX_AMOUNT_CENTS) next.amount = "Amount must be under $1,000,000.";

    if (!isCategory(category)) next.category = "Choose a category.";

    const desc = description.trim();
    if (!desc) next.description = "Add a short description.";
    else if (desc.length > MAX_DESCRIPTION) next.description = `Keep it under ${MAX_DESCRIPTION} characters.`;

    return { errors: next, cents };
  }

  // Live re-validation once the user has attempted to submit.
  const liveErrors = touched ? validate().errors : errors;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    const { errors: next, cents } = validate();
    setErrors(next);
    if (Object.keys(next).length > 0 || cents === null || !isCategory(category)) {
      const firstInvalid = (["date", "amount", "category", "description"] as const).find((k) => next[k]);
      if (firstInvalid) document.getElementById(`expense-${firstInvalid}`)?.focus();
      return;
    }
    setSubmitting(true);
    onSubmit({ date, amountCents: cents, category, description: description.trim() });
  }

  const fieldClass = (hasError: boolean) =>
    `block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
      hasError ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-brand-500 focus:ring-brand-100"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount" id="expense-amount" error={liveErrors.amount}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">$</span>
            <input
              id="expense-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => {
                const c = parseAmountToCents(amount);
                if (c !== null && c > 0) setAmount(centsToInput(c));
              }}
              aria-invalid={!!liveErrors.amount}
              aria-describedby={liveErrors.amount ? "expense-amount-error" : undefined}
              className={`${fieldClass(!!liveErrors.amount)} pl-7 tabular-nums`}
            />
          </div>
        </Field>
        <Field label="Date" id="expense-date" error={liveErrors.date}>
          <input
            id="expense-date"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={!!liveErrors.date}
            aria-describedby={liveErrors.date ? "expense-date-error" : undefined}
            className={fieldClass(!!liveErrors.date)}
          />
        </Field>
      </div>

      <Field label="Category" id="expense-category" error={liveErrors.category}>
        <div id="expense-category" role="radiogroup" aria-label="Category" tabIndex={-1} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((c) => {
            const selected = category === c;
            return (
              <button
                type="button"
                key={c}
                role="radio"
                aria-checked={selected}
                onClick={() => setCategory(c)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  selected
                    ? "border-brand-500 bg-brand-50 font-medium text-brand-700 ring-1 ring-brand-500"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span aria-hidden>{CATEGORY_STYLES[c].icon}</span>
                {c}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label="Description"
        id="expense-description"
        error={liveErrors.description}
        hint={`${description.trim().length}/${MAX_DESCRIPTION}`}
      >
        <input
          id="expense-description"
          placeholder="e.g. Weekly groceries"
          value={description}
          maxLength={MAX_DESCRIPTION + 20}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={!!liveErrors.description}
          aria-describedby={liveErrors.description ? "expense-description-error" : undefined}
          className={fieldClass(!!liveErrors.description)}
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving…" : initial ? "Save changes" : "Add expense"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  error,
  hint,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {hint && <span className="text-xs tabular-nums text-slate-400">{hint}</span>}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
