import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type RookieRow = {
  playerId: number;
  fullName: string;
  teamId: string;
  position: string;
  headshotUrl: string | null;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  projGoals: number;
  projAssists: number;
  projPoints: number;
};

function round(value: number) {
  return Math.round(value * 10) / 10;
}

export default async function RookiesPage() {
  const latestSnapshot = await prisma.standingsSnapshot.findFirst({
    orderBy: { snapshotDate: "desc" },
  });

  const standings = latestSnapshot
    ? await prisma.standingsSnapshot.findMany({
        where: { snapshotDate: latestSnapshot.snapshotDate },
        select: { teamId: true, gamesPlayed: true },
      })
    : [];

  const gamesPlayedMap = new Map(
    standings.map((entry) => [entry.teamId, entry.gamesPlayed])
  );

  const totals = await prisma.playerGameLog.groupBy({
    by: ["playerId"],
    _sum: { goals: true, assists: true, points: true },
    _count: { _all: true },
  });

  const playerIds = totals.map((total) => total.playerId);
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds }, rookieEligible: true },
    select: {
      id: true,
      fullName: true,
      teamId: true,
      position: true,
      headshotUrl: true,
      rookieEligible: true,
    },
  });

  const playerMap = new Map(players.map((player) => [player.id, player]));

  const rookies: RookieRow[] = totals
    .map((total) => {
      const player = playerMap.get(total.playerId);
      if (!player) return null;
      const gamesPlayed = total._count._all || 0;
      const teamGames = gamesPlayedMap.get(player.teamId) ?? gamesPlayed;
      const remaining = Math.max(0, 82 - teamGames);
      const goals = total._sum.goals ?? 0;
      const assists = total._sum.assists ?? 0;
      const points = total._sum.points ?? 0;
      const gpg = gamesPlayed ? goals / gamesPlayed : 0;
      const apg = gamesPlayed ? assists / gamesPlayed : 0;
      const ppg = gamesPlayed ? points / gamesPlayed : 0;

      return {
        playerId: player.id,
        fullName: player.fullName,
        teamId: player.teamId,
        position: player.position,
        headshotUrl: player.headshotUrl,
        gamesPlayed,
        goals,
        assists,
        points,
        projGoals: round(goals + gpg * remaining),
        projAssists: round(assists + apg * remaining),
        projPoints: round(points + ppg * remaining),
      };
    })
    .filter((row): row is RookieRow => row !== null)
    .sort((a, b) => b.projPoints - a.projPoints)
    .slice(0, 50);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 md:px-14">
      <div className="flex items-center justify-between page-section">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Rookie Tracker
          </p>
          <h1 className="text-4xl font-semibold text-white">
            Projected Rookie Totals
          </h1>
        </div>
        <span className="stat-chip px-4 py-2 text-xs text-slate-200">
          Career GP eligibility
        </span>
      </div>

      <div className="mt-8 space-y-2 page-section stagger-1">
        {rookies.map((row, index) => (
          <Link
            key={row.playerId}
            href={`/players/${row.playerId}`}
            className="glass flex items-center gap-4 rounded-2xl p-3 transition hover:-translate-y-0.5 hover:border-white/15"
          >
            <span className="w-8 text-center text-xs text-slate-500">
              {index + 1}
            </span>
            <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5 shrink-0">
              {row.headshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.headshotUrl}
                  alt={row.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                  {row.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {row.fullName}
              </p>
              <p className="text-[10px] text-slate-500">
                {row.teamId} · {row.position} · {row.gamesPlayed} GP
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] text-slate-500">G</p>
                <p className="text-xs font-semibold text-white">{row.goals}</p>
                <p className="text-[8px] text-slate-600">proj {row.projGoals}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">A</p>
                <p className="text-xs font-semibold text-white">{row.assists}</p>
                <p className="text-[8px] text-slate-600">proj {row.projAssists}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">PTS</p>
                <p className="text-xs font-semibold text-yellow-300">{row.points}</p>
                <p className="text-[8px] text-slate-600">proj {row.projPoints}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
