import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PlayersPage() {
  const pointsLeaders = await prisma.playerGameLog.groupBy({
    by: ["playerId"],
    _sum: { points: true },
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

  const pointsMap = new Map(
    pointsLeaders.map((entry) => [entry.playerId, entry._sum.points ?? 0])
  );

  const sortedPlayers = players
    .map((player) => ({
      ...player,
      seasonPoints: pointsMap.get(player.id) ?? 0,
    }))
    .sort((a, b) => {
      if (a.seasonPoints !== b.seasonPoints) {
        return b.seasonPoints - a.seasonPoints;
      }
      return a.fullName.localeCompare(b.fullName);
    });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 md:px-14">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Players
          </p>
          <h1 className="text-4xl font-semibold text-white">Projected Scorers</h1>
        </div>
        <span className="stat-chip px-4 py-2 text-xs text-slate-200">
          Top 120 rostered
        </span>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedPlayers.map((player) => (
          <Link
            key={player.id}
            href={`/players/${player.id}`}
            className="glass group flex items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-1"
          >
            <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {player.headshotUrl ? (
                <Image
                  src={player.headshotUrl}
                  alt={player.fullName}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                  {player.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white group-hover:text-cyan-200">
                {player.fullName}
              </p>
              <p className="text-xs text-slate-400">
                {player.teamId} · {player.position}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Season PTS</p>
              <p className="text-sm font-semibold text-white">
                {player.seasonPoints}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
