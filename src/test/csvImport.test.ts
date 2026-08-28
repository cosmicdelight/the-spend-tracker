import { describe, it, expect } from "vitest";
import { parseCSVLines, parseExpenseCSV, parseIncomeCSV, parseMoney } from "@/lib/csvImport";

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
      expect(result.rows).toEqual([["2024-01-15", "50.00", "Food"]]);
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
      expense_date: "2024-01-15",
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

  it("rejects a personal_amount larger than the amount", () => {
    // Your share cannot exceed the total. Without this, an import writes a row that
    // drags Others Owe You negative, exactly like the three found in production.
    const csv = `${validHeaders}\n2024-01-15,18.10,18.50,Paper,,cash,Novel from Kinokuniya,`;
    const result = parseExpenseCSV(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("cannot exceed"))).toBe(true);
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

describe("parseMoney", () => {
  it("reads plain numbers", () => {
    expect(parseMoney("1234.56")).toBe(1234.56);
    expect(parseMoney("0")).toBe(0);
    expect(parseMoney(" 42 ")).toBe(42);
  });

  it("reads comma thousands separators instead of truncating them", () => {
    // parseFloat("1,234.56") returns 1 — the bug this function exists to prevent.
    expect(parseMoney("1,234.56")).toBe(1234.56);
    expect(parseMoney("1,234,567")).toBe(1234567);
  });

  it("reads a leading currency symbol or ISO code", () => {
    expect(parseMoney("$1,234.56")).toBe(1234.56);
    expect(parseMoney("S$45")).toBe(45);
    expect(parseMoney("SGD 20")).toBe(20);
  });

  it("reads negatives, including accounting parentheses", () => {
    expect(parseMoney("-10")).toBe(-10);
    expect(parseMoney("(45.00)")).toBe(-45);
  });

  it("rejects rather than truncating anything it cannot read exactly", () => {
    expect(parseMoney("45 CR")).toBeNull();
    expect(parseMoney("12abc")).toBeNull();
    expect(parseMoney("1,23.45")).toBeNull(); // malformed grouping
    expect(parseMoney("1.2.3")).toBeNull();
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });
});

describe("CSV quoting (RFC 4180)", () => {
  const validHeaders = "date,amount,personal_amount,category,sub_category,payment_mode,description,notes";

  it("keeps quoted commas inside a field", () => {
    const csv = `${validHeaders}\n2024-01-15,"1,234.56","1,234.56",Food,,cash,"Dinner, drinks",`;
    const result = parseExpenseCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].amount).toBe(1234.56);
    expect(result.rows[0].description).toBe("Dinner, drinks");
  });

  it("unescapes doubled quotes", () => {
    const csv = `${validHeaders}\n2024-01-15,10,10,Food,,cash,"He said ""hi""",`;
    const result = parseExpenseCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows[0].description).toBe('He said "hi"');
  });

  it("keeps a quoted field containing a newline as one row", () => {
    const csv = `${validHeaders}\n2024-01-15,10,10,Food,,cash,"Line one\nLine two",`;
    const result = parseExpenseCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].description).toBe("Line one Line two");
  });

  it("handles CRLF line endings", () => {
    const csv = `${validHeaders}\r\n2024-01-15,10,10,Food,,cash,Lunch,\r\n`;
    const result = parseExpenseCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
  });

  it("reports an unreadable amount instead of importing a wrong value", () => {
    const csv = `${validHeaders}\n2024-01-15,45 CR,45,Food,,cash,Refund,`;
    const result = parseExpenseCSV(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.some((e) => e.includes('could not read amount "45 CR"'))).toBe(true);
  });
});
