import Link from "next/link";
import { prisma } from "@/lib/db";
import PlayerSearch from "@/components/player-search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PlayersPage() {
  const pointsLeaders = await prisma.playerGameLog.groupBy({
    by: ["playerId"],
    _sum: { points: true, goals: true, assists: true },
    _count: { _all: true },
    orderBy: { _sum: { points: "desc" } },
    take: 120,
  });

  const playerIds = pointsLeaders.map((entry) => entry.playerId);
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: {
      id: true,
      fullName: true,
      position: true,
      teamId: true,
      headshotUrl: true,
    },
  });

  const statsMap = new Map(
    pointsLeaders.map((entry) => [
      entry.playerId,
      {
        points: entry._sum.points ?? 0,
        goals: entry._sum.goals ?? 0,
        assists: entry._sum.assists ?? 0,
        gp: entry._count._all,
      },
    ])
  );

  const sortedPlayers = players
    .map((player) => ({
      ...player,
      ...(statsMap.get(player.id) ?? { points: 0, goals: 0, assists: 0, gp: 0 }),
    }))
    .sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName));

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 md:px-14">
      <div className="flex items-center justify-between page-section">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Players
          </p>
          <h1 className="text-4xl font-semibold text-white">Points Leaders</h1>
        </div>
        <span className="stat-chip px-4 py-2 text-xs text-slate-200">
          Top {sortedPlayers.length}
        </span>
      </div>

      <div className="relative z-30 mt-6 page-section stagger-1">
        <PlayerSearch />
      </div>

      <div className="relative z-10 mt-8 space-y-2 page-section stagger-1">
        {sortedPlayers.map((player, index) => (
          <Link
            key={player.id}
            href={`/players/${player.id}`}
            className="glass group flex items-center gap-4 rounded-2xl p-3 transition hover:-translate-y-0.5 hover:border-white/15"
          >
            <span className="w-8 text-center text-xs text-slate-500">
              {index + 1}
            </span>
            <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5 shrink-0">
              {player.headshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.headshotUrl}
                  alt={player.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                  {player.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate group-hover:text-cyan-200">
                {player.fullName}
              </p>
              <p className="text-[10px] text-slate-500">
                {player.teamId} · {player.position} · {player.gp} GP
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] text-slate-500">G</p>
                <p className="text-xs font-semibold text-white">{player.goals}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">A</p>
                <p className="text-xs font-semibold text-white">{player.assists}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">PTS</p>
                <p className="text-xs font-semibold text-white">{player.points}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
