"use client";

import { useState } from "react";

type MatchupLog = {
  gameId: number;
  label: string;
  points: number;
  goals: number;
  assists: number;
};

type BoxscoreTeam = {
  abbrev: string;
  score: number;
  sog: number;
  hits: number;
  powerPlayConversion?: string;
  faceoffWinningPctg?: number;
};

type Boxscore = {
  gameId: number;
  gameDate: string;
  awayTeam: BoxscoreTeam;
  homeTeam: BoxscoreTeam;
  scoring: Array<{
    periodDescriptor: { number: number; periodType: string };
    goals: Array<{
      teamAbbrev: { default: string };
      name: { default: string };
      headshot?: string;
      strength?: string;
      timeInPeriod: string;
      assists: Array<{ name: { default: string } }>;
    }>;
  }>;
};

type Props = {
  logs: MatchupLog[];
};

export default function PlayerMatchups({ logs }: Props) {
  const [openGameId, setOpenGameId] = useState<number | null>(null);
  const [boxscores, setBoxscores] = useState<Record<number, Boxscore>>({});
  const [loading, setLoading] = useState<number | null>(null);

  const toggle = async (gameId: number) => {
    if (openGameId === gameId) {
      setOpenGameId(null);
      return;
    }

    setOpenGameId(gameId);

    if (boxscores[gameId]) return;

    setLoading(gameId);
    const response = await fetch(`/api/boxscore/${gameId}`);
    const data = await response.json();
    if (response.ok) {
      setBoxscores((prev) => ({ ...prev, [gameId]: data }));
    }
    setLoading(null);
  };

  return (
    <div className="mt-6 glass rounded-3xl p-6">
      <h2 className="text-2xl font-semibold text-white">Last 10 Matchups</h2>
      <div className="mt-4 space-y-3">
        {logs.map((log) => {
          const boxscore = boxscores[log.gameId];
          return (
            <div key={log.gameId} className="rounded-2xl border border-white/10 bg-white/5">
              <button
                onClick={() => toggle(log.gameId)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-xs text-slate-400">{log.label}</span>
                <span className="text-sm text-white">
                  {log.points} pts · {log.goals} G · {log.assists} A
                </span>
              </button>
              {openGameId === log.gameId && (
                <div className="border-t border-white/10 px-4 py-3 text-sm text-slate-300">
                  {loading === log.gameId && (
                    <p className="text-xs text-slate-400">Loading boxscore...</p>
                  )}
                  {boxscore && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-xs text-slate-400">Away</p>
                        <p className="text-sm text-white">
                          {boxscore.awayTeam.abbrev} {boxscore.awayTeam.score}
                        </p>
                        <p>Shots: {boxscore.awayTeam.sog}</p>
                        <p>Hits: {boxscore.awayTeam.hits}</p>
                        <p>
                          PP: {boxscore.awayTeam.powerPlayConversion ?? "--"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-xs text-slate-400">Home</p>
                        <p className="text-sm text-white">
                          {boxscore.homeTeam.abbrev} {boxscore.homeTeam.score}
                        </p>
                        <p>Shots: {boxscore.homeTeam.sog}</p>
                        <p>Hits: {boxscore.homeTeam.hits}</p>
                        <p>
                          PP: {boxscore.homeTeam.powerPlayConversion ?? "--"}
                        </p>
                      </div>
                      <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          Scoring Summary
                        </p>
                        <div className="mt-3 space-y-3">
                          {boxscore.scoring?.length ? (
                            boxscore.scoring.flatMap((period) =>
                              period.goals.map((goal, index) => {
                                const assists = goal.assists
                                  .map((assist) => assist.name.default)
                                  .join(", ");
                                return (
                                  <div
                                    key={`${period.periodDescriptor.periodType}-${period.periodDescriptor.number}-${index}`}
                                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5">
                                          {goal.headshot ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                              src={goal.headshot}
                                              alt={goal.name.default}
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                                              {goal.name.default.slice(0, 2).toUpperCase()}
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                            Goal · {goal.teamAbbrev.default}
                                          </p>
                                          <p className="text-sm font-semibold text-white">
                                            {goal.name.default}
                                          </p>
                                          <p className="text-xs text-slate-400">
                                            {goal.strength ?? "EV"} · P{period.periodDescriptor.number} {goal.timeInPeriod}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                          Assists
                                        </p>
                                        <p className="text-sm text-slate-200">
                                          {assists || "Unassisted"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )
                          ) : (
                            <p className="text-xs text-slate-400">No scoring data.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
