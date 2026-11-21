import { NextRequest, NextResponse } from "next/server";
import { getDemoReport } from "@/lib/demo";
import { analyzeLiveVideo, parseVideoId, YoutubeError } from "@/lib/youtube";

export const runtime = "nodejs";

const LIMIT_WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS = 12;
const counters = new Map<string, { count: number; resetAt: number }>();

function isLimited(key: string): boolean {
  const now = Date.now();
  if (counters.size > 1500) {
    for (const [id, record] of counters) {
      if (record.resetAt <= now) counters.delete(id);
    }
  }
  const entry = counters.get(key);
  if (!entry || entry.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_REQUESTS;
}

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 2048) return NextResponse.json({ error: "Request too large." }, { status: 413 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  if (data.mode === "demo") return NextResponse.json(getDemoReport(), {
    headers: { "Cache-Control": "no-store" },
  });

  const input = typeof data.url === "string" ? data.url : "";
  const id = input.length <= 300 ? parseVideoId(input) : null;
  if (!id) {
    return NextResponse.json({ error: "Enter a valid YouTube video, Shorts, or youtu.be URL." }, { status: 400 });
  }
  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({ error: "Live analysis requires YOUTUBE_API_KEY in .env.local. Try the demo first." }, { status: 503 });
  }

  // Best-effort single-process rate limiting. Use Redis or an edge rate limiter for production.
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (isLimited(clientIp)) {
    return NextResponse.json({ error: "Too many analyses. Try again in ten minutes." }, { status: 429 });
  }

  try {
    const report = await analyzeLiveVideo(id);
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof YoutubeError ? error.status : 500;
    const message = error instanceof YoutubeError ? error.message : "An unexpected server error occurred.";
    return NextResponse.json({ error: message }, { status });
  }
}
