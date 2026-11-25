"use client";

import { ratio } from "@/lib/analysis";
import {
  compactNumber,
  formatDate,
  fullNumber,
  percentage,
  relativeDate,
  signedPercentage,
} from "@/lib/format";
import type {
  AnalysisReport,
  CommentSignal,
  FindingLevel,
  MetricComparison,
  MetricKey,
  ScoredComment,
  VideoRecord,
} from "@/lib/types";
import { parseVideoId } from "@/lib/video-url";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Download,
  ExternalLink,
  Fingerprint,
  LoaderCircle,
  MoveUpRight,
  Play,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { ActivityBars, TimelineChart } from "./charts";
import { VeyraMark } from "./veyra-mark";

const SIGNAL_LABELS: Record<CommentSignal, string> = {
  "repeated-text": "Repeated wording",
  "generic-language": "Generic language",
  "burst-activity": "Activity burst",
  "new-account": "New account",
  "username-pattern": "Name pattern",
  "external-link": "External link",
  "praise-template": "Templated praise",
  "praise-wave": "Praise saturation",
};

const METRICS: Array<{ key: MetricKey; label: string }> = [
  { key: "likeRate", label: "Like / view" },
  { key: "commentRate", label: "Comment / view" },
  { key: "commentsPerLike", label: "Comment / like" },
];

function levelText(level: FindingLevel): string {
  if (level === "elevated") return "Elevated anomaly";
  if (level === "watch") return "Investigate";
  if (level === "normal") return "No major outlier";
  return "Limited evidence";
}

function Verdict({ level }: { level: FindingLevel }) {
  return (
    <span className={`verdict verdict-${level}`}>
      <span className="verdict-dot" />
      {levelText(level)}
    </span>
  );
}

function Eyebrow({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <div className="section-eyebrow">
      <span className="section-index">{number}</span>
      <span>{children}</span>
      <span className="section-rule" />
    </div>
  );
}

function SectionHeading({
  number,
  eyebrow,
  title,
  description,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="section-heading reveal">
      <Eyebrow number={number}>{eyebrow}</Eyebrow>
      <h2>
        {title}
        <span className="accent-period">.</span>
      </h2>
      {description && <p>{description}</p>}
    </div>
  );
}

function SignalOrb() {
  return (
    <div className="signal-orb" aria-hidden="true">
      <div className="orb-glow" />
      <div className="orb-ring orb-ring-one" />
      <div className="orb-ring orb-ring-two" />
      <div className="orb-ring orb-ring-three" />
      <div className="orb-axis orb-axis-x" />
      <div className="orb-axis orb-axis-y" />
      <div className="orb-scanner" />
      <div className="orb-center">
        <VeyraMark size={98} />
      </div>
      <div className="orb-coordinate orb-coordinate-top">V/01 · SCANNING</div>
      <div className="orb-coordinate orb-coordinate-bottom">
        SIGNAL INTELLIGENCE / 2026
      </div>
    </div>
  );
}

function VideoPortrait({ report }: { report: AnalysisReport }) {
  return (
    <div className="video-portrait reveal">
      <div className="video-image-wrap">
        {report.video.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={report.video.thumbnail}
            alt="Video thumbnail"
            referrerPolicy="no-referrer"
            className="video-image"
          />
        ) : (
          <div className="video-image-placeholder">
            <Play size={35} />
          </div>
        )}
        <div className="video-image-overlay">
          <span>SELECTED MATERIAL</span>
          <span>
            {report.mode === "demo" ? "DEMO / 001" : `ID / ${report.video.id}`}
          </span>
        </div>
      </div>
      <div className="video-portrait-body">
        <div className="micro-label">NOW UNDER REVIEW</div>
        <h3>{report.video.title}</h3>
        <div className="video-channel">
          <span>{report.channel.title}</span>
          <span>↗</span>
          <span>{formatDate(report.video.publishedAt)}</span>
        </div>
        {report.mode === "live" && (
          <a
            className="text-link"
            href={`https://www.youtube.com/watch?v=${encodeURIComponent(report.video.id)}`}
            target="_blank"
            rel="noreferrer"
          >
            View original on YouTube <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

function MetricComparisonRow({
  metric,
  index,
}: {
  metric: MetricComparison;
  index: number;
}) {
  const current = metric.current ?? 0;
  const baseline = metric.median ?? 0;
  const max = Math.max(current, baseline, 0.00001) * 1.12;
  return (
    <div
      className="metric-comparison-row reveal"
      style={{ "--reveal-delay": `${index * 70}ms` } as CSSProperties}
    >
      <div className="metric-comparison-name">
        <span className="small-counter">0{index + 1}</span>
        <h3>{metric.label}</h3>
        <Verdict level={metric.finding} />
      </div>
      <div className="metric-comparison-bars">
        <div className="comparison-track">
          <span>THIS VIDEO</span>
          <div className="bar-back">
            <div
              className="bar-fill bar-fill-current"
              style={{ width: `${(current / max) * 100}%` }}
            />
          </div>
          <b>{percentage(metric.current)}</b>
        </div>
        <div className="comparison-track">
          <span>CHANNEL MEDIAN</span>
          <div className="bar-back">
            <div
              className="bar-fill bar-fill-median"
              style={{ width: `${(baseline / max) * 100}%` }}
            />
          </div>
          <b>{percentage(metric.median)}</b>
        </div>
      </div>
      <div className="metric-comparison-delta">
        {metric.deviation === null ? (
          <span>—</span>
        ) : (
          <>
            <span
              className={
                metric.deviation < 0 ? "delta-negative" : "delta-positive"
              }
            >
              {metric.deviation < 0 ? (
                <ArrowDownRight size={18} />
              ) : (
                <ArrowUpRight size={18} />
              )}
              {signedPercentage(metric.deviation)}
            </span>
            <small>vs channel</small>
          </>
        )}
      </div>
    </div>
  );
}

function CommentCard({
  comment,
  mode,
  videoId,
}: {
  comment: ScoredComment;
  mode: "live" | "demo";
  videoId: string;
}) {
  return (
    <article className="comment-entry">
      <div className="comment-heading">
        <div className="comment-author">
          <span className="comment-avatar">
            {comment.author.slice(0, 1).toUpperCase()}
          </span>
          <span>{comment.author}</span>
          {comment.flagged && (
            <span className="comment-review-tag">REVIEW</span>
          )}
        </div>
        <span className="comment-date">
          {relativeDate(comment.publishedAt)}
        </span>
      </div>
      <p className="comment-content">{comment.text}</p>
      <div className="comment-footer">
        <div className="comment-tags">
          {comment.signals.length ? (
            comment.signals.map((signal) => (
              <span
                key={signal}
                className={
                  signal === "repeated-text" || signal === "praise-wave"
                    ? "signal-tag strong"
                    : "signal-tag"
                }
              >
                {SIGNAL_LABELS[signal]}
              </span>
            ))
          ) : (
            <span className="comment-muted">No review signals</span>
          )}
        </div>
        {mode === "live" && (
          <a
            className="comment-open"
            href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&lc=${encodeURIComponent(comment.id)}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open comment by ${comment.author} on YouTube`}
          >
            <MoveUpRight size={16} />
          </a>
        )}
      </div>
      {comment.accountCreatedAt && (
        <div className="comment-extra">
          ACCOUNT CREATED {formatDate(comment.accountCreatedAt)}
        </div>
      )}
    </article>
  );
}

function HistoryRow({
  video,
  index,
  mode,
}: {
  video: VideoRecord;
  index: number;
  mode: "live" | "demo";
}) {
  return (
    <tr className="history-row">
      <td>
        <span className="history-number">
          {String(index + 1).padStart(2, "0")}
        </span>
      </td>
      <td>
        <div className="history-title-cell">
          {mode === "live" ? (
            <Link
              href={`/analyze/${encodeURIComponent(video.id)}`}
              className="history-video-link"
              title="Open Veyra analysis"
            >
              <span>{video.title}</span>
              <ArrowUpRight size={16} aria-hidden />
            </Link>
          ) : (
            <span
              className="history-video-demo"
              title="Fictional demo video; live analysis unavailable"
            >
              {video.title}
            </span>
          )}
          <small>
            {formatDate(video.publishedAt)}
            {mode === "demo" ? " · Fictional" : ""}
          </small>
        </div>
      </td>
      <td className="numeric">{fullNumber(video.views)}</td>
      <td className="numeric">{percentage(ratio(video.likes, video.views))}</td>
      <td className="numeric">
        {percentage(ratio(video.comments, video.views))}
      </td>
    </tr>
  );
}

export default function Dashboard({
  initialReport,
  initialVideoId,
}: {
  initialReport: AnalysisReport | null;
  initialVideoId?: string;
}) {
  const router = useRouter();
  const [report, setReport] = useState<AnalysisReport | null>(initialReport);
  const [url, setUrl] = useState("");
  const [working, setWorking] = useState(Boolean(initialVideoId));
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<MetricKey>("likeRate");
  const [commentFilter, setCommentFilter] = useState<
    "flagged" | "all" | "unflagged"
  >("flagged");
  const [commentQuery, setCommentQuery] = useState("");
  const [commentsShown, setCommentsShown] = useState(5);
  const [historyShown, setHistoryShown] = useState(8);
  const [historySort, setHistorySort] = useState<
    "recent" | "views" | "like-rate"
  >("recent");
  const [scrollPercent, setScrollPercent] = useState(0);
  const loadedId = useRef<string | null>(null);

  const load = useCallback(async (mode: "demo" | "live", videoId?: string) => {
    setError(null);
    setWorking(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "demo" ? { mode } : { mode, url: videoId },
        ),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "We couldn't complete this investigation.";
        throw new Error(message);
      }
      setReport(payload as AnalysisReport);
      setMetric("likeRate");
      setCommentFilter("flagged");
      setCommentQuery("");
      setCommentsShown(5);
      setHistoryShown(8);
      requestAnimationFrame(() =>
        document
          .getElementById("results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "An unexpected error occurred.",
      );
    } finally {
      setWorking(false);
    }
  }, []);

  useEffect(() => {
    if (!initialVideoId || loadedId.current === initialVideoId) return;
    loadedId.current = initialVideoId;
    void load("live", initialVideoId);
  }, [initialVideoId, load]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setScrollPercent(
          max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0,
        );
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("motion-ready");
    const elements = document.querySelectorAll<HTMLElement>(".reveal");
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [report]);

  const filteredComments = useMemo(
    () =>
      (report?.audit.comments ?? []).filter((comment) => {
        if (commentFilter === "flagged" && !comment.flagged) return false;
        if (commentFilter === "unflagged" && comment.flagged) return false;
        const query = commentQuery.trim().toLowerCase();
        return (
          !query ||
          `${comment.author} ${comment.text}`.toLowerCase().includes(query)
        );
      }),
    [report, commentFilter, commentQuery],
  );

  const sortedHistory = useMemo(
    () =>
      [...(report?.history ?? [])].sort((a, b) => {
        if (historySort === "views") return (b.views ?? -1) - (a.views ?? -1);
        if (historySort === "like-rate")
          return (
            (ratio(b.likes, b.views) ?? -1) - (ratio(a.likes, a.views) ?? -1)
          );
        return (
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      }),
    [report, historySort],
  );

  function startAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = parseVideoId(url);
    if (!id) {
      setError("Paste a valid YouTube video URL or 11-character video ID.");
      return;
    }
    setError(null);
    if (initialVideoId === id) {
      void load("live", id);
      return;
    }
    router.push(`/analyze/${encodeURIComponent(id)}`);
  }

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `veyra-${report.video.id}-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  const important =
    report?.findings.filter(
      (finding) => finding.level === "elevated" || finding.level === "watch",
    ) ?? [];
  const overall: FindingLevel = important.some(
    (finding) => finding.level === "elevated",
  )
    ? "elevated"
    : important.length > 0
      ? "watch"
      : (report?.history.length ?? 0) < 5
        ? "insufficient"
        : "normal";

  return (
    <div className="veyra-app">
      <div
        className="scroll-progress"
        style={{ transform: `scaleX(${scrollPercent / 100})` }}
        aria-hidden="true"
      />
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="wordmark" aria-label="Veyra home">
            <VeyraMark size={34} />
            <span>
              VEYRA<span className="wordmark-dot">.</span>
            </span>
          </Link>
          <nav aria-label="Site navigation" className="header-nav">
            <a href="#results">THE REPORT</a>
            <Link href="/methodology">METHODOLOGY</Link>
            <Link href="/privacy">PRIVACY</Link>
          </nav>
          <a className="header-action" href="#analyzer">
            NEW SCAN <ArrowUpRight size={16} />
          </a>
        </div>
      </header>

      <main>
        <section className="masthead wrap" id="analyzer">
          <div className="masthead-grain" aria-hidden="true" />
          <div className="masthead-copy">
            <div className="masthead-eyebrow">
              <span className="live-marker" /> AN INSTRUMENT FOR DIGITAL
              SKEPTICS <span className="masthead-edition">— VOL. 001</span>
            </div>
            <h1>
              LOOK <span>BEYOND</span>
              <br /> THE NUMBERS<span className="accent-period">.</span>
            </h1>
            <p className="masthead-intro">
              The internet runs on attention.{" "}
              <em>Not all attention is real.</em> Trace the signals behind a
              YouTube video&apos;s popularity.
            </p>
            <form onSubmit={startAnalysis} className="scan-form">
              <div className="scan-input-wrap">
                <Search size={19} strokeWidth={1.7} />
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="Paste a YouTube video URL"
                  aria-label="YouTube video URL"
                  required
                />
                <span className="scan-input-hint">YOUTUBE / URL</span>
              </div>
              <button className="scan-submit" disabled={working} type="submit">
                {working ? (
                  <LoaderCircle size={20} className="animate-spin" />
                ) : (
                  <ArrowUpRight size={23} />
                )}
                <span>{working ? "SCANNING" : "ANALYZE"}</span>
              </button>
            </form>
            <div className="scan-under">
              <span>NO SIGN-IN. PUBLIC DATA. EXPLAINABLE FINDINGS.</span>
              <button
                type="button"
                disabled={working}
                onClick={() => {
                  if (initialVideoId) router.push("/");
                  else void load("demo");
                }}
              >
                TRY THE DEMO <ArrowRight size={13} />
              </button>
            </div>
            {error && (
              <div className="scan-error" role="alert">
                <ShieldAlert size={17} />
                {error}
                <button
                  type="button"
                  onClick={() => setError(null)}
                  aria-label="Dismiss error"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <SignalOrb />
          <a href="#results" className="masthead-scroll">
            SCROLL TO EXPLORE <ArrowDown size={16} />
          </a>
          <div className="masthead-side-label" aria-hidden="true">
            VERIFY / QUESTION / INVESTIGATE
          </div>
        </section>

        <div className="ticker" aria-hidden="true">
          <div className="ticker-line">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i}>
                QUESTION THE SIGNAL <b>✳</b> TRUST THE EVIDENCE <b>✳</b> LOOK
                CLOSER <b>✳</b>
              </span>
            ))}
          </div>
        </div>

        {!report && (
          <section
            id="results"
            className="wrap scan-loading-section"
            aria-live="polite"
          >
            <div className="micro-label">VEYRA / LIVE INVESTIGATION</div>
            {working ? (
              <>
                <div className="loading-line" />
                <h2>
                  Reading the signals<span className="accent-period">.</span>
                </h2>
                <p>
                  Retrieving channel history and comment patterns. The report
                  will appear here.
                </p>
              </>
            ) : (
              <>
                <h2>
                  No report loaded<span className="accent-period">.</span>
                </h2>
                <p>Enter a public YouTube video URL above to begin.</p>
              </>
            )}
          </section>
        )}

        {report && (
          <>
            <section id="results" className="report-section wrap">
              <SectionHeading
                number="01"
                eyebrow="THE VERDICT"
                title="The signal, decoded"
                description={`Analyzed ${formatDate(report.analyzedAt)} · ${report.mode === "demo" ? "Illustrative fictional data" : "Live public YouTube data"}`}
              />
              <div className="report-status-line reveal">
                <span className="report-mode">
                  <span className="live-marker" />
                  {report.mode === "demo"
                    ? "DEMO ENVIRONMENT"
                    : "LIVE ANALYSIS"}
                </span>
                <span>INVESTIGATION / {report.video.id}</span>
                <button type="button" onClick={downloadReport}>
                  <Download size={14} /> EXPORT REPORT
                </button>
              </div>
              <div className="score-grid">
                <div className="score-primary reveal">
                  <div className="micro-label">
                    VEYRA SCORE{" "}
                    <span className="score-asterisk">/ EXPERIMENTAL INDEX</span>
                  </div>
                  <div className="score-number-wrap">
                    <strong className="score-number">
                      {report.veyraScore.value ?? "—"}
                    </strong>
                    <span className="score-denominator">/100</span>
                    <div
                      className="score-orbit"
                      aria-hidden="true"
                      style={
                        {
                          "--score": `${report.veyraScore.value ?? 0}%`,
                        } as CSSProperties
                      }
                    >
                      <span />
                    </div>
                  </div>
                  <div className="score-conclusion">
                    {report.veyraScore.label}
                  </div>
                  <p className="score-caption">
                    This measures observable anomalies, <strong>not</strong> the
                    percentage of real viewers or a bot probability.
                  </p>
                  <div className="score-meta">
                    <span>
                      EVIDENCE COVERAGE <b>{report.veyraScore.coverage}%</b>
                    </span>
                    <span>
                      CONFIDENCE{" "}
                      <b>{report.veyraScore.confidence.toUpperCase()}</b>
                    </span>
                  </div>
                </div>
                <div className="score-secondary reveal">
                  <div className="score-secondary-top">
                    <span className="micro-label">
                      SIGNAL BREAKDOWN / THREE LENSES
                    </span>
                    <Fingerprint size={22} strokeWidth={1.4} />
                  </div>
                  <div className="score-component-list">
                    {report.veyraScore.components.map((component, index) => (
                      <div className="score-component" key={component.key}>
                        <div className="score-component-header">
                          <span>
                            <small>0{index + 1}</small>
                            {component.label}
                          </span>
                          <b>
                            {component.score === null ? "—" : component.score}
                            <small> / 100</small>
                          </b>
                        </div>
                        <div className="component-track">
                          <span style={{ width: `${component.score ?? 0}%` }} />
                        </div>
                        <p>{component.detail}</p>
                      </div>
                    ))}
                  </div>
                  <div className="score-secondary-foot">
                    <Sparkles size={17} />
                    <p>
                      We show uncertainty when evidence is missing. An unflagged
                      video is not necessarily an authentic one.
                    </p>
                  </div>
                </div>
              </div>
              <div className="video-stats-layout">
                <VideoPortrait report={report} />
                <div className="stat-collection reveal">
                  {[
                    {
                      label: "TOTAL VIEWS",
                      value: report.video.views,
                      detail: "PUBLIC COUNT",
                    },
                    {
                      label: "TOTAL LIKES",
                      value: report.video.likes,
                      detail: "PUBLIC COUNT",
                    },
                    {
                      label: "TOTAL COMMENTS",
                      value: report.video.comments,
                      detail: "PUBLIC COUNT",
                    },
                    {
                      label: "COMPARABLE UPLOADS",
                      value: report.history.length,
                      detail: "CHANNEL BASELINE",
                    },
                  ].map((item, i) => (
                    <div className="stat-tile" key={item.label}>
                      <div className="stat-tile-top">
                        <span>{item.label}</span>
                        <span>0{i + 1}</span>
                      </div>
                      <strong>{compactNumber(item.value)}</strong>
                      <small>{item.detail}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="findings-strip reveal">
                <div className="findings-label">
                  LATEST FINDINGS <Verdict level={overall} />
                </div>
                <div className="findings-items">
                  {report.findings.slice(0, 3).map((finding) => (
                    <div className="finding-line" key={finding.id}>
                      <span
                        className={`finding-pip finding-pip-${finding.level}`}
                      />
                      <div>
                        <b>{finding.title}</b>
                        <p>{finding.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="engagement" className="report-section wrap">
              <SectionHeading
                number="02"
                eyebrow="THE PATTERNS"
                title="Follow the imbalance"
                description="A channel's history sets the context. Large deviations deserve review, but a consistent baseline can still hide coordinated activity."
              />
              <div className="metrics-list">
                {METRICS.map(({ key }, index) => (
                  <MetricComparisonRow
                    key={key}
                    metric={report.comparisons[key]}
                    index={index}
                  />
                ))}
              </div>
              <div className="timeline-panel reveal">
                <div className="timeline-header">
                  <div>
                    <div className="micro-label">HISTORICAL SIGNAL</div>
                    <h3>Engagement trajectory</h3>
                  </div>
                  <div className="custom-select">
                    <select
                      aria-label="Chart metric"
                      value={metric}
                      onChange={(event) =>
                        setMetric(event.target.value as MetricKey)
                      }
                    >
                      {METRICS.map((item) => (
                        <option value={item.key} key={item.key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} />
                  </div>
                </div>
                <TimelineChart
                  history={report.history}
                  current={report.video}
                  metric={metric}
                />
                <p className="timeline-caveat">{report.historicalCaveat}</p>
              </div>
            </section>

            <section id="comments" className="report-section wrap">
              <SectionHeading
                number="03"
                eyebrow="THE CONVERSATION"
                title="Human. Or hollow?"
                description="Repeated praise, suspicious timing, and connected signals deserve a closer look. Individual wording alone cannot identify a bot or AI author."
              />
              <div className="comment-overview">
                <div className="comment-lead reveal">
                  <div className="micro-label">COMMENTS MARKED FOR REVIEW</div>
                  <div className="comment-big-number">
                    {report.audit.sampled
                      ? Math.round(
                          (report.audit.flaggedCount / report.audit.sampled) *
                            100,
                        )
                      : 0}
                    <span>%</span>
                  </div>
                  <div className="comment-big-sub">
                    <span className="live-marker" /> {report.audit.flaggedCount}{" "}
                    OF {report.audit.sampled} SAMPLED
                  </div>
                  <p>
                    Based on an inspection of the latest public top-level
                    comments. The sample is not representative of all viewers.
                  </p>
                </div>
                <div className="signal-bars reveal">
                  <div className="micro-label">
                    PATTERN FREQUENCY{" "}
                    <span className="dim">/ SIGNALS MAY OVERLAP</span>
                  </div>
                  {[
                    ["Templated praise", report.audit.praiseCount],
                    ["Praise saturation", report.audit.praiseWaveCount],
                    ["Repeated wording", report.audit.repeatedCount],
                    ["Synchronized bursts", report.audit.burstCount],
                    ["New accounts", report.audit.newAccountCount],
                  ].map(([label, count], index) => (
                    <div className="signal-bar-row" key={label}>
                      <div>
                        <span>
                          0{index + 1} <b>{label}</b>
                        </span>
                        <strong>{count}</strong>
                      </div>
                      <div className="signal-bar-track">
                        <span
                          style={{
                            width: `${report.audit.sampled ? (Number(count) / report.audit.sampled) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="activity-panel reveal">
                  <div className="micro-label">LATEST ACTIVITY / 7 DAYS</div>
                  <ActivityBars activity={report.audit.hourlyActivity} />
                  <small>
                    Most recent sampled comments only. Activity bursts alone do
                    not imply automation.
                  </small>
                </div>
              </div>
              <div className="inspector-layout">
                <div className="inspector-main reveal">
                  <div className="inspector-header">
                    <div>
                      <div className="micro-label">
                        INVESTIGATION / COMMENT FEED
                      </div>
                      <h3>Inspect the conversation</h3>
                    </div>
                    <div className="inspector-count">
                      {filteredComments.length} RESULTS
                    </div>
                  </div>
                  <div className="inspector-controls">
                    <div className="inspector-tabs">
                      {[
                        [
                          "flagged",
                          `FOR REVIEW (${report.audit.flaggedCount})`,
                        ],
                        ["all", `ALL (${report.audit.sampled})`],
                        ["unflagged", "UNFLAGGED"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          className={commentFilter === value ? "active" : ""}
                          onClick={() => {
                            setCommentFilter(value as typeof commentFilter);
                            setCommentsShown(5);
                          }}
                          type="button"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="inspector-search">
                      <Search size={15} />
                      <input
                        aria-label="Search comments"
                        placeholder="Search comments"
                        value={commentQuery}
                        onChange={(event) => {
                          setCommentQuery(event.target.value);
                          setCommentsShown(5);
                        }}
                      />
                    </div>
                  </div>
                  {filteredComments.length ? (
                    filteredComments
                      .slice(0, commentsShown)
                      .map((comment) => (
                        <CommentCard
                          key={comment.id}
                          comment={comment}
                          mode={report.mode}
                          videoId={report.video.id}
                        />
                      ))
                  ) : (
                    <div className="inspector-empty">
                      {report.audit.unavailableReason ??
                        "No matching comments. Try a different filter."}
                    </div>
                  )}
                  {filteredComments.length > commentsShown && (
                    <button
                      className="load-more"
                      onClick={() => setCommentsShown((prev) => prev + 10)}
                      type="button"
                    >
                      LOAD MORE COMMENTS <ArrowDown size={15} />
                    </button>
                  )}
                </div>
                <aside className="inspector-sidebar reveal">
                  <div className="micro-label">
                    CLUSTER INTELLIGENCE / {report.audit.clusterCount} DETECTED
                  </div>
                  <h3>
                    Similar voices<span className="accent-period">.</span>
                  </h3>
                  {report.audit.clusters.length ? (
                    report.audit.clusters.slice(0, 5).map((cluster) => (
                      <div className="cluster" key={cluster.id}>
                        <div>
                          <span>
                            CLUSTER {String(cluster.id).padStart(2, "0")}
                          </span>
                          <b>{cluster.size} COMMENTS</b>
                        </div>
                        <blockquote>“{cluster.example}”</blockquote>
                        <small>
                          {cluster.authorCount} DISTINCT AUTHOR IDENTIFIERS
                        </small>
                      </div>
                    ))
                  ) : (
                    <p className="cluster-empty">
                      No repeated-text clusters in the latest sample.
                    </p>
                  )}
                  <div className="caution-note">
                    <ShieldAlert size={19} />
                    <div>
                      <b>A FLAG IS NOT A VERDICT</b>
                      <p>
                        Shared language can be organic. Every signal is a prompt
                        for human review—not a definitive accusation.
                      </p>
                      <Link href="/methodology">
                        READ THE METHODOLOGY <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            <section
              id="history"
              className="report-section wrap history-section"
            >
              <SectionHeading
                number="04"
                eyebrow="CHANNEL DNA"
                title="The bigger picture"
                description={report.cohortDescription}
              />
              <div className="history-top reveal">
                <div className="micro-label">
                  COMPARABLE UPLOADS / {report.history.length} RESULTS
                </div>
                <div className="custom-select">
                  <select
                    aria-label="Sort historical uploads"
                    value={historySort}
                    onChange={(event) =>
                      setHistorySort(event.target.value as typeof historySort)
                    }
                  >
                    <option value="recent">MOST RECENT</option>
                    <option value="views">MOST VIEWED</option>
                    <option value="like-rate">HIGHEST LIKE RATE</option>
                  </select>
                  <ChevronDown size={15} />
                </div>
              </div>
              <div className="history-table-wrap reveal">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>VIDEO / PUBLISHED</th>
                      <th>VIEWS</th>
                      <th>LIKE RATE</th>
                      <th>COMMENT RATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistory
                      .slice(0, historyShown)
                      .map((video, index) => (
                        <HistoryRow
                          key={video.id}
                          index={index}
                          video={video}
                          mode={report.mode}
                        />
                      ))}
                  </tbody>
                </table>
                {!sortedHistory.length && (
                  <p className="table-empty">
                    No comparable uploads available for this channel.
                  </p>
                )}
                {sortedHistory.length > historyShown && (
                  <button
                    type="button"
                    className="load-more"
                    onClick={() => setHistoryShown((count) => count + 15)}
                  >
                    REVEAL MORE UPLOADS <ArrowDown size={16} />
                  </button>
                )}
              </div>
              <p className="history-hint">
                {report.mode === "demo"
                  ? "Fictional demo titles do not lead to live reports."
                  : "Select any video to open a new Veyra investigation. You will stay within Veyra."}
              </p>
            </section>
          </>
        )}
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <div>
            <Link href="/" className="footer-brand">
              <VeyraMark size={42} />
              <span>
                VEYRA<span className="accent-period">.</span>
              </span>
            </Link>
            <p>
              Look beyond the numbers.
              <br />
              Question the signal. Trust the evidence.
            </p>
          </div>
          <div className="footer-column">
            <span>EXPLORE</span>
            <a href="#analyzer">NEW INVESTIGATION</a>
            <a href="#results">LATEST REPORT</a>
          </div>
          <div className="footer-column">
            <span>REFERENCE</span>
            <Link href="/methodology">METHODOLOGY</Link>
            <Link href="/privacy">PRIVACY</Link>
            <a
              href="https://developers.google.com/youtube/terms/developer-policies"
              target="_blank"
              rel="noreferrer"
            >
              YOUTUBE API POLICIES ↗
            </a>
          </div>
          <div className="footer-signature">
            THE SIGNAL IS
            <br />
            NEVER THE STORY<span className="accent-period">.</span>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>© {new Date().getFullYear()} VEYRA / RESEARCH PREVIEW</span>
          <span>BUILT TO QUESTION / NOT TO ACCUSE</span>
          <span>V / 0.3</span>
        </div>
      </footer>
    </div>
  );
}
