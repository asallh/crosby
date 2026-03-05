import "dotenv/config";
import {
  fetchPlayerGameLog,
  fetchPlayerSpotlight,
  fetchRoster,
  fetchScheduleNow,
  fetchStandingsNow,
} from "../src/lib/nhl-api";
import { resolveSeasonId } from "./ingest";

async function main() {
  const seasonId = await resolveSeasonId();
  console.log(`Validating NHL API for season ${seasonId}...`);

  const standings = await fetchStandingsNow();
  console.log(`Standings entries: ${standings.standings.length}`);

  const schedule = await fetchScheduleNow();
  const totalGames = schedule.gameWeek.reduce(
    (sum, week) => sum + week.games.length,
    0
  );
  console.log(`Schedule games: ${totalGames}`);

  const team = standings.standings[0]?.teamAbbrev.default;
  if (!team) throw new Error("No team found in standings.");

  const roster = await fetchRoster(team);
  const rosterCount =
    roster.forwards.length + roster.defensemen.length + roster.goalies.length;
  console.log(`Roster for ${team}: ${rosterCount} players`);

  const spotlight = await fetchPlayerSpotlight();
  const samplePlayer = spotlight[0];
  if (!samplePlayer) throw new Error("No spotlight player found.");

  const log = await fetchPlayerGameLog(samplePlayer.playerId, seasonId);
  console.log(
    `Player logs for ${samplePlayer.name.default}: ${log.gameLog.length}`
  );

  console.log("API validation complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
