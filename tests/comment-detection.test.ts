import { describe, expect, it } from "vitest";
import { analyzeComments } from "../src/lib/comment-detection";
import type { CommentRecord } from "../src/lib/types";

const base: CommentRecord = {
  id: "a",
  author: "Ordinary commenter",
  authorChannelId: "author-a",
  authorAvatar: null,
  accountCreatedAt: "2020-01-01T00:00:00Z",
  text: "I enjoyed the comparison near the middle of this video.",
  publishedAt: "2026-10-01T00:00:00Z",
  likes: 1,
};

const make = (id: string, text: string): CommentRecord => ({ ...base, id, authorChannelId: `author-${id}`, text });

describe("comment heuristics", () => {
  it("groups three copies of a phrase", () => {
    const comments = [
      make("one", "Every person should watch this amazing and powerful analysis of online trends."),
      make("two", "Every person should watch this amazing and powerful analysis of online trends!"),
      make("three", "Every person should watch this amazing and powerful analysis of online trends."),
    ];
    const audit = analyzeComments(comments, 3);
    expect(audit.clusterCount).toBe(1);
    expect(audit.repeatedCount).toBe(3);
    expect(audit.flaggedCount).toBe(3);
  });

  it("does not flag an isolated generic reaction as a bot", () => {
    const audit = analyzeComments([make("single", "Amazing video!")], 1);
    expect(audit.genericCount).toBe(1);
    expect(audit.flaggedCount).toBe(0);
  });

  it("only flags young accounts if creation metadata is available", () => {
    const unknown = make("unknown", "An interesting example from the documentary.");
    unknown.accountCreatedAt = null;
    const known = make("known", "An interesting example from the documentary.");
    known.accountCreatedAt = "2026-09-27T00:00:00Z";
    const audit = analyzeComments([unknown, known], 2);
    expect(audit.newAccountCount).toBe(1);
    expect(audit.flaggedCount).toBe(0);
  });

  it("does not label a large burst suspicious on timing alone", () => {
    const comments = Array.from({ length: 20 }, (_, index) => ({
      ...make(String(index), `Specific observation about example ${index} in scene ${index + 7}.`),
      publishedAt: new Date(new Date("2026-10-01T00:00:00Z").getTime() + index * 2000).toISOString(),
    }));
    const audit = analyzeComments(comments, 20);
    expect(audit.burstCount).toBe(0);
  });
});

describe("contextual generic praise", () => {
  it("recognizes long AI-style compliments as weak generic signals", () => {
    const audit = analyzeComments([make("solo", "What an incredibly insightful and thought provoking video. Your perspective is truly amazing and the content is always so valuable and inspiring.")], 1);
    expect(audit.genericCount).toBe(1);
    expect(audit.flaggedCount).toBe(0);
  });

  it("highlights a large cross-account praise wave without claiming bots", () => {
    const comments = Array.from({ length: 24 }, (_, index) => ({
      ...make(`p${index}`, index % 2
        ? "This is such an incredible video, what an inspiring and thoughtful perspective!"
        : "Absolutely amazing content, always delivering insightful and valuable perspectives!"),
      publishedAt: new Date(Date.parse("2026-10-01T00:00:00Z") + index * 20_000).toISOString(),
    }));
    const audit = analyzeComments(comments, 24);
    expect(audit.praiseWaveCount).toBeGreaterThanOrEqual(12);
    expect(audit.flaggedCount).toBeGreaterThanOrEqual(12);
  });

  it("does not mistake a specific positive observation for generic praise", () => {
    const audit = analyzeComments([make("specific", "Great breakdown of the audience retention graph around 6 minutes, but I disagree with the conclusion.")], 1);
    expect(audit.genericCount).toBe(0);
  });
});
