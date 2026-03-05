"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PlayerOption = {
  id: number;
  fullName: string;
  teamId: string;
  headshotUrl: string | null;
  position: string;
};

export default function PlayerSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.trim().length < 2) {
        setPlayers([]);
        setOpen(false);
        return;
      }

      const response = await fetch(
        `/api/players?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      const results = data.players ?? [];
      setPlayers(results);
      setOpen(results.length > 0);
      setActiveIndex(-1);
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectPlayer(player: PlayerOption) {
    setQuery("");
    setPlayers([]);
    setOpen(false);
    router.push(`/players/${player.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || players.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < players.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : players.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectPlayer(players[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative z-20 w-full max-w-md">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) setOpen(false);
          }}
          onFocus={() => {
            if (players.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search players..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
        />
      </div>

      {open && players.length > 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-white/10 bg-[#0c1422]/95 p-2 shadow-xl backdrop-blur-sm">
          {players.map((player, i) => (
            <button
              key={player.id}
              onClick={() => selectPlayer(player)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                i === activeIndex
                  ? "bg-white/10 text-white"
                  : "text-slate-200 hover:bg-white/5"
              }`}
            >
              <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-white/5 shrink-0">
                {player.headshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
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
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {player.fullName}
                </p>
                <p className="text-xs text-slate-400">
                  {player.teamId} · {player.position}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
