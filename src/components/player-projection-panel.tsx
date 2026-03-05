"use client";

import { useEffect, useMemo, useState } from "react";

type PlayerOption = {
  id: number;
  fullName: string;
  teamId: string;
  headshotUrl: string | null;
  position: string;
};

type PlayerProjection = {
  playerId: number;
  expectedPoints: number;
  confidence: number;
  opponent: string;
  gameDate: string;
  home: boolean;
  team: string;
  headshotUrl: string | null;
};

export default function PlayerProjectionPanel() {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [selected, setSelected] = useState<PlayerOption | null>(null);
  const [projection, setProjection] = useState<PlayerProjection | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.trim().length < 2) {
        setPlayers([]);
        return;
      }

      const response = await fetch(`/api/players?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setPlayers(data.players ?? []);
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    if (!selected) return;

    const loadProjection = async () => {
      setLoading(true);
      const response = await fetch(
        `/api/player-projection?playerId=${selected.id}`
      );
      const data = await response.json();
      setProjection(data.projection ?? null);
      setLoading(false);
    };

    loadProjection();
  }, [selected]);

  const placeholder = useMemo(() => {
    if (selected) return selected.fullName;
    return "Search a player";
  }, [selected]);

  return (
    <div className="glass rounded-3xl p-6 md:p-8 card-grid">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
              Player Projection
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold">
              Expected Points Engine
            </h2>
          </div>
          <span className="stat-chip px-3 py-1 text-xs text-slate-200">
            LEBRON-style blend
          </span>
        </div>

        <div className="relative">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(null);
            }}
            placeholder={placeholder}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
          />
          {players.length > 0 && !selected && (
            <div className="absolute z-10 mt-2 w-full rounded-2xl border border-white/10 bg-[#0c1422]/95 p-2 shadow-xl">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    setSelected(player);
                    setQuery("");
                    setPlayers([]);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                >
                  <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    {player.headshotUrl ? (
                      <img
                        src={player.headshotUrl}
                        alt={player.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        {player.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{player.fullName}</p>
                    <p className="text-xs text-slate-400">
                      {player.teamId} · {player.position}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          {loading && (
            <p className="text-sm text-slate-300">Calculating projection...</p>
          )}

          {!loading && projection && (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {projection.headshotUrl ? (
                    <img
                      src={projection.headshotUrl}
                      alt="player"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                      {projection.team}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                    Next Matchup
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {projection.team} {projection.home ? "vs" : "@"} {projection.opponent}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(projection.gameDate).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                  Expected Points
                </p>
                <p className="text-4xl font-semibold text-white">
                  {projection.expectedPoints.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">
                  Confidence {(projection.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          )}

          {!loading && !projection && (
            <p className="text-sm text-slate-300">
              Search for a player to generate projections for their next game.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
