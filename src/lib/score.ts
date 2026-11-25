import type {
  CommentAudit,
  MetricComparison,
  VeyraScore,
  VeyraScoreComponent,
} from "./types";

const clamp = (value: number, lower = 0, upper = 100) =>
  Math.min(upper, Math.max(lower, value));

/**
 * Experimental diagnostic index. NOT a probability of authentic views or bots.
 * Every component can be unavailable; missing evidence never becomes a perfect score.
 * Thresholds are deliberately documented and uncalibrated pending validation.
 */
export function calculateVeyraScore(
  comparisons: Record<string, MetricComparison>,
  audit: CommentAudit,
): VeyraScore {
  const metrics = Object.values(comparisons).filter(
    (metric) =>
      metric.current !== null &&
      metric.median !== null &&
      metric.sampleSize >= 5,
  );
  const metricRisk = (metric: MetricComparison) => {
    const deviation = Math.abs(metric.deviation ?? 0);
    const robust = metric.robustZ === null ? null : Math.abs(metric.robustZ);
    // Mild deviations are common. Large deviations are warnings, not fraud evidence.
    if (deviation < 25) return 0;
    const magnitude = clamp((deviation - 25) * 0.65, 0, 50);
    const unusualness = robust === null ? 8 : clamp((robust - 1) * 8, 0, 30);
    return clamp(magnitude + unusualness, 0, 80);
  };

  const engagementScore =
    metrics.length >= 2
      ? Math.round(
          100 -
            metrics.reduce((sum, metric) => sum + metricRisk(metric), 0) /
              metrics.length,
        )
      : null;
  const share = (count: number) =>
    audit.sampled > 0 ? count / audit.sampled : 0;
  const hasCommentCoverage = audit.sampled >= 20;
  const commentsScore = hasCommentCoverage
    ? Math.round(
        clamp(
          100 -
            share(audit.flaggedCount) * 115 -
            share(audit.genericCount) * 10,
        ),
      )
    : null;
  const coordinationScore = hasCommentCoverage
    ? Math.round(
        clamp(
          100 -
            share(audit.burstCount) * 90 -
            share(audit.repeatedCount) * 65 -
            Math.min(
              15,
              audit.clusters.filter((cluster) => cluster.authorCount >= 4)
                .length * 5,
            ),
        ),
      )
    : null;

  const components: VeyraScoreComponent[] = [
    {
      key: "engagement",
      label: "Engagement consistency",
      weight: 35,
      score: engagementScore,
      detail: `${metrics.length}/3 engagement ratios have usable channel comparisons.`,
    },
    {
      key: "comments",
      label: "Comment integrity",
      weight: 45,
      score: commentsScore,
      detail: `${audit.flaggedCount}/${audit.sampled} sampled comments need review.`,
    },
    {
      key: "coordination",
      label: "Coordination signals",
      weight: 20,
      score: coordinationScore,
      detail: `${audit.clusterCount} repeated-text groups; ${audit.burstCount} comments in contextual bursts.`,
    },
  ];

  const available = components.filter(
    (component): component is VeyraScoreComponent & { score: number } =>
      component.score !== null,
  );
  const coverage = available.reduce(
    (total, component) => total + component.weight,
    0,
  );
  // A score with only one source of evidence would be misleading.
  const value =
    coverage >= 55 && available.length >= 2
      ? Math.round(
          available.reduce(
            (sum, component) => sum + component.score * component.weight,
            0,
          ) / coverage,
        )
      : null;
  const confidence: VeyraScore["confidence"] =
    coverage >= 90 &&
    audit.sampled >= 100 &&
    metrics.every((metric) => metric.sampleSize >= 12)
      ? "moderate"
      : "low";
  const label =
    value === null
      ? "Not enough evidence"
      : value >= 80
        ? "Few anomalies observed"
        : value >= 60
          ? "Mixed signals"
          : "Elevated anomaly signals";

  return {
    value,
    label,
    coverage,
    confidence,
    components,
    explanation:
      "Experimental Veyra index based on observed anomalies, NOT the percentage of authentic viewers, a bot probability, or proof of purchased traffic. Similar channel-wide manipulation may evade channel baselines. Data are not age-matched or peer-benchmarked.",
  };
}
