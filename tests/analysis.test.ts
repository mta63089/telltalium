import { describe, expect, it } from "vitest";
import { compareMetric, median, ratio } from "../src/lib/analysis";

describe("basic ratios and robust comparisons", () => {
  it("computes engagement percentages", () => {
    expect(ratio(80, 2_000)).toBe(4);
    expect(ratio(0, 2_000)).toBe(0);
    expect(ratio(null, 5)).toBeNull();
    expect(ratio(5, 0)).toBeNull();
  });

  it("computes medians without mutating inputs", () => {
    const values = [8, 1, 3, 5];
    expect(median(values)).toBe(4);
    expect(values).toEqual([8, 1, 3, 5]);
    expect(median([])).toBeNull();
  });

  it("marks large deviations, but does not pretend to compute bot probability", () => {
    const comparison = compareMetric(
      "likeRate",
      "Like-to-view",
      1,
      [3, 3.1, 3.2, 3.3, 3.4, 3.5],
    );
    expect(comparison.finding).toBe("elevated");
    expect(comparison.deviation).toBeLessThan(-60);
  });

  it("requires adequate historical coverage", () => {
    expect(compareMetric("likeRate", "Likes", 2, [2.1, 2.2, 2.3]).finding).toBe(
      "insufficient",
    );
  });
});
