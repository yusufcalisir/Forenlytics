"use client";

import React, { useMemo } from "react";
import { clsx } from "clsx";

interface RadarDimension {
  dimension: string;
  key: string;
  score: number | null;
  weight_pct: number;
  available: boolean;
}

interface RadarChartProps {
  data: RadarDimension[];
  size?: number;
}

const COLORS = {
  available: { fill: "rgba(0,240,255,0.12)", stroke: "#00f0ff", dot: "#00f0ff" },
  unavailable: { fill: "rgba(100,100,100,0.08)", stroke: "#444", dot: "#444" },
  grid: "rgba(255,255,255,0.06)",
  label: "#9ca3af",
  labelHighlight: "#e5e7eb",
};

function polarToXY(cx: number, cy: number, r: number, angle: number) {
  // 0° at top, clockwise
  const rad = (angle - 90) * (Math.PI / 180);
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export function RadarChart({ data, size = 320 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.37;
  const labelR = size * 0.47;
  const n = data.length;
  const rings = [20, 40, 60, 80, 100];

  const angles = useMemo(
    () => data.map((_, i) => (360 / n) * i),
    [data, n]
  );

  // Build polygon points from scores
  const polyPoints = useMemo(() => {
    return data.map((d, i) => {
      const score = d.available && d.score !== null ? d.score : 0;
      const r = (score / 100) * maxR;
      return polarToXY(cx, cy, r, angles[i]);
    });
  }, [data, angles, cx, cy, maxR]);

  const polyStr = polyPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid ring polygons
  const ringPolygons = rings.map((pct) => {
    const r = (pct / 100) * maxR;
    const pts = Array.from({ length: n }, (_, i) => polarToXY(cx, cy, r, angles[i]));
    return pts.map((p) => `${p.x},${p.y}`).join(" ");
  });

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Grid rings */}
        {ringPolygons.map((pts, ri) => (
          <polygon
            key={`ring-${ri}`}
            points={pts}
            fill="none"
            stroke={COLORS.grid}
            strokeWidth={ri === 4 ? 1.5 : 1}
          />
        ))}

        {/* Axis lines from center to vertex */}
        {angles.map((angle, i) => {
          const outer = polarToXY(cx, cy, maxR, angle);
          return (
            <line
              key={`axis-${i}`}
              x1={cx} y1={cy}
              x2={outer.x} y2={outer.y}
              stroke={COLORS.grid}
              strokeWidth={1}
            />
          );
        })}

        {/* Ring % labels (right side) */}
        {rings.map((pct) => {
          const rp = polarToXY(cx, cy, (pct / 100) * maxR, 0);
          return (
            <text
              key={`pct-${pct}`}
              x={rp.x + 4}
              y={rp.y + 3}
              fontSize={8}
              fill="#444"
              textAnchor="start"
            >
              {pct}
            </text>
          );
        })}

        {/* Data polygon — glow fill */}
        <defs>
          <filter id="radar-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polygon
          points={polyStr}
          fill={COLORS.available.fill}
          stroke={COLORS.available.stroke}
          strokeWidth={2}
          strokeLinejoin="round"
          filter="url(#radar-glow)"
          className="transition-all duration-700"
        />

        {/* Data point dots */}
        {polyPoints.map((p, i) => {
          const d = data[i];
          const isAvail = d.available && d.score !== null;
          return (
            <circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={isAvail ? 4 : 2}
              fill={isAvail ? COLORS.available.dot : COLORS.unavailable.dot}
              stroke={isAvail ? "rgba(0,240,255,0.3)" : "transparent"}
              strokeWidth={isAvail ? 6 : 0}
              className="transition-all duration-700"
            />
          );
        })}

        {/* Axis labels */}
        {data.map((d, i) => {
          const pos = polarToXY(cx, cy, labelR, angles[i]);
          const isAvail = d.available && d.score !== null;
          const scoreStr = isAvail ? `${d.score?.toFixed(0)}%` : "N/A";

          // Anchor based on position
          let anchor: "start" | "middle" | "end" = "middle";
          const relX = pos.x - cx;
          if (relX > 15) anchor = "start";
          else if (relX < -15) anchor = "end";

          return (
            <g key={`label-${i}`}>
              <text
                x={pos.x}
                y={pos.y - 6}
                fontSize={9.5}
                fontWeight="600"
                fill={isAvail ? COLORS.labelHighlight : COLORS.label}
                textAnchor={anchor}
                letterSpacing="0.04em"
              >
                {d.dimension.toUpperCase()}
              </text>
              <text
                x={pos.x}
                y={pos.y + 8}
                fontSize={11}
                fontWeight="700"
                fill={isAvail ? "#00f0ff" : "#555"}
                textAnchor={anchor}
              >
                {scoreStr}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1 max-w-[340px]">
        {data.map((d) => (
          <div key={d.key} className="flex items-center gap-1.5 text-[10px] text-neutral-500">
            <div
              className={clsx(
                "w-2 h-2 rounded-full",
                d.available ? "bg-brand-cyan" : "bg-neutral-700"
              )}
            />
            <span>{d.dimension}</span>
            <span className="text-neutral-600">({d.weight_pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
