import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type ProjectionRow = {
  playerId: number;
  fullName: string;
  teamId: string;
  position: string;
  headshotUrl: string | null;
  rookieEligible: boolean;
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

export default async function AwardsPage() {
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
    where: { id: { in: playerIds } },
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

  const projections: ProjectionRow[] = totals
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
        rookieEligible: player.rookieEligible,
        gamesPlayed,
        goals,
        assists,
        points,
        projGoals: round(goals + gpg * remaining),
        projAssists: round(assists + apg * remaining),
        projPoints: round(points + ppg * remaining),
      };
    })
    .filter((row): row is ProjectionRow => row !== null);

  const trophies = [
    {
      name: "Rocket Richard",
      desc: "Most goals",
      color: "text-orange-300",
      metric: "projGoals" as const,
      rows: [...projections].sort((a, b) => b.projGoals - a.projGoals).slice(0, 5),
    },
    {
      name: "Art Ross",
      desc: "Most points",
      color: "text-cyan-300",
      metric: "projPoints" as const,
      rows: [...projections].sort((a, b) => b.projPoints - a.projPoints).slice(0, 5),
    },
    {
      name: "Playmaker",
      desc: "Most assists",
      color: "text-emerald-300",
      metric: "projAssists" as const,
      rows: [...projections].sort((a, b) => b.projAssists - a.projAssists).slice(0, 5),
    },
    {
      name: "Norris",
      desc: "Top defenseman",
      color: "text-purple-300",
      metric: "projPoints" as const,
      rows: projections
        .filter((row) => row.position === "D")
        .sort((a, b) => b.projPoints - a.projPoints)
        .slice(0, 5),
    },
    {
      name: "Calder",
      desc: "Top rookie",
      color: "text-yellow-300",
      metric: "projPoints" as const,
      rows: projections
        .filter((row) => row.rookieEligible)
        .sort((a, b) => b.projPoints - a.projPoints)
        .slice(0, 5),
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 md:px-14">
      <div className="flex items-center justify-between page-section">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Awards Forecast
          </p>
          <h1 className="text-4xl font-semibold text-white">Trophy Projections</h1>
        </div>
        <span className="stat-chip px-4 py-2 text-xs text-slate-200">
          Pace-based
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 page-section stagger-1">
        {trophies.map((trophy) => (
          <div key={trophy.name} className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-2xl font-semibold ${trophy.color}`}>
                  {trophy.name}
                </h2>
                <p className="text-xs text-slate-400">{trophy.desc}</p>
              </div>
            </div>
            <div className="space-y-2">
              {trophy.rows.map((row, index) => (
                <div
                  key={row.playerId}
                  className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-[10px] text-slate-500">
                      {index + 1}
                    </span>
                    <div className="h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-white/5 shrink-0">
                      {row.headshotUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.headshotUrl}
                          alt={row.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[8px] text-slate-400">
                          {row.fullName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {row.fullName}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {row.teamId} · {row.position}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${trophy.color}`}>
                      {row[trophy.metric]}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {row.goals}G {row.assists}A {row.points}P
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
