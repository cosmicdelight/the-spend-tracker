import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, ArrowLeft, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { usePaymentModes } from "@/hooks/usePaymentModes";
import { useBudgetCategories } from "@/hooks/useBudgetCategories";
import { useIncomeCategories } from "@/hooks/useIncomeCategories";
import { useAddBudgetCategory } from "@/hooks/useBudgetCategories";
import { useAddIncomeCategory } from "@/hooks/useIncomeCategories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

// ── Category Resolution ───────────────────────────────────────────────────────
interface CategoryResolution {
  csvCategory: string;
  csvSubCategory: string | null;
  action: "map" | "create";
  mappedTo: string | null;       // existing category name to map to
  mappedSubTo: string | null;    // existing sub-category name to map to
}

type ResolutionKey = string; // "category||sub_category"
function makeKey(cat: string, sub: string | null): ResolutionKey {
  return `${cat}||${sub ?? ""}`;
}

// ── Shared ────────────────────────────────────────────────────────────────────
const MAX_LENGTHS: Record<string, number> = {
  description: 500, notes: 1000, category: 100, sub_category: 100, payment_mode: 100,
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
      if (max && raw.length > max) { errors.push(`Row ${rowNum}: ${key} exceeds ${max} characters (truncated)`); return raw.substring(0, max); }
      return raw;
    };
    const amount = parseFloat(getRaw("amount"));
    const personalAmount = parseFloat(getRaw("personal_amount"));
    const date = getRaw("date");
    const category = get("category");
    if (!date || isNaN(amount) || !category) { errors.push(`Row ${rowNum}: missing required field (date, amount, or category)`); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) { errors.push(`Row ${rowNum}: invalid date "${date}" — expected YYYY-MM-DD`); continue; }
    if (isNaN(personalAmount)) { errors.push(`Row ${rowNum}: invalid personal_amount`); continue; }
    if (amount < 0) { errors.push(`Row ${rowNum}: amount must be 0 or greater`); continue; }
    rows.push({ date, amount, personal_amount: personalAmount, category, sub_category: get("sub_category") || null, payment_mode: get("payment_mode") || "cash", description: get("description"), notes: get("notes") || null });
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
      if (max && raw.length > max) { errors.push(`Row ${rowNum}: ${key} exceeds ${max} characters (truncated)`); return raw.substring(0, max); }
      return raw;
    };
    const amount = parseFloat(getRaw("amount"));
    const date = getRaw("date");
    const category = get("category");
    if (!date || isNaN(amount) || !category) { errors.push(`Row ${rowNum}: missing required field (date, amount, or category)`); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) { errors.push(`Row ${rowNum}: invalid date "${date}" — expected YYYY-MM-DD`); continue; }
    if (amount < 0) { errors.push(`Row ${rowNum}: amount must be 0 or greater`); continue; }
    rows.push({ date, amount, category, sub_category: get("sub_category") || null, description: get("description") || null, notes: get("notes") || null });
  }
  return { rows, errors };
}

// ── Similarity matching ───────────────────────────────────────────────────────
function similarityScore(a: string, b: string): number {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
  if (la.includes(lb) || lb.includes(la)) return 0.8;
  const wordsA = la.split(/\W+/).filter(Boolean);
  const wordsB = lb.split(/\W+/).filter(Boolean);
  const overlap = wordsA.filter((w) => wordsB.includes(w) && w.length > 2).length;
  if (overlap > 0) return 0.5 + overlap * 0.1;
  return 0;
}

interface ExistingCategoryRow { name: string; sub_category_name: string | null }

function findBestMatch(csvCat: string, csvSub: string | null, existing: ExistingCategoryRow[]): { name: string; sub: string | null; score: number } | null {
  let best: { name: string; sub: string | null; score: number } | null = null;
  for (const row of existing) {
    const catScore = similarityScore(csvCat, row.name);
    if (catScore < 0.5) continue;
    const subScore = csvSub
      ? row.sub_category_name ? similarityScore(csvSub, row.sub_category_name) : 0
      : row.sub_category_name === null ? 1 : 0.3;
    const total = catScore * 0.6 + subScore * 0.4;
    if (total > (best?.score ?? 0)) best = { name: row.name, sub: row.sub_category_name, score: total };
  }
  return best && best.score >= 0.5 ? best : null;
}

function isExactMatch(csvCat: string, csvSub: string | null, existing: ExistingCategoryRow[]): boolean {
  return existing.some(
    (r) => r.name.toLowerCase() === csvCat.toLowerCase() &&
      (r.sub_category_name ?? null)?.toLowerCase() === (csvSub ?? null)?.toLowerCase()
  );
}

function extractUniquePairs(rows: Array<{ category: string; sub_category: string | null }>): Array<{ category: string; sub_category: string | null }> {
  const seen = new Set<string>();
  const pairs: Array<{ category: string; sub_category: string | null }> = [];
  for (const r of rows) {
    const k = makeKey(r.category, r.sub_category);
    if (!seen.has(k)) { seen.add(k); pairs.push({ category: r.category, sub_category: r.sub_category }); }
  }
  return pairs;
}

// ── CategoryReviewStep ────────────────────────────────────────────────────────
interface ReviewItem {
  csvCategory: string;
  csvSubCategory: string | null;
  suggestion: { name: string; sub: string | null } | null;
  existingCategories: ExistingCategoryRow[];
}

interface CategoryReviewStepProps {
  items: ReviewItem[];
  resolutions: Map<ResolutionKey, CategoryResolution>;
  onResolutionChange: (key: ResolutionKey, res: CategoryResolution) => void;
  onBack: () => void;
  onConfirm: () => void;
}

function CategoryReviewStep({ items, resolutions, onResolutionChange, onBack, onConfirm }: CategoryReviewStepProps) {
  // Get unique existing category names for the dropdowns
  const uniqueCategories = (existingCategories: ExistingCategoryRow[]) => {
    const names = [...new Set(existingCategories.map((c) => c.name))].sort();
    return names;
  };

  const getSubsForCategory = (catName: string, existingCategories: ExistingCategoryRow[]) => {
    return existingCategories.filter((c) => c.name === catName && c.sub_category_name).map((c) => c.sub_category_name as string);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7 px-2">
          <ArrowLeft className="h-3.5 w-3.5" />
        </Button>
        <div>
          <p className="text-sm font-medium">{items.length} {items.length === 1 ? "category" : "categories"} need review</p>
          <p className="text-xs text-muted-foreground">Map to an existing category or create new ones</p>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
        {items.map((item) => {
          const key = makeKey(item.csvCategory, item.csvSubCategory);
          const res = resolutions.get(key)!;
          const catNames = uniqueCategories(item.existingCategories);
          const subsForMapped = res.mappedTo ? getSubsForCategory(res.mappedTo, item.existingCategories) : [];

          return (
            <div key={key} className="rounded-lg border bg-card p-3 space-y-2.5">
              {/* CSV value */}
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span className="text-xs text-muted-foreground">CSV:</span>
                <span className="text-xs font-medium">
                  {item.csvCategory}{item.csvSubCategory ? ` › ${item.csvSubCategory}` : ""}
                </span>
              </div>

              {/* Action selector */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onResolutionChange(key, { ...res, action: "create", mappedTo: null, mappedSubTo: null })}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    res.action === "create"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Plus className="h-3 w-3" />Create new
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const suggestion = item.suggestion;
                    onResolutionChange(key, {
                      ...res,
                      action: "map",
                      mappedTo: suggestion?.name ?? catNames[0] ?? null,
                      mappedSubTo: suggestion?.sub ?? null,
                    });
                  }}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    res.action === "map"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Map to existing
                </button>
              </div>

              {/* Map controls */}
              {res.action === "map" && catNames.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select
                    value={res.mappedTo ?? ""}
                    onValueChange={(v) => onResolutionChange(key, { ...res, mappedTo: v, mappedSubTo: null })}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue placeholder="Pick category" />
                    </SelectTrigger>
                    <SelectContent>
                      {catNames.map((n) => <SelectItem key={n} value={n} className="text-xs">{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {subsForMapped.length > 0 && (
                    <Select
                      value={res.mappedSubTo ?? "__none__"}
                      onValueChange={(v) => onResolutionChange(key, { ...res, mappedSubTo: v === "__none__" ? null : v })}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue placeholder="Sub-category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">(none)</SelectItem>
                        {subsForMapped.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Create new — preview label */}
              {res.action === "create" && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Will create: <span className="font-medium text-foreground">
                    {item.csvCategory}{item.csvSubCategory ? ` › ${item.csvSubCategory}` : ""}
                  </span>
                </div>
              )}

              {/* Suggestion hint */}
              {item.suggestion && res.action === "map" && res.mappedTo !== item.suggestion.name && (
                <p className="text-[11px] text-muted-foreground">
                  Suggested: <button
                    type="button"
                    className="underline hover:text-foreground"
                    onClick={() => onResolutionChange(key, { ...res, action: "map", mappedTo: item.suggestion!.name, mappedSubTo: item.suggestion!.sub })}
                  >{item.suggestion.name}{item.suggestion.sub ? ` › ${item.suggestion.sub}` : ""}</button>
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Button size="sm" className="w-full" onClick={onConfirm}>
        Confirm & continue →
      </Button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ImportTransactionsDialog() {
  const [open, setOpen] = useState(false);
  const [importType, setImportType] = useState<"expense" | "income">("expense");
  const [step, setStep] = useState<"upload" | "review" | "preview">("upload");
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const [parsedIncome, setParsedIncome] = useState<ParsedIncome[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [resolutions, setResolutions] = useState<Map<ResolutionKey, CategoryResolution>>(new Map());
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: paymentModes = [] } = usePaymentModes();
  const { data: budgetCategories = [] } = useBudgetCategories();
  const { data: incomeCategories = [] } = useIncomeCategories();
  const addBudgetCategory = useAddBudgetCategory();
  const addIncomeCategory = useAddIncomeCategory();

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
    setResolutions(new Map());
    setReviewItems([]);
    setStep("upload");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleTypeChange = (type: "expense" | "income") => {
    setImportType(type);
    reset();
  };

  // ── Build review items from parsed rows ───────────────────────────────────
  const buildReviewItems = useCallback((rows: Array<{ category: string; sub_category: string | null }>, type: "expense" | "income"): ReviewItem[] => {
    const existing: ExistingCategoryRow[] = type === "expense" ? budgetCategories : incomeCategories;
    const pairs = extractUniquePairs(rows);
    const items: ReviewItem[] = [];
    for (const pair of pairs) {
      if (isExactMatch(pair.category, pair.sub_category, existing)) continue;
      const suggestion = findBestMatch(pair.category, pair.sub_category, existing);
      items.push({ csvCategory: pair.category, csvSubCategory: pair.sub_category, suggestion, existingCategories: existing });
    }
    return items;
  }, [budgetCategories, incomeCategories]);

  // ── Initialize resolutions map from review items ──────────────────────────
  const initResolutions = (items: ReviewItem[]): Map<ResolutionKey, CategoryResolution> => {
    const map = new Map<ResolutionKey, CategoryResolution>();
    for (const item of items) {
      const key = makeKey(item.csvCategory, item.csvSubCategory);
      const hasSuggestion = !!item.suggestion;
      map.set(key, {
        csvCategory: item.csvCategory,
        csvSubCategory: item.csvSubCategory,
        action: hasSuggestion ? "map" : "create",
        mappedTo: item.suggestion?.name ?? null,
        mappedSubTo: item.suggestion?.sub ?? null,
      });
    }
    return map;
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
      setStep("upload");
      setResolutions(new Map());
      setReviewItems([]);
    };
    reader.readAsText(file);
  }, [importType]);

  const downloadTemplate = () => {
    let header: string, sample: string, filename: string;
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

  // ── Advance from upload → review or preview ───────────────────────────────
  const handleProceed = () => {
    const rows = importType === "expense" ? parsedExpenses : parsedIncome;
    const items = buildReviewItems(rows, importType);
    if (items.length === 0) {
      setStep("preview");
    } else {
      setReviewItems(items);
      setResolutions(initResolutions(items));
      setStep("review");
    }
  };

  const handleResolutionChange = (key: ResolutionKey, res: CategoryResolution) => {
    setResolutions((prev) => new Map(prev).set(key, res));
  };

  // ── Apply resolutions and go to preview ───────────────────────────────────
  const handleConfirmReview = () => {
    setStep("preview");
  };

  // ── Remap rows based on resolutions ──────────────────────────────────────
  const applyResolutions = <T extends { category: string; sub_category: string | null }>(rows: T[]): T[] => {
    return rows.map((r) => {
      const key = makeKey(r.category, r.sub_category);
      const res = resolutions.get(key);
      if (!res || res.action === "create") return r;
      return { ...r, category: res.mappedTo ?? r.category, sub_category: res.mappedSubTo ?? null };
    });
  };

  // ── Create new categories before import ──────────────────────────────────
  const createNewCategories = async (type: "expense" | "income") => {
    const addFn = type === "expense" ? addBudgetCategory : addIncomeCategory;
    const toCreate = [...resolutions.values()].filter((r) => r.action === "create");

    // Collect parent categories that need to be created (those with sub-categories)
    const parentNames = new Set(toCreate.filter((r) => r.csvSubCategory).map((r) => r.csvCategory));
    const existing: ExistingCategoryRow[] = type === "expense" ? budgetCategories : incomeCategories;
    const existingParents = new Set(existing.filter((e) => !e.sub_category_name).map((e) => e.name.toLowerCase()));

    // Insert parents first if needed
    for (const parentName of parentNames) {
      if (!existingParents.has(parentName.toLowerCase())) {
        await addFn.mutateAsync({ name: parentName, sub_category_name: null });
        existingParents.add(parentName.toLowerCase());
      }
    }

    // Insert all create-new entries
    for (const res of toCreate) {
      await addFn.mutateAsync({ name: res.csvCategory, sub_category_name: res.csvSubCategory ?? null });
    }
  };

  const handleImport = async () => {
    if (!user) return;
    setImporting(true);

    try {
      await createNewCategories(importType);

      if (importType === "expense" && parsedExpenses.length > 0) {
        const remapped = applyResolutions(parsedExpenses);
        const payload = remapped.map((r) => ({
          user_id: user.id, date: r.date, amount: r.amount, personal_amount: r.personal_amount,
          category: r.category, sub_category: r.sub_category,
          payment_mode: normalizePaymentMode(r.payment_mode),
          description: r.description, notes: r.notes, credit_card_id: null,
        }));
        const { error } = await supabase.from("transactions").insert(payload);
        if (error) throw error;
        const newCatCount = [...resolutions.values()].filter((r) => r.action === "create").length;
        toast({
          title: "Import successful",
          description: `${parsedExpenses.length} expenses imported${newCatCount ? ` · ${newCatCount} new ${newCatCount === 1 ? "category" : "categories"} created` : ""}.`,
        });
        qc.invalidateQueries({ queryKey: ["transactions"] });
        qc.invalidateQueries({ queryKey: ["budget_categories"] });
      }

      if (importType === "income" && parsedIncome.length > 0) {
        const remapped = applyResolutions(parsedIncome);
        const payload = remapped.map((r) => ({
          user_id: user.id, date: r.date, amount: r.amount,
          original_amount: r.amount, original_currency: "SGD",
          category: r.category, sub_category: r.sub_category,
          description: r.description, notes: r.notes,
        }));
        const { error } = await supabase.from("income").insert(payload);
        if (error) throw error;
        const newCatCount = [...resolutions.values()].filter((r) => r.action === "create").length;
        toast({
          title: "Import successful",
          description: `${parsedIncome.length} income entries imported${newCatCount ? ` · ${newCatCount} new ${newCatCount === 1 ? "category" : "categories"} created` : ""}.`,
        });
        qc.invalidateQueries({ queryKey: ["income"] });
        qc.invalidateQueries({ queryKey: ["income_categories"] });
      }

      reset();
      setOpen(false);
    } catch (err: unknown) {
      toast({ title: "Import failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const parsedRows = importType === "expense" ? parsedExpenses : parsedIncome;
  const columnHeaders = importType === "expense" ? EXPENSE_HEADERS.join(", ") : INCOME_HEADERS.join(", ");

  // ── Step indicator ────────────────────────────────────────────────────────
  const StepDots = () => (
    <div className="flex items-center gap-1.5 justify-center py-1">
      {(["upload", "review", "preview"] as const).map((s, i) => (
        <div key={s} className={`h-1.5 rounded-full transition-all ${step === s ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"}`} />
      ))}
    </div>
  );

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
        </DialogHeader>

        <StepDots />

        {/* ── Step 1: Upload ─────────────────────────────────────────────── */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* Type toggle */}
            <div className="flex rounded-lg border p-1 gap-1">
              <button type="button" onClick={() => handleTypeChange("expense")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${importType === "expense" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Expense
              </button>
              <button type="button" onClick={() => handleTypeChange("income")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${importType === "income" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Income
              </button>
            </div>

            <div>
              <p className="mb-2 text-xs text-muted-foreground">
                Columns: <span className="font-medium">{columnHeaders}</span>.{" "}
                <button type="button" className="underline text-primary hover:text-primary/80" onClick={downloadTemplate}>
                  Download template
                </button>
              </p>
              <input
                ref={fileRef} type="file" accept=".csv" onChange={handleFile}
                className="w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
              />
            </div>

            {parseErrors.length > 0 && (
              <div className="max-h-24 overflow-y-auto rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
                {parseErrors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            {parsedRows.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{parsedRows.length} rows parsed</p>
                <Button size="sm" onClick={handleProceed}>
                  Continue →
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Category Review ────────────────────────────────────── */}
        {step === "review" && (
          <CategoryReviewStep
            items={reviewItems}
            resolutions={resolutions}
            onResolutionChange={handleResolutionChange}
            onBack={() => setStep("upload")}
            onConfirm={handleConfirmReview}
          />
        )}

        {/* ── Step 3: Preview & Import ───────────────────────────────────── */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(reviewItems.length > 0 ? "review" : "upload")} className="h-7 px-2">
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <p className="text-sm font-medium">{parsedRows.length} rows ready to import</p>
            </div>

            <div className="max-h-48 overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">Date</th>
                    <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                    {importType === "expense" && <th className="px-2 py-1.5 text-right font-medium">Personal</th>}
                    <th className="px-2 py-1.5 text-left font-medium">Category</th>
                    <th className="px-2 py-1.5 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {applyResolutions(parsedRows).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{r.date}</td>
                      <td className="px-2 py-1 text-right">${r.amount.toFixed(2)}</td>
                      {importType === "expense" && <td className="px-2 py-1 text-right">${(r as ParsedExpense).personal_amount.toFixed(2)}</td>}
                      <td className="px-2 py-1">{r.category}</td>
                      <td className="px-2 py-1 truncate max-w-[8rem]">{r.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {[...resolutions.values()].filter((r) => r.action === "create").length > 0 && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                <span className="font-medium">{[...resolutions.values()].filter((r) => r.action === "create").length}</span> new {[...resolutions.values()].filter((r) => r.action === "create").length === 1 ? "category" : "categories"} will be created on import.
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{parsedRows.length} rows ready</p>
              <Button onClick={handleImport} disabled={importing} size="sm">
                {importing ? "Importing…" : `Import ${parsedRows.length} ${importType === "expense" ? "expenses" : "income entries"}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
