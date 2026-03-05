import Image from "next/image";
import { prisma } from "@/lib/db";

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
      <div className="flex items-center justify-between">
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

      <div className="mt-8 space-y-3">
        {rookies.map((row, index) => (
          <div
            key={row.playerId}
            className="glass flex flex-col gap-4 rounded-2xl p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 w-6">{index + 1}</span>
              <div className="h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-white/5">
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
              <div>
                <p className="text-sm font-semibold text-white">{row.fullName}</p>
                <p className="text-xs text-slate-400">
                  {row.teamId} · {row.position} · {row.gamesPlayed} GP
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-white/5 px-4 py-2">
                <p className="text-[10px] text-slate-400">Projected PTS</p>
                <p className="text-sm font-semibold text-white">{row.projPoints}</p>
                <p className="text-[10px] text-slate-500">{row.points} current</p>
              </div>
              <div className="rounded-xl bg-white/5 px-4 py-2">
                <p className="text-[10px] text-slate-400">Projected G</p>
                <p className="text-sm font-semibold text-white">{row.projGoals}</p>
                <p className="text-[10px] text-slate-500">{row.goals} current</p>
              </div>
              <div className="rounded-xl bg-white/5 px-4 py-2">
                <p className="text-[10px] text-slate-400">Projected A</p>
                <p className="text-sm font-semibold text-white">{row.projAssists}</p>
                <p className="text-[10px] text-slate-500">{row.assists} current</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
