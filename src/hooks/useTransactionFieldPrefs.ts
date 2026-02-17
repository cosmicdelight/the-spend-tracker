import { useState, useCallback } from "react";

export interface TransactionFieldPrefs {
  currency: boolean;
  creditCard: boolean;
  subCategory: boolean;
  notes: boolean;
}

const STORAGE_KEY = "transaction-field-prefs";

const defaults: TransactionFieldPrefs = {
  currency: true,
  creditCard: true,
  subCategory: true,
  notes: true,
};

function load(): TransactionFieldPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

export function useTransactionFieldPrefs() {
  const [prefs, setPrefs] = useState<TransactionFieldPrefs>(load);

  const toggle = useCallback((field: keyof TransactionFieldPrefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [field]: !prev[field] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { prefs, toggle };
}
