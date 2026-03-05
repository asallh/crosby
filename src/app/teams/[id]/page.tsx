import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeamDetailPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = id;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) return notFound();

  const latestSnapshot = await prisma.standingsSnapshot.findFirst({
    where: { teamId },
    orderBy: { snapshotDate: "desc" },
  });

  const teamStats = await prisma.teamStats.findFirst({
    where: { teamId },
    orderBy: { season: "desc" },
  });

  const roster = await prisma.player.findMany({
    where: { teamId },
    orderBy: { fullName: "asc" },
  });

  const upcoming = await prisma.game.findMany({
    where: {
      gameDate: { gte: new Date() },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { gameDate: "asc" },
    take: 5,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 md:px-14">
      <div className="mb-6">
        <Link
          href="/teams"
          className="text-xs text-slate-400 hover:text-cyan-200 transition"
        >
          Teams /
        </Link>
      </div>

      <div className="flex items-center gap-5 page-section">
        <Image src={team.logoUrl} alt={team.commonName} width={64} height={64} />
        <div>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            {team.name}
          </h1>
          <p className="text-sm text-slate-400">
            {team.conference} · {team.division}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 page-section stagger-1">
        {[
          {
            label: "Record",
            value: latestSnapshot
              ? `${latestSnapshot.wins}-${latestSnapshot.losses}-${latestSnapshot.otLosses}`
              : "--",
          },
          { label: "Points", value: latestSnapshot?.points ?? "--" },
          { label: "GF/G", value: teamStats?.gfPerGame.toFixed(2) ?? "--" },
          { label: "GA/G", value: teamStats?.gaPerGame.toFixed(2) ?? "--" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 page-section stagger-2">
        <div className="glass rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Upcoming Games
          </h2>
          <div className="space-y-2">
            {upcoming.length ? (
              upcoming.map((game) => {
                const isHome = game.homeTeamId === teamId;
                const opponent = isHome ? game.awayTeam : game.homeTeam;
                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={opponent.logoUrl}
                        alt={opponent.commonName}
                        width={24}
                        height={24}
                      />
                      <span className="text-xs text-white">
                        {isHome ? "vs" : "@"} {opponent.commonName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {game.gameDate.toLocaleDateString()}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400">No upcoming games.</p>
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Roster</h2>
          <div className="space-y-1.5">
            {roster.map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.06]"
              >
                <div className="h-7 w-7 overflow-hidden rounded-full border border-white/10 bg-white/5 shrink-0">
                  {player.headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={player.headshotUrl}
                      alt={player.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[8px] text-slate-400">
                      {player.fullName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="flex-1 truncate text-xs text-white">
                  {player.fullName}
                </span>
                <span className="text-[10px] text-slate-500">
                  {player.position}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
