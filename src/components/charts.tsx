"use client";

import { ratio } from "@/lib/analysis";
import { compactNumber, percentage } from "@/lib/format";
import type { MetricKey, VideoRecord } from "@/lib/types";
import { useMemo } from "react";

function metricValue(video: VideoRecord, metric: MetricKey): number | null {
  switch (metric) {
    case "likeRate":
      return ratio(video.likes, video.views);
    case "commentRate":
      return ratio(video.comments, video.views);
    case "commentsPerLike":
      return ratio(video.comments, video.likes);
  }
}

export function TimelineChart({
  history,
  current,
  metric,
}: {
  history: VideoRecord[];
  current: VideoRecord;
  metric: MetricKey;
}) {
  const data = useMemo(() => {
    return [...history, current]
      .map((item) => ({ ...item, value: metricValue(item, metric) }))
      .filter(
        (item): item is typeof item & { value: number } => item.value !== null,
      )
      .sort(
        (a, b) =>
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
      );
  }, [history, current, metric]);

  if (data.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-[#8993ac]">
        Not enough public metrics to draw a trend.
      </div>
    );
  }

  const width = 860;
  const height = 248;
  const left = 49;
  const right = 20;
  const top = 18;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = Math.max(...data.map((item) => item.value), 0.1) * 1.18;
  const x = (index: number) =>
    left + (index / Math.max(1, data.length - 1)) * plotWidth;
  const y = (value: number) => top + plotHeight - (value / max) * plotHeight;
  const coords = data.map((item, index) => ({
    x: x(index),
    y: y(item.value),
    ...item,
  }));
  const line = coords
    .map(
      (item, index) =>
        `${index === 0 ? "M" : "L"}${item.x.toFixed(2)},${item.y.toFixed(2)}`,
    )
    .join(" ");
  const area = `${line} L${x(data.length - 1)},${top + plotHeight} L${x(0)},${top + plotHeight} Z`;
  const selected = coords.find((item) => item.id === current.id);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Historical engagement ratio chart; coral marker shows selected video"
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#d6ff52" stopOpacity="0.19" />
            <stop offset="100%" stopColor="#d6ff52" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 5 }, (_, index) => {
          const value = (max / 4) * index;
          const ypos = y(value);
          return (
            <g key={index}>
              <line
                x1={left}
                x2={width - right}
                y1={ypos}
                y2={ypos}
                stroke="#394135"
                strokeDasharray="4 7"
              />
              <text
                x={left - 11}
                y={ypos + 4}
                textAnchor="end"
                fontSize="11"
                fill="#8b9581"
              >
                {percentage(value, value < 1 ? 2 : 1)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#chart-fill)" />
        <path
          d={line}
          fill="none"
          stroke="#d6ff52"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((item) => (
          <circle
            key={item.id}
            cx={item.x}
            cy={item.y}
            r="3"
            fill="#d6ff52"
            stroke="#191c17"
            strokeWidth="1.5"
          />
        ))}
        {selected && (
          <g>
            <circle
              cx={selected.x}
              cy={selected.y}
              r="10"
              fill="#a69cff"
              opacity="0.2"
            />
            <circle
              cx={selected.x}
              cy={selected.y}
              r="5.5"
              fill="#a69cff"
              stroke="#191c17"
              strokeWidth="2"
            />
          </g>
        )}
        <text
          x={left}
          y={height - 6}
          textAnchor="start"
          fill="#8b9581"
          fontSize="11"
        >
          Older uploads
        </text>
        <text
          x={width - right}
          y={height - 6}
          textAnchor="end"
          fill="#8b9581"
          fontSize="11"
        >
          Newer uploads
        </text>
      </svg>
      <div className="mt-1 flex items-center justify-end gap-5 text-xs text-[#b5beaf]">
        <span className="flex items-center gap-2">
          <i className="h-2 w-2 rounded-full bg-[#d6ff52]" />
          Comparison uploads
        </span>
        <span className="flex items-center gap-2">
          <i className="h-2 w-2 rounded-full bg-[#a69cff]" />
          Selected video
        </span>
      </div>
    </div>
  );
}

export function AuditRing({
  flagged,
  sampled,
}: {
  flagged: number;
  sampled: number;
}) {
  const amount = sampled ? (flagged / sampled) * 100 : 0;
  const circumference = 2 * Math.PI * 55;
  const dash = (amount / 100) * circumference;
  return (
    <div className="relative mx-auto h-44 w-44">
      <svg
        viewBox="0 0 150 150"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`${flagged} of ${sampled} sampled comments flagged for review`}
      >
        <circle
          cx="75"
          cy="75"
          r="55"
          fill="none"
          stroke="#394135"
          strokeWidth="13"
        />
        <circle
          cx="75"
          cy="75"
          r="55"
          fill="none"
          stroke="#d6ff52"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold tracking-tight text-white">
          {amount.toFixed(1)}%
        </div>
        <div className="text-xs text-[#8c9884]">flagged for review</div>
      </div>
    </div>
  );
}

export function ActivityBars({
  activity,
}: {
  activity: Array<{ label: string; count: number }>;
}) {
  const max = Math.max(1, ...activity.map((item) => item.count));
  return (
    <div className="flex h-40 items-end gap-3 pt-3">
      {activity.map((item) => (
        <div
          key={item.label}
          className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2"
        >
          <div className="flex flex-1 items-end justify-center">
            <div
              className="group relative w-full max-w-11 rounded-t-md bg-gradient-to-t from-[#6e7b3f] to-[#d6ff52] transition-opacity hover:opacity-80"
              style={{ height: `${Math.max(3, (item.count / max) * 100)}%` }}
              title={`${item.label}: ${item.count} sampled comments`}
            >
              {item.count > 0 && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-[#e8efe1]">
                  {compactNumber(item.count)}
                </div>
              )}
            </div>
          </div>
          <div className="text-center text-[10px] text-[#8c9884]">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
