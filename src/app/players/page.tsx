import Link from "next/link";
import { prisma } from "@/lib/db";
import PlayerSearch from "@/components/player-search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PlayersPageProps = {
  searchParams?: {
    page?: string;
    team?: string;
    position?: string;
  };
};

const PER_PAGE = 30;

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const pageParam = searchParams?.page ?? "1";
  const teamParam = searchParams?.team ?? "";
  const positionParam = searchParams?.position ?? "";
  const requestedPage = Number.parseInt(pageParam, 10);
  const currentPage = Number.isFinite(requestedPage)
    ? Math.max(1, requestedPage)
    : 1;

  const teamFilter = teamParam.trim();
  const positionFilter = positionParam.trim();

  const [teams, positions, players] = await Promise.all([
    prisma.team.findMany({
      select: { id: true, commonName: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.player.findMany({
      select: { position: true },
      distinct: ["position"],
      orderBy: { position: "asc" },
    }),
    prisma.player.findMany({
      where: {
        ...(teamFilter ? { teamId: teamFilter } : {}),
        ...(positionFilter ? { position: positionFilter } : {}),
      },
      select: {
        id: true,
        fullName: true,
        position: true,
        teamId: true,
        headshotUrl: true,
      },
    }),
  ]);

  const playerIds = players.map((entry) => entry.id);
  const pointsLeaders = playerIds.length
    ? await prisma.playerGameLog.groupBy({
        by: ["playerId"],
        _sum: { points: true, goals: true, assists: true },
        _count: { _all: true },
        where: { playerId: { in: playerIds } },
        orderBy: { _sum: { points: "desc" } },
      })
    : [];

  const statsMap = new Map(
    pointsLeaders.map((entry) => [
      entry.playerId,
      {
        points: entry._sum.points ?? 0,
        goals: entry._sum.goals ?? 0,
        assists: entry._sum.assists ?? 0,
        gp: entry._count._all,
      },
    ])
  );

  const sortedPlayers = players
    .map((player) => ({
      ...player,
      ...(statsMap.get(player.id) ?? { points: 0, goals: 0, assists: 0, gp: 0 }),
    }))
    .sort((a, b) => b.points - a.points || a.fullName.localeCompare(b.fullName));

  const totalPlayers = sortedPlayers.length;
  const totalPages = totalPlayers ? Math.ceil(totalPlayers / PER_PAGE) : 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PER_PAGE;
  const pagedPlayers = sortedPlayers.slice(startIndex, startIndex + PER_PAGE);
  const rangeStart = totalPlayers ? startIndex + 1 : 0;
  const rangeEnd = Math.min(startIndex + PER_PAGE, totalPlayers);

  const buildQuery = (nextPage: number) => {
    const params = new URLSearchParams();
    if (teamFilter) params.set("team", teamFilter);
    if (positionFilter) params.set("position", positionFilter);
    params.set("page", String(nextPage));
    return params.toString();
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-10 md:px-14">
      <div className="flex items-center justify-between page-section">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
            Players
          </p>
          <h1 className="text-4xl font-semibold text-white">Points Leaders</h1>
        </div>
        <span className="stat-chip px-4 py-2 text-xs text-slate-200">
          {totalPlayers}
        </span>
      </div>

      <div className="relative z-30 mt-6 page-section stagger-1">
        <div className="glass rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-md">
              <PlayerSearch />
            </div>
            <form
              action="/players"
              method="get"
              className="flex w-full flex-col gap-3 md:flex-row md:flex-wrap md:items-end lg:w-auto"
            >
              <input type="hidden" name="page" value="1" />
              <div className="flex w-full flex-col gap-2 md:w-auto">
                <label className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  Team
                </label>
                <select
                  name="team"
                  defaultValue={teamFilter}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-cyan-400 focus:outline-none md:w-44"
                >
                  <option value="">All teams</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.commonName ?? team.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex w-full flex-col gap-2 md:w-auto">
                <label className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  Position
                </label>
                <select
                  name="position"
                  defaultValue={positionFilter}
                  className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-cyan-400 focus:outline-none md:w-36"
                >
                  <option value="">All positions</option>
                  {positions.map((pos) => (
                    <option key={pos.position} value={pos.position ?? ""}>
                      {pos.position ?? ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-cyan-400/20 px-4 text-xs uppercase tracking-[0.25em] text-cyan-100 transition hover:bg-cyan-400/30"
                >
                  Apply
                </button>
                <Link
                  href="/players"
                  className="h-10 rounded-xl border border-white/10 px-4 text-xs uppercase tracking-[0.25em] text-slate-300 transition hover:border-white/25 hover:text-white inline-flex items-center"
                >
                  Clear
                </Link>
              </div>
            </form>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Showing {rangeStart}-{rangeEnd} of {totalPlayers}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 space-y-2 page-section stagger-1">
        {pagedPlayers.map((player, index) => (
          <Link
            key={player.id}
            href={`/players/${player.id}`}
            className="glass group flex items-center gap-4 rounded-2xl p-3 transition hover:-translate-y-0.5 hover:border-white/15"
          >
            <span className="w-8 text-center text-xs text-slate-500">
              {startIndex + index + 1}
            </span>
            <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5 shrink-0">
              {player.headshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.headshotUrl}
                  alt={player.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                  {player.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate group-hover:text-cyan-200">
                {player.fullName}
              </p>
              <p className="text-[10px] text-slate-500">
                {player.teamId} · {player.position} · {player.gp} GP
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-[10px] text-slate-500">G</p>
                <p className="text-xs font-semibold text-white">{player.goals}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">A</p>
                <p className="text-xs font-semibold text-white">{player.assists}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">PTS</p>
                <p className="text-xs font-semibold text-white">{player.points}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Link
            href={`/players?${buildQuery(Math.max(1, safePage - 1))}`}
            aria-disabled={safePage === 1}
            className={`rounded-lg border px-3 py-2 uppercase tracking-[0.2em] transition ${
              safePage === 1
                ? "border-white/5 text-slate-600 pointer-events-none"
                : "border-white/10 text-slate-300 hover:border-white/25 hover:text-white"
            }`}
          >
            Prev
          </Link>
          <span>
            Page {safePage} of {totalPages}
          </span>
          <Link
            href={`/players?${buildQuery(Math.min(totalPages, safePage + 1))}`}
            aria-disabled={safePage === totalPages}
            className={`rounded-lg border px-3 py-2 uppercase tracking-[0.2em] transition ${
              safePage === totalPages
                ? "border-white/5 text-slate-600 pointer-events-none"
                : "border-white/10 text-slate-300 hover:border-white/25 hover:text-white"
            }`}
          >
            Next
          </Link>
        </div>
      </div>
    </main>
  );
}
