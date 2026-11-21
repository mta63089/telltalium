import { describe, expect, it } from "vitest";
import { parseDuration, parseVideoId } from "../src/lib/youtube";

const id = "dQw4w9WgXcQ";

describe("YouTube URL handling", () => {
  it.each([
    id,
    `https://www.youtube.com/watch?v=${id}&t=2`,
    `https://youtu.be/${id}?feature=shared`,
    `https://www.youtube.com/shorts/${id}`,
    `https://m.youtube.com/live/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
  ])("accepts supported URL %s", (url) => {
    expect(parseVideoId(url)).toBe(id);
  });

  it.each([
    "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://youtube.com/watch?v=not-an-id",
    "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
  ])("rejects invalid or untrusted URL %s", (url) => {
    expect(parseVideoId(url)).toBeNull();
  });

  it("parses ISO 8601 durations", () => {
    expect(parseDuration("PT12M34S")).toBe(754);
    expect(parseDuration("PT2H1M10S")).toBe(7270);
    expect(parseDuration("P1DT2H")).toBe(93600);
  });
});
