"use client";

import { useMemo, useState } from "react";

type ConfidenceEntry = {
  playerId: number;
  fullName: string;
  teamId: string;
  position: string;
  headshotUrl: string | null;
  expectedPoints: number;
  confidence: number;
  gameDate: string;
  homeTeamId: string;
  awayTeamId: string;
};

type Props = {
  entries: ConfidenceEntry[];
};

export default function PlayerConfidenceList({ entries }: Props) {
  const [sort, setSort] = useState<"high" | "low">("high");
  const [minConfidence, setMinConfidence] = useState(60);

  const sorted = useMemo(() => {
    const copy = entries.filter(
      (entry) => entry.confidence * 100 >= minConfidence
    );
    copy.sort((a, b) =>
      sort === "high"
        ? b.confidence - a.confidence
        : a.confidence - b.confidence
    );
    return copy;
  }, [entries, sort, minConfidence]);

  return (
    <div className="glass rounded-3xl p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Confidence Board
          </p>
          <h2 className="text-2xl font-semibold text-white">
            Most Reliable Projections
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              Sort
            </label>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as "high" | "low")}
              className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="high">Highest confidence</option>
              <option value="low">Lowest confidence</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              Min {minConfidence}%
            </label>
            <input
              type="range"
              min={40}
              max={90}
              step={1}
              value={minConfidence}
              onChange={(event) => setMinConfidence(Number(event.target.value))}
              className="h-2 w-32 appearance-none rounded-full bg-white/10 accent-cyan-300"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {sorted.map((entry) => (
          <div
            key={`${entry.playerId}-${entry.gameDate}`}
            className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5">
                {entry.headshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.headshotUrl}
                    alt={entry.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    {entry.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {entry.fullName}
                </p>
                <p className="text-[10px] text-slate-500">
                  {entry.teamId} · {entry.position} · {entry.awayTeamId} @ {entry.homeTeamId}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Confidence
              </p>
              <p className="text-lg font-semibold text-white">
                {(entry.confidence * 100).toFixed(0)}%
              </p>
              <p className="text-[10px] text-slate-500">
                {entry.expectedPoints.toFixed(2)} pts
              </p>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs text-slate-400 md:col-span-2">
            No players meet this confidence threshold.
          </div>
        )}
      </div>
    </div>
  );
}
