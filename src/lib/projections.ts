export type GameLogSample = {
  points: number;
  goals: number;
  assists: number;
  shots?: number;
};

export function weightedPointsPerGame(logs: GameLogSample[]) {
  if (logs.length === 0) {
    return 0;
  }

  const slice = (count: number) => logs.slice(0, count);
  const avg = (items: GameLogSample[]) =>
    items.reduce((sum, item) => sum + item.points, 0) /
    Math.max(items.length, 1);

  const last10 = avg(slice(10));
  const last20 = avg(slice(20));
  const season = avg(logs);

  return last10 * 0.6 + last20 * 0.3 + season * 0.1;
}

export function opponentDefenseAdjustment(gaPerGame: number) {
  if (!Number.isFinite(gaPerGame) || gaPerGame <= 0) {
    return 1;
  }

  const leagueAverage = 3.1;
  const ratio = gaPerGame / leagueAverage;
  return Math.min(Math.max(ratio, 0.8), 1.2);
}

export function homeIceAdjustment(isHome: boolean) {
  return isHome ? 1.05 : 0.97;
}

export function confidenceScore(sampleSize: number) {
  if (sampleSize >= 20) return 0.78;
  if (sampleSize >= 10) return 0.68;
  if (sampleSize >= 5) return 0.58;
  return 0.45;
}

export function matchupExpectedGoals(
  gfPerGame: number,
  opponentGaPerGame: number,
  isHome: boolean
) {
  const base = (gfPerGame + opponentGaPerGame) / 2;
  const homeBoost = isHome ? 0.12 : -0.08;
  return Math.max(base + homeBoost, 1.2);
}
