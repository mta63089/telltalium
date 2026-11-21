import { createReport } from "./analysis";
import type { AnalysisReport, CommentRecord, VideoRecord } from "./types";

const ago = (days: number, minutes = 0) =>
  new Date(Date.now() - days * 86_400_000 - minutes * 60_000).toISOString();

const HISTORY_TITLES = [
  "How attention became the new currency",
  "The surprising economics of creator culture",
  "Why every platform wants your attention",
  "Inside the internet's biggest trend cycles",
  "What actually makes a video go viral?",
  "The hidden costs of recommendation systems",
  "How independent creators find an audience",
  "The psychology of the infinite scroll",
  "Are online trends getting shorter?",
  "The business of modern entertainment",
  "Why communities change the algorithm",
  "A closer look at viral storytelling",
];

const AUTHENTIC_TEXTS = [
  "The part about recommendation feedback loops at 8:42 made a lot of sense.",
  "I wonder how much of this changes on smaller channels versus major creators.",
  "The chart about subscriber engagement was actually the most interesting part.",
  "One thing missing here is how live streams affect discovery over time.",
  "I've followed this channel for two years and the editing really has improved.",
  "Could you compare this with TikTok in a follow-up?",
  "That example about niche communities was spot on. I've seen it on my own channel.",
  "Interesting hypothesis, but is there published data to support the conclusion?",
  "The interview clip near the middle helped clarify the argument.",
  "Would be curious to know how viewing from recommendations differs from search.",
  "Great breakdown of the audience retention example around 6 minutes.",
  "The methodology section was useful; nice to see the limitations explained.",
  "I disagree with the conclusion about small channels, but appreciate the research.",
  "Could you share the original study mentioned near the end?",
  "I had no idea such a big percentage of traffic could come from suggested videos.",
  "The first five minutes covered exactly what I was wondering about.",
  "Please do another one on how creator sponsorships change incentives.",
  "Good point about distinguishing correlation from causation.",
  "My recommendation feed shows a very different mix than what you describe.",
  "The editing and motion graphics on this episode are excellent.",
];

const AUTHENTIC_SUFFIXES = [
  "It would be useful to compare with another dataset.",
  "I would also like to see a breakdown for Shorts.",
  "I've noticed something similar in small gaming communities.",
  "The earlier examples are harder to interpret without timestamps.",
  "I'm not sure I draw the same conclusion from those numbers.",
  "A follow-up with a longer time range would help clarify things.",
];

export function getDemoReport(): AnalysisReport {
  const history: VideoRecord[] = Array.from({ length: 36 }, (_, index) => {
    const views = 51_000 + index * 2_800 + (index % 6) * 9_200;
    const likes = Math.round(views * (0.035 + ((index % 5) - 2) * 0.0023));
    const comments = Math.round(views * (0.0032 + ((index % 7) - 3) * 0.00023));
    return {
      id: `demo-history-${index}`,
      title: HISTORY_TITLES[index % HISTORY_TITLES.length],
      publishedAt: ago(35 + index * 11),
      views,
      likes,
      comments,
      durationSeconds: 580 + (index % 9) * 45,
      categoryId: "27",
      thumbnail: null,
    };
  });

  const video: VideoRecord = {
    id: "demo-sample",
    title: "The Viral Video Nobody Can Explain",
    publishedAt: ago(21),
    views: 382_400,
    likes: 4_290,
    comments: 1_380,
    durationSeconds: 1_138,
    categoryId: "27",
    thumbnail: null,
  };

  const comments: CommentRecord[] = Array.from({ length: 110 }, (_, i) => {
    const isRepeated = (i < 25 && i % 2 === 0) || i % 8 === 0 || (i >= 65 && i < 80);
    const isTemplate = i % 9 === 0;
    const isLink = i % 23 === 0;
    const text = isRepeated
      ? (i % 2 === 0
        ? "This is the best video ever, everyone needs to watch this amazing content!"
        : "This is the best video ever! Everyone needs to watch this amazing content.")
      : isLink
        ? "See more details here https://example.org/discussion"
        : isTemplate
          ? "Amazing video!"
          : `${AUTHENTIC_TEXTS[i % AUTHENTIC_TEXTS.length]} ${AUTHENTIC_SUFFIXES[Math.floor(i / AUTHENTIC_TEXTS.length) % AUTHENTIC_SUFFIXES.length]}`;
    const suspicious = isRepeated || isTemplate;
    return {
      id: `demo-comment-${i}`,
      author: suspicious && i % 3 === 0 ? `user_${10000000 + i * 17}` : `Viewer ${i + 1}`,
      authorChannelId: `demo-author-${i}`,
      authorAvatar: null,
      accountCreatedAt: suspicious && i % 3 === 0 ? ago(18) : ago(500 + i * 6),
      text,
      publishedAt: i < 42 ? ago(0, i * 0.4) : ago((i % 6) + 1, (i * 13) % 120),
      likes: (i * 3) % 31,
    };
  });

  return createReport({
    mode: "demo",
    channel: {
      id: "demo-channel",
      title: "Signal Room",
      avatar: null,
      subscribers: 147_000,
    },
    video,
    history,
    comments,
    cohortDescription: "36 fictional long-form uploads in the same category, produced for demonstrating the interface.",
  });
}
