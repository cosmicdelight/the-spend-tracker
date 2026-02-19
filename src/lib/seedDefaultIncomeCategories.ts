import { supabase } from "@/integrations/supabase/client";

const DEFAULT_INCOME_CATEGORIES: { name: string; sub_category_name: string | null }[] = [
  // Salary & Employment
  { name: "Salary & Employment", sub_category_name: "Base" },
  { name: "Salary & Employment", sub_category_name: "Bonus" },
  { name: "Salary & Employment", sub_category_name: "Commission" },

  // Investments
  { name: "Investments", sub_category_name: "Dividends" },
  { name: "Investments", sub_category_name: "Capital Gains" },
  { name: "Investments", sub_category_name: "Interest" },
  { name: "Investments", sub_category_name: "Crypto" },

  // Rental Income
  { name: "Rental Income", sub_category_name: null },

  // Government & Benefits
  { name: "Government & Benefits", sub_category_name: "Tax Refund" },
  { name: "Government & Benefits", sub_category_name: "Subsidies" },

  // Other
  { name: "Other", sub_category_name: null },
];

export async function seedDefaultIncomeCategories(userId: string) {
  const { count, error: countError } = await supabase
    .from("income_categories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError || (count && count > 0)) return;

  const rows = DEFAULT_INCOME_CATEGORIES.map((c) => ({ ...c, user_id: userId }));
  await supabase.from("income_categories").insert(rows);
}
