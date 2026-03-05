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

export function confidenceScore(logs: GameLogSample[]) {
  if (logs.length === 0) return 0.4;

  const points = logs.map((log) => log.points ?? 0);
  const sampleSize = points.length;
  const average = points.reduce((sum, value) => sum + value, 0) / sampleSize;
  const variance =
    points.reduce((sum, value) => sum + (value - average) ** 2, 0) / sampleSize;
  const volatility = Math.min(Math.sqrt(variance), 3);
  const stabilityScore = 1 - Math.min(volatility / 2.2, 1);

  const recentSample = points.slice(0, Math.min(sampleSize, 8));
  const recentAverage =
    recentSample.reduce((sum, value) => sum + value, 0) /
    Math.max(recentSample.length, 1);
  const momentumDelta = recentAverage - average;
  const momentumScore = Math.min(Math.max(momentumDelta / 1.8, -1), 1) * 0.5 + 0.5;

  let streak = 0;
  for (const value of points) {
    if (value > 0) streak += 1;
    else break;
  }
  const streakScore = Math.min(streak / 8, 1);

  const sampleScore = 1 - Math.exp(-sampleSize / 28);

  const score =
    0.35 +
    sampleScore * 0.32 +
    stabilityScore * 0.2 +
    momentumScore * 0.1 +
    streakScore * 0.03;

  return Math.min(Math.max(score, 0.3), 0.92);
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
