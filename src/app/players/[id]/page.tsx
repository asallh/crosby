import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  confidenceScore,
  homeIceAdjustment,
  opponentDefenseAdjustment,
  weightedPointsPerGame,
} from "@/lib/projections";
import PlayerMatchups from "@/components/player-matchups";
import PlayerTrendChart from "@/components/player-trend-chart";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlayerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isFinite(playerId)) return notFound();

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { team: true },
  });

  if (!player) return notFound();

  const projection = await prisma.projection.findFirst({
    where: { playerId, game: { gameDate: { gte: new Date() } } },
    orderBy: { game: { gameDate: "asc" } },
    include: { game: true },
  });

  const logs = await prisma.playerGameLog.findMany({
    where: { playerId },
    orderBy: { gameId: "desc" },
    take: 10,
  });

  const logGameIds = logs.map((log) => log.gameId);
  const games = await prisma.game.findMany({
    where: { id: { in: logGameIds } },
    include: { homeTeam: true, awayTeam: true },
  });
  const gamesMap = new Map(games.map((game) => [game.id, game]));
  const seasonTotals = await prisma.playerGameLog.aggregate({
    where: { playerId },
    _sum: { goals: true, assists: true, points: true },
    _count: { _all: true },
  });

  const fullSeasonLogs = await prisma.playerGameLog.findMany({
    where: { playerId },
    select: { points: true, goals: true, assists: true, shots: true },
    orderBy: { gameId: "desc" },
  });

  const seasonTrendLogs = await prisma.playerGameLog.findMany({
    where: { playerId },
    select: { gameId: true, points: true },
    orderBy: { gameId: "asc" },
  });

  const seasonGameIds = seasonTrendLogs.map((log) => log.gameId);
  const seasonGames = await prisma.game.findMany({
    where: { id: { in: seasonGameIds } },
    include: { homeTeam: true, awayTeam: true },
  });
  const seasonGamesMap = new Map(
    seasonGames.map((game) => [game.id, game])
  );

  const gp = seasonTotals._count._all;
  const pts = seasonTotals._sum.points ?? 0;
  const g = seasonTotals._sum.goals ?? 0;
  const a = seasonTotals._sum.assists ?? 0;

  const totalGames = 82;
  let runningTotal = 0;
  const trendData = seasonTrendLogs.map((log, index) => {
    runningTotal += log.points ?? 0;
    const game = seasonGamesMap.get(log.gameId);
    const label = (() => {
      if (!game) return `Game ${log.gameId}`;
      const home = game.homeTeamId === player.teamId;
      const opponent = home ? game.awayTeam : game.homeTeam;
      return `${home ? "vs" : "@"} ${opponent.commonName}`;
    })();
    return {
      label,
      gameNumber: index + 1,
      cumulativePoints: runningTotal,
    };
  });
  const lastTenTrendData = trendData.slice(-10);

  const nextGame = await prisma.game.findFirst({
    where: {
      gameDate: { gte: new Date() },
      OR: [{ homeTeamId: player.teamId }, { awayTeamId: player.teamId }],
    },
    orderBy: { gameDate: "asc" },
  });

  const opponentId = nextGame
    ? nextGame.homeTeamId === player.teamId
      ? nextGame.awayTeamId
      : nextGame.homeTeamId
    : null;

  const opponentStats = opponentId
    ? await prisma.teamStats.findFirst({
        where: { teamId: opponentId },
        orderBy: { season: "desc" },
      })
    : null;

  const basePoints = weightedPointsPerGame(
    fullSeasonLogs.map((log) => ({
      points: log.points,
      goals: log.goals,
      assists: log.assists,
      shots: log.shots ?? undefined,
    }))
  );
  const isHome = nextGame ? nextGame.homeTeamId === player.teamId : false;
  const computedProjection = nextGame
    ? {
        expectedPoints:
          basePoints *
          opponentDefenseAdjustment(opponentStats?.gaPerGame ?? 3.1) *
          homeIceAdjustment(isHome),
        confidence: confidenceScore(
          fullSeasonLogs.map((log) => ({
            points: log.points,
            goals: log.goals,
            assists: log.assists,
            shots: log.shots ?? undefined,
          }))
        ),
      }
    : null;

  const effectiveProjection =
    projection ??
    (nextGame
      ? {
          expectedPoints: computedProjection?.expectedPoints ?? basePoints,
          confidence: computedProjection?.confidence ?? 0.55,
          game: nextGame,
        }
      : null);

  const remainingGames = Math.max(totalGames - gp, 0);
  const projectedEnd = pts + basePoints * remainingGames;

  return (
    <main className="relative mx-auto w-full max-w-6xl px-6 pb-24 pt-10 md:px-14">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-56 -top-10 h-[720px] w-[720px] opacity-[0.19] [mask-image:radial-gradient(circle,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.3)_55%,transparent_78%)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={player.team.logoUrl}
            alt={`${player.team.commonName} logo`}
            className="h-full w-full object-contain blur-[6px] saturate-0"
          />
        </div>
      </div>
      <div className="mb-6">
        <Link
          href="/players"
          className="text-xs text-slate-400 hover:text-cyan-200 transition"
        >
          Players /
        </Link>
      </div>

      <div className="flex items-center gap-5 page-section">
        <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shrink-0">
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
        <div>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            {player.fullName}
          </h1>
          <p className="text-sm text-slate-400">
            {player.team.commonName} · {player.position} · {player.shoots ?? "--"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 page-section stagger-1">
        {[
          { label: "GP", value: gp },
          { label: "Goals", value: g },
          { label: "Assists", value: a },
          { label: "Points", value: pts },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass rounded-2xl p-4 text-center"
          >
            <p className="text-[10px] uppercase tracking-widest text-slate-400">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 page-section stagger-2">
        <PlayerTrendChart
          seasonData={trendData}
          lastTenData={lastTenTrendData}
          currentGames={gp}
          totalGames={totalGames}
          projectedEnd={projectedEnd}
        />
      </div>

      <div className="mt-6 glass rounded-3xl p-6 page-section stagger-3">
        <h2 className="text-xl font-semibold text-white">Next Game Projection</h2>
        {effectiveProjection ? (
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs text-slate-400">Matchup</p>
              <p className="text-lg text-white">
                {effectiveProjection.game.homeTeamId} vs{" "}
                {effectiveProjection.game.awayTeamId}
              </p>
              <p className="text-xs text-slate-500">
                {effectiveProjection.game.gameDate.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  Expected PTS
                </p>
                <p className="text-3xl font-semibold text-white">
                  {effectiveProjection.expectedPoints.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  Confidence
                </p>
                <p className="text-3xl font-semibold text-white">
                  {(effectiveProjection.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            No upcoming projection available.
          </p>
        )}
      </div>

      <div className="page-section stagger-4">
        <PlayerMatchups
          logs={logs.map((log) => {
            const game = gamesMap.get(log.gameId);
            const label = (() => {
              if (!game) return `Game ${log.gameId}`;
              const home = game.homeTeamId === player.teamId;
              const opponent = home ? game.awayTeam : game.homeTeam;
              return `${home ? "vs" : "@"} ${opponent.commonName}`;
            })();

            return {
              gameId: log.gameId,
              label,
              points: log.points,
              goals: log.goals,
              assists: log.assists,
            };
          })}
        />
      </div>
    </main>
  );
}
