"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { clsx } from "clsx";

interface MfccCoeff {
  coeff: number;
  val_1: number;
  val_2: number;
  delta: number;
}

interface MfccBarChartProps {
  data: MfccCoeff[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl px-3 py-2 text-[11px] shadow-xl">
      <p className="text-neutral-300 font-medium mb-1.5">MFCC Coefficient {label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono">
          {p.name}: {Number(p.value).toFixed(3)}
        </p>
      ))}
    </div>
  );
};

// Color delta bar by magnitude (green → yellow → red)
function deltaColor(delta: number, max: number): string {
  const ratio = Math.min(delta / Math.max(max, 1), 1.0);
  if (ratio < 0.25) return "#00ff88";
  if (ratio < 0.5) return "#a3e635";
  if (ratio < 0.75) return "#facc15";
  return "#f87171";
}

export function MfccBarChart({ data }: MfccBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-neutral-500 text-xs">
        MFCC data unavailable
      </div>
    );
  }

  const maxDelta = Math.max(...data.map((d) => d.delta));

  return (
    <div className="w-full space-y-4">
      {/* Overlaid coefficient values */}
      <div>
        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2">
          Coefficient Values — Target vs Comparison
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="coeff"
              tickFormatter={(v) => `C${v}`}
              tick={{ fill: "#555", fontSize: 8 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#555", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 10, color: "#888" }}
              iconType="circle"
              iconSize={5}
            />
            <Bar
              dataKey="val_1"
              name="Target"
              fill="rgba(0,240,255,0.7)"
              radius={[2, 2, 0, 0]}
              maxBarSize={14}
              isAnimationActive={true}
              animationDuration={700}
            />
            <Bar
              dataKey="val_2"
              name="Comparison"
              fill="rgba(0,255,136,0.7)"
              radius={[2, 2, 0, 0]}
              maxBarSize={14}
              isAnimationActive={true}
              animationDuration={700}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-coefficient delta strip */}
      <div>
        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2">
          Coefficient Divergence (|Target − Comparison|)
        </p>
        <div className="grid grid-cols-13 gap-px">
          <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}>
            {data.map((d) => {
              const ratio = Math.min(d.delta / Math.max(maxDelta, 0.001), 1);
              const color = deltaColor(d.delta, maxDelta);
              return (
                <div
                  key={d.coeff}
                  className="flex flex-col items-center gap-1"
                  title={`C${d.coeff}: delta=${d.delta.toFixed(3)}`}
                >
                  <div
                    className="w-full rounded-sm transition-all duration-500"
                    style={{
                      height: `${Math.max(ratio * 32, 2)}px`,
                      backgroundColor: color,
                      opacity: 0.85,
                    }}
                  />
                  <span className="text-[7px] text-neutral-600">{d.coeff}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 justify-end">
          <div className="flex items-center gap-1 text-[9px] text-neutral-600">
            <div className="w-2 h-2 rounded-sm bg-green-400 opacity-80" /> Low delta
          </div>
          <div className="flex items-center gap-1 text-[9px] text-neutral-600">
            <div className="w-2 h-2 rounded-sm bg-red-400 opacity-80" /> High delta
          </div>
        </div>
      </div>
    </div>
  );
}
