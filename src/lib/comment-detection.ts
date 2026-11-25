import type {
  CommentAudit,
  CommentRecord,
  CommentSignal,
  ScoredComment,
} from "./types";

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " [link] ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((word) => word.length > 2),
  );
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const word of a) if (b.has(word)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

/**
 * Broad, language-dependent *review heuristic*: generic, strongly positive copy.
 * This does NOT claim AI authorship; it is intentionally a weak signal alone.
 */
function genericLanguage(value: string): boolean {
  const text = normalizeText(value);
  const words = text.split(" ").filter(Boolean);
  if (words.length < 1 || words.length > 48 || text.length > 270) return false;
  if (/\?|\b\d{1,2}:\d{2}\b|\b\d{3,}\b/.test(value)) return false;
  if (
    /\b(disagree|however|although|except|but|critique|wrong|misleading|source|citation|evidence|timestamp|study|graph|chart|statistics|interview|minute|scene|chapter)\b/i.test(
      text,
    )
  )
    return false;
  const praise =
    /\b(amazing|awesome|good|nice|cool|excellent|incredible|fantastic|insightful|inspiring|inspirational|thought provoking|powerful|brilliant|perfect|beautiful|outstanding|wonderful|informative|impressive|great|valuable|legendary|masterpiece|remarkable|important|best|love|loved|adore|appreciate|appreciated|well said|spot on|keep it up|keep going|thank you|thanks)\b/i.test(
      text,
    );
  const genericTarget =
    /\b(video|content|creator|channel|insight|insights|perspective|message|take|analysis|breakdown|work|job|upload|topic|issue|viewers|people|everyone|you|your|this|that|always|sharing|more|watching|quality)\b/i.test(
      text,
    );
  return (
    (praise && (genericTarget || words.length <= 5)) ||
    /^(so true|well said|keep speaking the truth|this deserves more views|who is watching in \d{4})$/.test(
      text,
    )
  );
}

function usernamePattern(value: string): boolean {
  const name = value.replace(/^@/, "").toLowerCase().trim();
  return (
    /^user[-_]?\d{6,}$/.test(name) ||
    /^(?:[a-z]{2,10}[-_])?\d{8,}$/.test(name) ||
    /^[a-z]{3,}[-_]\d{8,}$/.test(name)
  );
}

function isRecentAccount(comment: CommentRecord): boolean {
  if (!comment.accountCreatedAt) return false;
  const age =
    new Date(comment.publishedAt).getTime() -
    new Date(comment.accountCreatedAt).getTime();
  return age >= 0 && age < 30 * 86_400_000;
}

function makeActivity(
  comments: CommentRecord[],
): Array<{ label: string; count: number }> {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (6 - i),
      ),
    );
    return {
      key: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      count: 0,
    };
  });
  const indexed = new Map(days.map((day) => [day.key, day]));
  for (const comment of comments) {
    const day = indexed.get(comment.publishedAt.slice(0, 10));
    if (day) day.count++;
  }
  return days.map(({ label, count }) => ({ label, count }));
}

export function analyzeComments(
  comments: CommentRecord[],
  totalReported: number | null,
  unavailableReason: string | null = null,
): CommentAudit {
  const list = comments.slice(0, 250);
  const n = list.length;
  const normalized = list.map((item) => normalizeText(item.text));
  const generic = list.map((item) => genericLanguage(item.text));
  const wordSets = list.map((item) => tokens(item.text));
  const parent = Array.from({ length: n }, (_, index) => index);

  function root(index: number): number {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  }

  function join(a: number, b: number) {
    const ra = root(a);
    const rb = root(b);
    if (ra !== rb) parent[rb] = ra;
  }

  // Restrict fuzzy clustering to longer text to avoid conflating short, normal reactions.
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!normalized[i] || !normalized[j]) continue;
      if (normalized[i] === normalized[j]) {
        join(i, j);
      } else if (
        normalized[i].length >= 35 &&
        normalized[j].length >= 35 &&
        wordSets[i].size >= 5 &&
        wordSets[j].size >= 5 &&
        similarity(wordSets[i], wordSets[j]) >= 0.86
      ) {
        join(i, j);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const key = root(i);
    groups.set(key, [...(groups.get(key) ?? []), i]);
  }

  const eligibleGroups = [...groups.values()]
    .filter((members) => members.length >= 3)
    .sort((a, b) => b.length - a.length);
  const clusterByIndex = new Map<number, number>();
  const clusters = eligibleGroups.map((members, clusterIndex) => {
    const id = clusterIndex + 1;
    for (const index of members) clusterByIndex.set(index, id);
    return {
      id,
      size: members.length,
      example: list[members[0]].text,
      authorCount: new Set(
        members.map(
          (index) => list[index].authorChannelId ?? list[index].author,
        ),
      ).size,
    };
  });

  // A praise wave describes saturation in a SAMPLE, not AI authorship.
  // Require volume and distinct authors; the resulting flag means review, not bot.
  const praiseIndexes = list.flatMap((comment, index) =>
    generic[index] ? [index] : [],
  );
  const praiseAuthors = new Set(
    praiseIndexes.map(
      (index) => list[index].authorChannelId ?? list[index].author,
    ),
  );
  const broadPraiseWave =
    praiseIndexes.length >= 12 &&
    praiseIndexes.length / Math.max(1, n) >= 0.25 &&
    praiseAuthors.size >= 10;
  const praiseWave = new Set<number>(broadPraiseWave ? praiseIndexes : []);

  // A burst alone is not a bot signal. It counts only when the window is also
  // dominated by repeated or generic text (at least 40%).
  const suspiciousWindow = new Set<number>();
  const ordered = list
    .map((comment, index) => ({
      index,
      at: new Date(comment.publishedAt).getTime(),
    }))
    .filter((item) => Number.isFinite(item.at))
    .sort((a, b) => a.at - b.at);
  let left = 0;
  for (let right = 0; right < ordered.length; right++) {
    while (ordered[right].at - ordered[left].at > 5 * 60_000) left++;
    const window = ordered.slice(left, right + 1);
    if (window.length < 10) continue;
    const unusual = window.filter(
      ({ index }) => clusterByIndex.has(index) || generic[index],
    ).length;
    if (unusual / window.length >= 0.4) {
      for (const { index } of window) {
        if (clusterByIndex.has(index) || generic[index])
          suspiciousWindow.add(index);
      }
      const praiseInWindow = window.filter(({ index }) => generic[index]);
      const distinct = new Set(
        praiseInWindow.map(
          ({ index }) => list[index].authorChannelId ?? list[index].author,
        ),
      );
      if (
        praiseInWindow.length >= 8 &&
        distinct.size >= 8 &&
        praiseInWindow.length / window.length >= 0.6
      ) {
        for (const { index } of praiseInWindow) praiseWave.add(index);
      }
    }
  }

  const scored: ScoredComment[] = list.map((comment, index) => {
    const signals: CommentSignal[] = [];
    if (clusterByIndex.has(index)) signals.push("repeated-text");
    if (generic[index]) {
      signals.push("generic-language");
      // Praising the creator is not evidence of a bot; only coordinated-looking
      // concentrations create a second signal for manual review.
      if (praiseWave.has(index)) signals.push("praise-wave");
      else if (normalized[index].length >= 75) signals.push("praise-template");
    }
    if (suspiciousWindow.has(index)) signals.push("burst-activity");
    if (isRecentAccount(comment)) signals.push("new-account");
    if (usernamePattern(comment.author)) signals.push("username-pattern");
    if (/https?:\/\/\S+|\b(?:t\.me|wa\.me)\/\S+/i.test(comment.text))
      signals.push("external-link");

    const weights: Record<CommentSignal, number> = {
      "repeated-text": 3,
      "generic-language": 1,
      "burst-activity": 1,
      "new-account": 1,
      "username-pattern": 1,
      "external-link": 2,
      "praise-template": 0,
      "praise-wave": 2,
    };
    const points = signals.reduce((sum, signal) => sum + weights[signal], 0);
    return {
      ...comment,
      signals,
      points,
      flagged: points >= 3,
      clusterId: clusterByIndex.get(index) ?? null,
    };
  });

  return {
    sampled: n,
    totalReported,
    samplingMethod: "latest-top-level",
    flaggedCount: scored.filter((comment) => comment.flagged).length,
    repeatedCount: scored.filter((comment) =>
      comment.signals.includes("repeated-text"),
    ).length,
    genericCount: scored.filter((comment) =>
      comment.signals.includes("generic-language"),
    ).length,
    burstCount: scored.filter((comment) =>
      comment.signals.includes("burst-activity"),
    ).length,
    newAccountCount: scored.filter((comment) =>
      comment.signals.includes("new-account"),
    ).length,
    praiseCount: scored.filter((comment) =>
      comment.signals.includes("generic-language"),
    ).length,
    praiseWaveCount: scored.filter((comment) =>
      comment.signals.includes("praise-wave"),
    ).length,
    metadataAvailableCount: scored.filter(
      (comment) => comment.accountCreatedAt !== null,
    ).length,
    clusterCount: clusters.length,
    clusters,
    comments: scored,
    hourlyActivity: makeActivity(list),
    unavailableReason,
  };
}
