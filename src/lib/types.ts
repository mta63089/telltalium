export type MetricKey = "likeRate" | "commentRate" | "commentsPerLike";
export type FindingLevel = "elevated" | "watch" | "normal" | "insufficient";
export type CommentSignal =
  | "repeated-text"
  | "generic-language"
  | "burst-activity"
  | "new-account"
  | "username-pattern"
  | "external-link"
  | "praise-template"
  | "praise-wave";

export interface VideoRecord {
  id: string;
  title: string;
  publishedAt: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  durationSeconds: number;
  categoryId: string;
  thumbnail: string | null;
}

export interface ChannelRecord {
  id: string;
  title: string;
  avatar: string | null;
  subscribers: number | null;
}

export interface MetricComparison {
  key: MetricKey;
  label: string;
  current: number | null;
  median: number | null;
  deviation: number | null;
  robustZ: number | null;
  sampleSize: number;
  finding: FindingLevel;
}

export interface CommentRecord {
  id: string;
  author: string;
  authorChannelId: string | null;
  authorAvatar: string | null;
  accountCreatedAt: string | null;
  text: string;
  publishedAt: string;
  likes: number;
}

export interface ScoredComment extends CommentRecord {
  signals: CommentSignal[];
  points: number;
  flagged: boolean;
  clusterId: number | null;
}

export interface CommentCluster {
  id: number;
  size: number;
  example: string;
  authorCount: number;
}

export interface CommentAudit {
  sampled: number;
  totalReported: number | null;
  samplingMethod: "latest-top-level";
  flaggedCount: number;
  repeatedCount: number;
  genericCount: number;
  burstCount: number;
  newAccountCount: number;
  praiseCount: number;
  praiseWaveCount: number;
  metadataAvailableCount: number;
  clusterCount: number;
  clusters: CommentCluster[];
  comments: ScoredComment[];
  hourlyActivity: Array<{ label: string; count: number }>;
  unavailableReason: string | null;
}

export interface Finding {
  id: string;
  title: string;
  detail: string;
  level: FindingLevel;
  category: "engagement" | "comments" | "coverage";
}

export interface VeyraScoreComponent {
  key: "engagement" | "comments" | "coordination";
  label: string;
  weight: number;
  score: number | null;
  detail: string;
}

export interface VeyraScore {
  value: number | null;
  label: string;
  coverage: number;
  confidence: "low" | "moderate";
  components: VeyraScoreComponent[];
  explanation: string;
}

export interface AnalysisReport {
  id: string;
  mode: "demo" | "live";
  analyzedAt: string;
  channel: ChannelRecord;
  video: VideoRecord;
  history: VideoRecord[];
  comparisons: Record<MetricKey, MetricComparison>;
  audit: CommentAudit;
  findings: Finding[];
  veyraScore: VeyraScore;
  historicalCaveat: string;
  cohortDescription: string;
}
