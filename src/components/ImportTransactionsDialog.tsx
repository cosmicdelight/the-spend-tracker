import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const EXPECTED_HEADERS = ["date", "amount", "personal_amount", "category", "sub_category", "payment_mode", "description"];

interface ParsedRow {
  date: string;
  amount: number;
  personal_amount: number;
  category: string;
  sub_category: string | null;
  payment_mode: string;
  description: string;
}

function parseCSV(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: ["File must have a header row and at least one data row."] };

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(", ")}`] };

  const rows: ParsedRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map((v) => v.trim());
    const get = (key: string) => vals[headers.indexOf(key)] || "";

    const amount = parseFloat(get("amount"));
    const personalAmount = parseFloat(get("personal_amount"));
    const date = get("date");
    const category = get("category");
    const description = get("description");

    if (!date || isNaN(amount) || !category) {
      errors.push(`Row ${i + 1}: missing required field (date, amount, or category)`);
      continue;
    }
    if (isNaN(personalAmount)) {
      errors.push(`Row ${i + 1}: invalid personal_amount`);
      continue;
    }

    rows.push({
      date,
      amount,
      personal_amount: personalAmount,
      category,
      sub_category: get("sub_category") || null,
      payment_mode: get("payment_mode") || "cash",
      description,
    });
  }

  return { rows, errors };
}

export default function ImportTransactionsDialog() {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const reset = () => {
    setParsed([]);
    setParseErrors([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { rows, errors } = parseCSV(reader.result as string);
      setParsed(rows);
      setParseErrors(errors);
    };
    reader.readAsText(file);
  }, []);

  const handleImport = async () => {
    if (!user || parsed.length === 0) return;
    setImporting(true);
    const payload = parsed.map((r) => ({
      user_id: user.id,
      date: r.date,
      amount: r.amount,
      personal_amount: r.personal_amount,
      category: r.category,
      sub_category: r.sub_category,
      payment_mode: r.payment_mode,
      description: r.description,
      notes: null,
      credit_card_id: null,
    }));

    const { error } = await supabase.from("transactions").insert(payload);
    setImporting(false);

    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Import successful", description: `${parsed.length} transactions imported.` });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      reset();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-1 h-3 w-3" />Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              Upload a CSV with columns: <span className="font-medium">date, amount, personal_amount, category, sub_category, payment_mode, description</span>
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

          {parsed.length > 0 && (
            <>
              <div className="max-h-48 overflow-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Date</th>
                      <th className="px-2 py-1.5 text-right font-medium">Amount</th>
                      <th className="px-2 py-1.5 text-right font-medium">Personal</th>
                      <th className="px-2 py-1.5 text-left font-medium">Category</th>
                      <th className="px-2 py-1.5 text-left font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{r.date}</td>
                        <td className="px-2 py-1 text-right">${r.amount.toFixed(2)}</td>
                        <td className="px-2 py-1 text-right">${r.personal_amount.toFixed(2)}</td>
                        <td className="px-2 py-1">{r.category}</td>
                        <td className="px-2 py-1 truncate max-w-[8rem]">{r.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{parsed.length} rows ready</p>
                <Button onClick={handleImport} disabled={importing} size="sm">
                  {importing ? "Importing…" : `Import ${parsed.length} transactions`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
