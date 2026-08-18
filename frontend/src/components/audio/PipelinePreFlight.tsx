"use client";

import React, { useState } from "react";
import {
  Cpu, Waves, Sliders, BarChart3, Radio, Sparkles, Layers,
  Scissors, Clock, ShieldCheck, Zap, Activity, Info, CheckCircle2,
  ChevronRight, Terminal, Lock
} from "lucide-react";
import { clsx } from "clsx";

interface PipelinePreFlightProps {
  mode: "compare" | "deepfake";
}

export function PipelinePreFlight({ mode }: PipelinePreFlightProps) {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  if (mode === "compare") {
    const steps = [
      {
        id: "step-1",
        phase: "PHASE 01",
        title: "Adaptive VAD & Normalization",
        badge: "ACOUSTIC INGEST",
        color: "cyan",
        icon: Radio,
        summary: "16 kHz resample, zero-phase bandpass filtering, and energy-based speech isolation.",
        details: "Strips background noise and silent intervals to ensure pure vocal phonation is fed into neural extractors.",
        telemetry: ["Sample Rate: 16,000 Hz", "VAD Threshold: Adaptive Energy", "Channel: Mono 32-bit Float"]
      },
      {
        id: "step-2",
        phase: "PHASE 02",
        title: "Deep Neural Identity Embeddings",
        badge: "WAVLM + ECAPA",
        color: "cyan",
        icon: Cpu,
        summary: "Dual self-supervised transformer extraction into 512-dimensional speaker identity vectors.",
        details: "Computes cosine similarity across deep latent representations, capturing speaker timbre independent of text content.",
        telemetry: ["Model: WavLM-Base+ SV", "Embedding Dim: 512-D", "Metric: Cosine Similarity"]
      },
      {
        id: "step-3",
        phase: "PHASE 03",
        title: "Vocal Tract LPC Formants",
        badge: "BIOMECHANICAL",
        color: "cyan",
        icon: Sliders,
        summary: "Linear Predictive Coding (LPC order 16) root-solving for F1–F4 anatomical resonances.",
        details: "Extracts physical vocal tract length (VTL) dispersion and oral/pharyngeal cavity acoustic formants.",
        telemetry: ["Formants: F1, F2, F3, F4", "Analysis: Polynomial Roots", "Metric: Vocal Tract Dispersion"]
      },
      {
        id: "step-4",
        phase: "PHASE 04",
        title: "Pitch (F0) Intonation Dynamics",
        badge: "FUNDAMENTAL FREQ",
        color: "cyan",
        icon: Waves,
        summary: "Probabilistic YIN (pYIN) fundamental frequency tracking across voiced speech frames.",
        details: "Compares intonation contours, micro-jitter flutter (%), and physiological semitone pitch range.",
        telemetry: ["Algorithm: pYIN (60-500 Hz)", "Time Series: 60-pt Normalized", "Metric: Intonation Correlation"]
      },
      {
        id: "step-5",
        phase: "PHASE 05",
        title: "13-Band Spectral MFCC Fingerprint",
        badge: "TIMBRE & ENVELOPE",
        color: "cyan",
        icon: BarChart3,
        summary: "13-coefficient Mel-frequency cepstral vectors, spectral centroid, and crest factor dynamics.",
        details: "Analyzes spectral tilt, rolloff, dynamic range (dB), and vocal harmonic energy distribution.",
        telemetry: ["Coefficients: 13-MFCC", "Spectral Centroid: Mean/Std", "Dynamic Range: Crest Factor (dB)"]
      },
      {
        id: "step-6",
        phase: "PHASE 06",
        title: "Speaking Rhythm & Prosodic Tempo",
        badge: "TEMPORAL CADENCE",
        color: "cyan",
        icon: Activity,
        summary: "Onset detection, articulation tempo (syllables/s), and speech-to-pause duration ratios.",
        details: "Evaluates speaking cadence, micro-pause variance, and conversational rhythm patterns.",
        telemetry: ["Metric: Onset Rate /s", "Tempo: Articulation BPM", "Pause: Mean Duration (s)"]
      },
      {
        id: "step-7",
        phase: "PHASE 07",
        title: "Multi-Dimensional Synthesis & Fusion",
        badge: "CONTRADICTION ENGINE",
        color: "cyan",
        icon: Sparkles,
        summary: "Weighted Bayesian synthesis across all 6 dimensions with cross-signal contradiction detection.",
        details: "Generates forensic verdict, spider radar chart, and flags any conflicting acoustic indicators.",
        telemetry: ["Neural Weight: 35%", "Formants: 20%", "Pitch & MFCC: 15% each", "Rhythm: 10% | Energy: 5%"]
      }
    ];

    const activeStep = steps[activeStepIndex];

    return (
      <div className="p-4 sm:p-5 bg-brand-surface/70 rounded-2xl border border-brand-cyan/20 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              6-Dimensional Forensic Architecture Blueprint
            </span>
          </div>
          <span className="text-[10px] font-mono text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded border border-brand-cyan/20">
            PRE-FLIGHT TELEMETRY: READY
          </span>
        </div>

        {/* Step Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isSelected = idx === activeStepIndex;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStepIndex(idx)}
                className={clsx(
                  "p-2 rounded-xl border text-left transition-all relative overflow-hidden group",
                  isSelected
                    ? "bg-brand-cyan/15 border-brand-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                    : "bg-black/20 border-brand-border/60 hover:border-brand-cyan/40 hover:bg-white/[0.02]"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] font-mono text-neutral-500 group-hover:text-brand-cyan transition-colors">{s.phase}</span>
                  <Icon className={clsx("w-3 h-3", isSelected ? "text-brand-cyan" : "text-neutral-500")} />
                </div>
                <p className={clsx("text-[10px] font-bold truncate", isSelected ? "text-white" : "text-neutral-300")}>
                  {s.title}
                </p>
                <span className="text-[8px] font-mono text-neutral-500 block truncate">{s.badge}</span>
                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-cyan" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Step Deep-Dive Card */}
        <div className="p-3.5 bg-black/30 rounded-xl border border-brand-cyan/20 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-8 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan font-mono text-[9px] font-bold">
                {activeStep.phase} • {activeStep.badge}
              </span>
              <h4 className="text-xs font-bold text-white">{activeStep.title}</h4>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">{activeStep.summary}</p>
            <p className="text-[10px] text-neutral-400 leading-snug">{activeStep.details}</p>
          </div>

          <div className="md:col-span-4 bg-brand-surface/80 p-2.5 rounded-lg border border-brand-border/60 space-y-1 font-mono text-[9px]">
            <span className="text-neutral-500 uppercase block font-sans font-bold border-b border-brand-border/40 pb-0.5">Parameters Extracted:</span>
            {activeStep.telemetry.map((t, i) => (
              <div key={i} className="text-brand-cyan/90 flex items-center gap-1">
                <span className="text-neutral-600">›</span> {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Deepfake mode
  const dfSteps = [
    {
      id: "df-1",
      phase: "STAGE 01",
      title: "1.5s Sliding Segmentation",
      badge: "TEMPORAL SLICING",
      icon: Clock,
      color: "red",
      summary: "Audio is sliced into overlapping 1.5s windows with 0.5s hops for micro-temporal localization.",
      details: "Enables detection of partial synthetic insertions and millisecond-accurate splice point marking.",
      telemetry: ["Window Size: 1.50 sec", "Hop Size: 0.50 sec", "Overlap: ~66.7%"]
    },
    {
      id: "df-2",
      phase: "STAGE 02",
      title: "Primary SOTA Spoof Model",
      badge: "TRAINED MODEL",
      icon: Cpu,
      color: "cyan",
      summary: "Fine-tuned Wav2Vec2 sequence classifier evaluates latent neural spoof probabilities.",
      details: "Trained on state-of-the-art synthetic speech engines (ElevenLabs, Amazon Polly, Google TTS, Tortoise).",
      telemetry: ["Backbone: Wav2Vec2-Deepfake", "Classifier: Softmax 2-Class", "Output: Sequence Probability"]
    },
    {
      id: "df-3",
      phase: "STAGE 03",
      title: "Vocoder Artifacts Scan",
      badge: "ACOUSTIC HEURISTIC",
      icon: Radio,
      color: "amber",
      summary: "Scans for GAN vocoder transposition ripple (>6.5 kHz), HNR anomalies, and phase irregularity.",
      details: "HiFi-GAN, WaveGlow, and MelGAN synthesis architectures leave distinct high-frequency energy checkerboards.",
      telemetry: ["High-Freq Band: >6,500 Hz", "HNR Normal Range: 15-30 dB", "Metric: Phase Derivative Var"]
    },
    {
      id: "df-4",
      phase: "STAGE 04",
      title: "Spectral Splicing & Boundary",
      badge: "TEMPORAL HEURISTIC",
      icon: Scissors,
      color: "emerald",
      summary: "Cross-window MFCC Euclidean distance and background noise floor continuity check.",
      details: "Detects acoustic environment transitions and flags exact splice boundary points (✂).",
      telemetry: ["Threshold: 2.5σ Delta", "Room Tone: Quiet Frame RMS", "Metric: Cross-Window MFCC"]
    },
    {
      id: "df-5",
      phase: "STAGE 05",
      title: "Prosody Naturalness & Entropy",
      badge: "STATISTICAL HEURISTIC",
      icon: Waves,
      color: "purple",
      summary: "Evaluates F0 pitch entropy, micro-jitter flutter, and metronomic syllable rhythm regularity.",
      details: "Catches over-smoothed pitch spline trajectories and robotic cadence lacking natural human micro-pauses.",
      telemetry: ["Pitch Entropy: >2.0 bits", "Micro-Jitter: 0.5-8.0%", "Cadence: Interval CoV"]
    },
    {
      id: "df-6",
      phase: "STAGE 06",
      title: "Timeline & Splicing Assembly",
      badge: "SYNTHESIS ENGINE",
      icon: Sparkles,
      color: "red",
      summary: "Compiles 4-series suspicion timeline, groups suspect intervals, and classifies manipulation type.",
      details: "Categorizes into FULLY_SYNTHETIC, SPLICED_PARTIAL, or LIKELY_AUTHENTIC with regional conflict alerts.",
      telemetry: ["Output: 4-Line Series", "Intervals: Contiguous Grouping", "Conflict Alerts: Delta >= 35%"]
    }
  ];

  const activeDfStep = dfSteps[activeStepIndex < dfSteps.length ? activeStepIndex : 0];

  return (
    <div className="p-4 sm:p-5 bg-brand-surface/70 rounded-2xl border border-red-500/20 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Multi-Signal Deepfake &amp; Temporal Splicing Diagnostics Blueprint
          </span>
        </div>
        <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
          DIAGNOSTIC PIPELINE: STANDBY
        </span>
      </div>

      {/* Step Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
        {dfSteps.map((s, idx) => {
          const Icon = s.icon;
          const isSelected = idx === activeStepIndex;
          return (
            <button
              key={s.id}
              onClick={() => setActiveStepIndex(idx)}
              className={clsx(
                "p-2 rounded-xl border text-left transition-all relative overflow-hidden group",
                isSelected
                  ? "bg-red-500/15 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                  : "bg-black/20 border-brand-border/60 hover:border-red-500/40 hover:bg-white/[0.02]"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] font-mono text-neutral-500 group-hover:text-red-400 transition-colors">{s.phase}</span>
                <Icon className={clsx("w-3 h-3", isSelected ? "text-red-400" : "text-neutral-500")} />
              </div>
              <p className={clsx("text-[10px] font-bold truncate", isSelected ? "text-white" : "text-neutral-300")}>
                {s.title}
              </p>
              <span className="text-[8px] font-mono text-neutral-500 block truncate">{s.badge}</span>
              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Step Deep-Dive Card */}
      <div className="p-3.5 bg-black/30 rounded-xl border border-red-500/20 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        <div className="md:col-span-8 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono text-[9px] font-bold">
              {activeDfStep.phase} • {activeDfStep.badge}
            </span>
            <h4 className="text-xs font-bold text-white">{activeDfStep.title}</h4>
          </div>
          <p className="text-[11px] text-neutral-300 leading-relaxed">{activeDfStep.summary}</p>
          <p className="text-[10px] text-neutral-400 leading-snug">{activeDfStep.details}</p>
        </div>

        <div className="md:col-span-4 bg-brand-surface/80 p-2.5 rounded-lg border border-brand-border/60 space-y-1 font-mono text-[9px]">
          <span className="text-neutral-500 uppercase block font-sans font-bold border-b border-brand-border/40 pb-0.5">Parameters Extracted:</span>
          {activeDfStep.telemetry.map((t, i) => (
            <div key={i} className="text-red-300/90 flex items-center gap-1">
              <span className="text-neutral-600">›</span> {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
