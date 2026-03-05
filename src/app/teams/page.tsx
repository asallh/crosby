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

  const east = standings.filter((entry) => entry.team.conference === "Eastern");
  const west = standings.filter((entry) => entry.team.conference === "Western");

  const renderTable = (entries: typeof standings, label: string) => (
    <div className="glass rounded-3xl p-6">
      <h2 className="text-2xl font-semibold text-white mb-4">{label}</h2>
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <Link
            key={entry.teamId}
            href={`/teams/${entry.teamId}`}
            className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.06]"
          >
            <div className="flex items-center gap-3">
              <span className="w-5 text-center text-[10px] text-slate-500">
                {index + 1}
              </span>
              <Image
                src={entry.team.logoUrl}
                alt={entry.team.commonName}
                width={28}
                height={28}
              />
              <div>
                <p className="text-xs font-semibold text-white">
                  {entry.team.commonName}
                </p>
                <p className="text-[10px] text-slate-500">
                  {entry.wins}-{entry.losses}-{entry.otLosses}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[10px] text-slate-500">PTS</p>
                <p className="text-xs font-semibold text-white">{entry.points}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-500">Rank</p>
                <p className="text-xs text-white">#{entry.leagueRank}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 md:px-14">
      <div className="flex items-center justify-between page-section">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Teams
          </p>
          <h1 className="text-4xl font-semibold text-white">League Standings</h1>
        </div>
        <span className="stat-chip px-4 py-2 text-xs text-slate-200">
          {latestSnapshot?.snapshotDate.toLocaleDateString() ?? "--"}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 page-section stagger-1">
        {renderTable(east, "Eastern Conference")}
        {renderTable(west, "Western Conference")}
      </div>
    </main>
  );
}
