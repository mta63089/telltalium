import { describe, expect, it } from "vitest";
import { createReport } from "../src/lib/analysis";
import type { CommentRecord, VideoRecord } from "../src/lib/types";

const video: VideoRecord = {
  id: "current",
  title: "Test",
  publishedAt: "2026-10-01T00:00:00Z",
  views: 10000,
  likes: 500,
  comments: 100,
  categoryId: "27",
  durationSeconds: 700,
  thumbnail: null,
};
const channel = {
  id: "channel",
  title: "Channel",
  avatar: null,
  subscribers: 5000,
};
const history = Array.from({ length: 15 }, (_, i) => ({
  ...video,
  id: `history-${i}`,
  views: 10000 + i * 100,
  likes: 500 + i * 5,
  comments: 100 + i,
}));
const comments: CommentRecord[] = Array.from({ length: 30 }, (_, i) => ({
  id: `${i}`,
  author: `Original user ${i}`,
  authorChannelId: `${i}`,
  authorAvatar: null,
  accountCreatedAt: null,
  text: `At 2:${String(i).padStart(2, "0")} the example with statistic ${i + 200} was genuinely helpful.`,
  publishedAt: "2026-10-02T00:00:00Z",
  likes: 0,
}));
const run = (h = history, c = comments) =>
  createReport({ mode: "demo", channel, video, history: h, comments: c });

describe("Veyra score", () => {
  it("does not turn missing evidence into a perfect score", () => {
    const result = run([], []);
    expect(result.veyraScore.value).toBeNull();
    expect(result.veyraScore.coverage).toBe(0);
  });
  it("produces a bounded value with sufficient evidence", () => {
    const result = run();
    expect(result.veyraScore.value).toBeGreaterThanOrEqual(0);
    expect(result.veyraScore.value).toBeLessThanOrEqual(100);
  });
  it("lowers the index for coordinated praise", () => {
    const suspect = comments.map((comment, i) => ({
      ...comment,
      text:
        i % 2
          ? "Amazing and incredibly insightful content, your perspective is always inspiring!"
          : "What a wonderful video, absolutely brilliant perspective and powerful message!",
    }));
    expect(run(history, suspect).veyraScore.value!).toBeLessThan(
      run().veyraScore.value!,
    );
  });
});

describe("fresh video guard", () => {
  it("does not benchmark lifetime engagement of a video published today against mature uploads", () => {
    const fresh = { ...video, publishedAt: new Date().toISOString() };
    const report = createReport({
      mode: "demo",
      channel,
      video: fresh,
      history,
      comments,
    });
    expect(report.comparisons.likeRate.finding).toBe("insufficient");
    expect(
      report.findings.some((finding) => finding.id === "video-too-new"),
    ).toBe(true);
  });
});
