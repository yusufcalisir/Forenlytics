"use client";

import React, { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { clsx } from "clsx";
import { AlertTriangle, Clock, Info, Eye, EyeOff, Scissors } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface TimelineWindow {
  start_time: number;
  end_time: number;
  vocoder_score: number;
  spectral_score: number;
  prosody_score: number;
  combined_suspicion_score: number;
  boundary_detected: boolean;
  triggered_checks: string[];
  vocoder_subchecks: string[];
  spectral_subchecks: string[];
  prosody_subchecks: string[];
  is_suspicious: boolean;
}

interface SuspectInterval {
  t_start: number;
  t_end: number;
  duration_sec: number;
}

interface SuspicionTimelineProps {
  timeline: TimelineWindow[];
  suspectIntervals?: SuspectInterval[];
  boundaryTimestamps?: number[];
  waveform?: number[];
  durationSec?: number;
}

// ── Series definitions (color, label, data key, description) ─────────────────

const SERIES = [
  {
    key: "combined_suspicion_score" as const,
    label: "Combined Suspicion",
    color: "#ef4444",
    description: "Weighted composite of all three indicators.",
    type: "COMPOSITE",
    dotColor: "#ef4444",
  },
  {
    key: "vocoder_score" as const,
    label: "Vocoder Artifacts",
    color: "#f59e0b",
    description:
      "ACOUSTIC HEURISTIC — Detects signatures left by neural vocoders: high-frequency ripple above 6.5 kHz, harmonic-to-noise ratio anomalies, and phase coherence irregularities. Not a trained classifier.",
    type: "ACOUSTIC_HEURISTIC",
    dotColor: "#f59e0b",
  },
  {
    key: "spectral_score" as const,
    label: "Spectral Inconsistency",
    color: "#10b981",
    description:
      "TEMPORAL HEURISTIC — Compares spectral envelope between adjacent windows. A spike indicates an abrupt acoustic boundary (splice point, recording environment change). Not a trained classifier.",
    type: "TEMPORAL_HEURISTIC",
    dotColor: "#10b981",
  },
  {
    key: "prosody_score" as const,
    label: "Prosody Naturalness",
    color: "#a855f7",
    description:
      "STATISTICAL HEURISTIC — Measures F0 micro-jitter, pitch entropy, syllable rhythm regularity, and energy envelope variance against natural human speech baselines. Not a trained classifier.",
    type: "STATISTICAL_HEURISTIC",
    dotColor: "#a855f7",
  },
];

// ── Custom Tooltip ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, visibleSeries }: any) => {
  if (!active || !payload?.length) return null;
  const d: TimelineWindow = payload[0].payload;
  const combined = d.combined_suspicion_score;

  const allChecks = d.triggered_checks || [];
  const byIndicator = [
    { label: "Vocoder", checks: d.vocoder_subchecks || [], score: d.vocoder_score, color: "#f59e0b" },
    { label: "Spectral", checks: d.spectral_subchecks || [], score: d.spectral_score, color: "#10b981" },
    { label: "Prosody", checks: d.prosody_subchecks || [], score: d.prosody_score, color: "#a855f7" },
  ];

  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 text-xs shadow-2xl min-w-[240px] max-w-[300px] z-50">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 border-b border-white/10 pb-2">
        <span className="font-mono text-neutral-400 text-[11px] flex items-center gap-1">
          <Clock className="w-3 h-3 text-brand-cyan" />
          {d.start_time.toFixed(1)}s – {d.end_time.toFixed(1)}s
        </span>
        <span
          className={clsx(
            "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
            d.is_suspicious
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          )}
        >
          {d.is_suspicious ? "SUSPICIOUS" : "ORGANIC"}
        </span>
      </div>

      {/* Combined score */}
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-neutral-400 text-[10px] uppercase">Combined Suspicion</span>
        <span
          className={clsx(
            "font-mono font-bold text-sm",
            combined > 65 ? "text-red-400" : combined > 40 ? "text-amber-400" : "text-emerald-400"
          )}
        >
          {combined.toFixed(1)}%
        </span>
      </div>

      {/* Per-indicator breakdown */}
      <div className="space-y-1.5 mb-2">
        {byIndicator.map((ind) => (
          <div key={ind.label} className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />
              <span className="text-[10px] text-neutral-400 truncate">{ind.label}</span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-white shrink-0">
              {ind.score.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Triggered sub-checks */}
      {allChecks.length > 0 && (
        <div className="border-t border-white/10 pt-2 space-y-1">
          <span className="text-[9px] uppercase font-bold text-neutral-500 block">
            Triggered Checks
          </span>
          {allChecks.map((c, i) => (
            <div key={i} className="text-[10px] text-amber-300 flex items-center gap-1">
              <span className="text-amber-500">›</span> {c}
            </div>
          ))}
        </div>
      )}

      {d.boundary_detected && (
        <div className="border-t border-white/10 pt-2 mt-1 flex items-center gap-1.5 text-[10px] text-emerald-300">
          <Scissors className="w-3 h-3 text-emerald-400 shrink-0" />
          Spectral boundary / splice marker at this point
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export function SuspicionTimeline({
  timeline,
  suspectIntervals = [],
  boundaryTimestamps = [],
  waveform = [],
  durationSec,
}: SuspicionTimelineProps) {
  // Toggle visibility for each series
  const [visible, setVisible] = useState<Record<string, boolean>>({
    combined_suspicion_score: true,
    vocoder_score: true,
    spectral_score: true,
    prosody_score: true,
  });
  const [expandedLegend, setExpandedLegend] = useState(false);

  const toggle = (key: string) =>
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  const chartData = useMemo(
    () =>
      timeline.map((w) => ({
        ...w,
        t: Math.round(((w.start_time + w.end_time) / 2) * 10) / 10,
      })),
    [timeline]
  );

  const maxT =
    durationSec ||
    (timeline.length ? timeline[timeline.length - 1].end_time : 5.0);

  if (!timeline || timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-44 text-neutral-500 text-xs">
        Timeline scan data unavailable
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* ── Chart ── */}
      <div className="p-4 bg-brand-surface rounded-2xl border border-brand-border relative overflow-hidden">
        {/* Chart header */}
        <div className="flex items-center justify-between mb-3 text-[10px] text-neutral-500 uppercase tracking-wider font-mono">
          <span className="text-neutral-300 font-sans font-semibold">
            4-Indicator Suspicion Timeline
          </span>
          <span className="text-neutral-600">{WINDOW_SEC}s sliding window</span>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />

            <XAxis
              dataKey="t"
              tickFormatter={(v) => `${v}s`}
              tick={{ fill: "#555", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              domain={[0, maxT]}
              type="number"
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#555", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              ticks={[0, 35, 55, 80, 100]}
              width={36}
            />

            <Tooltip
              content={<CustomTooltip visibleSeries={visible} />}
              cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
            />

            {/* Reference thresholds */}
            <ReferenceLine y={55} stroke="rgba(239,68,68,0.25)" strokeDasharray="4 2" />
            <ReferenceLine y={35} stroke="rgba(16,185,129,0.2)" strokeDasharray="4 2" />

            {/* Splice boundary markers */}
            {boundaryTimestamps.map((bt, idx) => (
              <ReferenceLine
                key={`boundary-${idx}`}
                x={bt}
                stroke="rgba(16,185,129,0.55)"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                label={{
                  value: "✂",
                  position: "top",
                  fill: "#10b981",
                  fontSize: 10,
                }}
              />
            ))}

            {/* Suspect interval shading */}
            {suspectIntervals.map((iv, idx) => (
              <ReferenceArea
                key={`suspect-${idx}`}
                x1={iv.t_start}
                x2={iv.t_end}
                y1={0}
                y2={100}
                fill="rgba(239, 68, 68, 0.09)"
                stroke="rgba(239, 68, 68, 0.35)"
                strokeDasharray="3 3"
              />
            ))}

            {/* Combined suspicion — filled area */}
            {visible.combined_suspicion_score && (
              <>
                <defs>
                  <linearGradient id="combinedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="combined_suspicion_score"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#combinedGrad)"
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={700}
                />
              </>
            )}

            {/* Vocoder artifacts line */}
            {visible.vocoder_score && (
              <Line
                type="monotone"
                dataKey="vocoder_score"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="0"
                isAnimationActive={false}
              />
            )}

            {/* Spectral inconsistency line */}
            {visible.spectral_score && (
              <Line
                type="monotone"
                dataKey="spectral_score"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {/* Prosody naturalness line */}
            {visible.prosody_score && (
              <Line
                type="monotone"
                dataKey="prosody_score"
                stroke="#a855f7"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Y-axis labels */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col justify-between h-[120px] pointer-events-none pr-1">
          <span className="text-[8px] text-red-400/50 font-mono">HIGH RISK</span>
          <span className="text-[8px] text-emerald-400/50 font-mono">ORGANIC</span>
        </div>
      </div>

      {/* ── Interactive Series Toggle + Heuristic Legend ── */}
      <div className="p-3.5 bg-brand-surface rounded-xl border border-brand-border space-y-3">
        {/* Toggle buttons */}
        <div className="flex flex-wrap gap-2">
          {SERIES.map((s) => (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-medium transition-all",
                visible[s.key]
                  ? "border-current text-white bg-white/5"
                  : "border-neutral-700 text-neutral-600 bg-transparent"
              )}
              style={{ color: visible[s.key] ? s.color : undefined }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: visible[s.key] ? s.color : "#444" }}
              />
              {s.label}
              {visible[s.key] ? (
                <Eye className="w-3 h-3 opacity-60" />
              ) : (
                <EyeOff className="w-3 h-3 opacity-40" />
              )}
            </button>
          ))}

          <button
            onClick={() => setExpandedLegend((v) => !v)}
            className="ml-auto px-2.5 py-1 rounded-lg border border-neutral-700 text-[10px] text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            {expandedLegend ? "Hide" : "What do these mean?"}
          </button>
        </div>

        {/* Expanded methodological disclosure */}
        {expandedLegend && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-brand-border/50">
            {SERIES.slice(1).map((s) => (
              <div key={s.key} className="p-2.5 rounded-lg border border-brand-border/50 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span style={{ color: s.color }}>{s.label}</span>
                  <span className="text-[8px] px-1 rounded bg-neutral-800 text-neutral-400 font-mono">
                    {s.type.replace("_", " ")}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-snug">{s.description}</p>
              </div>
            ))}
            <div className="sm:col-span-2 p-2.5 rounded-lg border border-brand-cyan/20 bg-brand-cyan/5 text-[10px] text-neutral-400 leading-snug">
              <span className="text-brand-cyan font-bold block mb-0.5">⚠ Combined Suspicion</span>
              Weighted composite of all three indicators. Only the Wav2Vec2 primary model score (shown separately above) is a trained classifier. The three timeline indicators are signal-processing heuristics — useful forensic signals, but not model-validated. Treat each independently and look for convergence.
            </div>
          </div>
        )}
      </div>

      {/* ── Suspect Intervals ── */}
      {suspectIntervals.length > 0 ? (
        <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Temporally Localized Suspicious Segments ({suspectIntervals.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suspectIntervals.map((iv, i) => (
              <div
                key={i}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 font-mono text-xs text-red-200 flex items-center gap-2"
              >
                <Clock className="w-3 h-3 text-red-400" />
                <span className="font-bold">
                  {iv.t_start}s – {iv.t_end}s
                </span>
                <span className="text-[10px] text-red-300/70">({iv.duration_sec}s)</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-400">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>No contiguous suspicious segments detected across the timeline.</span>
        </div>
      )}

      {/* ── Splice Boundary Markers ── */}
      {boundaryTimestamps.length > 0 && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Scissors className="w-3.5 h-3.5 shrink-0" />
            Splice Boundary Markers from Spectral Inconsistency Indicator
          </div>
          <div className="flex flex-wrap gap-2">
            {boundaryTimestamps.map((bt, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded font-mono text-[10px] text-emerald-200 bg-emerald-500/20 border border-emerald-500/30"
              >
                ✂ {bt.toFixed(1)}s
              </span>
            ))}
          </div>
          <p className="text-[10px] text-neutral-500 leading-snug">
            These markers represent points where cross-window MFCC distance or noise floor shifted beyond 2.5σ of the file&apos;s own baseline — a signal-processing heuristic for audio editing boundaries.
          </p>
        </div>
      )}
    </div>
  );
}

const WINDOW_SEC = 1.5;
