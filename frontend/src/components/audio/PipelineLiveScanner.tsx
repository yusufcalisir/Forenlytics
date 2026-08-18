"use client";

import React, { useEffect, useState } from "react";
import {
  Cpu, Waves, Sliders, BarChart3, Radio, Sparkles, Activity,
  Clock, Scissors, CheckCircle2, Loader2, Terminal, Shield, Zap
} from "lucide-react";
import { clsx } from "clsx";
import { useAppStore } from "@/lib/store";

interface PipelineLiveScannerProps {
  mode: "compare" | "deepfake";
}

export function PipelineLiveScanner({ mode }: PipelineLiveScannerProps) {
  const jobKey = mode === "compare" ? "audio_compare" : "audio_deepfake";
  const backendProgress = useAppStore((state) => state.jobProgress[jobKey]);

  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);

  const compareStages = [
    { key: "vad", name: "Adaptive Ingestion & Voice Activity Detection", engine: "VAD Filter (16kHz)", icon: Radio },
    { key: "neural", name: "WavLM & ECAPA Neural Latent Projections", engine: "WavLM-Base+ Transformer", icon: Cpu },
    { key: "formants", name: "Vocal Tract Linear Predictive Resonances", engine: "LPC Root Solver (F1-F4)", icon: Sliders },
    { key: "pitch", name: "Probabilistic Pitch (F0) Intonation Tracking", engine: "pYIN Micro-Jitter (60-500Hz)", icon: Waves },
    { key: "mfcc", name: "13-Band Mel-Frequency Spectral Dynamics", engine: "MFCC & Centroid Extractor", icon: BarChart3 },
    { key: "rhythm", name: "Temporal Rhythm & Syllable Onset Cadence", engine: "Speech-to-Pause Analyzer", icon: Activity },
    { key: "fusion", name: "Bayesian 6-Dimensional Fusion & Synthesis", engine: "Contradiction Engine", icon: Sparkles },
  ];

  const deepfakeStages = [
    { key: "segmentation", name: "1.5s Sliding-Window Temporal Segmentation", engine: "Overlap Window Slicer", icon: Clock },
    { key: "neural_model", name: "Primary Wav2Vec2 Neural Spoof Classification", engine: "Wav2Vec2 Sequence Model", icon: Cpu },
    { key: "vocoder", name: "High-Frequency Vocoder Ripple & HNR Scan", engine: "GAN Ripple Detector (>6.5kHz)", icon: Radio },
    { key: "spectral", name: "Cross-Window Spectral Inconsistency & Splicing", engine: "Boundary Jump (2.5σ Delta)", icon: Scissors },
    { key: "prosody", name: "Pitch Entropy & Intonation Naturalness", engine: "F0 Entropy & Cadence CoV", icon: Waves },
    { key: "synthesis", name: "4-Series Timeline Assembly & Categorization", engine: "Multi-Signal Synthesis", icon: Sparkles },
  ];

  const stages = mode === "compare" ? compareStages : deepfakeStages;

  // Real backend active index
  const currentStepIndex = backendProgress?.stage_index ?? 0;
  const currentProgressPct = backendProgress?.progress_pct ?? 15;
  const currentTelemetryLog = backendProgress?.telemetry_log;

  // Live timer tick
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 60);

    return () => clearInterval(interval);
  }, []);

  // Update telemetry log list when backend sends new log
  useEffect(() => {
    if (currentTelemetryLog) {
      setTelemetryLogs((prev) => {
        if (prev.length > 0 && prev[prev.length - 1] === currentTelemetryLog) {
          return prev;
        }
        return [...prev.slice(-4), currentTelemetryLog];
      });
    } else {
      const stage = stages[currentStepIndex] || stages[0];
      const initialLog = `[${(elapsedMs / 1000).toFixed(2)}s] ENGAGING: ${stage.engine} -> Processing audio frames...`;
      setTelemetryLogs([initialLog]);
    }
  }, [currentTelemetryLog, currentStepIndex, stages]);

  const activeStage = stages[currentStepIndex] || stages[0];

  return (
    <div className={clsx(
      "p-5 rounded-2xl border relative overflow-hidden transition-all animate-in fade-in duration-300",
      mode === "compare"
        ? "bg-gradient-to-br from-brand-panel via-brand-panel to-brand-cyan/5 border-brand-cyan/30 shadow-[0_0_30px_rgba(0,240,255,0.15)]"
        : "bg-gradient-to-br from-brand-panel via-brand-panel to-red-500/5 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
    )}>
      {/* Top Banner / HUD Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "w-10 h-10 rounded-xl flex items-center justify-center border animate-pulse",
            mode === "compare" ? "bg-brand-cyan/15 border-brand-cyan/40 text-brand-cyan" : "bg-red-500/15 border-red-500/40 text-red-400"
          )}>
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={clsx("text-xs font-bold uppercase tracking-wider", mode === "compare" ? "text-brand-cyan" : "text-red-400")}>
                {mode === "compare" ? "Live 6D Biometric Pipeline Active" : "Live Synthetic Speech Scanner Active"}
              </span>
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-neutral-300">
                STAGE {currentStepIndex + 1} OF {stages.length} ({currentProgressPct}%)
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
              Active Engine: <b className="text-white">{activeStage?.name}</b>
            </p>
          </div>
        </div>

        {/* Live Timer & Progress */}
        <div className="flex items-center gap-4 bg-black/40 px-3.5 py-2 rounded-xl border border-brand-border font-mono text-xs">
          <div>
            <span className="text-[9px] text-neutral-500 uppercase block">Execution Time</span>
            <span className={clsx("font-bold", mode === "compare" ? "text-brand-cyan" : "text-red-400")}>
              {(elapsedMs / 1000).toFixed(2)}s
            </span>
          </div>
          <div className="h-6 w-px bg-brand-border" />
          <div>
            <span className="text-[9px] text-neutral-500 uppercase block">Process State</span>
            <span className={clsx("font-bold flex items-center gap-1", mode === "compare" ? "text-brand-cyan" : "text-red-400")}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
              STREAMING
            </span>
          </div>
        </div>
      </div>

      {/* Cyber Waveform / Laser Visualizer */}
      <div className="my-4 p-3 bg-black/40 rounded-xl border border-brand-border/60 relative overflow-hidden h-14 flex items-center justify-between gap-1 px-3">
        {/* Animated Laser Sweep Line */}
        <div
          className={clsx(
            "absolute top-0 bottom-0 w-24 bg-gradient-to-r pointer-events-none",
            mode === "compare" ? "from-transparent via-brand-cyan/25 to-transparent" : "from-transparent via-red-500/25 to-transparent"
          )}
          style={{
            animation: "laserSweep 1.8s ease-in-out infinite alternate"
          }}
        />

        {/* Frequency visualizer bars */}
        {Array.from({ length: 48 }).map((_, i) => {
          const height = Math.sin((i + elapsedMs / 80) * 0.45) * 35 + 45;
          const isActive = Math.abs((i / 48) - ((currentStepIndex + 0.5) / stages.length)) < 0.28;
          return (
            <div
              key={i}
              className={clsx(
                "w-1 rounded-full transition-all duration-75",
                isActive
                  ? (mode === "compare" ? "bg-brand-cyan shadow-[0_0_10px_rgba(0,240,255,0.9)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]")
                  : "bg-white/10"
              )}
              style={{ height: `${Math.max(12, height)}%` }}
            />
          );
        })}
      </div>

      {/* Real-Time Step Stepper List (synchronized with Python backend) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isPending = idx > currentStepIndex;

          return (
            <div
              key={stage.key}
              className={clsx(
                "p-2.5 rounded-xl border text-xs flex items-center gap-2.5 transition-all duration-200",
                isCurrent
                  ? (mode === "compare"
                      ? "bg-brand-cyan/20 border-brand-cyan text-white shadow-[0_0_18px_rgba(0,240,255,0.2)] ring-1 ring-brand-cyan/40 scale-[1.01]"
                      : "bg-red-500/20 border-red-500 text-white shadow-[0_0_18px_rgba(239,68,68,0.2)] ring-1 ring-red-500/40 scale-[1.01]")
                  : isDone
                  ? "bg-emerald-500/5 border-emerald-500/30 text-neutral-300"
                  : "bg-black/20 border-brand-border/40 text-neutral-600 opacity-60"
              )}
            >
              <div className={clsx(
                "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all",
                isCurrent
                  ? (mode === "compare" ? "bg-brand-cyan text-black border-brand-cyan font-bold" : "bg-red-500 text-white border-red-500 font-bold")
                  : isDone
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : "bg-brand-surface text-neutral-600 border-brand-border"
              )}>
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : isCurrent ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className={clsx("font-bold truncate text-[11px] block", isCurrent ? "text-white" : isDone ? "text-neutral-200" : "text-neutral-500")}>
                    {stage.name}
                  </span>
                  <span className={clsx(
                    "text-[8px] font-mono shrink-0 ml-1 font-bold",
                    isCurrent ? (mode === "compare" ? "text-brand-cyan" : "text-red-400") : isDone ? "text-emerald-400" : "text-neutral-600"
                  )}>
                    {isDone ? "PASS ✓" : isCurrent ? "ACTIVE" : "QUEUED"}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-neutral-400 truncate block">
                  {stage.engine}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Terminal Telemetry Log (streaming from backend) */}
      <div className="bg-black/70 rounded-xl p-3 border border-brand-border font-mono text-[10px] space-y-1 overflow-hidden">
        <div className="flex items-center justify-between text-neutral-500 border-b border-brand-border/40 pb-1 mb-1">
          <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-neutral-400">
            <Terminal className="w-3 h-3 text-neutral-400" /> Real-Time Telemetry Bus (Backend Stream)
          </span>
          <span className="text-[8px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> SYNCED (350ms)
          </span>
        </div>
        {telemetryLogs.map((log, i) => (
          <div key={i} className="text-neutral-300 truncate leading-snug flex items-center gap-1">
            <span className={mode === "compare" ? "text-brand-cyan" : "text-red-400"}>›</span> {log}
          </div>
        ))}
      </div>
    </div>
  );
}
