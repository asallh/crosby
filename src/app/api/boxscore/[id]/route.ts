import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteProps) {
  const { id } = await params;
  const gameId = Number(id);
  if (!Number.isFinite(gameId)) {
    return NextResponse.json({ error: "Invalid game id" }, { status: 400 });
  }

  const response = await fetch(
    `https://api-web.nhle.com/v1/gamecenter/${gameId}/boxscore`,
    { cache: "no-store" }
  );

  const scoringResponse = await fetch(
    `https://api-web.nhle.com/v1/gamecenter/${gameId}/landing`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Boxscore unavailable" }, { status: 404 });
  }

  const data = await response.json();
  const scoringData = scoringResponse.ok ? await scoringResponse.json() : null;
  const scoring = scoringData?.summary?.scoring ?? [];
  return NextResponse.json({
    gameId,
    gameDate: data.gameDate,
    awayTeam: data.awayTeam,
    homeTeam: data.homeTeam,
    scoring,
  });
}
