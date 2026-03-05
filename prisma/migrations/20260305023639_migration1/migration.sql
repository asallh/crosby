-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commonName" TEXT NOT NULL,
    "conference" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "primaryColor" TEXT,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "shoots" TEXT,
    "heightIn" INTEGER,
    "weightLb" INTEGER,
    "headshotUrl" TEXT,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandingsSnapshot" (
    "id" SERIAL NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "otLosses" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "pointPct" DOUBLE PRECISION NOT NULL,
    "conferenceRank" INTEGER NOT NULL,
    "divisionRank" INTEGER NOT NULL,
    "leagueRank" INTEGER NOT NULL,
    "wildcardRank" INTEGER,

    CONSTRAINT "StandingsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" INTEGER NOT NULL,
    "season" TEXT NOT NULL,
    "gameDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerGameLog" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "goals" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "shots" INTEGER,
    "toi" INTEGER,

    CONSTRAINT "PlayerGameLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamStats" (
    "id" SERIAL NOT NULL,
    "teamId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "gamesPlayed" INTEGER NOT NULL,
    "goalsFor" INTEGER NOT NULL,
    "goalsAgainst" INTEGER NOT NULL,
    "gfPerGame" DOUBLE PRECISION NOT NULL,
    "gaPerGame" DOUBLE PRECISION NOT NULL,
    "shotsFor" INTEGER,
    "shotsAgainst" INTEGER,
    "ppPct" DOUBLE PRECISION,
    "pkPct" DOUBLE PRECISION,

    CONSTRAINT "TeamStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Projection" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "expectedPoints" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Projection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchupProjection" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "homeExpectedGoals" DOUBLE PRECISION NOT NULL,
    "awayExpectedGoals" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchupProjection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StandingsSnapshot_snapshotDate_idx" ON "StandingsSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "StandingsSnapshot_teamId_idx" ON "StandingsSnapshot"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerGameLog_playerId_gameId_key" ON "PlayerGameLog"("playerId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamStats_teamId_season_key" ON "TeamStats"("teamId", "season");

-- CreateIndex
CREATE UNIQUE INDEX "Projection_playerId_gameId_key" ON "Projection"("playerId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchupProjection_gameId_key" ON "MatchupProjection"("gameId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandingsSnapshot" ADD CONSTRAINT "StandingsSnapshot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerGameLog" ADD CONSTRAINT "PlayerGameLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerGameLog" ADD CONSTRAINT "PlayerGameLog_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamStats" ADD CONSTRAINT "TeamStats_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projection" ADD CONSTRAINT "Projection_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Projection" ADD CONSTRAINT "Projection_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchupProjection" ADD CONSTRAINT "MatchupProjection_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
