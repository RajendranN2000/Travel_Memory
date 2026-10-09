import { describe, expect, it } from "vitest";
import { formatDateRange, parseIsoDate, tripLengthInDays } from "@/lib/dates";

describe("formatDateRange", () => {
  it("collapses ranges within one month", () => {
    expect(formatDateRange("2025-11-14", "2025-11-16")).toBe("14–16 Nov 2025");
  });
  it("shows both months within one year", () => {
    expect(formatDateRange("2025-09-28", "2025-10-02")).toBe("28 Sept – 2 Oct 2025");
  });
  it("shows both years across new year", () => {
    expect(formatDateRange("2025-12-27", "2026-01-02")).toBe("27 Dec 2025 – 2 Jan 2026");
  });
  it("handles single and missing dates", () => {
    expect(formatDateRange("2025-11-14", "2025-11-14")).toBe("14 Nov 2025");
    expect(formatDateRange("2025-11-14", null)).toBe("14 Nov 2025");
    expect(formatDateRange(null, null)).toBe("");
  });
  it("ignores invalid input instead of throwing", () => {
    expect(formatDateRange("not-a-date", null)).toBe("");
    expect(parseIsoDate("2025-13-45")).toBeNull();
  });
});

describe("tripLengthInDays", () => {
  it("counts inclusive days", () => {
    expect(tripLengthInDays("2025-11-14", "2025-11-16")).toBe(3);
  });
  it("returns null for reversed or missing dates", () => {
    expect(tripLengthInDays("2025-11-16", "2025-11-14")).toBeNull();
    expect(tripLengthInDays(null, "2025-11-14")).toBeNull();
  });
});
