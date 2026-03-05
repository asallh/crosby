import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  confidenceScore,
  homeIceAdjustment,
  opponentDefenseAdjustment,
  weightedPointsPerGame,
} from "@/lib/projections";
import PlayerMatchups from "@/components/player-matchups";

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
    logs.map((log) => ({
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
        confidence: confidenceScore(logs.length),
      }
    : null;

  const effectiveProjection = projection ??
    (nextGame
      ? {
          expectedPoints: computedProjection?.expectedPoints ?? basePoints,
          confidence: computedProjection?.confidence ?? 0.55,
          game: nextGame,
        }
      : null);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 md:px-14">
      <div className="flex items-center gap-6">
        <div className="h-24 w-24 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          {player.headshotUrl ? (
            <Image
              src={player.headshotUrl}
              alt={player.fullName}
              width={96}
              height={96}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
              {player.fullName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Player Profile
          </p>
          <h1 className="text-4xl font-semibold text-white">{player.fullName}</h1>
          <p className="text-sm text-slate-400">
            {player.teamId} · {player.position} · {player.shoots ?? "--"}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Next Game Projection</h2>
          {effectiveProjection ? (
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Game</p>
                <p className="text-lg text-white">
                  {effectiveProjection.game.homeTeamId} vs {effectiveProjection.game.awayTeamId}
                </p>
                <p className="text-xs text-slate-400">
                  {effectiveProjection.game.gameDate.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Expected Points</p>
                <p className="text-4xl font-semibold text-white">
                  {effectiveProjection.expectedPoints.toFixed(2)}
                </p>
                <p className="text-xs text-slate-400">
                  Confidence {(effectiveProjection.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-300">
              No upcoming projection available.
            </p>
          )}
        </div>

        <div className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Current Season</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">Games</p>
              <p className="text-lg text-white">{seasonTotals._count._all}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">Points</p>
              <p className="text-lg text-white">{seasonTotals._sum.points ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">Goals</p>
              <p className="text-lg text-white">{seasonTotals._sum.goals ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">Assists</p>
              <p className="text-lg text-white">{seasonTotals._sum.assists ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <PlayerMatchups
        logs={logs.map((log) => {
          const game = gamesMap.get(log.gameId);
          const label = (() => {
            if (!game) return `Game ${log.gameId}`;
            const isHome = game.homeTeamId === player.teamId;
            const opponent = isHome ? game.awayTeam : game.homeTeam;
            return `${isHome ? "vs" : "@"} ${opponent.commonName}`;
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
    </main>
  );
}
