"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Loader2, Mic, Radar, ShieldCheck, Terminal, Plus, Minus, RotateCcw, Activity } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Panel } from "@/components/ui/Panel";
import { apiClient } from "@/lib/apiClient";
import { useAppStore } from "@/lib/store";

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

  return (
    <div className="animate-in fade-in duration-300 pb-16 space-y-6 sm:space-y-8">
      <SectionHeader 
        title="Audio Forensic Intelligence Docket" 
        subtitle="Comprehensive neural vocal biometric and deepfake diagnostic docket"
        icon={FileText}
      />

      {isProcessing ? (
        <Panel className="max-w-lg mx-auto !p-6 sm:!p-8 text-center">
           <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-cyan/8 border border-brand-cyan/10 flex items-center justify-center mx-auto mb-4">
             <Loader2 className="w-6 h-6 animate-spin text-brand-cyan" />
           </div>
           <h3 className="text-white font-medium text-base mb-1.5">Compiling Forensic Docket</h3>
           <p className="text-neutral-500 text-xs sm:text-sm leading-relaxed">Aggregating vocal biometric and synthetic anomaly telemetry...</p>
        </Panel>
      ) : !data ? (
        <Panel className="max-w-lg mx-auto !p-6 sm:!p-8 text-center">
           <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-cyan/8 border border-brand-cyan/10 flex items-center justify-center mx-auto mb-4">
             <Terminal className="w-6 h-6 text-brand-cyan/50" />
           </div>
           <h3 className="text-white font-medium text-base mb-1.5">Compile Forensic Docket</h3>
           <p className="text-neutral-500 text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed">Compile session vocal biometrics, neural embeddings (WavLM/Wav2Vec2), and synthetic artifact scan results into an exportable docket.</p>
           
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
              
              <AccordionSection title="SPEAKER VERIFICATION & NEURAL BIOMETRICS" icon={Mic} id="speaker">
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-4">
                    <div className="p-2.5 sm:p-3 bg-brand-surface border border-brand-border rounded-xl">
                      <span className="text-neutral-500 block text-[9px] sm:text-[10px] uppercase tracking-wider">Similarity Score</span>
                      <span className="font-mono text-lg sm:text-xl text-white font-bold stat-value">{data.speaker_verification?.similarity_score ?? 0}%</span>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-brand-surface border border-brand-border rounded-xl">
                      <span className="text-neutral-500 block text-[9px] sm:text-[10px] uppercase tracking-wider">Confidence</span>
                      <span className="font-mono text-sm sm:text-base text-brand-cyan font-semibold">{data.speaker_verification?.confidence_level ?? "N/A"}</span>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-brand-surface border border-brand-border rounded-xl">
                      <span className="text-neutral-500 block text-[9px] sm:text-[10px] uppercase tracking-wider">WavLM Neural</span>
                      <span className="font-mono text-sm sm:text-lg text-neutral-200">{data.speaker_verification?.engine_scores?.wavlm !== null ? `${data.speaker_verification?.engine_scores?.wavlm}%` : "OFFLINE"}</span>
                    </div>
                    <div className="p-2.5 sm:p-3 bg-brand-surface border border-brand-border rounded-xl">
                      <span className="text-neutral-500 block text-[9px] sm:text-[10px] uppercase tracking-wider">Wav2Vec2 Match</span>
                      <span className="font-mono text-sm sm:text-lg text-neutral-200">{data.speaker_verification?.engine_scores?.embedding ?? 0}%</span>
                    </div>
                 </div>

                 {data.speaker_verification?.breakdown?.length > 0 && (
                   <div className="mt-3 pt-3 border-t border-brand-border">
                     <p className="text-xs font-semibold text-neutral-300 mb-2 uppercase tracking-wider">Telemetry Breakdown</p>
                     <ul className="text-xs text-neutral-400 space-y-1.5 list-disc pl-4">
                       {data.speaker_verification.breakdown.map((item: string, idx: number) => (
                         <li key={idx} className={item.includes("WARNING") ? "text-red-400 font-medium" : ""}>{item}</li>
                       ))}
                     </ul>
                   </div>
                 )}
              </AccordionSection>

              <AccordionSection title="DEEPFAKE & SYNTHETIC ANOMALY EVALUATION" icon={Radar} id="deepfake">
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

                 <div className="p-3 sm:p-3.5 bg-brand-surface border border-brand-border rounded-xl text-xs leading-relaxed text-neutral-300 mb-3">
                   <p className="font-semibold text-white mb-1">Diagnostic Interpretation:</p>
                   {data.deepfake_diagnostics?.interpretation}
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs text-neutral-400 bg-brand-surface/50 p-3 rounded-xl border border-brand-border/60">
                    <div className="flex sm:flex-col justify-between items-center sm:items-start"><span className="text-neutral-500 block text-[10px] uppercase">ZCR Variance</span><span className="font-mono text-neutral-200">{data.deepfake_diagnostics?.metrics?.zcr_variance ?? "—"}</span></div>
                    <div className="flex sm:flex-col justify-between items-center sm:items-start"><span className="text-neutral-500 block text-[10px] uppercase">Rolloff Variance</span><span className="font-mono text-neutral-200">{data.deepfake_diagnostics?.metrics?.rolloff_variance ?? "—"}</span></div>
                    <div className="flex sm:flex-col justify-between items-center sm:items-start"><span className="text-neutral-500 block text-[10px] uppercase">Embedding Var</span><span className="font-mono text-neutral-200">{data.deepfake_diagnostics?.metrics?.embedding_variance ?? "—"}</span></div>
                 </div>
              </AccordionSection>

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
