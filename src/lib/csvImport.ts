/**
 * CSV parsing utilities for transaction import.
 * Extracted for testability.
 */

export const EXPENSE_HEADERS = ["date", "amount", "personal_amount", "category", "sub_category", "payment_mode", "description", "notes"] as const;
export const INCOME_HEADERS = ["date", "amount", "category", "sub_category", "description", "notes"] as const;

export interface ParsedExpense {
  date: string;
  amount: number;
  personal_amount: number;
  category: string;
  sub_category: string | null;
  payment_mode: string;
  description: string;
  notes: string | null;
}

export interface ParsedIncome {
  date: string;
  amount: number;
  category: string;
  sub_category: string | null;
  description: string | null;
  notes: string | null;
}

const MAX_LENGTHS: Record<string, number> = {
  description: 500, notes: 1000, category: 100, sub_category: 100, payment_mode: 100,
};

function sanitizeString(input: string): string {
  const filtered = [...input]
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join("");
  return filtered.trim();
}

export function parseCSVLines(text: string): { headers: string[]; lines: string[] } | { error: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { error: "File must have a header row and at least one data row." };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return { headers, lines: lines.slice(1) };
}

export function parseExpenseCSV(text: string): { rows: ParsedExpense[]; errors: string[] } {
  const parsed = parseCSVLines(text);
  if ("error" in parsed) return { rows: [], errors: [parsed.error] };
  const { headers, lines } = parsed;
  const missing = EXPENSE_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(", ")}`] };
  const rows: ParsedExpense[] = [];
  const errors: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const rowNum = i + 2;
    const vals = lines[i].split(",").map((v) => v.trim());
    const getRaw = (key: string) => vals[headers.indexOf(key)] ?? "";
    const get = (key: string) => {
      const raw = sanitizeString(getRaw(key));
      const max = MAX_LENGTHS[key];
      if (max && raw.length > max) {
        errors.push(`Row ${rowNum}: ${key} exceeds ${max} characters (truncated)`);
        return raw.substring(0, max);
      }
      return raw;
    };
    const amount = parseFloat(getRaw("amount"));
    const personalAmount = parseFloat(getRaw("personal_amount"));
    const date = getRaw("date");
    const category = get("category");
    if (!date || isNaN(amount) || !category) {
      errors.push(`Row ${rowNum}: missing required field (date, amount, or category)`);
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
      errors.push(`Row ${rowNum}: invalid date "${date}" — expected YYYY-MM-DD`);
      continue;
    }
    if (isNaN(personalAmount)) {
      errors.push(`Row ${rowNum}: invalid personal_amount`);
      continue;
    }
    if (amount < 0) {
      errors.push(`Row ${rowNum}: amount must be 0 or greater`);
      continue;
    }
    rows.push({
      date,
      amount,
      personal_amount: personalAmount,
      category,
      sub_category: get("sub_category") || null,
      payment_mode: get("payment_mode") || "cash",
      description: get("description"),
      notes: get("notes") || null,
    });
  }
  return { rows, errors };
}

export function parseIncomeCSV(text: string): { rows: ParsedIncome[]; errors: string[] } {
  const parsed = parseCSVLines(text);
  if ("error" in parsed) return { rows: [], errors: [parsed.error] };
  const { headers, lines } = parsed;
  const missing = INCOME_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(", ")}`] };
  const rows: ParsedIncome[] = [];
  const errors: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const rowNum = i + 2;
    const vals = lines[i].split(",").map((v) => v.trim());
    const getRaw = (key: string) => vals[headers.indexOf(key)] ?? "";
    const get = (key: string) => {
      const raw = sanitizeString(getRaw(key));
      const max = MAX_LENGTHS[key];
      if (max && raw.length > max) {
        errors.push(`Row ${rowNum}: ${key} exceeds ${max} characters (truncated)`);
        return raw.substring(0, max);
      }
      return raw;
    };
    const amount = parseFloat(getRaw("amount"));
    const date = getRaw("date");
    const category = get("category");
    if (!date || isNaN(amount) || !category) {
      errors.push(`Row ${rowNum}: missing required field (date, amount, or category)`);
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
      errors.push(`Row ${rowNum}: invalid date "${date}" — expected YYYY-MM-DD`);
      continue;
    }
    if (amount < 0) {
      errors.push(`Row ${rowNum}: amount must be 0 or greater`);
      continue;
    }
    rows.push({
      date,
      amount,
      category,
      sub_category: get("sub_category") || null,
      description: get("description") || null,
      notes: get("notes") || null,
    });
  }
  return { rows, errors };
}
