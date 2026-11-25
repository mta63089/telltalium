import { describe, expect, it } from "vitest";
import { parseVideoId } from "../src/lib/video-url";

describe("in-app analysis navigation", () => {
  it("accepts supported YouTube video URL formats", () => {
    const id = "dQw4w9WgXcQ";
    for (const value of [
      id,
      `https://www.youtube.com/watch?v=${id}&t=23`,
      `https://youtu.be/${id}`,
      `https://www.youtube.com/shorts/${id}`,
    ]) {
      expect(parseVideoId(value)).toBe(id);
    }
  });
  it("rejects untrusted or invalid URLs", () => {
    for (const value of [
      "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=abc",
      "javascript:alert(1)",
    ]) {
      expect(parseVideoId(value)).toBeNull();
    }
  });
});
