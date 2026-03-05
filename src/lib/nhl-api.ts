import { z } from "zod";

const BASE_URL = "https://api-web.nhle.com";

const teamNameSchema = z.object({ default: z.string() }).passthrough();

const standingsEntrySchema = z
  .object({
    teamAbbrev: teamNameSchema,
    teamName: teamNameSchema,
    teamCommonName: teamNameSchema.optional(),
    teamLogo: z.string(),
    conferenceName: z.string(),
    divisionName: z.string(),
    conferenceSequence: z.number(),
    divisionSequence: z.number(),
    leagueSequence: z.number(),
    wildcardSequence: z.number().optional(),
    gamesPlayed: z.number(),
    wins: z.number(),
    losses: z.number(),
    otLosses: z.number(),
    points: z.number(),
    pointPctg: z.number(),
    goalFor: z.number(),
    goalAgainst: z.number(),
  })
  .passthrough();

const standingsSchema = z
  .object({
    standingsDateTimeUtc: z.string().optional(),
    standings: z.array(standingsEntrySchema),
  })
  .passthrough();

const scheduleGameSchema = z
  .object({
    id: z.number(),
    season: z.number(),
    gameType: z.number(),
    startTimeUTC: z.string(),
    gameState: z.string(),
    gameScheduleState: z.string(),
    awayTeam: z.object({ abbrev: z.string() }).passthrough(),
    homeTeam: z.object({ abbrev: z.string() }).passthrough(),
  })
  .passthrough();

const scheduleSchema = z
  .object({
    gameWeek: z.array(
      z
        .object({
          date: z.string(),
          games: z.array(scheduleGameSchema),
        })
        .passthrough()
    ),
  })
  .passthrough();

const rosterPlayerSchema = z
  .object({
    id: z.number(),
    headshot: z.string().optional(),
    firstName: teamNameSchema,
    lastName: teamNameSchema,
    positionCode: z.string(),
    shootsCatches: z.string().optional(),
    heightInInches: z.number().optional(),
    weightInPounds: z.number().optional(),
  })
  .passthrough();

const rosterSchema = z
  .object({
    forwards: z.array(rosterPlayerSchema),
    defensemen: z.array(rosterPlayerSchema),
    goalies: z.array(rosterPlayerSchema),
  })
  .passthrough();

const gameLogSchema = z
  .object({
    gameLog: z.array(
      z
        .object({
          gameId: z.number(),
          gameDate: z.string(),
          homeRoadFlag: z.string().optional(),
          goals: z.number().optional(),
          assists: z.number().optional(),
          points: z.number().optional(),
          shots: z.number().optional(),
          toi: z.string().optional(),
          opponentAbbrev: z.string(),
        })
        .passthrough()
    ),
  })
  .passthrough();


const seasonsSchema = z.array(z.number());

const playerSpotlightSchema = z.array(
  z
    .object({
      playerId: z.number(),
      name: teamNameSchema,
    })
    .passthrough()
);

async function nhlFetch<T>(path: string, schema: z.ZodSchema<T>): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "User-Agent": "crosby/1.0" },
  });

  if (!response.ok) {
    throw new Error(`NHL API error ${response.status} for ${path}`);
  }

  const data = await response.json();
  return schema.parse(data);
}

export async function fetchStandingsNow() {
  return nhlFetch("/v1/standings/now", standingsSchema);
}

export async function fetchScheduleNow() {
  return nhlFetch("/v1/schedule/now", scheduleSchema);
}

export async function fetchRoster(teamAbbrev: string) {
  return nhlFetch(`/v1/roster/${teamAbbrev}/current`, rosterSchema);
}

export async function fetchPlayerGameLog(playerId: number, season: string) {
  return nhlFetch(`/v1/player/${playerId}/game-log/${season}/2`, gameLogSchema);
}


export async function fetchSeasons() {
  return nhlFetch("/v1/season", seasonsSchema);
}

export async function fetchPlayerSpotlight() {
  return nhlFetch("/v1/player-spotlight", playerSpotlightSchema);
}
