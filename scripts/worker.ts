import "dotenv/config";
import {
  buildMatchupProjections,
  buildPlayerProjections,
  resolveSeasonId,
  syncPlayerLogs,
  syncRosters,
  syncSchedule,
  syncStandings,
} from "./ingest";

async function main() {
  const seasonId = await resolveSeasonId();
  console.log(`Worker refresh for season ${seasonId}...`);

  const teams = await syncStandings(seasonId);
  await syncSchedule(seasonId);
  await syncRosters(teams.map((team) => team.id));
  await syncPlayerLogs(seasonId);
  await buildMatchupProjections();
  await buildPlayerProjections();

  console.log("Refresh complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
