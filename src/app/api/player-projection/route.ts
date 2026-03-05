import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = Number(searchParams.get("playerId"));

  if (!Number.isFinite(playerId)) {
    return NextResponse.json({ projection: null }, { status: 400 });
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) {
    return NextResponse.json({ projection: null }, { status: 404 });
  }

  const projection = await prisma.projection.findFirst({
    where: {
      playerId,
      game: { gameDate: { gte: new Date() } },
    },
    orderBy: { game: { gameDate: "asc" } },
    include: {
      game: {
        include: {
          homeTeam: true,
          awayTeam: true,
        },
      },
    },
  });

  if (!projection) {
    return NextResponse.json({ projection: null });
  }

  const isHome = projection.game.homeTeamId === player.teamId;
  const opponent = isHome
    ? projection.game.awayTeamId
    : projection.game.homeTeamId;

  return NextResponse.json({
    projection: {
      playerId,
      expectedPoints: projection.expectedPoints,
      confidence: projection.confidence,
      opponent,
      gameDate: projection.game.gameDate,
      home: isHome,
      team: player.teamId,
      headshotUrl: player.headshotUrl,
    },
  });
}
