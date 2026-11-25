import { createReport } from "./analysis";
import type {
  AnalysisReport,
  ChannelRecord,
  CommentRecord,
  VideoRecord,
} from "./types";

const BASE_URL = "https://www.googleapis.com/youtube/v3";
const USER_AGENT = "Telltalium/0.2 (YouTube engagement research MVP)";

interface YouTubeVideo {
  id: string;
  snippet: {
    title: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    categoryId?: string;
    liveBroadcastContent?: string;
    thumbnails?: { high?: { url: string }; medium?: { url: string } };
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: { duration?: string };
}

interface YouTubeChannel {
  id: string;
  snippet?: {
    title?: string;
    publishedAt?: string;
    thumbnails?: { default?: { url: string }; medium?: { url: string } };
  };
  statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
}

interface Thread {
  id: string;
  snippet?: {
    topLevelComment?: {
      id: string;
      snippet?: {
        textOriginal?: string;
        textDisplay?: string;
        authorDisplayName?: string;
        authorChannelId?: { value?: string };
        authorProfileImageUrl?: string;
        publishedAt?: string;
        likeCount?: number;
      };
    };
  };
}

interface ApiResponse<T> {
  items?: T[];
  nextPageToken?: string;
}

export class YoutubeError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
  ) {
    super(message);
    this.name = "YoutubeError";
  }
}

async function youtube<T>(
  endpoint: string,
  parameters: Record<string, string>,
): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key)
    throw new YoutubeError(
      "Set YOUTUBE_API_KEY in .env.local to analyze live videos. Demo mode works without a key.",
      503,
    );

  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(parameters).forEach(([name, value]) =>
    url.searchParams.set(name, value),
  );
  url.searchParams.set("key", key);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new YoutubeError(
      "Could not reach YouTube. Check your network and retry.",
    );
  }

  if (!response.ok) {
    if (response.status === 403) {
      throw new YoutubeError(
        "YouTube rejected the request. Check API access, key restrictions, and remaining quota.",
        502,
      );
    }
    if (response.status === 400)
      throw new YoutubeError("YouTube rejected the video request.", 400);
    throw new YoutubeError(`YouTube returned HTTP ${response.status}.`, 502);
  }
  return response.json() as Promise<T>;
}

export { parseVideoId } from "./video-url";

function number(value?: string): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDuration(value = "PT0S"): number {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    value,
  );
  if (!match) return 0;
  return (
    Number(match[1] ?? 0) * 86400 +
    Number(match[2] ?? 0) * 3600 +
    Number(match[3] ?? 0) * 60 +
    Number(match[4] ?? 0)
  );
}

function normalizeVideo(video: YouTubeVideo): VideoRecord {
  return {
    id: video.id,
    title: video.snippet.title,
    publishedAt: video.snippet.publishedAt,
    views: number(video.statistics?.viewCount),
    likes: number(video.statistics?.likeCount),
    comments: number(video.statistics?.commentCount),
    durationSeconds: parseDuration(video.contentDetails?.duration),
    categoryId: video.snippet.categoryId ?? "",
    thumbnail:
      video.snippet.thumbnails?.high?.url ??
      video.snippet.thumbnails?.medium?.url ??
      null,
  };
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

async function getUploadIds(uploadPlaylist: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 2; page++) {
    const result: ApiResponse<{ contentDetails?: { videoId?: string } }> =
      await youtube("playlistItems", {
        part: "contentDetails",
        playlistId: uploadPlaylist,
        maxResults: "50",
        ...(pageToken ? { pageToken } : {}),
      });
    ids.push(
      ...(result.items ?? []).flatMap((item) =>
        item.contentDetails?.videoId ? [item.contentDetails.videoId] : [],
      ),
    );
    pageToken = result.nextPageToken;
    if (!pageToken) break;
  }
  return [...new Set(ids)];
}

async function getVideos(ids: string[]): Promise<YouTubeVideo[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
  const results = await Promise.all(
    chunks.map((chunk) =>
      youtube<ApiResponse<YouTubeVideo>>("videos", {
        part: "snippet,statistics,contentDetails",
        id: chunk.join(","),
        maxResults: "50",
      }),
    ),
  );
  return results.flatMap((result) => result.items ?? []);
}

async function getComments(
  videoId: string,
): Promise<{ items: CommentRecord[]; unavailableReason: string | null }> {
  const items: CommentRecord[] = [];
  let pageToken: string | undefined;
  try {
    for (let page = 0; page < 2; page++) {
      const response: ApiResponse<Thread> = await youtube("commentThreads", {
        part: "snippet",
        videoId,
        maxResults: "100",
        order: "time",
        textFormat: "plainText",
        ...(pageToken ? { pageToken } : {}),
      });
      for (const thread of response.items ?? []) {
        const comment = thread.snippet?.topLevelComment;
        const snippet = comment?.snippet;
        if (!comment || !snippet?.publishedAt) continue;
        items.push({
          id: comment.id,
          author: snippet.authorDisplayName ?? "Unknown author",
          authorChannelId: snippet.authorChannelId?.value ?? null,
          authorAvatar: snippet.authorProfileImageUrl ?? null,
          accountCreatedAt: null,
          text: snippet.textOriginal ?? snippet.textDisplay ?? "",
          publishedAt: snippet.publishedAt,
          likes: snippet.likeCount ?? 0,
        });
      }
      pageToken = response.nextPageToken;
      if (!pageToken) break;
    }
  } catch (error) {
    // Comments may be turned off, or access may be restricted; still return the video analysis.
    return {
      items: [],
      unavailableReason:
        error instanceof YoutubeError
          ? `Comments not available: ${error.message}`
          : "Comments are unavailable for this video.",
    };
  }

  const authors = [
    ...new Set(
      items.flatMap((comment) =>
        comment.authorChannelId ? [comment.authorChannelId] : [],
      ),
    ),
  ];
  const dates = new Map<string, string>();
  // Channel metadata is best-effort; unavailable data is never interpreted as a signal.
  for (let i = 0; i < authors.length; i += 50) {
    try {
      const response = await youtube<ApiResponse<YouTubeChannel>>("channels", {
        part: "snippet",
        id: authors.slice(i, i + 50).join(","),
        maxResults: "50",
      });
      for (const channel of response.items ?? []) {
        if (channel.snippet?.publishedAt)
          dates.set(channel.id, channel.snippet.publishedAt);
      }
    } catch {
      break;
    }
  }
  for (const comment of items) {
    if (comment.authorChannelId)
      comment.accountCreatedAt = dates.get(comment.authorChannelId) ?? null;
  }
  return { items, unavailableReason: null };
}

export async function analyzeLiveVideo(
  videoId: string,
): Promise<AnalysisReport> {
  const selected = await getVideos([videoId]);
  const video = selected[0];
  if (!video)
    throw new YoutubeError(
      "This video was not found or is not publicly available.",
      404,
    );
  const channelResult = await youtube<ApiResponse<YouTubeChannel>>("channels", {
    part: "snippet,statistics,contentDetails",
    id: video.snippet.channelId,
  });
  const channelInfo = channelResult.items?.[0];
  if (!channelInfo)
    throw new YoutubeError("The video's channel is unavailable.", 404);
  const uploads = channelInfo.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads)
    throw new YoutubeError(
      "Could not find this channel's public uploads playlist.",
      502,
    );

  // Independent collection so comment access problems do not stop engagement comparisons.
  const [recentVideos, commentData] = await Promise.all([
    getUploadIds(uploads).then(getVideos),
    getComments(videoId),
  ]);
  const current = normalizeVideo(video);
  const sameDurationBand = (v: VideoRecord) =>
    v.durationSeconds <= 180 === current.durationSeconds <= 180;
  const candidates = recentVideos
    .map(normalizeVideo)
    .filter(
      (item) =>
        item.id !== current.id &&
        daysSince(item.publishedAt) >= 7 &&
        item.views !== null &&
        item.durationSeconds > 0 &&
        sameDurationBand(item),
    );
  const sameCategory = candidates.filter(
    (item) => item.categoryId === current.categoryId,
  );
  const history = (sameCategory.length >= 5 ? sameCategory : candidates).slice(
    0,
    50,
  );
  const channel: ChannelRecord = {
    id: video.snippet.channelId,
    title: channelInfo.snippet?.title ?? video.snippet.channelTitle,
    avatar:
      channelInfo.snippet?.thumbnails?.medium?.url ??
      channelInfo.snippet?.thumbnails?.default?.url ??
      null,
    subscribers: channelInfo.statistics?.hiddenSubscriberCount
      ? null
      : number(channelInfo.statistics?.subscriberCount),
  };

  return createReport({
    mode: "live",
    channel,
    video: current,
    history,
    comments: commentData.items,
    commentsUnavailableReason: commentData.unavailableReason,
    cohortDescription:
      sameCategory.length >= 5
        ? "Up to 50 recent public uploads with the same YouTube category and approximate duration format; at least 7 days old."
        : "Up to 50 recent public uploads with similar duration format; category requirement relaxed due to limited data. At least 7 days old.",
  });
}
