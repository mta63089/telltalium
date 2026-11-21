"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FileSearch,
  Flag,
  Info,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  MessageCircle,
  Play,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { ActivityBars, AuditRing, TimelineChart } from "./charts";
import { compactNumber, formatDate, fullNumber, percentage, relativeDate, signedPercentage } from "@/lib/format";
import type {
  AnalysisReport,
  FindingLevel,
  MetricComparison,
  MetricKey,
  ScoredComment,
  CommentSignal,
  VideoRecord,
} from "@/lib/types";
import { ratio } from "@/lib/analysis";

const SIGNAL_LABELS: Record<CommentSignal, string> = {
  "repeated-text": "Repeated wording",
  "generic-language": "Generic language",
  "burst-activity": "Coordinated-looking burst",
  "new-account": "New account",
  "username-pattern": "Generated-looking name",
  "external-link": "External link",
};

const CHART_OPTIONS: Array<{ value: MetricKey; label: string }> = [
  { value: "likeRate", label: "Like rate" },
  { value: "commentRate", label: "Comment rate" },
  { value: "commentsPerLike", label: "Comments / likes" },
];

function findingColor(level: FindingLevel) {
  if (level === "elevated") return "coral";
  if (level === "watch") return "amber";
  if (level === "normal") return "mint";
  return "muted";
}

function severityLabel(level: FindingLevel) {
  if (level === "elevated") return "Elevated anomaly";
  if (level === "watch") return "Worth reviewing";
  if (level === "normal") return "Within baseline";
  return "Limited evidence";
}

function SeverityPill({ level }: { level: FindingLevel }) {
  return <span className={`severity severity-${findingColor(level)}`}>{severityLabel(level)}</span>;
}

function SectionTitle({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#8792b1]">{kicker}</div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h2>
      {note && <p className="mt-1.5 text-sm leading-relaxed text-[#8792ab]">{note}</p>}
    </div>
  );
}

function MetricStat({ label, value, icon: Icon, detail }: { label: string; value: string; icon: typeof Eye; detail: string }) {
  return (
    <div className="panel flex min-w-0 items-start justify-between gap-3 p-5 sm:p-6">
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#99a4bd]">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{value}</p>
        <p className="mt-2 text-xs text-[#7e8aa4]">{detail}</p>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#252d48] text-[#aab6f7]">
        <Icon size={19} strokeWidth={1.8} />
      </div>
    </div>
  );
}

function MetricComparisonCard({ metric }: { metric: MetricComparison }) {
  const mine = metric.current ?? 0;
  const baseline = metric.median ?? 0;
  const scale = Math.max(mine, baseline, 0.01) * 1.25;
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-[#cdd5eb]">{metric.label}</div>
        {metric.deviation !== null && (
          <span className={`flex items-center gap-1 text-xs font-medium ${metric.deviation < 0 ? "text-[#ffa18d]" : "text-[#a6b2ff]"}`}>
            {metric.deviation < 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
            {signedPercentage(metric.deviation)}
          </span>
        )}
      </div>
      <div className="text-3xl font-semibold tracking-tight text-white">{percentage(metric.current)}</div>
      <div className="mt-5 space-y-3">
        <div>
          <div className="mb-1.5 flex justify-between text-[11px] text-[#99a4bd]"><span>Selected video</span><span>{percentage(metric.current)}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-[#2a3149]"><div className="h-full rounded-full bg-[#fb8578]" style={{ width: `${(mine / scale) * 100}%` }} /></div>
        </div>
        <div>
          <div className="mb-1.5 flex justify-between text-[11px] text-[#99a4bd]"><span>Channel median</span><span>{percentage(metric.median)}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-[#2a3149]"><div className="h-full rounded-full bg-[#949bfa]" style={{ width: `${(baseline / scale) * 100}%` }} /></div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#2a3148] pt-4 text-[11px] text-[#8994ae]">
        <span>{metric.sampleSize} usable comparisons</span>
        <SeverityPill level={metric.finding} />
      </div>
    </div>
  );
}

function InitialAvatar({ name, avatar, size = "md" }: { name: string; avatar: string | null; size?: "sm" | "md" }) {
  const dimension = size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";
  return avatar ? (
    // Remote YouTube avatar is deliberately not proxied or cached by the application.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" src={avatar} className={`shrink-0 rounded-full object-cover ${dimension}`} referrerPolicy="no-referrer" />
  ) : (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#665ca7] to-[#384c79] font-semibold text-white ${dimension}`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function CommentItem({ comment, mode, videoId }: { comment: ScoredComment; mode: "live" | "demo"; videoId: string }) {
  return (
    <article className="border-b border-[#262e44] px-5 py-4 last:border-b-0 sm:px-6">
      <div className="flex gap-3">
        <InitialAvatar name={comment.author} avatar={comment.authorAvatar} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {mode === "live" && comment.authorChannelId ? (
                <a className="text-sm font-semibold text-[#e6eaf6] hover:underline" href={`https://www.youtube.com/channel/${encodeURIComponent(comment.authorChannelId)}`} target="_blank" rel="noreferrer">{comment.author}</a>
              ) : <span className="text-sm font-semibold text-[#e6eaf6]">{comment.author}</span>}
              {comment.flagged && <span className="rounded-md bg-[#4a2d33] px-2 py-0.5 text-[10px] font-semibold text-[#ffad9f]">Review</span>}
            </div>
            <span className="text-[11px] text-[#8791aa]">{relativeDate(comment.publishedAt)}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-[1.7] text-[#bec7dd]">{comment.text}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {comment.signals.length > 0 ? comment.signals.map((signal) => (
              <span className={`signal-chip ${signal === "repeated-text" ? "signal-chip-strong" : ""}`} key={signal}>{SIGNAL_LABELS[signal]}</span>
            )) : <span className="text-[11px] text-[#71809d]">No heuristic flags</span>}
            {comment.accountCreatedAt && <span className="ml-1 text-[10px] text-[#73809b]">Account created {formatDate(comment.accountCreatedAt)}</span>}
            {mode === "live" && (
              <a title="Open comment on YouTube" className="ml-auto text-[#8897be] transition hover:text-white" href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&lc=${encodeURIComponent(comment.id)}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function HistoryRow({ video, index, demo }: { video: VideoRecord; index: number; demo: boolean }) {
  return (
    <tr className="border-t border-[#263048] transition hover:bg-[#202840]/60">
      <td className="px-5 py-3.5 text-xs text-[#72809e]">{String(index + 1).padStart(2, "0")}</td>
      <td className="max-w-[250px] px-3 py-3.5">
        {demo ? <span className="block truncate text-[13px] font-medium text-[#cbd4e9]">{video.title}</span> : (
          <a className="block truncate text-[13px] font-medium text-[#cbd4e9] hover:text-white hover:underline" href={`https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`} target="_blank" rel="noreferrer">{video.title}</a>
        )}
        <span className="mt-1 block text-[11px] text-[#73809b]">{formatDate(video.publishedAt)}</span>
      </td>
      <td className="px-3 py-3.5 text-right text-[13px] tabular-nums text-[#bec8df]">{fullNumber(video.views)}</td>
      <td className="px-3 py-3.5 text-right text-[13px] tabular-nums text-[#bec8df]">{percentage(ratio(video.likes, video.views))}</td>
      <td className="px-5 py-3.5 text-right text-[13px] tabular-nums text-[#bec8df]">{percentage(ratio(video.comments, video.views))}</td>
    </tr>
  );
}

export default function Dashboard({ initialReport }: { initialReport: AnalysisReport }) {
  const [report, setReport] = useState<AnalysisReport>(initialReport);
  const [url, setUrl] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<MetricKey>("likeRate");
  const [commentFilter, setCommentFilter] = useState<"all" | "flagged" | "unflagged">("flagged");
  const [commentQuery, setCommentQuery] = useState("");
  const [commentsShown, setCommentsShown] = useState(6);
  const [historyShown, setHistoryShown] = useState(7);
  const [historySort, setHistorySort] = useState<"recent" | "views" | "like-rate">("recent");
  const inputRef = useRef<HTMLInputElement>(null);

  async function analyze(mode: "demo" | "live") {
    setError(null);
    setWorking(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "demo" ? { mode: "demo" } : { mode: "live", url: url.trim() }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "Could not complete the analysis.";
        throw new Error(message);
      }
      const nextReport = payload as AnalysisReport;
      setReport(nextReport);
      setCommentFilter("flagged");
      setCommentQuery("");
      setCommentsShown(6);
      setHistoryShown(7);
      setMetric("likeRate");
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown error. Please retry.");
    } finally {
      setWorking(false);
    }
  }

  const filteredComments = useMemo(() => report.audit.comments.filter((comment) => {
    if (commentFilter === "flagged" && !comment.flagged) return false;
    if (commentFilter === "unflagged" && comment.flagged) return false;
    const query = commentQuery.toLowerCase().trim();
    if (query && !`${comment.author} ${comment.text}`.toLowerCase().includes(query)) return false;
    return true;
  }), [report, commentFilter, commentQuery]);

  const sortedHistory = useMemo(() => [...report.history].sort((a, b) => {
    if (historySort === "views") return (b.views ?? -1) - (a.views ?? -1);
    if (historySort === "like-rate") return (ratio(b.likes, b.views) ?? -1) - (ratio(a.likes, a.views) ?? -1);
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  }), [report, historySort]);

  const important = report.findings.filter((finding) => finding.level === "elevated" || finding.level === "watch");
  const overall: FindingLevel = important.some((finding) => finding.level === "elevated")
    ? "elevated" : important.length > 0 ? "watch" : report.history.length < 5 ? "insufficient" : "normal";

  function downloadReport() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `bot-checker-${report.video.id}-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <div className="app-shell min-h-screen text-[#edf0fc]">
      <aside className="sidebar hidden w-[250px] shrink-0 flex-col border-r border-[#273047] px-5 pb-6 pt-7 lg:flex">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="brand-mark"><Shield size={23} fill="#f88a78" strokeWidth={1.9} /></span>
          <span className="leading-tight"><strong className="block text-[17px] tracking-tight text-white">Bot Checker</strong><span className="block text-[10px] font-semibold uppercase tracking-[.16em] text-[#8190ae]">YouTube intelligence</span></span>
        </Link>
        <div className="mt-12 px-3 text-[10px] font-semibold uppercase tracking-[.21em] text-[#65728f]">Workspace</div>
        <nav className="mt-3 space-y-1.5">
          {[
            { href: "#results", label: "Overview", icon: LayoutDashboard },
            { href: "#engagement", label: "Engagement", icon: BarChart3 },
            { href: "#comments", label: "Comment audit", icon: MessageCircle },
            { href: "#history", label: "Channel history", icon: Clock3 },
          ].map(({ href, label, icon: Icon }, index) => (
            <a href={href} key={href} className={`nav-link ${index === 0 ? "nav-link-active" : ""}`}><Icon size={17} strokeWidth={1.8} />{label}</a>
          ))}
        </nav>
        <div className="mt-11 px-3 text-[10px] font-semibold uppercase tracking-[.21em] text-[#65728f]">Resources</div>
        <nav className="mt-3 space-y-1.5">
          <Link className="nav-link" href="/methodology"><FileSearch size={17} strokeWidth={1.8} />Methodology</Link>
          <Link className="nav-link" href="/privacy"><ShieldCheck size={17} strokeWidth={1.8} />Privacy</Link>
        </nav>
        <div className="mt-auto rounded-2xl border border-[#333d59] bg-[#1e2741] px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#dae1f3]"><Sparkles size={15} className="text-[#b5b9ff]" /> Investigation toolkit</div>
          <p className="text-[11px] leading-[1.65] text-[#96a3bd]">Spot unusual patterns. Understand the evidence. Avoid unsupported accusations.</p>
          <a href="#analyzer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#c5c9ff]">New analysis <ArrowRight size={13} /></a>
        </div>
        <p className="mt-5 px-2 text-[10px] text-[#667590]">MVP v0.1 · Research preview</p>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[73px] items-center justify-between border-b border-[#283149] bg-[#111626]/90 px-5 backdrop-blur-xl sm:px-9 lg:px-11">
          <div className="flex items-center gap-3 text-sm">
            <span className="lg:hidden"><Shield size={20} className="text-[#f18b79]" /></span>
            <span className="font-semibold text-[#eff2ff] lg:font-normal lg:text-[#8796b6]">Workspace</span>
            <span className="hidden text-[#53627f] lg:inline">/</span>
            <span className="hidden font-medium text-[#e7ecff] lg:inline">Overview</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-2 rounded-full border border-[#38405a] bg-[#20283e] px-3 py-1.5 text-[11px] font-medium text-[#bac5e0]"><i className={`h-1.5 w-1.5 rounded-full ${report.mode === "demo" ? "bg-[#b6a6ff]" : "bg-[#74e1c0]"}`} />{report.mode === "demo" ? "Demo dataset" : "Live API data"}</span>
            <span className="hidden items-center gap-2 rounded-full border border-[#38405a] bg-[#20283e] px-3 py-1.5 text-[11px] font-medium text-[#bac5e0] sm:flex"><Activity size={13} />Analysis ready</span>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-9 sm:px-9 lg:px-11">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[.23em] text-[#959fd4]">Creator intelligence / Overview</div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[32px]">See beyond the view count<span className="text-[#ff9688]">.</span></h1>
              <p className="mt-2 text-sm text-[#8e9cb5]">Investigate engagement anomalies and comment patterns from public YouTube data.</p>
            </div>
            <button onClick={downloadReport} className="secondary-button"><Download size={15} />Export JSON</button>
          </div>

          <section id="analyzer" className="hero-card relative scroll-mt-24 overflow-hidden rounded-[22px] border border-[#3f4267] p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-24 h-80 w-80 rounded-full bg-[#835ba3]/25 blur-[80px]" />
            <div className="pointer-events-none absolute bottom-0 right-24 h-48 w-48 rounded-full bg-[#eb766e]/10 blur-[70px]" />
            <div className="relative z-10 max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#c0c2ff]"><Sparkles size={14} />Start an investigation</div>
              <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Analyze any public YouTube video</h2>
              <p className="mt-2 max-w-2xl text-[13px] leading-[1.65] text-[#9ea9c9]">Compare engagement with recent uploads, inspect comment clusters, and review the signals—not a verdict.</p>
              <form className="mt-6 flex flex-col gap-2.5 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void analyze("live"); }}>
                <div className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-[#454c70] bg-[#11172b] px-4 focus-within:border-[#a09bff]">
                  <Link2 className="shrink-0 text-[#8190b4]" size={17} />
                  <input ref={inputRef} className="h-12 min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-[#6f7b99]" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://youtube.com/watch?v=..." aria-label="YouTube video URL" required />
                </div>
                <button type="submit" disabled={working} className="primary-button min-h-12 justify-center whitespace-nowrap px-6">{working ? <LoaderCircle size={17} className="animate-spin" /> : <Search size={17} />}{working ? "Analyzing" : "Analyze video"}</button>
              </form>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[11px] text-[#8592b2]"><Info size={13} />Live mode needs a server-side YouTube API key.</span>
                <button type="button" onClick={() => void analyze("demo")} disabled={working} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d7d3ff] transition hover:text-white"><Play size={13} fill="currentColor" />Load demo analysis <ArrowRight size={13} /></button>
              </div>
              {error && <div role="alert" className="mt-5 flex items-start gap-2.5 rounded-lg border border-[#8f454e] bg-[#602f3b]/45 p-3 text-[12px] text-[#ffd2d0]"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}<button className="ml-auto" onClick={() => setError(null)} aria-label="Dismiss error"><X size={15} /></button></div>}
            </div>
          </section>

          <section id="results" className="mt-11 scroll-mt-28">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <SectionTitle kicker="Investigation results" title="Video overview" note={`Analyzed ${formatDate(report.analyzedAt)} · ${report.mode === "demo" ? "Fictional sample data" : "Public YouTube API data"}`} />
              <SeverityPill level={overall} />
            </div>
            <div className="panel mb-5 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
              {report.video.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={report.video.thumbnail} alt="Video thumbnail" referrerPolicy="no-referrer" className="aspect-video w-full shrink-0 rounded-xl object-cover sm:w-[218px]" />
              ) : (
                <div className="video-placeholder flex aspect-video w-full shrink-0 items-center justify-center rounded-xl sm:w-[218px]"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#7f7ba4]/50 bg-[#d5b5dc]/10"><Play size={24} fill="#e8c2db" className="ml-1 text-[#e8c2db]" /></div></div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-[#99a5c2]"><InitialAvatar name={report.channel.title} avatar={report.channel.avatar} size="sm" /><span className="font-semibold text-[#c5cee5]">{report.channel.title}</span><span>·</span><span>{compactNumber(report.channel.subscribers)} subscribers</span></div>
                <h3 className="text-lg font-semibold leading-snug text-white sm:text-xl">{report.video.title}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[#8491af]"><span className="flex items-center gap-1.5"><Clock3 size={12} />Published {formatDate(report.video.publishedAt)}</span><span>·</span><span>{Math.floor(report.video.durationSeconds / 60)} min video</span><span>·</span><span>{report.history.length} comparison uploads</span></div>
              </div>
              {report.mode === "live" && <a className="secondary-button shrink-0" href={`https://www.youtube.com/watch?v=${encodeURIComponent(report.video.id)}`} target="_blank" rel="noreferrer">Watch video <ExternalLink size={14} /></a>}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <MetricStat label="Total views" value={compactNumber(report.video.views)} icon={Eye} detail="YouTube-reported lifetime total" />
              <MetricStat label="Total likes" value={compactNumber(report.video.likes)} icon={Activity} detail="Public like count, if available" />
              <MetricStat label="Total comments" value={compactNumber(report.video.comments)} icon={MessageCircle} detail="Includes replies; sample is top-level" />
            </div>
          </section>

          <section id="engagement" className="mt-11 scroll-mt-28">
            <SectionTitle kicker="01 / Channel benchmark" title="Engagement patterns" note="Historical medians provide context; comparisons are not age-matched." />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
              <div className="panel min-w-0 p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-sm font-semibold text-white">Engagement across uploads</h3><p className="mt-1 text-[11px] text-[#8390aa]">Ordered by publication date, not view velocity</p></div>
                  <div className="relative"><select aria-label="Chart metric" value={metric} onChange={(event) => setMetric(event.target.value as MetricKey)} className="appearance-none rounded-lg border border-[#39425f] bg-[#222b42] py-2 pl-3 pr-8 text-xs text-[#e0e5f5] outline-none"><option value="likeRate">Like rate</option><option value="commentRate">Comment rate</option><option value="commentsPerLike">Comments / likes</option></select><ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-2.5 text-[#98a3bf]" /></div>
                </div>
                <TimelineChart history={report.history} current={report.video} metric={metric} />
              </div>
              <div className="panel flex flex-col p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-white">Signals to investigate</h3><span className="rounded-full bg-[#33334c] px-2 py-1 text-[10px] font-semibold text-[#c5c9e9]">{important.length} notable</span></div>
                {important.length > 0 ? (
                  <div className="space-y-4">{important.slice(0, 4).map((finding) => (
                    <div key={finding.id} className="flex gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${finding.level === "elevated" ? "bg-[#53353d] text-[#ffa28d]" : "bg-[#554734] text-[#f3ca81]"}`}><Flag size={15} /></div>
                      <div><div className="text-xs font-semibold leading-relaxed text-[#e6eaf8]">{finding.title}</div><p className="mt-1 text-[11px] leading-[1.55] text-[#8e9bb4]">{finding.detail}</p></div>
                    </div>
                  ))}</div>
                ) : <div className="flex flex-1 flex-col items-center justify-center py-6 text-center"><CheckCircle2 size={34} className="text-[#73d9bd]" /><p className="mt-3 text-sm text-[#cdd7e9]">No strong anomalies found</p><p className="mt-2 max-w-xs text-xs leading-relaxed text-[#8996b0]">This does not establish that engagement is authentic.</p></div>}
                <div className="mt-auto border-t border-[#2b344c] pt-4 text-[11px] leading-[1.6] text-[#8491ad]">Indicators are independent heuristics, not estimates of fake views or bot probability.</div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">{CHART_OPTIONS.map((option) => <MetricComparisonCard key={option.value} metric={report.comparisons[option.value]} />)}</div>
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#363c54] bg-[#1b2337]/75 px-4 py-3 text-[11px] leading-[1.65] text-[#98a5bd]"><Info size={16} className="mt-0.5 shrink-0 text-[#a9b3d5]" /><span>{report.historicalCaveat} <Link href="/methodology" className="font-semibold text-[#b8bbff] hover:underline">Read the methodology</Link>.</span></div>
          </section>

          <section id="comments" className="mt-12 scroll-mt-28">
            <SectionTitle kicker="02 / Comment audit" title="Comment patterns" note={`Inspected ${report.audit.sampled} latest public top-level comments, out of ${fullNumber(report.audit.totalReported)} reported comments including replies.`} />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,.85fr)]">
              <div className="panel p-5 sm:p-6"><h3 className="text-sm font-semibold text-white">Comments flagged for review</h3><AuditRing flagged={report.audit.flaggedCount} sampled={report.audit.sampled} /><div className="mt-1 text-center text-xs text-[#97a3bd]">{fullNumber(report.audit.flaggedCount)} / {fullNumber(report.audit.sampled)} examined</div><div className="mt-4 border-t border-[#2b344b] pt-3 text-center text-[11px] text-[#7f8da8]">Threshold: 3+ heuristic points, not a bot classification</div></div>
              <div className="panel p-5 sm:p-6"><h3 className="text-sm font-semibold text-white">Pattern breakdown</h3><p className="mt-1 text-[11px] text-[#8694b0]">Signals can overlap on the same comment.</p><div className="mt-5 space-y-4">{[
                { label: "Repeated wording", count: report.audit.repeatedCount, color: "bg-[#ff8e7d]" },
                { label: "Generic responses", count: report.audit.genericCount, color: "bg-[#9a9cfb]" },
                { label: "Contextual bursts", count: report.audit.burstCount, color: "bg-[#f1c081]" },
                { label: "New accounts", count: report.audit.newAccountCount, color: "bg-[#76dbbc]" },
              ].map((item) => <div key={item.label}><div className="mb-1.5 flex justify-between text-xs"><span className="text-[#b9c3da]">{item.label}</span><span className="tabular-nums text-white">{item.count}</span></div><div className="h-[7px] overflow-hidden rounded-full bg-[#303850]"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${report.audit.sampled ? Math.min(100, (item.count / report.audit.sampled) * 100) : 0}%` }} /></div></div>)}</div><div className="mt-5 text-[11px] text-[#8190a9]">Account metadata available for {report.audit.metadataAvailableCount} / {report.audit.sampled} comments.</div></div>
              <div className="panel p-5 sm:p-6"><h3 className="text-sm font-semibold text-white">Recent sampled activity</h3><p className="mt-1 text-[11px] text-[#8694b0]">Last 7 days; latest-first sample only</p><ActivityBars activity={report.audit.hourlyActivity} /><div className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-[#8793ad]"><Info size={13} className="mt-0.5 shrink-0" />Bursts alone are not evidence of automation.</div></div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <div className="panel min-w-0 overflow-hidden">
                <div className="flex flex-col justify-between gap-3 border-b border-[#2a3249] p-5 sm:flex-row sm:items-center sm:px-6">
                  <div><h3 className="text-sm font-semibold text-white">Comment inspector</h3><p className="mt-1 text-[11px] text-[#8491aa]">Inspect evidence and open original comments in YouTube.</p></div>
                  <div className="flex flex-wrap items-center gap-2"><div className="flex h-9 items-center gap-2 rounded-lg border border-[#36405b] bg-[#1e273c] px-3"><Search size={13} className="text-[#8898b4]" /><input value={commentQuery} onChange={(event) => { setCommentQuery(event.target.value); setCommentsShown(6); }} placeholder="Search comments" aria-label="Search comments" className="w-32 bg-transparent text-[11px] text-white outline-none placeholder:text-[#73819e] sm:w-40" /></div></div>
                </div>
                <div className="flex gap-1.5 overflow-x-auto border-b border-[#2a3249] px-5 py-3 sm:px-6">{[
                  { value: "flagged", label: `Flagged (${report.audit.flaggedCount})` },
                  { value: "all", label: `All (${report.audit.sampled})` },
                  { value: "unflagged", label: "Unflagged" },
                ].map((option) => <button key={option.value} className={`filter-tab ${commentFilter === option.value ? "filter-tab-active" : ""}`} onClick={() => { setCommentFilter(option.value as typeof commentFilter); setCommentsShown(6); }}>{option.label}</button>)}</div>
                {filteredComments.length > 0 ? (
                  <div>{filteredComments.slice(0, commentsShown).map((comment) => <CommentItem key={comment.id} comment={comment} mode={report.mode} videoId={report.video.id} />)}</div>
                ) : <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-6 text-center"><MessageCircle size={26} className="text-[#75819d]" /><p className="text-sm text-[#abb6ce]">No matching comments</p><p className="text-xs text-[#7b89a3]">{report.audit.unavailableReason ?? "Try another filter or search term."}</p></div>}
                {filteredComments.length > commentsShown && <button className="flex w-full items-center justify-center gap-2 border-t border-[#2a3249] py-4 text-xs font-semibold text-[#b6b9fc] hover:bg-[#212a43]" onClick={() => setCommentsShown((previous) => previous + 10)}>Show more comments <ChevronDown size={14} /></button>}
              </div>
              <div className="flex min-w-0 flex-col gap-4">
                <div className="panel p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-white">Repeated text clusters</h3><span className="text-xs text-[#a6b3d0]">{report.audit.clusterCount} groups</span></div>
                  {report.audit.clusters.length ? <div className="space-y-4">{report.audit.clusters.slice(0, 4).map((cluster) => <div key={cluster.id} className="rounded-xl border border-[#303a56] bg-[#202a42]/70 p-4"><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-semibold text-[#d8ddf9]">Cluster #{cluster.id}</span><span className="rounded-md bg-[#453e53] px-2 py-1 text-[10px] font-semibold text-[#ffc0ab]">{cluster.size} messages</span></div><p className="line-clamp-3 text-xs leading-[1.65] text-[#b3bfdb]">“{cluster.example}”</p><p className="mt-2 text-[10px] text-[#7989a7]">{cluster.authorCount} distinct author identifiers</p></div>)}</div> : <div className="py-5 text-xs leading-relaxed text-[#8f9bb5]">No groups of at least three highly similar messages were found in this sample.</div>}
                </div>
                <div className="rounded-xl border border-[#38445d] bg-[#222c43]/70 p-5"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#edf1fc]"><ShieldAlert size={17} className="text-[#ffa18d]" />A flag is not a verdict</div><p className="text-xs leading-[1.8] text-[#96a5bf]">Legitimate viewers repeat phrases, respond during premieres, and create new accounts. Signals only highlight comments worth manual inspection.</p><Link href="/methodology" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#b7beff]">How flags work <ArrowRight size={13} /></Link></div>
              </div>
            </div>
          </section>

          <section id="history" className="mt-12 scroll-mt-28">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><SectionTitle kicker="03 / Historical context" title="Comparable channel uploads" note={report.cohortDescription} /><div className="relative mb-2"><SlidersHorizontal size={13} className="pointer-events-none absolute left-3 top-2.5 text-[#9daac7]" /><select className="appearance-none rounded-lg border border-[#39425f] bg-[#20283d] py-2 pl-8 pr-8 text-xs text-[#dae2f3] outline-none" value={historySort} onChange={(event) => setHistorySort(event.target.value as typeof historySort)} aria-label="Sort history"><option value="recent">Most recent</option><option value="views">Most viewed</option><option value="like-rate">Highest like rate</option></select><ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-2.5 text-[#9daac7]" /></div></div>
            <div className="panel overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[630px] text-left"><thead className="bg-[#212a42]"><tr className="text-[10px] uppercase tracking-[.1em] text-[#8190ae]"><th className="w-12 px-5 py-4 font-semibold">#</th><th className="px-3 py-4 font-semibold">Video / Published</th><th className="px-3 py-4 text-right font-semibold">Views</th><th className="px-3 py-4 text-right font-semibold">Like rate</th><th className="px-5 py-4 text-right font-semibold">Comment rate</th></tr></thead><tbody>{sortedHistory.slice(0, historyShown).map((video, index) => <HistoryRow key={video.id} video={video} index={index} demo={report.mode === "demo"} />)}</tbody></table></div>
              {sortedHistory.length === 0 && <p className="px-5 py-10 text-center text-xs text-[#99a6c1]">No comparable uploads were available.</p>}
              {sortedHistory.length > historyShown && <button className="flex w-full items-center justify-center gap-2 border-t border-[#2a3249] py-4 text-xs font-semibold text-[#b6b9fc] hover:bg-[#212a43]" onClick={() => setHistoryShown((previous) => previous + 15)}>Show more uploads <ChevronDown size={14} /></button>}
            </div>
          </section>
          <footer className="mt-14 flex flex-col justify-between gap-4 border-t border-[#2b344b] pt-7 text-[11px] leading-relaxed text-[#8290aa] sm:flex-row"><p>Bot Checker · Public data, explainable heuristics, human judgment.</p><div className="flex flex-wrap gap-4"><Link href="/methodology" className="hover:text-white">Methodology</Link><Link href="/privacy" className="hover:text-white">Privacy</Link><a href="https://developers.google.com/youtube/terms/developer-policies" target="_blank" rel="noreferrer" className="hover:text-white">YouTube API policies ↗</a></div></footer>
        </main>
      </div>
    </div>
  );
}
