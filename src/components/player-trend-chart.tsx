"use client";

import { useMemo, useState } from "react";

type TrendPoint = {
  label: string;
  gameNumber: number;
  cumulativePoints: number;
};

type Props = {
  seasonData: TrendPoint[];
  lastTenData: TrendPoint[];
  currentGames: number;
  totalGames: number;
  projectedEnd: number;
};

function smoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;

  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    d += ` Q${current.x} ${current.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` T${last.x} ${last.y}`;
  return d;
}

export default function PlayerTrendChart({
  seasonData,
  lastTenData,
  currentGames,
  totalGames,
  projectedEnd,
}: Props) {
  const [view, setView] = useState<"season" | "last10">("season");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const data = useMemo(
    () => (view === "season" ? seasonData : lastTenData),
    [view, seasonData, lastTenData]
  );

  if (data.length < 2) {
    return (
      <div className="glass rounded-3xl p-6">
        <h2 className="text-xl font-semibold text-white">Points Trend</h2>
        <p className="mt-3 text-sm text-slate-400">
          Not enough games yet to chart a trend.
        </p>
      </div>
    );
  }

  const width = 1000;
  const height = 240;
  const paddingX = 36;
  const paddingY = 26;

  const values = data.map((point) => point.cumulativePoints);
  values.push(projectedEnd);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const span = Math.max(maxValue - minValue, 1);
  const topValue = maxValue + span * 0.2;
  const bottomValue = Math.max(0, minValue - span * 0.2);
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const xDomainStart = view === "season" ? 1 : data[0].gameNumber;
  const xDomainEnd = view === "season" ? totalGames : data[data.length - 1].gameNumber;
  const scaleX = (gameNumber: number) =>
    Math.round(
      paddingX +
        ((Math.max(gameNumber - xDomainStart, 0) /
          Math.max(xDomainEnd - xDomainStart, 1)) *
          innerWidth)
    );
  const inverseX = (xValue: number) =>
    xDomainStart +
    ((xValue - paddingX) / innerWidth) * (xDomainEnd - xDomainStart);
  const scaleY = (value: number) =>
    Math.round(
      paddingY + ((topValue - value) / (topValue - bottomValue)) * innerHeight
    );

  const actualPoints = data.map((point) => ({
    x: scaleX(point.gameNumber),
    y: scaleY(point.cumulativePoints),
  }));
  const actualPath = smoothPath(actualPoints);
  const baselineY = paddingY + innerHeight;
  const areaPath = `${actualPath} L${actualPoints[actualPoints.length - 1].x} ${baselineY} L${actualPoints[0].x} ${baselineY} Z`;

  const currentPoint = {
    x: scaleX(currentGames),
    y: scaleY(data[data.length - 1].cumulativePoints),
  };
  const projectedPoint = {
    x: scaleX(totalGames),
    y: scaleY(projectedEnd),
  };
  const projectionPath = `M${currentPoint.x} ${currentPoint.y} L${projectedPoint.x} ${projectedPoint.y}`;
  const currentActual = data[data.length - 1].cumulativePoints;
  const projectionSlope =
    totalGames === currentGames
      ? 0
      : (projectedEnd - currentActual) / (totalGames - currentGames);
  const tickInterval = 10;
  const tickStart = view === "season"
    ? tickInterval
    : Math.ceil(data[0].gameNumber / tickInterval) * tickInterval;
  const tickEnd = view === "season" ? totalGames : data[data.length - 1].gameNumber;
  const tickGames = [] as number[];
  for (let tick = tickStart; tick <= tickEnd; tick += tickInterval) {
    tickGames.push(tick);
  }

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Trend
          </p>
          <h2 className="text-2xl font-semibold text-white">Points Momentum</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setView("season")}
              className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] transition ${
                view === "season"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Season
            </button>
            <button
              type="button"
              onClick={() => setView("last10")}
              className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] transition ${
                view === "last10"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Last 10
            </button>
          </div>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-300" />
            Current
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            Projected end
          </span>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1324] via-[#0b1424] to-[#0f1b30]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 w-full"
          role="img"
          aria-label="Points trend chart"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const scale = width / rect.width;
            const x = (event.clientX - rect.left) * scale;
            const xValue = Math.min(Math.max(x, paddingX), width - paddingX);
            const gameValue = inverseX(xValue);
            let nearestIndex = 0;
            let nearestDistance = Infinity;
            for (let i = 0; i < data.length; i += 1) {
              const distance = Math.abs(data[i].gameNumber - gameValue);
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
              }
            }
            setHoverIndex(nearestIndex);
          }}
        >
          <defs>
            <linearGradient id="pointsTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#5eead4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#5eead4" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="pointsTrendLine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#5eead4" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={paddingX}
              x2={width - paddingX}
              y1={Math.round(paddingY + innerHeight * ratio)}
              y2={Math.round(paddingY + innerHeight * ratio)}
              stroke="#ffffff"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
          ))}

          {tickGames.map((tick) => {
            const x = scaleX(tick);
            return (
              <g key={tick}>
                <line
                  x1={x}
                  x2={x}
                  y1={baselineY}
                  y2={baselineY + 6}
                  stroke="#ffffff"
                  strokeOpacity="0.12"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={baselineY + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#94a3b8"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#pointsTrendFill)" />
          <path
            d={actualPath}
            fill="none"
            stroke="url(#pointsTrendLine)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={projectionPath}
            fill="none"
            stroke="#94a3b8"
            strokeOpacity="0.7"
            strokeWidth="2"
            strokeDasharray="6 8"
            strokeLinecap="round"
          />

          {hoverIndex !== null && (() => {
            const hoverPoint = actualPoints[hoverIndex];
            const hoverData = data[hoverIndex];
            const projectedAtHover =
              currentActual +
              projectionSlope * (hoverData.gameNumber - currentGames);
            const tooltipWidth = 180;
            const tooltipHeight = 56;
            const tooltipX =
              hoverPoint.x + 16 + tooltipWidth > width - paddingX
                ? hoverPoint.x - tooltipWidth - 16
                : hoverPoint.x + 16;
            const tooltipY = Math.max(hoverPoint.y - tooltipHeight - 12, paddingY);

            return (
              <g>
                <line
                  x1={hoverPoint.x}
                  x2={hoverPoint.x}
                  y1={paddingY}
                  y2={baselineY}
                  stroke="#ffffff"
                  strokeOpacity="0.08"
                  strokeWidth="1"
                />
                <circle
                  cx={hoverPoint.x}
                  cy={hoverPoint.y}
                  r="6"
                  fill="#0f172a"
                  stroke="#5eead4"
                  strokeWidth="2"
                />
                <g transform={`translate(${tooltipX} ${tooltipY})`}>
                  <rect
                    width={tooltipWidth}
                    height={tooltipHeight}
                    rx="10"
                    fill="#0b1220"
                    stroke="#1e293b"
                    strokeWidth="1"
                    opacity="0.95"
                  />
                  <text
                    x="12"
                    y="18"
                    fill="#e2e8f0"
                    fontSize="11"
                    fontWeight="600"
                  >
                    Game {hoverData.gameNumber} · {hoverData.label}
                  </text>
                  <text x="12" y="36" fill="#94a3b8" fontSize="10">
                    Actual: {hoverData.cumulativePoints} pts
                  </text>
                  <text x="12" y="50" fill="#94a3b8" fontSize="10">
                    Projected: {projectedAtHover.toFixed(1)} pts
                  </text>
                </g>
              </g>
            );
          })()}

          <circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r="6"
            fill="#0f172a"
            stroke="#5eead4"
            strokeWidth="2"
          />
          <circle
            cx={projectedPoint.x}
            cy={projectedPoint.y}
            r="4"
            fill="#0f172a"
            stroke="#94a3b8"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <span>
          Games {data[0].gameNumber}-{data[data.length - 1].gameNumber} of {totalGames}
        </span>
        <span className="text-slate-300">
          Now: {data[data.length - 1].cumulativePoints} pts · End: {projectedEnd.toFixed(1)}
        </span>
      </div>
    </div>
  );
}
