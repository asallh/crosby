import Image from "next/image";
import { prisma } from "@/lib/db";

export default async function MatchupsPage() {
  const matchups = await prisma.matchupProjection.findMany({
    include: { game: { include: { homeTeam: true, awayTeam: true } } },
    orderBy: { game: { gameDate: "asc" } },
    take: 30,
  });

  const latestSnapshot = await prisma.standingsSnapshot.findFirst({
    orderBy: { snapshotDate: "desc" },
  });

  const standings = latestSnapshot
    ? await prisma.standingsSnapshot.findMany({
        where: { snapshotDate: latestSnapshot.snapshotDate },
      })
    : [];

  const standingsMap = new Map(
    standings.map((entry) => [entry.teamId, entry])
  );

  const teamStats = await prisma.teamStats.findMany();
  const teamStatsMap = new Map(teamStats.map((stat) => [stat.teamId, stat]));

  const gameIds = matchups.map((matchup) => matchup.gameId);
  const projections = await prisma.projection.findMany({
    where: { gameId: { in: gameIds } },
    include: { player: true },
  });

  const projectionPlayerIds = Array.from(
    new Set(projections.map((projection) => projection.playerId))
  );

  const seasonPoints = await prisma.playerGameLog.groupBy({
    by: ["playerId"],
    where: { playerId: { in: projectionPlayerIds } },
    _sum: { points: true },
  });

  const seasonPointsMap = new Map(
    seasonPoints.map((entry) => [entry.playerId, entry._sum.points ?? 0])
  );

  const projectionsByGame = new Map<number, typeof projections>();
  for (const projection of projections) {
    const list = projectionsByGame.get(projection.gameId) ?? [];
    list.push(projection);
    projectionsByGame.set(projection.gameId, list);
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 md:px-14">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Head-to-Head
          </p>
          <h1 className="text-4xl font-semibold text-white">Daily Matchups</h1>
        </div>
        <span className="stat-chip px-4 py-2 text-xs text-slate-200">
          Next {matchups.length} games
        </span>
      </div>

      <div className="mt-8 space-y-6">
        {matchups.map((matchup) => {
          const delta =
            matchup.homeExpectedGoals - matchup.awayExpectedGoals;
          const total = matchup.homeExpectedGoals + matchup.awayExpectedGoals;
          const awayPct = total > 0 ? (matchup.awayExpectedGoals / total) * 100 : 50;
          const homePct = 100 - awayPct;
          const homeStanding = standingsMap.get(matchup.game.homeTeam.id);
          const awayStanding = standingsMap.get(matchup.game.awayTeam.id);
          const homeStats = teamStatsMap.get(matchup.game.homeTeam.id);
          const awayStats = teamStatsMap.get(matchup.game.awayTeam.id);
          const gameProjections = projectionsByGame.get(matchup.gameId) ?? [];
          const homePlayers = gameProjections
            .filter((proj) => proj.player.teamId === matchup.game.homeTeam.id)
            .sort((a, b) => b.expectedPoints - a.expectedPoints)
            .slice(0, 5);
          const awayPlayers = gameProjections
            .filter((proj) => proj.player.teamId === matchup.game.awayTeam.id)
            .sort((a, b) => b.expectedPoints - a.expectedPoints)
            .slice(0, 5);

          return (
            <div key={matchup.gameId} className="glass rounded-3xl overflow-hidden">
              {/* ── Header: logos + score + date ── */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <div className="flex items-center gap-5">
                  <div className="flex flex-col items-center gap-1">
                    <Image
                      src={matchup.game.awayTeam.logoUrl}
                      alt={matchup.game.awayTeam.commonName}
                      width={48}
                      height={48}
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      {matchup.game.awayTeam.id}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-lg font-semibold text-white">
                      {matchup.awayExpectedGoals.toFixed(1)}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400">
                      xG
                    </span>
                  </div>

                  <div className="flex flex-col items-center px-4">
                    <span className="text-xs text-slate-400">vs</span>
                    <span className="text-[10px] text-slate-500">
                      {matchup.game.gameDate.toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-lg font-semibold text-white">
                      {matchup.homeExpectedGoals.toFixed(1)}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400">
                      xG
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <Image
                      src={matchup.game.homeTeam.logoUrl}
                      alt={matchup.game.homeTeam.commonName}
                      width={48}
                      height={48}
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      {matchup.game.homeTeam.id}
                    </span>
                  </div>
                </div>

                <div className="hidden md:block text-right">
                  <p className="text-xs text-slate-400">
                    {delta >= 0
                      ? `${matchup.game.homeTeam.commonName} favored`
                      : `${matchup.game.awayTeam.commonName} favored`}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    +{Math.abs(delta).toFixed(2)} xG edge
                  </p>
                </div>
              </div>

              {/* ── Dominance bar ── */}
              <div className="px-6 py-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-orange-300">{awayPct.toFixed(0)}%</span>
                  <span className="text-[10px] uppercase tracking-widest text-slate-500">
                    Projected Dominance
                  </span>
                  <span className="text-xs text-cyan-300">{homePct.toFixed(0)}%</span>
                </div>
                <div className="relative flex h-3 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all"
                    style={{ width: `${awayPct}%` }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all"
                    style={{ width: `${homePct}%` }}
                  />
                  <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-white/30" />
                </div>
              </div>

              {/* ── Two-column body ── */}
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
                {/* Away side */}
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-orange-200">
                      {matchup.game.awayTeam.commonName}
                    </h3>
                    <span className="stat-chip px-2 py-0.5 text-[10px] text-slate-300">
                      #{awayStanding?.leagueRank ?? "--"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
                      <p className="text-[10px] text-slate-400">Record</p>
                      <p className="text-xs font-semibold text-white">
                        {awayStanding?.wins ?? 0}-{awayStanding?.losses ?? 0}-{awayStanding?.otLosses ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
                      <p className="text-[10px] text-slate-400">GF/G</p>
                      <p className="text-xs font-semibold text-white">
                        {awayStats?.gfPerGame.toFixed(2) ?? "--"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
                      <p className="text-[10px] text-slate-400">GA/G</p>
                      <p className="text-xs font-semibold text-white">
                        {awayStats?.gaPerGame.toFixed(2) ?? "--"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                      Top Projected Scorers
                    </p>
                    <div className="space-y-1.5">
                      {awayPlayers.length ? (
                        awayPlayers.map((proj, idx) => (
                          <div
                            key={proj.playerId}
                            className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2"
                          >
                            <span className="w-4 text-[10px] text-slate-500">
                              {idx + 1}
                            </span>
                            <div className="h-6 w-6 overflow-hidden rounded-full border border-white/10 bg-white/5 shrink-0">
                              {proj.player.headshotUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={proj.player.headshotUrl}
                                  alt={proj.player.fullName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[8px] text-slate-400">
                                  {proj.player.fullName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="flex-1 truncate text-xs text-slate-200">
                              {proj.player.fullName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">
                                {proj.expectedPoints.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                / {seasonPointsMap.get(proj.playerId) ?? 0}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No projections</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Home side */}
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-cyan-200">
                      {matchup.game.homeTeam.commonName}
                    </h3>
                    <span className="stat-chip px-2 py-0.5 text-[10px] text-slate-300">
                      #{homeStanding?.leagueRank ?? "--"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
                      <p className="text-[10px] text-slate-400">Record</p>
                      <p className="text-xs font-semibold text-white">
                        {homeStanding?.wins ?? 0}-{homeStanding?.losses ?? 0}-{homeStanding?.otLosses ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
                      <p className="text-[10px] text-slate-400">GF/G</p>
                      <p className="text-xs font-semibold text-white">
                        {homeStats?.gfPerGame.toFixed(2) ?? "--"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
                      <p className="text-[10px] text-slate-400">GA/G</p>
                      <p className="text-xs font-semibold text-white">
                        {homeStats?.gaPerGame.toFixed(2) ?? "--"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                      Top Projected Scorers
                    </p>
                    <div className="space-y-1.5">
                      {homePlayers.length ? (
                        homePlayers.map((proj, idx) => (
                          <div
                            key={proj.playerId}
                            className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2"
                          >
                            <span className="w-4 text-[10px] text-slate-500">
                              {idx + 1}
                            </span>
                            <div className="h-6 w-6 overflow-hidden rounded-full border border-white/10 bg-white/5 shrink-0">
                              {proj.player.headshotUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={proj.player.headshotUrl}
                                  alt={proj.player.fullName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[8px] text-slate-400">
                                  {proj.player.fullName.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="flex-1 truncate text-xs text-slate-200">
                              {proj.player.fullName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">
                                {proj.expectedPoints.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                / {seasonPointsMap.get(proj.playerId) ?? 0}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No projections</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
