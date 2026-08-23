/**
 * CSV parsing utilities for transaction import.
 * Extracted for testability.
 */

export const EXPENSE_HEADERS = ["date", "amount", "personal_amount", "category", "sub_category", "payment_mode", "description", "notes"] as const;
export const EXPENSE_OPTIONAL_HEADERS = ["expense_date"] as const;
export const INCOME_HEADERS = ["date", "amount", "category", "sub_category", "description", "notes"] as const;

export interface ParsedExpense {
  date: string;
  expense_date: string;
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
  // Quoted fields can legally contain newlines and tabs. Fold them to spaces instead of
  // dropping them, so "Line one\nLine two" doesn't collapse into "Line oneLine two".
  const folded = input.replace(/[\r\n\t]+/g, " ");
  const filtered = [...folded]
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join("");
  return filtered.replace(/ {2,}/g, " ").trim();
}

/**
 * Read a monetary value from a CSV cell.
 *
 * Accepts a leading currency symbol or ISO code, comma thousands separators, and
 * accounting-style parentheses for negatives:
 *   "1234.56" → 1234.56, "$1,234.56" → 1234.56, "SGD 20" → 20, "(45.00)" → -45
 *
 * Returns null for anything it cannot read exactly. This is the point of the function:
 * parseFloat("1,234.56") returns 1 and parseFloat("45 CR") returns 45, silently importing
 * the wrong amount. Callers must surface null as a row error rather than substituting a value.
 */
export function parseMoney(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1).trim();
  } else if (s.startsWith("+")) {
    s = s.slice(1).trim();
  }

  // Leading currency marker only: "$12", "S$12", "SGD 12". A trailing marker such as
  // "45 CR" is deliberately left in place so it fails below instead of parsing as 45.
  s = s.replace(/^(?:[A-Za-z]{1,3}(?=[\s$€£¥₹]))?\s*[$€£¥₹]?\s*/, "");
  if (!s) return null;

  const parts = s.split(".");
  if (parts.length > 2) return null;
  const [intPart, decPart] = parts;
  if (decPart !== undefined && !/^\d+$/.test(decPart)) return null;

  let digits: string;
  if (intPart === "") {
    // ".50" is only meaningful with a decimal part.
    if (decPart === undefined) return null;
    digits = "0";
  } else if (intPart.includes(",")) {
    // Grouping must be well-formed; "1,23.45" is malformed and must not become 123.45.
    if (!/^\d{1,3}(,\d{3})+$/.test(intPart)) return null;
    digits = intPart.replace(/,/g, "");
  } else {
    if (!/^\d+$/.test(intPart)) return null;
    digits = intPart;
  }

  const value = Number(decPart === undefined ? digits : `${digits}.${decPart}`);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

/**
 * Split raw CSV text into records, following RFC 4180 quoting rules: "" is a literal
 * quote, and a quoted field may span newlines. Scans the whole text in one pass rather
 * than splitting on newlines first, which would tear quoted fields apart.
 */
function parseCSVRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;      // this field contains a quoted section
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    // Unquoted fields get trimmed; quoted content is kept as the author wrote it.
    record.push(quoted ? field : field.trim());
    field = "";
    quoted = false;
  };
  const endRecord = () => {
    endField();
    if (record.some((v) => v !== "")) records.push(record);
    record = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') { inQuotes = true; quoted = true; i++; continue; }
    if (char === ",") { endField(); i++; continue; }
    if (char === "\r") { endRecord(); i += text[i + 1] === "\n" ? 2 : 1; continue; }
    if (char === "\n") { endRecord(); i++; continue; }

    field += char;
    i++;
  }

  if (field !== "" || quoted || record.length) endRecord();
  return records;
}

export function parseCSVLines(text: string): { headers: string[]; rows: string[][] } | { error: string } {
  const records = parseCSVRecords(text);
  if (records.length < 2) return { error: "File must have a header row and at least one data row." };

  const headers = records[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  return { headers, rows: records.slice(1) };
}

function makeFieldReader(headers: string[], vals: string[], rowNum: number, errors: string[]) {
  const getRaw = (key: string) => {
    const idx = headers.indexOf(key);
    return idx === -1 ? "" : (vals[idx] ?? "").trim();
  };
  const get = (key: string) => {
    const raw = sanitizeString(getRaw(key));
    const max = MAX_LENGTHS[key];
    if (max && raw.length > max) {
      errors.push(`Row ${rowNum}: ${key} exceeds ${max} characters (truncated)`);
      return raw.substring(0, max);
    }
    return raw;
  };
  return { get, getRaw };
}

const amountError = (rowNum: number, key: string, raw: string) =>
  `Row ${rowNum}: could not read ${key} "${raw}" — use a plain number such as 1234.56`;

export function parseExpenseCSV(text: string): { rows: ParsedExpense[]; errors: string[] } {
  const parsed = parseCSVLines(text);
  if ("error" in parsed) return { rows: [], errors: [parsed.error] };
  const { headers, rows: records } = parsed;
  const missing = EXPENSE_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(", ")}`] };

  const rows: ParsedExpense[] = [];
  const errors: string[] = [];
  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 2;
    const { get, getRaw } = makeFieldReader(headers, records[i], rowNum, errors);
    const amountRaw = getRaw("amount");
    const date = getRaw("date");
    const category = get("category");
    if (!date || !amountRaw || !category) {
      errors.push(`Row ${rowNum}: missing required field (date, amount, or category)`);
      continue;
    }
    const amount = parseMoney(amountRaw);
    if (amount === null) {
      errors.push(amountError(rowNum, "amount", amountRaw));
      continue;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
      errors.push(`Row ${rowNum}: invalid date "${date}" — expected YYYY-MM-DD`);
      continue;
    }
    const personalRaw = getRaw("personal_amount");
    const personalAmount = parseMoney(personalRaw);
    if (personalAmount === null) {
      errors.push(amountError(rowNum, "personal_amount", personalRaw));
      continue;
    }
    if (amount < 0 || personalAmount < 0) {
      errors.push(`Row ${rowNum}: amount must be 0 or greater`);
      continue;
    }
    const expenseDateRaw = getRaw("expense_date");
    let expenseDate = date;
    if (expenseDateRaw) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDateRaw) || isNaN(Date.parse(expenseDateRaw))) {
        errors.push(`Row ${rowNum}: invalid expense_date "${expenseDateRaw}" — expected YYYY-MM-DD`);
        continue;
      }
      expenseDate = expenseDateRaw;
    }
    rows.push({
      date,
      expense_date: expenseDate,
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
  const { headers, rows: records } = parsed;
  const missing = INCOME_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(", ")}`] };

  const rows: ParsedIncome[] = [];
  const errors: string[] = [];
  for (let i = 0; i < records.length; i++) {
    const rowNum = i + 2;
    const { get, getRaw } = makeFieldReader(headers, records[i], rowNum, errors);
    const amountRaw = getRaw("amount");
    const date = getRaw("date");
    const category = get("category");
    if (!date || !amountRaw || !category) {
      errors.push(`Row ${rowNum}: missing required field (date, amount, or category)`);
      continue;
    }
    const amount = parseMoney(amountRaw);
    if (amount === null) {
      errors.push(amountError(rowNum, "amount", amountRaw));
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
