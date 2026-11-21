import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileSearch, Info } from "lucide-react";

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
    title: "Comment sampling",
    body: "We request up to 200 most recent public top-level comments, excluding replies unless YouTube includes them as a separate thread. This is a convenience sample, not a random sample, and it can disproportionately show recent surges. YouTube's public API cannot list every unrelated comment an arbitrary commenter posted across the platform.",
  },
  {
    title: "Repeated text",
    body: "Comments are normalized and grouped when text is identical or, for sufficiently long comments, when token Jaccard similarity is at least 0.86. A cluster must contain at least three comments. Group membership adds three heuristic points. This heuristic can group legitimate copied quotes or memes.",
  },
  {
    title: "Other comment signals",
    body: "Short generic reactions add one point; a newly created author channel within 30 days of posting adds one point, if channel metadata is available; conservative generated-looking username patterns add one point; external links add two points. Dense five-minute windows add one point only when at least ten sampled comments occur together and at least 40% contain generic or repeated wording. A comment is flagged for manual review at three or more points.",
  },
  {
    title: "Critical limitations",
    body: "Public data does not expose which views were purchased or whether specific viewers are automated. Like counts may be hidden, comments may be disabled, and commenter channel metadata may be unavailable. Historical API values are current lifetime totals, not snapshots at matching ages. Duration under three minutes is only a proxy for Shorts, not reliable classification. This MVP does not yet compare peer channels or measure actual view velocity over time.",
  },
  {
    title: "YouTube API policies",
    body: "YouTube's 2026 developer policies restrict independently derived metrics and longer-term statistics storage. An audited, accepted analytics use case and additional policy acceptance may be required before operating this type of dashboard with live YouTube data in public production. Demo mode uses entirely fictional data and does not call the YouTube API. Review Google's terms and get the necessary permission before deploying live analytics.",
  },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-[#111626] px-5 py-10 text-[#e9edf9] sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#bfc2ff] hover:text-white"><ArrowLeft size={15} />Back to dashboard</Link>
        <div className="mt-12 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.18em] text-[#b4aeeb]"><FileSearch size={17} />Transparency first</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">How Bot Checker works</h1>
        <p className="mt-4 text-sm leading-8 text-[#a1aec9]">Anomaly detection should make evidence clearer, not turn assumptions into allegations. These are the actual rules used by this MVP.</p>
        <div className="mt-10 space-y-4">{sections.map((section, index) => (
          <section key={section.title} className="panel p-6"><div className="mb-2 flex items-center gap-3"><span className="text-[11px] font-semibold text-[#9895e9]">{String(index + 1).padStart(2, "0")}</span><h2 className="text-base font-semibold text-white">{section.title}</h2></div><p className="text-sm leading-[1.85] text-[#9aa8c2]">{section.body}</p></section>
        ))}</div>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#454661] bg-[#262943] p-5"><Info size={18} className="mt-0.5 shrink-0 text-[#c6b8ff]" /><div className="text-sm leading-7 text-[#bdc9e0]">API policy references: <a href="https://developers.google.com/youtube/terms/developer-policies" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#c6c4ff] hover:underline">Developer Policies <ExternalLink size={12}/></a> and <a href="https://developers.google.com/youtube/terms/derived-metrics-policy" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#c6c4ff] hover:underline">Derived Metrics Policy <ExternalLink size={12}/></a>.</div></div>
      </div>
    </main>
  );
}
