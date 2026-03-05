import Image from "next/image";
import PlayerProjectionPanel from "@/components/player-projection-panel";
import { prisma } from "@/lib/db";

export default async function Home() {
  const latestSnapshot = await prisma.standingsSnapshot.findFirst({
    orderBy: { snapshotDate: "desc" },
  });

  const standings = latestSnapshot
    ? await prisma.standingsSnapshot.findMany({
        where: { snapshotDate: latestSnapshot.snapshotDate },
        include: { team: true },
        orderBy: { leagueRank: "asc" },
      })
    : [];

  const matchups = await prisma.matchupProjection.findMany({
    include: {
      game: { include: { homeTeam: true, awayTeam: true } },
    },
    orderBy: { game: { gameDate: "asc" } },
    take: 12,
  });

  const conferenceBuckets = standings.reduce(
    (acc, entry) => {
      if (entry.team.conference === "Eastern") {
        acc.east.push(entry);
      } else {
        acc.west.push(entry);
      }
      return acc;
    },
    { east: [] as typeof standings, west: [] as typeof standings }
  );

  const draftPickForRank = (rank: number) => standings.length - rank + 1;

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden px-6 pb-16 pt-12 md:px-14">
        <div className="absolute -right-32 top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -left-24 top-24 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <nav className="flex items-center justify-between text-sm text-slate-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-cyan-400/20 p-2">
                <div className="h-full w-full rounded-xl bg-cyan-400/40" />
              </div>
              <span className="text-lg font-semibold tracking-wide">
                Crosby IQ
              </span>
            </div>
            <div className="hidden items-center gap-6 md:flex">
              <span className="stat-chip px-4 py-2 text-xs">2025-26 Season</span>
              <span className="stat-chip px-4 py-2 text-xs">Live NHL API</span>
            </div>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-6">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-300">
                League Intelligence Platform
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
                Forecast every matchup. Predict every player.
              </h1>
              <p className="max-w-xl text-base text-slate-300 md:text-lg">
                A modern NHL projections cockpit inspired by LEBRON. Live standings,
                head-to-head win curves, and player point forecasts grounded in recent
                performance.
              </p>

              <div className="flex flex-wrap gap-3">
                <div className="stat-chip px-4 py-2 text-xs text-slate-200">
                  Weighted PPG model
                </div>
                <div className="stat-chip px-4 py-2 text-xs text-slate-200">
                  Opponent defense adjusted
                </div>
                <div className="stat-chip px-4 py-2 text-xs text-slate-200">
                  Home ice multiplier
                </div>
              </div>
            </div>

            <div className="glass floaty rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                  Today&apos;s Pulse
                </p>
                <span className="text-xs text-slate-400">
                  Updated {latestSnapshot?.snapshotDate.toLocaleDateString() ?? "--"}
                </span>
              </div>
              <div className="mt-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Total Teams</p>
                    <p className="text-2xl font-semibold text-white">{standings.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Matchups queued</p>
                    <p className="text-2xl font-semibold text-white">{matchups.length}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-slate-300">
                    Forecast engine: last 10 + last 20 + season blend.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-24 md:px-14">
        <PlayerProjectionPanel />

        <section className="glass rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                Daily Matchups
              </p>
              <h2 className="text-3xl font-semibold text-white">Projected goals</h2>
            </div>
            <span className="stat-chip px-4 py-2 text-xs text-slate-200">
              Next 12 games
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {matchups.map((matchup) => (
              <div
                key={matchup.gameId}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Image
                      src={matchup.game.awayTeam.logoUrl}
                      alt={matchup.game.awayTeam.commonName}
                      width={36}
                      height={36}
                    />
                    <span className="text-sm text-slate-200">
                      {matchup.game.awayTeam.id}
                    </span>
                    <span className="text-xs text-slate-400">@</span>
                    <Image
                      src={matchup.game.homeTeam.logoUrl}
                      alt={matchup.game.homeTeam.commonName}
                      width={36}
                      height={36}
                    />
                    <span className="text-sm text-slate-200">
                      {matchup.game.homeTeam.id}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {matchup.game.gameDate.toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Away xG</p>
                    <p className="text-xl font-semibold text-white">
                      {matchup.awayExpectedGoals.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Home xG</p>
                    <p className="text-xl font-semibold text-white">
                      {matchup.homeExpectedGoals.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-3xl p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                  Conference Standings
                </p>
                <h2 className="text-2xl font-semibold text-white">Eastern</h2>
              </div>
              <span className="stat-chip px-3 py-1 text-xs text-slate-200">
                Draft Pick
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {conferenceBuckets.east.map((entry) => (
                <div
                  key={entry.teamId}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={entry.team.logoUrl}
                      alt={entry.team.commonName}
                      width={32}
                      height={32}
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {entry.team.commonName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {entry.wins}-{entry.losses}-{entry.otLosses}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Conf Rank</p>
                    <p className="text-sm text-white">#{entry.conferenceRank}</p>
                    <p className="text-xs text-cyan-300">
                      Pick {draftPickForRank(entry.leagueRank)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-3xl p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                  Conference Standings
                </p>
                <h2 className="text-2xl font-semibold text-white">Western</h2>
              </div>
              <span className="stat-chip px-3 py-1 text-xs text-slate-200">
                Draft Pick
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {conferenceBuckets.west.map((entry) => (
                <div
                  key={entry.teamId}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={entry.team.logoUrl}
                      alt={entry.team.commonName}
                      width={32}
                      height={32}
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {entry.team.commonName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {entry.wins}-{entry.losses}-{entry.otLosses}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Conf Rank</p>
                    <p className="text-sm text-white">#{entry.conferenceRank}</p>
                    <p className="text-xs text-cyan-300">
                      Pick {draftPickForRank(entry.leagueRank)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
