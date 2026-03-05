import { Prisma } from "../src/generated/prisma";
import { prisma } from "../src/lib/db";
import {
  fetchPlayerGameLog,
  fetchRoster,
  fetchScheduleNow,
  fetchSeasons,
  fetchStandingsNow,
} from "../src/lib/nhl-api";
import {
  confidenceScore,
  homeIceAdjustment,
  matchupExpectedGoals,
  opponentDefenseAdjustment,
  weightedPointsPerGame,
} from "../src/lib/projections";

const DEFAULT_SEASON = "20252026";

type TeamSeed = {
  id: string;
  name: string;
  commonName: string;
  conference: string;
  division: string;
  logoUrl: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  pointPct: number;
  conferenceRank: number;
  divisionRank: number;
  leagueRank: number;
  wildcardRank?: number;
  goalFor: number;
  goalAgainst: number;
};

async function asyncPool<T, R>(
  limit: number,
  items: T[],
  iterator: (item: T) => Promise<R>
) {
  const results: R[] = [];
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const promise = (async () => {
      const result = await iterator(item);
      results.push(result);
    })();

    executing.add(promise);

    const cleanup = () => executing.delete(promise);
    promise.then(cleanup).catch(cleanup);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

export async function resolveSeasonId() {
  const seasons = await fetchSeasons();
  const sorted = seasons.sort((a, b) => b - a);

  if (sorted.includes(Number(DEFAULT_SEASON))) {
    return DEFAULT_SEASON;
  }

  return String(sorted[0]);
}

export async function syncStandings(seasonId: string) {
  const standings = await fetchStandingsNow();
  const snapshotDate = standings.standingsDateTimeUtc
    ? new Date(standings.standingsDateTimeUtc)
    : new Date();

  const teams: TeamSeed[] = standings.standings.map((entry) => ({
    id: entry.teamAbbrev.default,
    name: entry.teamName.default,
    commonName: entry.teamCommonName?.default ?? entry.teamName.default,
    conference: entry.conferenceName,
    division: entry.divisionName,
    logoUrl: entry.teamLogo,
    gamesPlayed: entry.gamesPlayed,
    wins: entry.wins,
    losses: entry.losses,
    otLosses: entry.otLosses,
    points: entry.points,
    pointPct: entry.pointPctg,
    conferenceRank: entry.conferenceSequence,
    divisionRank: entry.divisionSequence,
    leagueRank: entry.leagueSequence,
    wildcardRank: entry.wildcardSequence ?? undefined,
    goalFor: entry.goalFor,
    goalAgainst: entry.goalAgainst,
  }));

  await prisma.$transaction(
    teams.map((team) =>
      prisma.team.upsert({
        where: { id: team.id },
        create: {
          id: team.id,
          name: team.name,
          commonName: team.commonName,
          conference: team.conference,
          division: team.division,
          logoUrl: team.logoUrl,
        },
        update: {
          name: team.name,
          commonName: team.commonName,
          conference: team.conference,
          division: team.division,
          logoUrl: team.logoUrl,
        },
      })
    )
  );

  await prisma.$transaction(
    teams.map((team) =>
      prisma.standingsSnapshot.create({
        data: {
          snapshotDate,
          teamId: team.id,
          gamesPlayed: team.gamesPlayed,
          wins: team.wins,
          losses: team.losses,
          otLosses: team.otLosses,
          points: team.points,
          pointPct: team.pointPct,
          conferenceRank: team.conferenceRank,
          divisionRank: team.divisionRank,
          leagueRank: team.leagueRank,
          wildcardRank: team.wildcardRank,
        },
      })
    )
  );

  await prisma.$transaction(
    teams.map((team) => {
      const gfPerGame = team.gamesPlayed ? team.goalFor / team.gamesPlayed : 0;
      const gaPerGame = team.gamesPlayed
        ? team.goalAgainst / team.gamesPlayed
        : 0;

      return prisma.teamStats.upsert({
        where: { teamId_season: { teamId: team.id, season: seasonId } },
        create: {
          teamId: team.id,
          season: seasonId,
          gamesPlayed: team.gamesPlayed,
          goalsFor: team.goalFor,
          goalsAgainst: team.goalAgainst,
          gfPerGame,
          gaPerGame,
        },
        update: {
          gamesPlayed: team.gamesPlayed,
          goalsFor: team.goalFor,
          goalsAgainst: team.goalAgainst,
          gfPerGame,
          gaPerGame,
        },
      });
    })
  );

  return teams;
}

export async function syncSchedule(seasonId: string) {
  const schedule = await fetchScheduleNow();
  const games = schedule.gameWeek.flatMap((week) => week.games);

  await prisma.$transaction(
    games.map((game) =>
      prisma.game.upsert({
        where: { id: game.id },
        create: {
          id: game.id,
          season: String(game.season ?? seasonId),
          gameDate: new Date(game.startTimeUTC),
          status: game.gameState,
          homeTeamId: game.homeTeam.abbrev,
          awayTeamId: game.awayTeam.abbrev,
        },
        update: {
          season: String(game.season ?? seasonId),
          gameDate: new Date(game.startTimeUTC),
          status: game.gameState,
          homeTeamId: game.homeTeam.abbrev,
          awayTeamId: game.awayTeam.abbrev,
        },
      })
    )
  );

  return games;
}

export async function syncRosters(teamIds: string[]) {
  await asyncPool(4, teamIds, async (teamId) => {
    const roster = await fetchRoster(teamId);
    const players = [...roster.forwards, ...roster.defensemen, ...roster.goalies];

    await prisma.$transaction(
      players.map((player) =>
        prisma.player.upsert({
          where: { id: player.id },
          create: {
            id: player.id,
            fullName: `${player.firstName.default} ${player.lastName.default}`,
            position: player.positionCode,
            shoots: player.shootsCatches ?? null,
            heightIn: player.heightInInches ?? null,
            weightLb: player.weightInPounds ?? null,
            headshotUrl: player.headshot ?? null,
            teamId,
          },
          update: {
            fullName: `${player.firstName.default} ${player.lastName.default}`,
            position: player.positionCode,
            shoots: player.shootsCatches ?? null,
            heightIn: player.heightInInches ?? null,
            weightLb: player.weightInPounds ?? null,
            headshotUrl: player.headshot ?? null,
            teamId,
          },
        })
      )
    );
  });
}

function toiToSeconds(toi?: string) {
  if (!toi) return null;
  const [minutes, seconds] = toi.split(":").map(Number);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  return minutes * 60 + seconds;
}

export async function syncPlayerLogs(seasonId: string) {
  const players = await prisma.player.findMany({ select: { id: true, teamId: true } });

  await asyncPool(3, players, async (player) => {
    let logs;
    try {
      logs = await fetchPlayerGameLog(player.id, seasonId);
    } catch (error) {
      console.warn(`No game log for player ${player.id}`, error);
      return;
    }

    for (const log of logs.gameLog) {
      const isHome = log.homeRoadFlag === "H";
      const homeTeamId = isHome ? player.teamId : log.opponentAbbrev;
      const awayTeamId = isHome ? log.opponentAbbrev : player.teamId;

      try {
        await prisma.game.upsert({
          where: { id: log.gameId },
          create: {
            id: log.gameId,
            season: seasonId,
            gameDate: new Date(log.gameDate),
            status: "FINAL",
            homeTeamId,
            awayTeamId,
          },
          update: {},
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          // Another concurrent insert won the race.
        } else {
          throw error;
        }
      }

      await prisma.playerGameLog.upsert({
        where: { playerId_gameId: { playerId: player.id, gameId: log.gameId } },
        create: {
          playerId: player.id,
          gameId: log.gameId,
          goals: log.goals ?? 0,
          assists: log.assists ?? 0,
          points: log.points ?? (log.goals ?? 0) + (log.assists ?? 0),
          shots: log.shots ?? null,
          toi: toiToSeconds(log.toi),
        },
        update: {
          goals: log.goals ?? 0,
          assists: log.assists ?? 0,
          points: log.points ?? (log.goals ?? 0) + (log.assists ?? 0),
          shots: log.shots ?? null,
          toi: toiToSeconds(log.toi),
        },
      });
    }
  });
}

export async function buildMatchupProjections() {
  const now = new Date();
  const games = await prisma.game.findMany({
    where: { gameDate: { gte: now } },
    orderBy: { gameDate: "asc" },
    take: 80,
  });

  const teamStats = await prisma.teamStats.findMany();
  const statsMap = new Map(
    teamStats.map((team) => [team.teamId, team])
  );

  await prisma.$transaction(
    games.map((game) => {
      const homeStats = statsMap.get(game.homeTeamId);
      const awayStats = statsMap.get(game.awayTeamId);

      const homeExpectedGoals = matchupExpectedGoals(
        homeStats?.gfPerGame ?? 3.0,
        awayStats?.gaPerGame ?? 3.0,
        true
      );

      const awayExpectedGoals = matchupExpectedGoals(
        awayStats?.gfPerGame ?? 3.0,
        homeStats?.gaPerGame ?? 3.0,
        false
      );

      return prisma.matchupProjection.upsert({
        where: { gameId: game.id },
        create: {
          gameId: game.id,
          homeExpectedGoals,
          awayExpectedGoals,
        },
        update: {
          homeExpectedGoals,
          awayExpectedGoals,
        },
      });
    })
  );
}

export async function buildPlayerProjections() {
  const now = new Date();
  const upcomingGames = await prisma.game.findMany({
    where: { gameDate: { gte: now } },
    orderBy: { gameDate: "asc" },
  });

  const nextGameByTeam = new Map<string, (typeof upcomingGames)[number]>();
  for (const game of upcomingGames) {
    if (!nextGameByTeam.has(game.homeTeamId)) {
      nextGameByTeam.set(game.homeTeamId, game);
    }
    if (!nextGameByTeam.has(game.awayTeamId)) {
      nextGameByTeam.set(game.awayTeamId, game);
    }
  }

  const teamStats = await prisma.teamStats.findMany();
  const statsMap = new Map(
    teamStats.map((team) => [team.teamId, team])
  );

  const players = await prisma.player.findMany();

  await asyncPool(4, players, async (player) => {
    const nextGame = nextGameByTeam.get(player.teamId);
    if (!nextGame) return;

    const logs = await prisma.playerGameLog.findMany({
      where: { playerId: player.id },
      orderBy: { gameId: "desc" },
      take: 50,
    });

    if (logs.length === 0) return;

    const basePoints = weightedPointsPerGame(logs);
    const isHome = nextGame.homeTeamId === player.teamId;
    const opponentId = isHome ? nextGame.awayTeamId : nextGame.homeTeamId;
    const opponent = statsMap.get(opponentId);

    const expectedPoints =
      basePoints *
      opponentDefenseAdjustment(opponent?.gaPerGame ?? 3.1) *
      homeIceAdjustment(isHome);

    const confidence = confidenceScore(logs.length);

    await prisma.projection.upsert({
      where: { playerId_gameId: { playerId: player.id, gameId: nextGame.id } },
      create: {
        playerId: player.id,
        gameId: nextGame.id,
        expectedPoints,
        confidence,
      },
      update: {
        expectedPoints,
        confidence,
      },
    });
  });
}
