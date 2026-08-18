import Link from "next/link";
import {
  Mic,
  Radar,
  FileText,
  Activity,
  Shield,
  Sparkles,
  ArrowRight,
  BrainCircuit,
  Scale,
  Microscope,
  Zap,
  Lock,
  Cpu,
  Layers,
  CheckCircle2,
  Sliders,
  Scissors,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Panel } from "@/components/ui/Panel";

export default function DashboardPage() {
  return (
    <div className="space-y-8 sm:space-y-10 animate-in fade-in duration-500 pb-16">
      {/* Hero Header */}
      <SectionHeader
        title="Audio Forensic Command Center"
        subtitle="High-fidelity vocal biometric verification and multi-signal synthetic anomaly detection platform"
        icon={Shield}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-brand-emerald/10 border border-brand-emerald/20 rounded-xl text-brand-emerald text-[11px] flex items-center gap-2 font-mono shadow-[0_0_12px_rgba(0,255,136,0.15)]">
            <span className="w-2 h-2 rounded-full bg-brand-emerald shadow-[0_0_8px_rgba(0,255,136,0.6)] animate-pulse"></span>
            <span>NEURAL ENGINES OPERATIONAL</span>
          </div>
          <div className="px-3 py-1.5 bg-brand-cyan/10 border border-brand-cyan/20 rounded-xl text-brand-cyan text-[11px] flex items-center gap-1.5 font-mono">
            <span className="text-neutral-400">SPEAKER EER:</span>
            <strong className="text-brand-cyan font-bold">6.25%</strong>
          </div>
          <div className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-300 text-[11px] flex items-center gap-1.5 font-mono">
            <span className="text-neutral-400">DEEPFAKE EER:</span>
            <strong className="text-purple-300 font-bold">20.0%</strong>
          </div>
        </div>
      </SectionHeader>

      {/* Main Studio Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Module 1: Speaker Verification */}
        <Link href="/audio?mode=compare" className="group block h-full">
          <Panel className="h-full !p-5 sm:!p-6 transition-all duration-300 group-hover:border-brand-cyan/50 group-hover:shadow-[0_0_30px_rgba(0,240,255,0.15)] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                  <Mic className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg bg-brand-surface border border-brand-border text-brand-cyan font-bold">
                  PILLAR 1.0
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-brand-cyan transition-colors flex items-center gap-1.5">
                <span>Speaker Verification</span>
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed mb-5">
                6-dimensional vocal biometric matrix comparing Microsoft WavLM, LPC vocal tract resonances, and pYIN pitch dynamics.
              </p>
            </div>

            <div className="pt-3.5 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-cyan font-semibold">
              <span>Launch Audio Comparison</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Panel>
        </Link>

        {/* Module 2: Deepfake & AI Voice Scan */}
        <Link href="/audio?mode=deepfake" className="group block h-full">
          <Panel className="h-full !p-5 sm:!p-6 transition-all duration-300 group-hover:border-red-500/50 group-hover:shadow-[0_0_30px_rgba(239,68,68,0.15)] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                  <Radar className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg bg-brand-surface border border-brand-border text-red-400 font-bold">
                  PILLAR 2.0
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                <span>Deepfake &amp; AI Voice Scan</span>
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed mb-5">
                Sliding-window synthetic speech scanner detecting HiFi-GAN vocoder phase jitter, pitch entropy, and 1.5s partial splices (✂).
              </p>
            </div>

            <div className="pt-3.5 border-t border-brand-border/60 flex items-center justify-between text-xs text-red-400 font-semibold">
              <span>Scan Audio Specimen</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Panel>
        </Link>

        {/* Module 3: Forensic PDF Dockets */}
        <Link href="/reports" className="group block h-full">
          <Panel className="h-full !p-5 sm:!p-6 transition-all duration-300 group-hover:border-brand-emerald/50 group-hover:shadow-[0_0_30px_rgba(0,255,136,0.15)] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-emerald/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(0,255,136,0.15)]">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg bg-brand-surface border border-brand-border text-brand-emerald font-bold">
                  COURT-READY
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-brand-emerald transition-colors flex items-center gap-1.5">
                <span>Forensic PDF Dockets</span>
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed mb-5">
                Compile and export tamper-evident inspection dockets with cryptographic hashes, acoustic telemetry, and expert opinions.
              </p>
            </div>

            <div className="pt-3.5 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-emerald font-semibold">
              <span>Compile Intelligence Docket</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Panel>
        </Link>

        {/* Module 4: Empirical Methodology */}
        <Link href="/methodology" className="group block h-full">
          <Panel className="h-full !p-5 sm:!p-6 transition-all duration-300 group-hover:border-purple-500/50 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-lg bg-brand-surface border border-brand-border text-purple-400 font-bold">
                  ISO/IEC 17025
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                <span>Calibration Dossier</span>
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed mb-5">
                Empirical Equal Error Rate (EER) tradeoffs, ROC AUC curves, and multi-architecture generalization benchmarking.
              </p>
            </div>

            <div className="pt-3.5 border-t border-brand-border/60 flex items-center justify-between text-xs text-purple-400 font-semibold">
              <span>View Benchmark Methodology</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Panel>
        </Link>
      </div>

      {/* Dual Core Architecture Interactive Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pillar 1 Breakdown */}
        <Panel className="!p-5 sm:!p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-brand-cyan" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Pillar 1.0 — 6-Dimensional Biometric Matrix
              </h3>
            </div>
            <span className="text-[11px] font-mono text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/20 px-2 py-0.5 rounded">
              EER: 6.25%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-brand-surface border border-brand-border">
              <div className="text-neutral-500 text-[10px]">Neural Identity</div>
              <div className="text-white font-bold mt-0.5">30% Weight</div>
              <div className="text-[10px] text-brand-cyan">WavLM + ECAPA</div>
            </div>
            <div className="p-2.5 rounded-lg bg-brand-surface border border-brand-border">
              <div className="text-neutral-500 text-[10px]">Vocal Tract Formants</div>
              <div className="text-white font-bold mt-0.5">25% Weight</div>
              <div className="text-[10px] text-brand-cyan">LPC F1–F4 Hz</div>
            </div>
            <div className="p-2.5 rounded-lg bg-brand-surface border border-brand-border">
              <div className="text-neutral-500 text-[10px]">Pitch Dynamics</div>
              <div className="text-white font-bold mt-0.5">25% Weight</div>
              <div className="text-[10px] text-brand-emerald">pYIN F0 &amp; Jitter</div>
            </div>
            <div className="p-2.5 rounded-lg bg-brand-surface border border-brand-border">
              <div className="text-neutral-500 text-[10px]">Spectral MFCC</div>
              <div className="text-white font-bold mt-0.5">15% Weight</div>
              <div className="text-[10px] text-amber-400">13-Band Timbre</div>
            </div>
            <div className="p-2.5 rounded-lg bg-brand-surface border border-brand-border">
              <div className="text-neutral-500 text-[10px]">Speaking Rhythm</div>
              <div className="text-white font-bold mt-0.5">3% Weight</div>
              <div className="text-[10px] text-neutral-400">Onset Cadence</div>
            </div>
            <div className="p-2.5 rounded-lg bg-brand-surface border border-brand-border">
              <div className="text-neutral-500 text-[10px]">Energy Dynamics</div>
              <div className="text-white font-bold mt-0.5">2% Weight</div>
              <div className="text-[10px] text-neutral-400">RMS Phonation</div>
            </div>
          </div>
        </Panel>

        {/* Pillar 2 Breakdown */}
        <Panel className="!p-5 sm:!p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-border/80 pb-3">
            <div className="flex items-center gap-2">
              <Microscope className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Pillar 2.0 — 4-Signal Deepfake &amp; Splicing Suite
              </h3>
            </div>
            <span className="text-[11px] font-mono text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/20 px-2 py-0.5 rounded">
              3-Class EER: 20.0%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-brand-surface border border-brand-border">
              <div className="text-neutral-500 text-[10px]">Spectral Splicing (✂)</div>
              <div className="text-white font-bold mt-0.5">35% Weight</div>
              <div className="text-[10px] text-brand-emerald">AUC: 0.892 | 100% Recall</div>
            </div>
            <div className="p-2.5 rounded-lg bg-brand-surface border border-brand-border">
              <div className="text-neutral-500 text-[10px]">Vocoder Artifacts</div>
              <div className="text-white font-bold mt-0.5">30% Weight</div>
              <div className="text-[10px] text-purple-400">&gt;6.5kHz HiFi-GAN Phase</div>
            </div>
            <div className="p-2.5 rounded-lg bg-brand-surface border border-brand-border">
              <div className="text-neutral-500 text-[10px]">Prosody &amp; F0 Entropy</div>
              <div className="text-white font-bold mt-0.5">25% Weight</div>
              <div className="text-[10px] text-amber-400">Low Intonation Variance</div>
            </div>
            <div className="p-2.5 rounded-lg bg-brand-surface border border-brand-border">
              <div className="text-neutral-500 text-[10px]">Primary SOTA Classifier</div>
              <div className="text-white font-bold mt-0.5">10% Weight</div>
              <div className="text-[10px] text-brand-cyan">Wav2Vec2 Sequence Model</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Forensic Engine Architecture Status */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3 sm:mb-4 px-1">
          <Activity className="w-4 h-4 text-brand-cyan" />
          <h2 className="text-[11px] sm:text-xs uppercase tracking-[0.2em] font-semibold text-neutral-400">
            Forensic Engine Telemetry Pipeline
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl border border-brand-border bg-brand-panel/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Microsoft WavLM</span>
              <span className="text-[10px] text-brand-cyan font-mono font-medium">Large (Base+)</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Self-supervised masked speech modeling for robust noise-invariant speaker representation.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-brand-panel/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Wav2Vec2-XLSR</span>
              <span className="text-[10px] text-brand-cyan font-mono font-medium">53 Languages</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Cross-lingual acoustic embedding alignment for phoneme-level cosine comparison.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-brand-panel/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Acoustic Biometrics</span>
              <span className="text-[10px] text-brand-emerald font-mono font-medium">Pitch &amp; Jitter</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Fundamental frequency (F0), formant ratios, shimmer, and vocal tract tractability.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-brand-panel/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Ephemeral Sandbox</span>
              <span className="text-[10px] text-brand-emerald font-mono font-medium">Zero Persistence</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Volatile in-memory analysis with 30-min auto-purge for complete evidentiary integrity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
