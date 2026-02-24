import { describe, it, expect } from "vitest";
import { parseCSVLines, parseExpenseCSV, parseIncomeCSV } from "@/lib/csvImport";

describe("parseCSVLines", () => {
  it("returns error when file has no header or data", () => {
    expect(parseCSVLines("")).toEqual({
      error: "File must have a header row and at least one data row.",
    });
    expect(parseCSVLines("header1,header2")).toEqual({
      error: "File must have a header row and at least one data row.",
    });
  });

  it("parses valid CSV with normalized headers", () => {
    const result = parseCSVLines("Date,Amount,Category\n2024-01-15,50.00,Food");
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.headers).toEqual(["date", "amount", "category"]);
      expect(result.lines).toEqual(["2024-01-15,50.00,Food"]);
    }
  });

  it("normalizes headers: lowercase, spaces to underscores", () => {
    const result = parseCSVLines("My Header,Another One\n1,2");
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.headers).toEqual(["my_header", "another_one"]);
    }
  });
});

describe("parseExpenseCSV", () => {
  const validHeaders = "date,amount,personal_amount,category,sub_category,payment_mode,description,notes";

  it("returns error when required columns are missing", () => {
    const result = parseExpenseCSV("date,amount\n2024-01-15,50");
    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toContain("Missing columns");
  });

  it("parses valid expense rows", () => {
    const csv = `${validHeaders}\n2024-01-15,100.50,50.25,Groceries,Produce,cash,Weekly shop,`;
    const result = parseExpenseCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      date: "2024-01-15",
      amount: 100.5,
      personal_amount: 50.25,
      category: "Groceries",
      sub_category: "Produce",
      payment_mode: "cash",
      description: "Weekly shop",
      notes: null,
    });
  });

  it("rejects invalid dates", () => {
    const csv = `${validHeaders}\n2024-13-99,100,100,Food,,cash,Dinner,`;
    const result = parseExpenseCSV(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("invalid date"))).toBe(true);
  });

  it("rejects negative amounts", () => {
    const csv = `${validHeaders}\n2024-01-15,-10,10,Food,,cash,Refund,`;
    const result = parseExpenseCSV(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("0 or greater"))).toBe(true);
  });

  it("accepts personal_amount same as amount (no split)", () => {
    const csv = `${validHeaders}\n2024-01-15,100,100,Food,,cash,Dinner,`;
    const result = parseExpenseCSV(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].personal_amount).toBe(100);
  });
});

describe("parseIncomeCSV", () => {
  const validHeaders = "date,amount,category,sub_category,description,notes";

  it("parses valid income rows", () => {
    const csv = `${validHeaders}\n2024-01-15,5000,Salary,,Monthly pay,`;
    const result = parseIncomeCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      date: "2024-01-15",
      amount: 5000,
      category: "Salary",
      sub_category: null,
      description: "Monthly pay",
      notes: null,
    });
  });
});
