import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ players: [] });
  }

  const players = await prisma.player.findMany({
    where: {
      fullName: {
        contains: query,
        mode: "insensitive",
      },
    },
    orderBy: { fullName: "asc" },
    take: 8,
    select: {
      id: true,
      fullName: true,
      teamId: true,
      headshotUrl: true,
      position: true,
    },
  });

  return NextResponse.json({ players });
}
