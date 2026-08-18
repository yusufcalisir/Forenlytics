"use client";

import { useState, useEffect } from "react";
import {
  FileText, Download, Loader2, Mic, Radar, ShieldCheck, Terminal,
  Plus, Minus, RotateCcw, Activity, AlertOctagon, Layers, Clock, Cpu, Waves, Radio, GitBranch
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Panel } from "@/components/ui/Panel";
import { apiClient } from "@/lib/apiClient";
import { useAppStore } from "@/lib/store";
import { clsx } from "clsx";

export default function ReportsPage() {
  const { reportData: data, setReportData: setData, activeJobs } = useAppStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("speaker");

  const isProcessing = !!activeJobs["report"];

  // Auto-fetch report if not present
  useEffect(() => {
    if (!data && !isProcessing) {
      handleCompile();
    }
  }, []);

  const handleCompile = async () => {
    try {
      setError(null);
      const res = await apiClient.get("/generate-report");
      if (res.status === "processing") {
        return;
      }
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to compile audio forensic report.");
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await apiClient.downloadReport();
    } catch (err: any) {
      setError(err.message || "PDF stream failed.");
    } finally {
      setIsDownloading(false);
    }
  };

  const AccordionSection = ({ title, icon: Icon, id, children }: any) => {
    const isOpen = openSection === id;
    return (
      <div className="intel-panel !p-0 overflow-hidden mb-3">
         <button 
           onClick={() => setOpenSection(isOpen ? null : id)}
           className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-white/[0.02] transition-colors text-left gap-2"
         >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
               <Icon className="w-4 h-4 text-brand-cyan shrink-0" />
               <span className="font-medium text-white tracking-wide text-xs sm:text-sm truncate">{title}</span>
            </div>
            {isOpen ? <Minus className="w-3.5 h-3.5 text-neutral-500 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-neutral-500 shrink-0" />}
         </button>
         {isOpen && (
            <div className="p-3.5 sm:p-5 border-t border-brand-border text-neutral-300 text-xs sm:text-sm animate-in slide-in-from-top-2 duration-200">
               {children}
            </div>
         )}
      </div>
    );
  };

  const dimScores = data?.speaker_verification?.dimension_scores || {};
  const disagreements = data?.speaker_verification?.disagreements || [];
  const dfSignals = data?.deepfake_diagnostics?.signals || {};
  const dfIntervals = data?.deepfake_diagnostics?.suspect_intervals || [];
  const dfDisagreements = data?.deepfake_diagnostics?.disagreements || [];

  return (
    <div className="animate-in fade-in duration-300 pb-16 space-y-6 sm:space-y-8">
      <SectionHeader 
        title="Audio Forensic Intelligence Docket" 
        subtitle="Comprehensive 6-dimension acoustic biometric and multi-signal deepfake diagnostic record"
        icon={FileText}
      />

      {isProcessing ? (
        <Panel className="max-w-lg mx-auto !p-6 sm:!p-8 text-center">
           <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-cyan/8 border border-brand-cyan/10 flex items-center justify-center mx-auto mb-4">
             <Loader2 className="w-6 h-6 animate-spin text-brand-cyan" />
           </div>
           <h3 className="text-white font-medium text-base mb-1.5">Compiling Forensic Docket</h3>
           <p className="text-neutral-500 text-xs sm:text-sm leading-relaxed">Aggregating multi-dimensional acoustic signals and synthetic telemetry...</p>
        </Panel>
      ) : !data ? (
        <Panel className="max-w-lg mx-auto !p-6 sm:!p-8 text-center">
           <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-cyan/8 border border-brand-cyan/10 flex items-center justify-center mx-auto mb-4">
             <Terminal className="w-6 h-6 text-brand-cyan/50" />
           </div>
           <h3 className="text-white font-medium text-base mb-1.5">Compile Forensic Docket</h3>
           <p className="text-neutral-500 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">Compile session vocal biometrics, neural embeddings (WavLM/ECAPA), pitch contours, LPC formants, and synthetic artifact scan results into an exportable docket.</p>
           
           {error && <p className="text-red-400 text-xs mb-4 bg-red-400/8 py-2 px-3 rounded-lg border border-red-400/15">{error}</p>}
           
           <button 
             onClick={handleCompile}
             className="flex items-center justify-center gap-2.5 w-full py-3 bg-brand-cyan/10 hover:bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/20 rounded-xl transition-all text-xs sm:text-sm font-semibold tracking-widest active:scale-[0.98]"
           >
             COMPILE DOCKET
           </button>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           <div className="lg:col-span-2 space-y-1 order-2 lg:order-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-3 sm:mb-4 px-1">Forensic Docket Preview</p>
              
              {/* ── 1. SPEAKER COMPARISON ── */}
              <AccordionSection title="MULTI-DIMENSIONAL FORENSIC COMPARISON" icon={Mic} id="speaker">
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 mb-4">
                    <div className="p-2.5 sm:p-3 bg-brand-surface border border-brand-border rounded-xl">
                      <span className="text-neutral-500 block text-[9px] sm:text-[10px] uppercase tracking-wider">Composite Score</span>
                      <span className="font-mono text-lg sm:text-xl text-white font-bold stat-value">{data.speaker_verification?.similarity_score ?? 0}%</span>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-brand-surface border border-brand-border rounded-xl">
                      <span className="text-neutral-500 block text-[9px] sm:text-[10px] uppercase tracking-wider">Verdict</span>
                      <span className="font-mono text-xs sm:text-sm text-brand-cyan font-semibold truncate block">{data.speaker_verification?.verdict ?? "N/A"}</span>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-brand-surface border border-brand-border rounded-xl col-span-2 lg:col-span-1">
                      <span className="text-neutral-500 block text-[9px] sm:text-[10px] uppercase tracking-wider">Confidence</span>
                      <span className="font-mono text-sm sm:text-base text-brand-emerald font-semibold">{data.speaker_verification?.confidence_level ?? "N/A"}</span>
                    </div>
                 </div>

                 {/* 6-Dimension Grid */}
                 <div className="p-3 bg-white/[0.015] rounded-xl border border-brand-border mb-4">
                   <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-2">Acoustic Dimension Breakdown</p>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                     <div className="p-2 bg-brand-surface rounded-lg border border-brand-border/60">
                       <span className="text-neutral-500 text-[9px] uppercase block">Neural Identity (35%)</span>
                       <span className="text-white font-bold">{dimScores.neural_identity != null ? `${dimScores.neural_identity}%` : "—"}</span>
                     </div>
                     <div className="p-2 bg-brand-surface rounded-lg border border-brand-border/60">
                       <span className="text-neutral-500 text-[9px] uppercase block">Vocal Tract F1-F4 (20%)</span>
                       <span className="text-white font-bold">{dimScores.formants != null ? `${dimScores.formants}%` : "—"}</span>
                     </div>
                     <div className="p-2 bg-brand-surface rounded-lg border border-brand-border/60">
                       <span className="text-neutral-500 text-[9px] uppercase block">Pitch F0 (15%)</span>
                       <span className="text-white font-bold">{dimScores.pitch != null ? `${dimScores.pitch}%` : "—"}</span>
                     </div>
                     <div className="p-2 bg-brand-surface rounded-lg border border-brand-border/60">
                       <span className="text-neutral-500 text-[9px] uppercase block">Spectral MFCC (15%)</span>
                       <span className="text-white font-bold">{dimScores.spectral_mfcc != null ? `${dimScores.spectral_mfcc}%` : "—"}</span>
                     </div>
                     <div className="p-2 bg-brand-surface rounded-lg border border-brand-border/60">
                       <span className="text-neutral-500 text-[9px] uppercase block">Speaking Rhythm (10%)</span>
                       <span className="text-white font-bold">{dimScores.rhythm != null ? `${dimScores.rhythm}%` : "—"}</span>
                     </div>
                     <div className="p-2 bg-brand-surface rounded-lg border border-brand-border/60">
                       <span className="text-neutral-500 text-[9px] uppercase block">Energy Dynamics (5%)</span>
                       <span className="text-white font-bold">{dimScores.energy != null ? `${dimScores.energy}%` : "—"}</span>
                     </div>
                   </div>
                 </div>

                 {/* Disagreements */}
                 {disagreements.length > 0 && (
                   <div className="mb-4 space-y-2">
                     <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                       <AlertOctagon className="w-3.5 h-3.5" /> Comparison Disagreement Flags ({disagreements.length})
                     </p>
                     {disagreements.map((d: any, i: number) => (
                       <div key={i} className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200">
                         {d.message}
                       </div>
                     ))}
                   </div>
                 )}

                 {data.speaker_verification?.breakdown?.length > 0 && (
                   <div className="mt-3 pt-3 border-t border-brand-border">
                     <p className="text-xs font-semibold text-neutral-300 mb-2 uppercase tracking-wider">Pipeline Output Breakdown</p>
                     <ul className="text-xs text-neutral-400 space-y-1.5 list-disc pl-4">
                       {data.speaker_verification.breakdown.map((item: string, idx: number) => (
                         <li key={idx} className={item.includes("WARNING") || item.includes("⚠") ? "text-amber-400 font-medium" : ""}>{item}</li>
                       ))}
                     </ul>
                   </div>
                 )}
              </AccordionSection>

              {/* ── 2. DEEPFAKE & MULTI-SIGNAL DIAGNOSTICS ── */}
              <AccordionSection title="DEEPFAKE & SYNTHETIC SPEECH EVALUATION" icon={Radar} id="deepfake">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 mb-4">
                    <div className="p-2.5 sm:p-3 bg-brand-surface border border-brand-border rounded-xl">
                      <span className="text-neutral-500 block text-[9px] sm:text-[10px] uppercase tracking-wider">Verdict</span>
                      <span className="font-mono text-base sm:text-lg text-white font-bold">{data.deepfake_diagnostics?.label ?? "N/A"}</span>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-brand-surface border border-brand-border rounded-xl">
                      <span className="text-neutral-500 block text-[9px] sm:text-[10px] uppercase tracking-wider">Anomaly Index</span>
                      <span className="font-mono text-base sm:text-lg text-red-400 font-bold">{data.deepfake_diagnostics?.deepfake_score ?? 0}%</span>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-brand-surface border border-brand-border rounded-xl">
                      <span className="text-neutral-500 block text-[9px] sm:text-[10px] uppercase tracking-wider">Confidence</span>
                      <span className="font-mono text-sm sm:text-base text-neutral-200 font-semibold">{data.deepfake_diagnostics?.confidence ?? "N/A"}</span>
                    </div>
                 </div>

                 {/* Manipulation Category Badge */}
                 {data.deepfake_diagnostics?.category_label && (
                   <div className="p-2.5 bg-brand-surface rounded-xl border border-brand-border mb-3 flex items-center justify-between text-xs">
                     <span className="text-neutral-400">Manipulation Category:</span>
                     <span className="font-mono font-bold text-white text-[11px]">{data.deepfake_diagnostics.category_label}</span>
                   </div>
                 )}

                 {/* 4 Signals Grid */}
                 <div className="p-3 bg-white/[0.015] rounded-xl border border-brand-border mb-3">
                   <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mb-2">4-Signal Diagnostic Breakdown</p>
                   <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                     <div className="p-2.5 bg-brand-surface rounded-lg border border-brand-border/60">
                       <span className="text-neutral-500 text-[9px] uppercase block">Signal 1: Primary Model</span>
                       <span className="text-brand-cyan font-bold">{dfSignals.neural_model?.score != null ? `${dfSignals.neural_model.score.toFixed(1)}%` : "—"}</span>
                     </div>
                     <div className="p-2.5 bg-brand-surface rounded-lg border border-brand-border/60">
                       <span className="text-neutral-500 text-[9px] uppercase block">Signal 2: Vocoder Ripple</span>
                       <span className="text-amber-400 font-bold">{dfSignals.vocoder_artifacts?.score != null ? `${dfSignals.vocoder_artifacts.score.toFixed(1)}%` : "—"}</span>
                     </div>
                     <div className="p-2.5 bg-brand-surface rounded-lg border border-brand-border/60">
                       <span className="text-neutral-500 text-[9px] uppercase block">Signal 3: Prosody Unnaturalness</span>
                       <span className="text-purple-400 font-bold">{dfSignals.prosody_naturalness?.score != null ? `${dfSignals.prosody_naturalness.score.toFixed(1)}%` : "—"}</span>
                     </div>
                     <div className="p-2.5 bg-brand-surface rounded-lg border border-brand-border/60">
                       <span className="text-neutral-500 text-[9px] uppercase block">Signal 4: Splicing / Boundary</span>
                       <span className="text-emerald-400 font-bold">{dfSignals.spectral_consistency?.score != null ? `${dfSignals.spectral_consistency.score.toFixed(1)}%` : "—"}</span>
                     </div>
                   </div>
                 </div>

                 {/* Suspect Intervals if any */}
                 {dfIntervals.length > 0 && (
                   <div className="p-2.5 bg-red-500/10 border border-red-500/25 rounded-xl mb-3 space-y-1.5">
                     <span className="text-[10px] uppercase font-bold text-red-400 block">Localized Suspicious Segments</span>
                     <div className="flex flex-wrap gap-1.5">
                       {dfIntervals.map((iv: any, i: number) => (
                         <span key={i} className="px-2 py-0.5 rounded bg-red-500/20 text-red-200 font-mono text-[10px]">
                           {iv.t_start}s – {iv.t_end}s
                         </span>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Disagreements */}
                 {dfDisagreements.length > 0 && (
                   <div className="mb-3 space-y-2">
                     <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                       <AlertOctagon className="w-3.5 h-3.5" /> Signal Disagreement Flags ({dfDisagreements.length})
                     </p>
                     {dfDisagreements.map((d: any, i: number) => (
                       <div key={i} className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200">
                         {d.message}
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="p-3 sm:p-3.5 bg-brand-surface border border-brand-border rounded-xl text-xs leading-relaxed text-neutral-300">
                   <p className="font-semibold text-white mb-1">Diagnostic Interpretation:</p>
                   {data.deepfake_diagnostics?.interpretation}
                 </div>
              </AccordionSection>

              {/* ── 3. FORENSIC SYNTHESIS ── */}
              <AccordionSection title="FORENSIC SUMMARY & SYNTHESIS" icon={ShieldCheck} id="summary">
                 <div className="p-3.5 sm:p-4 bg-brand-surface border border-brand-border rounded-xl text-xs leading-relaxed font-mono text-neutral-300">
                   {data.final_summary?.observation}
                 </div>
                 <div className="mt-3 flex flex-col sm:flex-row justify-between gap-1 text-[10px] sm:text-[11px] text-neutral-500">
                   <span>Platform: {data.case_summary?.target_platform}</span>
                   <span>Timestamp: {data.case_summary?.generated_at}</span>
                 </div>
              </AccordionSection>

           </div>

           <div className="lg:col-span-1 order-1 lg:order-2">
              <div className="sticky top-20">
                <Panel glow="cyan" className="!p-4 sm:!p-6">
                   <h3 className="font-medium text-white tracking-widest text-xs mb-4 sm:mb-5 border-b border-brand-border pb-3 uppercase">Export Forensic Docket</h3>
                   {error && <p className="text-red-400 text-[11px] mb-4 bg-red-400/10 p-2.5 rounded-lg border border-red-400/20">{error}</p>}
                   
                   <button 
                     onClick={handleDownload}
                     disabled={isDownloading}
                     className="w-full flex items-center justify-center gap-2.5 py-3 sm:py-3.5 bg-brand-cyan hover:bg-cyan-400 active:scale-[0.98] text-black rounded-xl font-bold transition-all disabled:opacity-40 hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] tracking-widest text-xs sm:text-sm"
                   >
                     {isDownloading ? <><Loader2 className="w-4 h-4 animate-spin" /> ENCODING PDF...</> : <><Download className="w-4 h-4" /> EXPORT PDF DOCKET</>}
                   </button>
                   
                   <button 
                     onClick={handleCompile}
                     className="w-full mt-2.5 sm:mt-3 py-2.5 flex items-center justify-center gap-2 text-xs text-neutral-400 hover:text-white bg-brand-surface hover:bg-white/5 border border-brand-border rounded-xl transition-colors active:scale-[0.98]"
                   >
                     <RotateCcw className="w-3.5 h-3.5" /> Re-sync Session Data
                   </button>
                </Panel>
              </div>
           </div>

        </div>
      )}
    </div>
  );
}
