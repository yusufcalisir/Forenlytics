import Link from "next/link";
import { Mic, Radar, FileText, Activity, Shield, Sparkles, AudioWaveform, Fingerprint, ArrowRight } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Panel } from "@/components/ui/Panel";

export default function DashboardPage() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-16">
      {/* Hero Header */}
      <SectionHeader 
        title="Audio Forensic Command Center" 
        subtitle="High-fidelity vocal biometric verification and synthetic anomaly detection platform"
        icon={Shield}
      >
        <div className="px-3.5 py-1.5 bg-brand-emerald/10 border border-brand-emerald/20 rounded-xl text-brand-emerald text-[11px] flex items-center gap-2 uppercase tracking-widest font-medium shadow-[0_0_12px_rgba(0,255,136,0.15)]">
          <span className="w-2 h-2 rounded-full bg-brand-emerald shadow-[0_0_8px_rgba(0,255,136,0.6)] animate-pulse"></span>
          Neural Engines Operational
        </div>
      </SectionHeader>

      {/* Main Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Speaker Verification Card */}
        <Link href="/audio" className="group block">
          <Panel className="h-full !p-5 sm:!p-7 transition-all duration-300 group-hover:border-brand-cyan/40 group-hover:shadow-[0_0_30px_rgba(0,240,255,0.12)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan group-hover:scale-110 transition-transform duration-300">
                  <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-lg bg-brand-surface border border-brand-border text-neutral-400">
                  Dual-Stream
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2 group-hover:text-brand-cyan transition-colors">
                Speaker Verification
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed mb-5 sm:mb-6">
                Multi-engine vocal biometric comparison using Microsoft WavLM, Wav2Vec2 embeddings, physiological pitch-jitter metrics, and spectral harmonic alignment.
              </p>
            </div>

            <div className="pt-3.5 sm:pt-4 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-cyan font-medium">
              <span>Launch Audio Comparison</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Panel>
        </Link>

        {/* Deepfake Anomaly Card */}
        <Link href="/audio" className="group block">
          <Panel className="h-full !p-5 sm:!p-7 transition-all duration-300 group-hover:border-red-500/40 group-hover:shadow-[0_0_30px_rgba(239,68,68,0.12)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform duration-300">
                  <Radar className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-lg bg-brand-surface border border-brand-border text-red-400">
                  Synthetics Scanner
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2 group-hover:text-red-400 transition-colors">
                Deepfake & AI Voice Scan
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed mb-5 sm:mb-6">
                Probabilistic synthetic vocoder artifact identification. Evaluates zero-crossing variance, spectral roll-off anomalies, and temporal over-smoothing.
              </p>
            </div>

            <div className="pt-3.5 sm:pt-4 border-t border-brand-border/60 flex items-center justify-between text-xs text-red-400 font-medium">
              <span>Scan Audio Specimen</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Panel>
        </Link>

        {/* Intelligence Reports Card */}
        <Link href="/reports" className="group block md:col-span-2 xl:col-span-1">
          <Panel className="h-full !p-5 sm:!p-7 transition-all duration-300 group-hover:border-brand-emerald/40 group-hover:shadow-[0_0_30px_rgba(0,255,136,0.12)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-lg bg-brand-surface border border-brand-border text-brand-emerald">
                  Court-Ready
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2 group-hover:text-brand-emerald transition-colors">
                Forensic PDF Dockets
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed mb-5 sm:mb-6">
                Generate and export official forensic documentation with mathematical similarity breakdown, acoustic telemetry tables, and expert diagnostic conclusions.
              </p>
            </div>

            <div className="pt-3.5 sm:pt-4 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-emerald font-medium">
              <span>Compile Intelligence Docket</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Panel>
        </Link>

      </div>

      {/* Forensic Engine Architecture Status */}
      <div className="pt-2 sm:pt-4">
        <div className="flex items-center gap-2 mb-3 sm:mb-4 px-1">
          <Activity className="w-4 h-4 text-brand-cyan" />
          <h2 className="text-[11px] sm:text-xs uppercase tracking-[0.2em] font-semibold text-neutral-400">Forensic Engine Pipeline</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl border border-brand-border bg-brand-panel/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Microsoft WavLM</span>
              <span className="text-[10px] text-brand-cyan font-mono font-medium">Large (Base+)</span>
            </div>
            <p className="text-[11px] text-neutral-500">Self-supervised masked speech modeling for robust noise-invariant speaker representation.</p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-brand-panel/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Wav2Vec2-XLSR</span>
              <span className="text-[10px] text-brand-cyan font-mono font-medium">53 Languages</span>
            </div>
            <p className="text-[11px] text-neutral-500">Cross-lingual acoustic embedding alignment for phoneme-level cosine comparison.</p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-brand-panel/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Acoustic Biometrics</span>
              <span className="text-[10px] text-brand-emerald font-mono font-medium">Pitch & Jitter</span>
            </div>
            <p className="text-[11px] text-neutral-500">Fundamental frequency (F0), formant ratios, shimmer, and vocal tract tractability.</p>
          </div>

          <div className="p-4 rounded-xl border border-brand-border bg-brand-panel/60 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">Ephemeral Sandbox</span>
              <span className="text-[10px] text-brand-emerald font-mono font-medium">Zero Persistence</span>
            </div>
            <p className="text-[11px] text-neutral-500">Volatile in-memory analysis with 30-min auto-purge for complete evidentiary integrity.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
