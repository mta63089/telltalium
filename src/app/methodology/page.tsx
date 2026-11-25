import { DocsShell } from "@/components/docs-shell";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Methodology" };

const sections = [
  {
    title: "Channel baselines",
    body: "We fetch up to 100 recent public uploads from the target channel, then select up to 50 videos with comparable duration and, where possible, the same YouTube category. Videos must be at least seven days old. We calculate like-to-view, comment-to-view, and comment-to-like percentages using available public totals. A comparison requires five valid historical ratios. Baselines use the median and median absolute deviation, not a simple average.",
  },
  {
    title: "What does 'anomaly' mean?",
    body: "A 35% or larger deviation from the median is considered worth reviewing when the robust standardized deviation is at least 2; a 60% or larger deviation is elevated when it is at least 3. If the median absolute deviation is zero, a magnitude-only fallback is used. These are deliberately simple, uncalibrated heuristics. No fraud probability, confidence percentage, or proof of artificial traffic is produced.",
  },
  {
    title: "Veyra Score (experimental index)",
    body: "The displayed 0–100 index is a diagnostic summary, NOT the proportion of authentic views and NOT a bot probability. Engagement consistency contributes 35%, comment integrity 45%, and coordination indicators 20%. Engagement uses the absolute magnitude of robust channel-median deviations; comments consider the proportion meeting a multi-signal review threshold and the prevalence of generic praise; coordination considers repeated-text groups and contextual bursts. Component scores are clamped to 0–100. If fewer than two components are available or combined coverage is under 55%, Veyra shows no score rather than assuming missing data are authentic. Remaining weights are normalized. Evidence coverage is the fraction of weights with usable data, not a claim of statistical certainty. Confidence remains low or moderate until stronger longitudinal comparisons are supported. These heuristic weights must be calibrated against labeled examples before general trust claims are made.",
  },
  {
    title: "Comment sampling",
    body: "We request up to 200 most recent public top-level comments, excluding replies unless YouTube includes them as a separate thread. This is a convenience sample, not a random sample, and it can disproportionately show recent surges. YouTube's public API cannot list every unrelated comment an arbitrary commenter posted across the platform.",
  },
  {
    title: "Repeated text",
    body: "Comments are normalized and grouped when text is identical or, for sufficiently long comments, when token Jaccard similarity is at least 0.86. A cluster must contain at least three comments. Group membership adds three heuristic points. This heuristic can group legitimate copied quotes or memes.",
  },
  {
    title: "Generic praise and potential coordination",
    body: "Veyra identifies generic positive language including verbose, templated-looking compliments and tracks whether such language saturates the latest-first comment sample. A praise wave requires at least 12 generic comments from 10 distinct authors comprising at least 25% of the sample, or 8 such comments by 8 distinct authors in a dense contextual window. This adds two review points on top of one generic-language point; it does NOT mean the messages were written by AI or the authors are bots. Individual long generic compliments remain weak signals. Similar messages can be organic fan behavior.",
  },
  {
    title: "Other comment signals",
    body: "Generic reactions add one point; a newly created author channel within 30 days of posting adds one point, if channel metadata is available; conservative generated-looking username patterns add one point; external links add two points. Dense five-minute windows add one point to generic or repeated comments only when at least ten sampled comments occur together and at least 40% contain generic or repeated wording. A comment is flagged for manual review at three or more points.",
  },
  {
    title: "Critical limitations",
    body: "Public data does not expose which views were purchased or whether specific viewers are automated. Like counts may be hidden, comments may be disabled, and commenter channel metadata may be unavailable. Historical API values are current lifetime totals, not snapshots at matching ages. Duration under three minutes is only a proxy for Shorts, not reliable classification. This MVP does not yet compare peer channels or measure actual view velocity over time. An entirely consistent channel baseline can conceal systematic manipulation. English-oriented generic-praise rules may miss other languages.",
  },
  {
    title: "YouTube API policies",
    body: "YouTube's 2026 developer policies restrict independently derived metrics and longer-term statistics storage. YouTube explicitly restricts derived ratios, scores, and extended storage without the requisite analytics-use-case approval and acceptance of additional terms. This local research implementation is not evidence of authorization for public deployment. Demo mode uses entirely fictional data and does not call the YouTube API. Review Google's terms and get the necessary permission before deploying live analytics.",
  },
];

export default function MethodologyPage() {
  return (
    <DocsShell
      index="M"
      kicker="TRANSPARENCY FIRST"
      title="Inside the signal"
      introduction="A transparent investigation requires transparent methods. Every heuristic is documented, and uncertainty is part of the report."
    >
      <div className="docs-section-list">
        {sections.map((section, index) => (
          <section key={section.title} className="docs-section">
            <div className="docs-section-index">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="docs-reference">
        <strong>OFFICIAL YOUTUBE DOCUMENTATION</strong>
        <a
          href="https://developers.google.com/youtube/terms/developer-policies"
          target="_blank"
          rel="noreferrer"
        >
          Developer Policies <ExternalLink size={13} />
        </a>
        <a
          href="https://developers.google.com/youtube/terms/derived-metrics-policy"
          target="_blank"
          rel="noreferrer"
        >
          Derived Metrics Policy <ExternalLink size={13} />
        </a>
      </div>
    </DocsShell>
  );
}
