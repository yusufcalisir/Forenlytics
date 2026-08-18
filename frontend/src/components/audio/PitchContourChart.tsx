"use client";

import React from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface ContourPoint {
  t: number;        // 0..1 normalized time
  f0: number | null; // Hz or null (unvoiced)
}

interface PitchContourChartProps {
  contour1: ContourPoint[];
  contour2: ContourPoint[];
  mean1?: number | null;
  mean2?: number | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl px-3 py-2 text-[11px] shadow-xl">
      <p className="text-neutral-400 mb-1">
        Position: {(parseFloat(label) * 100).toFixed(0)}%
      </p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono">
          {p.name}: {p.value != null ? `${Number(p.value).toFixed(1)} Hz` : "unvoiced"}
        </p>
      ))}
    </div>
  );
};

export function PitchContourChart({
  contour1,
  contour2,
  mean1,
  mean2,
}: PitchContourChartProps) {
  // Merge into unified time axis
  const merged = contour1.map((pt, i) => ({
    t: pt.t,
    f0_target: pt.f0,
    f0_comparison: contour2[i]?.f0 ?? null,
  }));

  const allVals = [
    ...contour1.map((p) => p.f0).filter((v) => v != null),
    ...contour2.map((p) => p.f0).filter((v) => v != null),
  ] as number[];

  const minY = allVals.length ? Math.max(0, Math.min(...allVals) - 20) : 60;
  const maxY = allVals.length ? Math.min(600, Math.max(...allVals) + 20) : 400;

  if (!contour1.length && !contour2.length) {
    return (
      <div className="flex items-center justify-center h-40 text-neutral-500 text-xs">
        Pitch contour data unavailable
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={merged} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <filter id="glow-cyan">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-emerald">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="t"
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fill: "#555", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            interval={14}
          />
          <YAxis
            domain={[minY, maxY]}
            tickFormatter={(v) => `${v}Hz`}
            tick={{ fill: "#555", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 10, color: "#888" }}
            iconType="circle"
            iconSize={6}
          />

          {/* Mean F0 reference lines */}
          {mean1 != null && (
            <ReferenceLine
              y={mean1}
              stroke="rgba(0,240,255,0.25)"
              strokeDasharray="6 3"
              strokeWidth={1}
            />
          )}
          {mean2 != null && (
            <ReferenceLine
              y={mean2}
              stroke="rgba(0,255,136,0.25)"
              strokeDasharray="6 3"
              strokeWidth={1}
            />
          )}

          <Line
            type="monotoneX"
            dataKey="f0_target"
            name="Target"
            stroke="#00f0ff"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            filter="url(#glow-cyan)"
            isAnimationActive={true}
            animationDuration={900}
          />
          <Line
            type="monotoneX"
            dataKey="f0_comparison"
            name="Comparison"
            stroke="#00ff88"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            filter="url(#glow-emerald)"
            isAnimationActive={true}
            animationDuration={900}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-[9px] text-neutral-600 text-center mt-1">
        Gaps = unvoiced frames. Dashed lines = mean F0.
      </p>
    </div>
  );
}
