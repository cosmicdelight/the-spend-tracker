import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { usePaymentModes } from "@/hooks/usePaymentModes";

// ── Expense ──────────────────────────────────────────────────────────────────
const EXPENSE_HEADERS = ["date", "amount", "personal_amount", "category", "sub_category", "payment_mode", "description", "notes"];

interface ParsedExpense {
  date: string;
  amount: number;
  personal_amount: number;
  category: string;
  sub_category: string | null;
  payment_mode: string;
  description: string;
  notes: string | null;
}

// ── Income ────────────────────────────────────────────────────────────────────
const INCOME_HEADERS = ["date", "amount", "category", "sub_category", "description", "notes"];

interface ParsedIncome {
  date: string;
  amount: number;
  category: string;
  sub_category: string | null;
  description: string | null;
  notes: string | null;
}

// ── Shared ────────────────────────────────────────────────────────────────────
const MAX_LENGTHS: Record<string, number> = {
  description: 500,
  notes: 1000,
  category: 100,
  sub_category: 100,
  payment_mode: 100,
};

function sanitizeString(input: string): string {
  return input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "").trim();
}

function parseCSVLines(text: string): { headers: string[]; lines: string[] } | { error: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { error: "File must have a header row and at least one data row." };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return { headers, lines: lines.slice(1) };
}

function parseExpenseCSV(text: string): { rows: ParsedExpense[]; errors: string[] } {
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

    if (!date || isNaN(amount) || !category) { errors.push(`Row ${rowNum}: missing required field (date, amount, or category)`); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) { errors.push(`Row ${rowNum}: invalid date "${date}" — expected YYYY-MM-DD`); continue; }
    if (isNaN(personalAmount)) { errors.push(`Row ${rowNum}: invalid personal_amount`); continue; }
    if (amount <= 0) { errors.push(`Row ${rowNum}: amount must be greater than 0`); continue; }

    rows.push({
      date, amount, personal_amount: personalAmount, category,
      sub_category: get("sub_category") || null,
      payment_mode: get("payment_mode") || "cash",
      description: get("description"),
      notes: get("notes") || null,
    });
  }
  return { rows, errors };
}

function parseIncomeCSV(text: string): { rows: ParsedIncome[]; errors: string[] } {
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

    if (!date || isNaN(amount) || !category) { errors.push(`Row ${rowNum}: missing required field (date, amount, or category)`); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) { errors.push(`Row ${rowNum}: invalid date "${date}" — expected YYYY-MM-DD`); continue; }
    if (amount <= 0) { errors.push(`Row ${rowNum}: amount must be greater than 0`); continue; }

    rows.push({
      date, amount, category,
      sub_category: get("sub_category") || null,
      description: get("description") || null,
      notes: get("notes") || null,
    });
  }
  return { rows, errors };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ImportTransactionsDialog() {
  const [open, setOpen] = useState(false);
  const [importType, setImportType] = useState<"expense" | "income">("expense");
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const [parsedIncome, setParsedIncome] = useState<ParsedIncome[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: paymentModes = [] } = usePaymentModes();

  const normalizePaymentMode = useCallback((raw: string): string => {
    const lower = raw.toLowerCase().trim();
    const exactMatch = paymentModes.find((m) => m.value === lower);
    if (exactMatch) return exactMatch.value;
    const labelMatch = paymentModes.find((m) => m.label.toLowerCase() === lower);
    if (labelMatch) return labelMatch.value;
    if (lower === "card" || lower === "cc") return "credit_card";
    return raw;
  }, [paymentModes]);

  const reset = () => {
    setParsedExpenses([]);
    setParsedIncome([]);
    setParseErrors([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleTypeChange = (type: "expense" | "income") => {
    setImportType(type);
    reset();
  };

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      if (importType === "expense") {
        const { rows, errors } = parseExpenseCSV(text);
        setParsedExpenses(rows);
        setParsedIncome([]);
        setParseErrors(errors);
      } else {
        const { rows, errors } = parseIncomeCSV(text);
        setParsedIncome(rows);
        setParsedExpenses([]);
        setParseErrors(errors);
      }
    };
    reader.readAsText(file);
  }, [importType]);

  const downloadTemplate = () => {
    let header: string;
    let sample: string;
    let filename: string;
    if (importType === "expense") {
      header = "date,amount,personal_amount,category,sub_category,payment_mode,description,notes";
      sample = "2026-01-15,50.00,25.00,Food,Restaurants,credit_card,Dinner with friends,Split with John\n2026-02-03,12.50,12.50,Transport,,cash,Grab ride,";
      filename = "expenses_template.csv";
    } else {
      header = "date,amount,category,sub_category,description,notes";
      sample = "2026-01-31,5000.00,Salary,,Monthly salary,\n2026-02-10,500.00,Freelance,Design,Logo project,";
      filename = "income_template.csv";
    }
    const blob = new Blob([header + "\n" + sample + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!user) return;

    if (importType === "expense" && parsedExpenses.length > 0) {
      setImporting(true);
      const payload = parsedExpenses.map((r) => ({
        user_id: user.id,
        date: r.date,
        amount: r.amount,
        personal_amount: r.personal_amount,
        category: r.category,
        sub_category: r.sub_category,
        payment_mode: normalizePaymentMode(r.payment_mode),
        description: r.description,
        notes: r.notes,
        credit_card_id: null,
      }));
      const { error } = await supabase.from("transactions").insert(payload);
      setImporting(false);
      if (error) {
        toast({ title: "Import failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Import successful", description: `${parsedExpenses.length} expenses imported.` });
        qc.invalidateQueries({ queryKey: ["transactions"] });
        reset(); setOpen(false);
      }
    }

    if (importType === "income" && parsedIncome.length > 0) {
      setImporting(true);
      const payload = parsedIncome.map((r) => ({
        user_id: user.id,
        date: r.date,
        amount: r.amount,
        original_amount: r.amount,
        original_currency: "SGD",
        category: r.category,
        sub_category: r.sub_category,
        description: r.description,
        notes: r.notes,
      }));
      const { error } = await supabase.from("income").insert(payload);
      setImporting(false);
      if (error) {
        toast({ title: "Import failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Import successful", description: `${parsedIncome.length} income entries imported.` });
        qc.invalidateQueries({ queryKey: ["income"] });
        reset(); setOpen(false);
      }
    }
  };

  const parsedRows = importType === "expense" ? parsedExpenses : parsedIncome;
  const columnHeaders = importType === "expense"
    ? EXPENSE_HEADERS.join(", ")
    : INCOME_HEADERS.join(", ");

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-1 h-3 w-3" />Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from CSV</DialogTitle>
          {/* toggle: expense | income */}
        </DialogHeader>

        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border p-1 gap-1">
            <button
              type="button"
              onClick={() => handleTypeChange("expense")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                importType === "expense"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("income")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                importType === "income"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Income
            </button>
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              Columns: <span className="font-medium">{columnHeaders}</span>.{" "}
              <button
                type="button"
                className="underline text-primary hover:text-primary/80"
                onClick={downloadTemplate}
              >
                Download template
              </button>
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
            />
          </div>

          {parseErrors.length > 0 && (
            <div className="max-h-24 overflow-y-auto rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
              {parseErrors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {parsedRows.length > 0 && (
            <>
              <div className="max-h-48 overflow-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Date</th>
                      <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                      {importType === "expense" && (
                        <th className="px-2 py-1.5 text-right font-medium">Personal</th>
                      )}
                      <th className="px-2 py-1.5 text-left font-medium">Category</th>
                      <th className="px-2 py-1.5 text-left font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{r.date}</td>
                        <td className="px-2 py-1 text-right">${r.amount.toFixed(2)}</td>
                        {importType === "expense" && (
                          <td className="px-2 py-1 text-right">${(r as ParsedExpense).personal_amount.toFixed(2)}</td>
                        )}
                        <td className="px-2 py-1">{r.category}</td>
                        <td className="px-2 py-1 truncate max-w-[8rem]">{r.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{parsedRows.length} rows ready</p>
                <Button onClick={handleImport} disabled={importing} size="sm">
                  {importing ? "Importing…" : `Import ${parsedRows.length} ${importType === "expense" ? "expenses" : "income entries"}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
