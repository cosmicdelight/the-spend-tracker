import { describe, it, expect } from "vitest";
import { getErrorMessage } from "@/lib/errorUtils";

describe("getErrorMessage", () => {
  it("returns message for Error instances", () => {
    expect(getErrorMessage(new Error("Something went wrong"))).toBe("Something went wrong");
  });

  it("returns string for string inputs", () => {
    expect(getErrorMessage("Direct message")).toBe("Direct message");
  });

  it("returns the message from Supabase-style error objects", () => {
    expect(
      getErrorMessage({ code: "PGRST205", message: "Could not find the table 'public.banks' in the schema cache", details: null, hint: null }),
    ).toBe("Could not find the table 'public.banks' in the schema cache");
  });

  it("returns fallback for unknown types", () => {
    expect(getErrorMessage(null)).toBe("An unexpected error occurred");
    expect(getErrorMessage(42)).toBe("An unexpected error occurred");
    expect(getErrorMessage({})).toBe("An unexpected error occurred");
    expect(getErrorMessage({ message: "" })).toBe("An unexpected error occurred");
  });
});
