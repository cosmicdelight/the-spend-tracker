import { supabase } from "@/integrations/supabase/client";

const DEFAULT_INCOME_CATEGORIES: { name: string; sub_category_name: string | null }[] = [
  // Salary & Employment
  { name: "Salary & Employment", sub_category_name: "Full-time" },
  { name: "Salary & Employment", sub_category_name: "Part-time" },
  { name: "Salary & Employment", sub_category_name: "Bonus" },
  { name: "Salary & Employment", sub_category_name: "Commission" },

  // Freelance & Consulting
  { name: "Freelance & Consulting", sub_category_name: "Projects" },
  { name: "Freelance & Consulting", sub_category_name: "Consulting Fees" },
  { name: "Freelance & Consulting", sub_category_name: "Contract Work" },

  // Investments
  { name: "Investments", sub_category_name: "Dividends" },
  { name: "Investments", sub_category_name: "Capital Gains" },
  { name: "Investments", sub_category_name: "Interest" },
  { name: "Investments", sub_category_name: "Crypto" },

  // Rental Income
  { name: "Rental Income", sub_category_name: "Property" },
  { name: "Rental Income", sub_category_name: "Room Rental" },
  { name: "Rental Income", sub_category_name: "Short-term Rental" },

  // Business
  { name: "Business", sub_category_name: "Sales" },
  { name: "Business", sub_category_name: "Services" },
  { name: "Business", sub_category_name: "Profit Distribution" },

  // Government & Benefits
  { name: "Government & Benefits", sub_category_name: "Tax Refund" },
  { name: "Government & Benefits", sub_category_name: "Grants" },
  { name: "Government & Benefits", sub_category_name: "Subsidies" },

  // Gifts & Transfers
  { name: "Gifts & Transfers", sub_category_name: "Gift" },
  { name: "Gifts & Transfers", sub_category_name: "Reimbursement" },
  { name: "Gifts & Transfers", sub_category_name: "Transfer In" },

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
