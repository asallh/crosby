import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

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
    take: 12,
  });

  const upcoming = await prisma.game.findMany({
    where: {
      gameDate: { gte: new Date() },
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    orderBy: { gameDate: "asc" },
    take: 5,
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 md:px-14">
      <div className="flex items-center gap-6">
        <Image src={team.logoUrl} alt={team.commonName} width={72} height={72} />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Team Profile
          </p>
          <h1 className="text-4xl font-semibold text-white">{team.name}</h1>
          <p className="text-sm text-slate-400">
            {team.conference} · {team.division}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Standings</h2>
          {latestSnapshot ? (
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>
                Record: {latestSnapshot.wins}-{latestSnapshot.losses}-
                {latestSnapshot.otLosses}
              </p>
              <p>Points: {latestSnapshot.points}</p>
              <p>League rank: #{latestSnapshot.leagueRank}</p>
              <p>Conference rank: #{latestSnapshot.conferenceRank}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-300">No snapshot available.</p>
          )}
        </div>

        <div className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Team Metrics</h2>
          {teamStats ? (
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>GF/G: {teamStats.gfPerGame.toFixed(2)}</p>
              <p>GA/G: {teamStats.gaPerGame.toFixed(2)}</p>
              <p>Goals For: {teamStats.goalsFor}</p>
              <p>Goals Against: {teamStats.goalsAgainst}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-300">No stats available.</p>
          )}
        </div>

        <div className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-semibold text-white">Upcoming Games</h2>
          <div className="mt-4 space-y-3">
            {upcoming.map((game) => (
              <div
                key={game.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="text-sm text-white">
                  {game.homeTeamId} vs {game.awayTeamId}
                </span>
                <span className="text-xs text-slate-400">
                  {game.gameDate.toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 glass rounded-3xl p-6">
        <h2 className="text-2xl font-semibold text-white">Key Players</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {roster.map((player) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="text-sm text-white">{player.fullName}</span>
              <span className="text-xs text-slate-400">{player.position}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <Link href="/teams" className="text-sm text-cyan-200">
          ← Back to teams
        </Link>
      </div>
    </main>
  );
}
