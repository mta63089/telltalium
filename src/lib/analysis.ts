import { analyzeComments } from "./comment-detection";
import type {
  AnalysisReport,
  ChannelRecord,
  CommentRecord,
  Finding,
  FindingLevel,
  MetricComparison,
  MetricKey,
  VideoRecord,
} from "./types";

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator <= 0) return null;
  return (numerator / denominator) * 100;
}

const metricDefinitions: Array<{
  key: MetricKey;
  label: string;
  value: (record: VideoRecord) => number | null;
}> = [
  { key: "likeRate", label: "Like-to-view rate", value: (v) => ratio(v.likes, v.views) },
  { key: "commentRate", label: "Comment-to-view rate", value: (v) => ratio(v.comments, v.views) },
  { key: "commentsPerLike", label: "Comments per like", value: (v) => ratio(v.comments, v.likes) },
];

export function compareMetric(
  key: MetricKey,
  label: string,
  current: number | null,
  historical: Array<number | null>,
): MetricComparison {
  const values = historical.filter((value): value is number => value !== null && Number.isFinite(value));
  const baseline = values.length >= 5 ? median(values) : null;
  const deviation = baseline !== null && baseline > 0 && current !== null
    ? ((current - baseline) / baseline) * 100
    : null;
  const mad = baseline !== null ? median(values.map((value) => Math.abs(value - baseline))) : null;
  const robustZ = current !== null && baseline !== null && mad !== null && mad > 0
    ? (current - baseline) / (1.4826 * mad)
    : null;

  let finding: FindingLevel = "insufficient";
  if (current !== null && baseline !== null) {
    if (deviation !== null && Math.abs(deviation) >= 60 &&
      (robustZ === null || Math.abs(robustZ) >= 3)) {
      finding = "elevated";
    } else if (deviation !== null && Math.abs(deviation) >= 35 &&
      (robustZ === null || Math.abs(robustZ) >= 2)) {
      finding = "watch";
    } else {
      finding = "normal";
    }
  }

  return { key, label, current, median: baseline, deviation, robustZ, sampleSize: values.length, finding };
}

function severityOrder(level: FindingLevel): number {
  return level === "elevated" ? 0 : level === "watch" ? 1 : level === "insufficient" ? 2 : 3;
}

export function createReport(input: {
  mode: "demo" | "live";
  channel: ChannelRecord;
  video: VideoRecord;
  history: VideoRecord[];
  comments: CommentRecord[];
  commentsUnavailableReason?: string | null;
  cohortDescription?: string;
  analyzedAt?: string;
}): AnalysisReport {
  const { mode, channel, video, history, comments } = input;
  const comparisons = Object.fromEntries(
    metricDefinitions.map(({ key, label, value }) => [
      key,
      compareMetric(key, label, value(video), history.map(value)),
    ]),
  ) as Record<MetricKey, MetricComparison>;

  const audit = analyzeComments(comments, video.comments, input.commentsUnavailableReason ?? null);
  const findings: Finding[] = [];

  for (const metric of Object.values(comparisons)) {
    if (metric.finding === "normal") continue;
    if (metric.finding === "insufficient") {
      findings.push({
        id: metric.key,
        title: `${metric.label}: limited baseline`,
        detail: `Only ${metric.sampleSize} usable historical ratios. At least five are required.`,
        level: "insufficient",
        category: "coverage",
      });
      continue;
    }
    findings.push({
      id: metric.key,
      title: `${metric.label} differs from baseline`,
      detail: `${Math.abs(metric.deviation ?? 0).toFixed(0)}% ${metric.deviation! < 0 ? "below" : "above"} the median of ${metric.sampleSize} comparable uploads. This is an anomaly, not evidence of purchased engagement.`,
      level: metric.finding,
      category: "engagement",
    });
  }

  if (audit.sampled > 0 && audit.flaggedCount / audit.sampled >= 0.15 && audit.flaggedCount >= 5) {
    findings.push({
      id: "flagged-comments",
      title: "Multiple comments contain overlapping signals",
      detail: `${audit.flaggedCount} of ${audit.sampled} sampled top-level comments met the review threshold. The sample is latest-first, not representative of every comment.`,
      level: "elevated",
      category: "comments",
    });
  }
  if (audit.clusterCount > 0) {
    findings.push({
      id: "text-clusters",
      title: `${audit.clusterCount} repeated-text cluster${audit.clusterCount === 1 ? "" : "s"} identified`,
      detail: `${audit.repeatedCount} comments belong to groups of at least three highly similar messages. Identical language can also occur organically.`,
      level: "watch",
      category: "comments",
    });
  }
  if (audit.sampled === 0) {
    findings.push({
      id: "comments-unavailable",
      title: "Comment patterns could not be assessed",
      detail: audit.unavailableReason ?? "The API returned no public top-level comments.",
      level: "insufficient",
      category: "coverage",
    });
  }
  if (!findings.some((item) => item.level === "elevated" || item.level === "watch")) {
    findings.push({
      id: "no-major-outliers",
      title: "No major anomalies detected in available signals",
      detail: "This does not rule out inorganic activity. Public engagement metrics alone cannot verify individual views.",
      level: "normal",
      category: "engagement",
    });
  }

  findings.sort((a, b) => severityOrder(a.level) - severityOrder(b.level));

  return {
    id: video.id,
    mode,
    analyzedAt: input.analyzedAt ?? new Date().toISOString(),
    channel,
    video,
    history,
    comparisons,
    audit,
    findings,
    historicalCaveat: "Historical ratios are based on current lifetime totals, not matched video ages. Shorts classification uses duration as an approximation. Deviations are exploratory and cannot establish fake views.",
    cohortDescription: input.cohortDescription ?? "Recent public uploads of comparable duration and category; at least seven days old.",
  };
}
