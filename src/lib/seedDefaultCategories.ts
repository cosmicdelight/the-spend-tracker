import { supabase } from "@/integrations/supabase/client";

const DEFAULT_CATEGORIES: { name: string; sub_category_name: string | null }[] = [
  // Food & Dining
  { name: "Food & Dining", sub_category_name: "Groceries" },
  { name: "Food & Dining", sub_category_name: "Restaurants" },
  { name: "Food & Dining", sub_category_name: "Coffee & Drinks" },
  { name: "Food & Dining", sub_category_name: "Food Delivery" },

  // Transport
  { name: "Transport", sub_category_name: "Public Transport" },
  { name: "Transport", sub_category_name: "Taxi & Ride Share" },
  { name: "Transport", sub_category_name: "Fuel" },
  { name: "Transport", sub_category_name: "Parking" },

  // Shopping
  { name: "Shopping", sub_category_name: "Clothing" },
  { name: "Shopping", sub_category_name: "Electronics" },
  { name: "Shopping", sub_category_name: "Home & Garden" },
  { name: "Shopping", sub_category_name: "Gifts" },

  // Bills & Utilities
  { name: "Bills & Utilities", sub_category_name: "Electricity" },
  { name: "Bills & Utilities", sub_category_name: "Water" },
  { name: "Bills & Utilities", sub_category_name: "Internet & Phone" },
  { name: "Bills & Utilities", sub_category_name: "Insurance" },

  // Entertainment
  { name: "Entertainment", sub_category_name: "Movies & Shows" },
  { name: "Entertainment", sub_category_name: "Subscriptions" },
  { name: "Entertainment", sub_category_name: "Games" },
  { name: "Entertainment", sub_category_name: "Events & Activities" },

  // Health & Fitness
  { name: "Health & Fitness", sub_category_name: "Medical" },
  { name: "Health & Fitness", sub_category_name: "Pharmacy" },
  { name: "Health & Fitness", sub_category_name: "Gym & Sports" },

  // Housing
  { name: "Housing", sub_category_name: "Rent / Mortgage" },
  { name: "Housing", sub_category_name: "Maintenance" },
  { name: "Housing", sub_category_name: "Furnishing" },

  // Personal
  { name: "Personal", sub_category_name: "Haircut & Grooming" },
  { name: "Personal", sub_category_name: "Laundry" },

  // Education
  { name: "Education", sub_category_name: "Courses" },
  { name: "Education", sub_category_name: "Books & Materials" },

  // Travel
  { name: "Travel", sub_category_name: "Flights" },
  { name: "Travel", sub_category_name: "Accommodation" },
  { name: "Travel", sub_category_name: "Activities" },

  // Miscellaneous
  { name: "Miscellaneous", sub_category_name: null },
];

export async function seedDefaultCategories(userId: string) {
  // Check if user already has categories
  const { count, error: countError } = await supabase
    .from("budget_categories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError || (count && count > 0)) return;

  const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId }));
  await supabase.from("budget_categories").insert(rows);
}
