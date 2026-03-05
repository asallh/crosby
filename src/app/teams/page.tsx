import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";

export default async function TeamsPage() {
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

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 md:px-14">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Teams
          </p>
          <h1 className="text-4xl font-semibold text-white">League Standings</h1>
        </div>
        <span className="stat-chip px-4 py-2 text-xs text-slate-200">
          Snapshot {latestSnapshot?.snapshotDate.toLocaleDateString() ?? "--"}
        </span>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {standings.map((entry) => (
          <Link
            key={entry.teamId}
            href={`/teams/${entry.teamId}`}
            className="glass flex items-center justify-between rounded-2xl p-4 transition hover:-translate-y-1"
          >
            <div className="flex items-center gap-4">
              <Image
                src={entry.team.logoUrl}
                alt={entry.team.commonName}
                width={40}
                height={40}
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
              <p className="text-xs text-slate-400">Rank</p>
              <p className="text-sm text-white">#{entry.leagueRank}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
