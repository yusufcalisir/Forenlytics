"use client";

import React from "react";
import { clsx } from "clsx";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

interface TelemetryRow {
  dimension: string;
  key: string;
  score: number | null;
  available: boolean;
  reason?: string | null;
  val_1?: number | string | null;
  val_2?: number | string | null;
  unit?: string;
  delta_label?: string;
  delta?: number | null;
  interpretation?: string;
}

interface TelemetryTableProps {
  rows: TelemetryRow[];
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono text-neutral-500 bg-neutral-800/60 border border-neutral-700">
        N/A
      </span>
    );
  }
  const color =
    score >= 75
      ? "text-brand-emerald border-brand-emerald/30 bg-brand-emerald/10"
      : score >= 50
      ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"
      : "text-red-400 border-red-400/30 bg-red-400/10";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold border",
        color
      )}
    >
      {score.toFixed(0)}%
    </span>
  );
}

function StatusIcon({ available, score }: { available: boolean; score: number | null }) {
  if (!available) return <XCircle className="w-3.5 h-3.5 text-neutral-600 shrink-0" />;
  if (score === null) return <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0" />;
  if (score >= 65) return <CheckCircle2 className="w-3.5 h-3.5 text-brand-emerald shrink-0" />;
  if (score >= 45) return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
  return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
}

const DIMENSION_LABELS: Record<string, string> = {
  neural_identity: "Neural Identity",
  pitch: "Pitch & Intonation",
  formants: "Vocal Tract Formants",
  spectral_mfcc: "Spectral & MFCC",
  rhythm: "Speaking Rhythm",
  energy: "Energy Dynamics",
};

export function TelemetryTable({ rows }: TelemetryTableProps) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-brand-border/60">
            <th className="text-left text-[10px] text-neutral-500 uppercase tracking-widest py-2 pr-4 font-medium w-40">
              Dimension
            </th>
            <th className="text-center text-[10px] text-neutral-500 uppercase tracking-widest py-2 px-2 font-medium w-20">
              Sub-Score
            </th>
            <th className="text-left text-[10px] text-neutral-500 uppercase tracking-widest py-2 px-2 font-medium w-24">
              Target
            </th>
            <th className="text-left text-[10px] text-neutral-500 uppercase tracking-widest py-2 px-2 font-medium w-24">
              Comparison
            </th>
            <th className="text-left text-[10px] text-neutral-500 uppercase tracking-widest py-2 px-2 font-medium w-24">
              Delta
            </th>
            <th className="text-left text-[10px] text-neutral-500 uppercase tracking-widest py-2 pl-2 font-medium">
              Forensic Interpretation
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.key}
              className={clsx(
                "border-b border-brand-border/30 transition-colors hover:bg-white/[0.015]",
                i % 2 === 0 ? "bg-transparent" : "bg-white/[0.01]"
              )}
            >
              {/* Dimension name */}
              <td className="py-3 pr-4 align-top">
                <div className="flex items-center gap-2">
                  <StatusIcon available={row.available} score={row.score} />
                  <div>
                    <p className="text-neutral-200 font-medium text-[11px]">
                      {DIMENSION_LABELS[row.key] || row.dimension}
                    </p>
                    {!row.available && row.reason && (
                      <p className="text-neutral-600 text-[9px] mt-0.5">{row.reason}</p>
                    )}
                  </div>
                </div>
              </td>

              {/* Sub-score */}
              <td className="py-3 px-2 text-center align-top">
                <ScorePill score={row.score ?? null} />
              </td>

              {/* Target value */}
              <td className="py-3 px-2 align-top font-mono text-brand-cyan text-[11px]">
                {row.val_1 != null
                  ? `${typeof row.val_1 === "number" ? row.val_1.toFixed(1) : row.val_1}${row.unit ? ` ${row.unit}` : ""}`
                  : "—"}
              </td>

              {/* Comparison value */}
              <td className="py-3 px-2 align-top font-mono text-brand-emerald text-[11px]">
                {row.val_2 != null
                  ? `${typeof row.val_2 === "number" ? row.val_2.toFixed(1) : row.val_2}${row.unit ? ` ${row.unit}` : ""}`
                  : "—"}
              </td>

              {/* Delta */}
              <td className="py-3 px-2 align-top font-mono text-neutral-400 text-[11px]">
                {row.delta != null ? (
                  <span
                    className={clsx(
                      row.delta > 50
                        ? "text-red-400"
                        : row.delta > 20
                        ? "text-yellow-400"
                        : "text-neutral-400"
                    )}
                  >
                    ±{typeof row.delta === "number" ? row.delta.toFixed(1) : row.delta}
                    {row.unit ? ` ${row.unit}` : ""}
                  </span>
                ) : (
                  "—"
                )}
              </td>

              {/* Interpretation */}
              <td className="py-3 pl-2 align-top text-neutral-400 text-[11px] leading-relaxed max-w-xs">
                {row.available
                  ? row.interpretation || "—"
                  : row.reason
                  ? `Unavailable: ${row.reason}`
                  : "Analysis not performed."}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
