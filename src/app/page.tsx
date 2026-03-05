import Image from "next/image";
import Link from "next/link";
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
    take: 6,
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
      <header className="relative overflow-hidden px-6 pb-14 pt-10 md:px-14">
        <div className="absolute -right-32 top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -left-24 top-24 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col gap-5 page-section">
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

              <div className="flex flex-wrap gap-2">
                <span className="stat-chip px-3 py-1.5 text-[11px] text-slate-200">
                  Weighted PPG model
                </span>
                <span className="stat-chip px-3 py-1.5 text-[11px] text-slate-200">
                  Opponent defense adjusted
                </span>
                <span className="stat-chip px-3 py-1.5 text-[11px] text-slate-200">
                  Home ice multiplier
                </span>
              </div>

              <div className="flex flex-wrap gap-3 mt-2">
                <Link
                  href="/players"
                  className="rounded-full bg-cyan-400/20 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/35 hover:shadow-lg hover:shadow-cyan-400/10"
                >
                  Explore Players
                </Link>
                <Link
                  href="/teams"
                  className="rounded-full bg-white/8 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/15"
                >
                  View Teams
                </Link>
                <Link
                  href="/matchups"
                  className="rounded-full bg-white/8 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/15"
                >
                  Head-to-Head
                </Link>
              </div>
            </div>

            <div className="glass floaty rounded-3xl p-6 page-section stagger-2">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                  Today&apos;s Pulse
                </p>
                <span className="text-[10px] text-slate-500">
                  {latestSnapshot?.snapshotDate.toLocaleDateString() ?? "--"}
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/5 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Teams</p>
                  <p className="text-2xl font-semibold text-white">{standings.length}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Matchups</p>
                  <p className="text-2xl font-semibold text-white">{matchups.length}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-white/5 p-3">
                <p className="text-xs text-slate-300">
                  Forecast engine: last 10 (60%) + last 20 (30%) + season (10%).
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-24 md:px-14">
        <div className="page-section stagger-1">
          <PlayerProjectionPanel />
        </div>

        <section className="glass rounded-3xl p-6 md:p-8 page-section stagger-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                Daily Matchups
              </p>
              <h2 className="text-2xl font-semibold text-white">Projected Goals</h2>
            </div>
            <Link href="/matchups" className="stat-chip px-4 py-2 text-xs text-slate-200 hover:bg-white/10 transition">
              View all
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {matchups.map((matchup) => (
              <div
                key={matchup.gameId}
                className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image
                      src={matchup.game.awayTeam.logoUrl}
                      alt={matchup.game.awayTeam.commonName}
                      width={28}
                      height={28}
                    />
                    <span className="text-xs font-medium text-slate-200">
                      {matchup.game.awayTeam.id}
                    </span>
                    <span className="text-[10px] text-slate-500">@</span>
                    <Image
                      src={matchup.game.homeTeam.logoUrl}
                      alt={matchup.game.homeTeam.commonName}
                      width={28}
                      height={28}
                    />
                    <span className="text-xs font-medium text-slate-200">
                      {matchup.game.homeTeam.id}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500">Away xG</p>
                    <p className="text-lg font-semibold text-white">
                      {matchup.awayExpectedGoals.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500">Home xG</p>
                    <p className="text-lg font-semibold text-white">
                      {matchup.homeExpectedGoals.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 page-section stagger-3">
          {(["east", "west"] as const).map((conf) => (
            <div key={conf} className="glass rounded-3xl p-6 md:p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                    Conference Standings
                  </p>
                  <h2 className="text-2xl font-semibold text-white">
                    {conf === "east" ? "Eastern" : "Western"}
                  </h2>
                </div>
              </div>
              <div className="space-y-2">
                {conferenceBuckets[conf].map((entry) => (
                  <Link
                    key={entry.teamId}
                    href={`/teams/${entry.teamId}`}
                    className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.06]"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={entry.team.logoUrl}
                        alt={entry.team.commonName}
                        width={24}
                        height={24}
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {entry.team.commonName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {entry.wins}-{entry.losses}-{entry.otLosses} · {entry.points} pts
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-[10px] text-slate-400">#{entry.conferenceRank}</span>
                      <span className="text-[10px] text-cyan-400">
                        Pick {draftPickForRank(entry.leagueRank)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
