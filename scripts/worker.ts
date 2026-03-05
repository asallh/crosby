import "dotenv/config";
import {
  buildMatchupProjections,
  buildPlayerProjections,
  resolveSeasonId,
  syncPlayerLogs,
  syncRookieEligibility,
  syncRosters,
  syncSchedule,
  syncStandings,
} from "./ingest";

async function main() {
  const totalStart = Date.now();
  console.log("=".repeat(60));
  console.log("  Crosby IQ — Worker Refresh");
  console.log("  Started at", new Date().toISOString());
  console.log("=".repeat(60));

  const seasonId = await resolveSeasonId();
  console.log();

  console.log("── Step 1/6: Sync Standings ──");
  const teams = await syncStandings(seasonId);
  console.log();

  console.log("── Step 2/6: Sync Schedule ──");
  await syncSchedule(seasonId);
  console.log();

  console.log("── Step 3/6: Sync Rosters ──");
  await syncRosters(teams.map((team) => team.id));
  console.log();

  console.log("── Step 4/6: Sync Player Game Logs ──");
  await syncPlayerLogs(seasonId);
  console.log();

  console.log("── Step 5/7: Sync Rookie Eligibility ──");
  await syncRookieEligibility(seasonId);
  console.log();

  console.log("── Step 6/7: Build Matchup Projections ──");
  await buildMatchupProjections();
  console.log();

  console.log("── Step 7/7: Build Player Projections (LEBRON) ──");
  await buildPlayerProjections();
  console.log();

  console.log("=".repeat(60));
  console.log(`  Refresh complete in ${((Date.now() - totalStart) / 1000).toFixed(1)}s`);
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Worker failed:", error);
  process.exit(1);
});
