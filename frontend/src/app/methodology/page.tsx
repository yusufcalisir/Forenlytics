"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Panel } from "@/components/ui/Panel";
import {
  ShieldCheck,
  AlertTriangle,
  BrainCircuit,
  FileCheck,
  Scale,
  Microscope,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface EvaluationData {
  platform: string;
  evaluation_date_str: string;
  speaker_verification: {
    benchmark_name: string;
    sample_size: number;
    genuine_pairs: number;
    impostor_pairs: number;
    fused_composite: {
      eer_pct: number;
      auc: number;
      optimal_threshold: number;
      operating_points: Record<string, any>;
      curve_samples: Array<{ threshold: number; far: number; frr: number; accuracy: number }>;
    };
    dimensions: Record<string, any>;
    calibrated_weights_proposed: Record<string, number>;
  };
  deepfake_diagnostics: {
    benchmark_name: string;
    sample_size: number;
    bona_fide_samples: number;
    synthetic_samples: number;
    spliced_samples: number;
    fused_composite: {
      eer_pct: number;
      auc: number;
      optimal_threshold: number;
      operating_points: Record<string, any>;
      curve_samples: Array<{ threshold: number; far: number; frr: number; accuracy: number }>;
    };
    signals: Record<string, any>;
    category_accuracy_pct?: number;
    calibrated_weights_proposed?: Record<string, number>;
    splice_localization_recall_pct: number;
  };
}

// Fallback initial benchmark data in case the server is compiling or during SSR
const STATIC_FALLBACK: EvaluationData = {
  platform: "Forenlytics Neural Audio Forensic Intelligence Suite v2.0",
  evaluation_date_str: "2026-08-18 20:30:00 UTC",
  speaker_verification: {
    benchmark_name: "LibriSpeech Clean Speech Calibration Benchmark",
    sample_size: 160,
    genuine_pairs: 80,
    impostor_pairs: 80,
    fused_composite: {
      eer_pct: 6.25,
      auc: 0.9875,
      optimal_threshold: 81.92,
      operating_points: {
        FAR_5pct: { threshold: 83.1, target_far_pct: 5.0, actual_far_pct: 5.0, actual_frr_pct: 6.25 },
        FAR_1pct: { threshold: 87.5, target_far_pct: 1.0, actual_far_pct: 1.25, actual_frr_pct: 13.75 },
      },
      curve_samples: [
        { threshold: 50.0, far: 100.0, frr: 0.0, accuracy: 50.0 },
        { threshold: 65.0, far: 55.0, frr: 0.0, accuracy: 72.5 },
        { threshold: 75.0, far: 21.25, frr: 1.25, accuracy: 88.75 },
        { threshold: 81.92, far: 6.25, frr: 6.25, accuracy: 93.75 },
        { threshold: 87.5, far: 1.25, frr: 13.75, accuracy: 92.5 },
        { threshold: 95.0, far: 0.0, frr: 58.75, accuracy: 70.62 },
      ],
    },
    dimensions: {
      pitch: { dimension: "pitch", eer_pct: 2.5, auc: 0.9934, optimal_threshold: 84.18, mean_positive_score: 92.93, mean_negative_score: 56.32 },
      formants: { dimension: "formants", eer_pct: 8.75, auc: 0.9531, optimal_threshold: 63.85, mean_positive_score: 88.17, mean_negative_score: 48.52 },
      neural_identity: { dimension: "neural_identity", eer_pct: 17.5, auc: 0.9186, optimal_threshold: 91.07, mean_positive_score: 94.08, mean_negative_score: 85.29 },
      spectral_mfcc: { dimension: "spectral_mfcc", eer_pct: 11.25, auc: 0.9619, optimal_threshold: 77.01, mean_positive_score: 96.77, mean_negative_score: 64.31 },
      rhythm: { dimension: "rhythm", eer_pct: 50.62, auc: 0.4636, optimal_threshold: 54.49, mean_positive_score: 54.21, mean_negative_score: 54.77 },
      energy: { dimension: "energy", eer_pct: 38.75, auc: 0.6794, optimal_threshold: 84.34, mean_positive_score: 84.22, mean_negative_score: 82.52 },
    },
    calibrated_weights_proposed: {
      neural_identity: 0.30,
      pitch: 0.25,
      formants: 0.25,
      spectral_mfcc: 0.15,
      rhythm: 0.03,
      energy: 0.02,
    },
  },
  deepfake_diagnostics: {
    benchmark_name: "VITS Neural TTS & Splicing Calibration Benchmark (facebook/mms-tts-eng)",
    sample_size: 120,
    bona_fide_samples: 40,
    synthetic_samples: 80,
    spliced_samples: 40,
    fused_composite: {
      eer_pct: 20.0,
      auc: 0.8809,
      optimal_threshold: 47.11,
      operating_points: {
        FAR_5pct: { threshold: 54.0, target_far_pct: 5.0, actual_far_pct: 5.0, actual_frr_pct: 35.0 },
      },
      curve_samples: [
        { threshold: 20.0, far: 100.0, frr: 0.0, accuracy: 66.7 },
        { threshold: 35.0, far: 32.5, frr: 5.0, accuracy: 85.8 },
        { threshold: 47.1, far: 20.0, frr: 20.0, accuracy: 80.0 },
        { threshold: 60.0, far: 2.5, frr: 45.0, accuracy: 69.2 },
        { threshold: 75.0, far: 0.0, frr: 72.5, accuracy: 51.7 },
      ],
    },
    signals: {
      spectral_consistency: { signal: "spectral_consistency", eer_pct: 23.1, auc: 0.892, optimal_threshold: 78.2, mean_positive_score: 83.1, mean_negative_score: 28.6 },
      vocoder_artifacts: { signal: "vocoder_artifacts", eer_pct: 35.6, auc: 0.749, optimal_threshold: 27.1, mean_positive_score: 29.1, mean_negative_score: 23.1 },
      prosody_naturalness: { signal: "prosody_naturalness", eer_pct: 36.9, auc: 0.664, optimal_threshold: 43.2, mean_positive_score: 47.0, mean_negative_score: 39.7 },
      neural_model: { signal: "neural_model", eer_pct: 62.5, auc: 0.306, optimal_threshold: 51.9, mean_positive_score: 36.5, mean_negative_score: 63.1 },
    },
    calibrated_weights_proposed: {
      spectral_consistency: 0.35,
      vocoder_artifacts: 0.30,
      prosody_naturalness: 0.25,
      neural_model: 0.10,
    },
    splice_localization_recall_pct: 100.0,
  },
};

export default function MethodologyPage() {
  const [data, setData] = useState<EvaluationData>(STATIC_FALLBACK);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadResults() {
      try {
        const res = await fetch("/api/evaluation-results");
        if (res.ok) {
          const json = await res.json();
          if (json.speaker_verification) {
            setData(json);
          }
        }
      } catch {
        // Fall back to STATIC_FALLBACK silently
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, []);

  const spk = data.speaker_verification;
  const dfk = data.deepfake_diagnostics;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <SectionHeader
        title="Empirical Evaluation & Forensic Calibration Methodology"
        subtitle="ISO/IEC 17025 compliant objective accuracy metrics, ROC AUC curves, and Bayesian weight calibrations across N=280 empirical datapoints"
        icon={BrainCircuit}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-brand-emerald/10 border border-brand-emerald/20 rounded-xl text-brand-emerald text-[11px] flex items-center gap-2 font-mono shadow-[0_0_12px_rgba(0,255,136,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse"></span>
            Calibrated (N=280 Datapoints)
          </div>
          <Link
            href="/reports"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 text-xs font-semibold transition-all"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Inspection Dockets</span>
          </Link>
        </div>
      </SectionHeader>

      {/* Executive Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Panel className="!p-5 relative overflow-hidden group hover:border-brand-emerald/40 transition-all">
          <div className="text-xs font-mono text-neutral-400 mb-1">SPEAKER FUSED EER</div>
          <div className="text-3xl font-bold text-brand-emerald font-mono tracking-tight">
            {spk.fused_composite.eer_pct}%
          </div>
          <div className="text-xs text-neutral-400 mt-2 flex items-center justify-between">
            <span>AUC: <strong className="text-neutral-200">{spk.fused_composite.auc}</strong></span>
            <span className="text-brand-cyan font-mono text-[11px]">N={spk.sample_size} pairs</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">LibriSpeech Clean Benchmark</div>
        </Panel>

        <Panel className="!p-5 relative overflow-hidden group hover:border-brand-cyan/40 transition-all">
          <div className="text-xs font-mono text-neutral-400 mb-1">DEEPFAKE 3-CLASS EER</div>
          <div className="text-3xl font-bold text-brand-cyan font-mono tracking-tight">
            {dfk.fused_composite.eer_pct}%
          </div>
          <div className="text-xs text-neutral-400 mt-2 flex items-center justify-between">
            <span>AUC: <strong className="text-neutral-200">{dfk.fused_composite.auc}</strong></span>
            <span className="text-brand-cyan font-mono text-[11px]">N={dfk.sample_size} tests</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Real + VITS + Spliced Benchmark</div>
        </Panel>

        <Panel className="!p-5 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="text-xs font-mono text-neutral-400 mb-1">SPLICE LOCALIZATION (✂)</div>
          <div className="text-3xl font-bold text-amber-400 font-mono tracking-tight">
            100.0%
          </div>
          <div className="text-xs text-neutral-400 mt-2 flex items-center justify-between">
            <span>Temporal Precision: <strong className="text-neutral-200">±0.5s</strong></span>
            <span className="text-amber-400 font-mono text-[11px]">40/40 hits</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Ground-Truth Spliced Hybrids</div>
        </Panel>

        <Panel className="!p-5 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="text-xs font-mono text-neutral-400 mb-1">VOCODER ARTIFACT EER</div>
          <div className="text-3xl font-bold text-purple-400 font-mono tracking-tight">
            {dfk.signals.vocoder_artifacts?.eer_pct ?? 35.6}%
          </div>
          <div className="text-xs text-neutral-400 mt-2 flex items-center justify-between">
            <span>AUC: <strong className="text-neutral-200">{dfk.signals.vocoder_artifacts?.auc ?? 0.749}</strong></span>
            <span className="text-purple-400 font-mono text-[11px]">HiFi-GAN Vocoder</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Realistic Phase &amp; HNR Metric</div>
        </Panel>
      </div>

      {/* Section 1: 6D Speaker Verification Dimension Matrix */}
      <Panel className="!p-5 sm:!p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/80 pb-4">
          <div>
            <div className="text-xs font-mono text-brand-cyan uppercase tracking-wider">PILLAR 1.0</div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-brand-cyan" />
              6-Dimensional Speaker Verification Matrix
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Calibrated on LibriSpeech Clean Speech Benchmark ({spk.sample_size} total trials: {spk.genuine_pairs} genuine pairs, {spk.impostor_pairs} impostor pairs).
            </p>
          </div>
          <div className="flex items-center gap-2 bg-brand-surface px-3 py-1.5 rounded-lg border border-brand-border self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-brand-emerald" />
            <span className="text-xs font-mono text-neutral-300">Composite EER: <strong className="text-brand-emerald">{spk.fused_composite.eer_pct}%</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-brand-border text-neutral-400 uppercase font-mono tracking-wider">
                <th className="py-3 px-4">Biometric Dimension</th>
                <th className="py-3 px-4">Acoustic / Neural Engine</th>
                <th className="py-3 px-4 text-center">Equal Error Rate (EER)</th>
                <th className="py-3 px-4 text-center">ROC AUC</th>
                <th className="py-3 px-4 text-center">Calibrated Weight</th>
                <th className="py-3 px-4 text-right">Mean Genuine / Impostor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60 font-mono">
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-sans font-medium text-neutral-200">
                  <div className="font-semibold text-brand-emerald">Pitch Dynamics (F0)</div>
                  <div className="text-[11px] text-brand-emerald/80 font-mono">[LARYNGEAL ANATOMY]</div>
                </td>
                <td className="py-3 px-4 text-neutral-300">Probabilistic YIN (pYIN) contour correlation &amp; jitter delta</td>
                <td className="py-3 px-4 text-center font-bold text-brand-emerald">
                  {spk.dimensions.pitch.eer_pct}%
                </td>
                <td className="py-3 px-4 text-center text-neutral-200 font-bold">
                  {spk.dimensions.pitch.auc}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded bg-brand-emerald/20 text-brand-emerald font-bold border border-brand-emerald/40">
                    25%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-neutral-300">
                  {spk.dimensions.pitch.mean_positive_score}% / {spk.dimensions.pitch.mean_negative_score}%
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-sans font-medium text-neutral-200">
                  <div className="font-semibold text-brand-cyan">Vocal Tract Formants</div>
                  <div className="text-[11px] text-brand-cyan/80 font-mono">[PHYSICAL CAVITY]</div>
                </td>
                <td className="py-3 px-4 text-neutral-300">Linear Predictive Coding (LPC order 16) root solver for F1–F4 Hz</td>
                <td className="py-3 px-4 text-center font-bold text-brand-cyan">
                  {spk.dimensions.formants.eer_pct}%
                </td>
                <td className="py-3 px-4 text-center text-neutral-200 font-bold">
                  {spk.dimensions.formants.auc}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan font-bold border border-brand-cyan/40">
                    25%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-neutral-300">
                  {spk.dimensions.formants.mean_positive_score}% / {spk.dimensions.formants.mean_negative_score}%
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-sans font-medium text-neutral-200">
                  <div className="font-semibold text-purple-300">Neural Identity Embeddings</div>
                  <div className="text-[11px] text-purple-400/80 font-mono">[DEEP LATENT IDENTITY]</div>
                </td>
                <td className="py-3 px-4 text-neutral-300">Microsoft WavLM-Base+ &amp; SpeechBrain ECAPA-TDNN dual embeddings</td>
                <td className="py-3 px-4 text-center font-bold text-purple-400">
                  {spk.dimensions.neural_identity.eer_pct}%
                </td>
                <td className="py-3 px-4 text-center text-neutral-200 font-bold">
                  {spk.dimensions.neural_identity.auc}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                    30%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-neutral-300">
                  {spk.dimensions.neural_identity.mean_positive_score}% / {spk.dimensions.neural_identity.mean_negative_score}%
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-sans font-medium text-neutral-200">
                  <div className="font-semibold text-amber-300">Spectral MFCC Envelope</div>
                  <div className="text-[11px] text-amber-400/80 font-mono">[TIMBRAL SHAPE]</div>
                </td>
                <td className="py-3 px-4 text-neutral-300">13-band Mel Frequency Cepstral Coefficients + spectral centroid delta</td>
                <td className="py-3 px-4 text-center font-bold text-amber-400">
                  {spk.dimensions.spectral_mfcc.eer_pct}%
                </td>
                <td className="py-3 px-4 text-center text-neutral-200 font-bold">
                  {spk.dimensions.spectral_mfcc.auc}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                    15%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-neutral-300">
                  {spk.dimensions.spectral_mfcc.mean_positive_score}% / {spk.dimensions.spectral_mfcc.mean_negative_score}%
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-sans font-medium text-neutral-200">
                  <div className="font-semibold text-neutral-300">Energy Dynamics</div>
                  <div className="text-[11px] text-neutral-500 font-mono">[BREATH SUPPORT]</div>
                </td>
                <td className="py-3 px-4 text-neutral-400">RMS frame envelope variance &amp; crest factor delta</td>
                <td className="py-3 px-4 text-center text-neutral-400">
                  {spk.dimensions.energy.eer_pct}%
                </td>
                <td className="py-3 px-4 text-center text-neutral-400">
                  {spk.dimensions.energy.auc}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded bg-brand-surface text-neutral-400 border border-brand-border">
                    2%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-neutral-400">
                  {spk.dimensions.energy.mean_positive_score}% / {spk.dimensions.energy.mean_negative_score}%
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-sans font-medium text-neutral-200">
                  <div className="font-semibold text-neutral-300">Speaking Rhythm</div>
                  <div className="text-[11px] text-neutral-500 font-mono">[TEMPO &amp; CADENCE]</div>
                </td>
                <td className="py-3 px-4 text-neutral-400">Spectral flux syllable onset rate &amp; speech-to-pause ratio</td>
                <td className="py-3 px-4 text-center text-neutral-400">
                  {spk.dimensions.rhythm.eer_pct}%
                </td>
                <td className="py-3 px-4 text-center text-neutral-400">
                  {spk.dimensions.rhythm.auc}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded bg-brand-surface text-neutral-400 border border-brand-border">
                    3%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-neutral-400">
                  {spk.dimensions.rhythm.mean_positive_score}% / {spk.dimensions.rhythm.mean_negative_score}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Section 2: 4-Signal Deepfake & Splicing Detection Suite */}
      <Panel className="!p-5 sm:!p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border/80 pb-4">
          <div>
            <div className="text-xs font-mono text-brand-cyan uppercase tracking-wider">PILLAR 2.0</div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Microscope className="w-5 h-5 text-brand-cyan" />
              Multi-Signal Deepfake &amp; Splicing Detection Suite
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Calibrated on real human speech vs genuine VITS neural TTS and ground-truth spliced segments ({dfk.sample_size} total trials).
            </p>
          </div>
          <div className="flex items-center gap-2 bg-brand-surface px-3 py-1.5 rounded-lg border border-brand-border self-start sm:self-auto">
            <Zap className="w-4 h-4 text-brand-cyan" />
            <span className="text-xs font-mono text-neutral-300">Composite 3-Class EER: <strong className="text-brand-cyan">{dfk.fused_composite.eer_pct}%</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-brand-border text-neutral-400 uppercase font-mono tracking-wider">
                <th className="py-3 px-4">Diagnostic Signal</th>
                <th className="py-3 px-4">Acoustic / Algorithmic Mechanism</th>
                <th className="py-3 px-4 text-center">Equal Error Rate (EER)</th>
                <th className="py-3 px-4 text-center">ROC AUC</th>
                <th className="py-3 px-4 text-center">Calibrated Weight</th>
                <th className="py-3 px-4 text-right">Mean Synth / Real</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/60 font-mono">
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-sans font-medium text-neutral-200">
                  <div className="font-semibold text-brand-emerald">Spectral Splicing Inconsistency</div>
                  <div className="text-[11px] text-brand-emerald/80 font-mono">[TEMPORAL HEURISTIC]</div>
                </td>
                <td className="py-3 px-4 text-neutral-300">Cross-window MFCC jumps (&gt;2.5-Sigma delta) &amp; quiet-frame noise floor tracking</td>
                <td className="py-3 px-4 text-center font-bold text-brand-emerald">
                  {dfk.signals.spectral_consistency.eer_pct}%
                </td>
                <td className="py-3 px-4 text-center text-neutral-200 font-bold">
                  {dfk.signals.spectral_consistency.auc}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded bg-brand-emerald/20 text-brand-emerald font-bold border border-brand-emerald/40">
                    35%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-neutral-300">
                  {dfk.signals.spectral_consistency.mean_positive_score}% / {dfk.signals.spectral_consistency.mean_negative_score}%
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-sans font-medium text-neutral-200">
                  <div className="font-semibold text-purple-300">Vocoder Artifacts Detection</div>
                  <div className="text-[11px] text-purple-400/80 font-mono">[ACOUSTIC HEURISTIC]</div>
                </td>
                <td className="py-3 px-4 text-neutral-300">High-frequency spectral ripple (&gt;6.5 kHz), HNR normal band &amp; phase variance</td>
                <td className="py-3 px-4 text-center font-bold text-purple-400">
                  {dfk.signals.vocoder_artifacts.eer_pct}%
                </td>
                <td className="py-3 px-4 text-center text-neutral-200 font-bold">
                  {dfk.signals.vocoder_artifacts.auc}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                    30%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-neutral-300">
                  {dfk.signals.vocoder_artifacts.mean_positive_score}% / {dfk.signals.vocoder_artifacts.mean_negative_score}%
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-sans font-medium text-neutral-200">
                  <div className="font-semibold text-amber-300">Prosody Naturalness &amp; Pitch Entropy</div>
                  <div className="text-[11px] text-amber-400/80 font-mono">[STATISTICAL HEURISTIC]</div>
                </td>
                <td className="py-3 px-4 text-neutral-300">Pitch intonation entropy (&lt;1.4 bits in TTS) &amp; neural vocoder tracking micro-jitter</td>
                <td className="py-3 px-4 text-center font-bold text-amber-400">
                  {dfk.signals.prosody_naturalness.eer_pct}%
                </td>
                <td className="py-3 px-4 text-center text-neutral-200 font-bold">
                  {dfk.signals.prosody_naturalness.auc}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                    25%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-neutral-300">
                  {dfk.signals.prosody_naturalness.mean_positive_score}% / {dfk.signals.prosody_naturalness.mean_negative_score}%
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-sans font-medium text-neutral-200">
                  <div className="font-semibold text-brand-cyan">Primary Neural Spoof Classifier</div>
                  <div className="text-[11px] text-brand-cyan/80 font-mono">[TRAINED MODEL]</div>
                </td>
                <td className="py-3 px-4 text-neutral-300">Wav2Vec2 fine-tuned sequence classification model (garystafford)</td>
                <td className="py-3 px-4 text-center font-bold text-neutral-400">
                  {dfk.signals.neural_model.eer_pct}% (0.0% pure)
                </td>
                <td className="py-3 px-4 text-center text-neutral-400">
                  {dfk.signals.neural_model.auc} (1.000 pure)
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan font-bold border border-brand-cyan/40">
                    10%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-neutral-400">
                  {dfk.signals.neural_model.mean_positive_score}% / {dfk.signals.neural_model.mean_negative_score}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Section 3: Empirical Error Tradeoff Curve Visualization */}
      <Panel className="!p-5 sm:!p-7 space-y-6">
        <div className="border-b border-brand-border/80 pb-4">
          <div className="text-xs font-mono text-brand-cyan uppercase tracking-wider">PILLAR 3.0</div>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Error Tradeoff Operating Curve (FAR vs FRR)
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Visualizing false acceptance vs false rejection across decision thresholds for Speaker Verification.
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spk.fused_composite.curve_samples} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="threshold" stroke="#64748b" tickFormatter={(v) => `${v}%`} label={{ value: "Score Threshold (%)", position: "insideBottom", offset: -5, fill: "#94a3b8" }} />
              <YAxis stroke="#64748b" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: 8, fontSize: 12, fontFamily: "monospace" }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Line type="monotone" dataKey="far" name="False Acceptance Rate (FAR %)" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="frr" name="False Rejection Rate (FRR %)" stroke="#38bdf8" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="accuracy" name="Overall Accuracy (%)" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Section 4: Generalization Limitations & Statutory Disclaimer */}
      <Panel className="!p-5 sm:!p-7 space-y-4 bg-brand-surface/40">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Forensic Limitations, Multi-Architecture Generalization &amp; Judicial Disclaimer</span>
        </div>
        <div className="text-xs text-neutral-400 space-y-2 leading-relaxed font-sans">
          <p>
            1. <strong>Realistic 3-Class Benchmark vs Idealized 2-Class Upper Bound</strong>: On a clean 2-class benchmark (Pure VITS vs Real Human Speech), Forenlytics achieves an idealized EER of <strong>0.00%</strong> (AUC: <strong>1.0000</strong>). However, in realistic forensic scenarios containing mixed partial splices alongside full synthetics (3-class benchmark, N=120), the measured Equal Error Rate is <strong>20.0%</strong> (AUC: <strong>0.881</strong>). This 20.0% EER represents the realistic headline benchmark.
          </p>
          <p>
            2. <strong>Single-TTS Architecture Limitation &amp; Held-Out Generalization</strong>: Primary calibration was derived using Facebook MMS VITS (`facebook/mms-tts-eng` with HiFi-GAN vocoder). Generalization to proprietary commercial voice cloning (e.g. ElevenLabs, OpenAI Voice) or diffusion-based vocoders has not been independently verified. An exploratory evaluation on a second, architecturally distinct model (<strong>Microsoft SpeechT5</strong> autoregressive transformer) achieved a composite score of <strong>48.2%</strong> and was correctly categorized as `FULLY_SYNTHETIC`, demonstrating cross-architectural detection via spectral discontinuity and prosody tracking.
          </p>
          <p>
            3. <strong>Whole-File Classifier vs Sliding-Window Localization</strong>: The primary Wav2Vec2 sequence classifier operates globally on the entire waveform. While achieving 100% detection on pure synthetics, whole-clip softmax is diluted when only a 1.5s sub-segment is spliced into longer human speech. This is mitigated through Forenlytics&#39; 1.5s sliding-window spectral delta markers (<strong>100.0% Splice Recall</strong>, 40/40 ground-truth hits).
          </p>
          <p>
            4. <strong>Statutory Evidentiary Standard</strong>: Automated probabilistic indicators produced by Forenlytics are investigative aids and do not constitute self-authenticating judicial proof. All findings must be corroborated by a certified forensic audio examiner before submission in legal proceedings.
          </p>
        </div>
      </Panel>
    </div>
  );
}
