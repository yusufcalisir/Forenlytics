"use client";

import { useState } from "react";
import { FileText, Download, Loader2, Target, Map, LayoutList, Terminal, Plus, Minus, RotateCcw } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Panel } from "@/components/ui/Panel";
import { apiClient } from "@/lib/apiClient";
import { useAppStore } from "@/lib/store";

export default function ReportsPage() {
  const { reportData: data, setReportData: setData, activeJobs } = useAppStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("summary");

  const isProcessing = !!activeJobs["report"];

  const handleRetry = async () => {
    try {
      setError(null);
      const res = await apiClient.get("/generate-report");
      if (res.status === "processing") {
        // Still processing, wait for poller
        return;
      }
      if (res.status === "no_data") {
        setError(res.message || "No data available.");
        return;
      }
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to compile intelligence report.");
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
           className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
         >
            <div className="flex items-center gap-3">
               <Icon className="w-4 h-4 text-brand-cyan" />
               <span className="font-medium text-white tracking-wide text-sm">{title}</span>
            </div>
            {isOpen ? <Minus className="w-3.5 h-3.5 text-neutral-500" /> : <Plus className="w-3.5 h-3.5 text-neutral-500" />}
         </button>
         {isOpen && (
            <div className="p-5 border-t border-brand-border text-neutral-300 text-sm animate-in slide-in-from-top-2 duration-200">
               {children}
            </div>
         )}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-300 pb-16">
      <SectionHeader 
        title="Intelligence Reports" 
        subtitle="Compile and export forensic analysis dockets"
        icon={FileText}
      />

      {isProcessing ? (
        <Panel className="max-w-lg mx-auto !p-8 text-center">
           <div className="w-14 h-14 rounded-2xl bg-brand-cyan/8 border border-brand-cyan/10 flex items-center justify-center mx-auto mb-4">
             <Loader2 className="w-6 h-6 animate-spin text-brand-cyan" />
           </div>
           <h3 className="text-white font-medium text-base mb-1.5">Compiling Intelligence Report</h3>
           <p className="text-neutral-500 text-sm leading-relaxed">Aggregating forensic data across all modules...</p>
        </Panel>
      ) : !data ? (
        <Panel className="max-w-lg mx-auto !p-8 text-center">
           <div className="w-14 h-14 rounded-2xl bg-brand-cyan/8 border border-brand-cyan/10 flex items-center justify-center mx-auto mb-4">
             <Terminal className="w-6 h-6 text-brand-cyan/50" />
           </div>
           <h3 className="text-white font-medium text-base mb-1.5">Compile Master Docket</h3>
           <p className="text-neutral-500 text-sm mb-8 leading-relaxed">Run an overarching script capturing logs from HTS matrices, GPS traces, and chronological correlations.</p>
           
           {error && <p className="text-red-400 text-xs mb-4 bg-red-400/8 py-2 rounded-lg border border-red-400/15">{error}</p>}
           
           <button 
             onClick={handleRetry}
             className="flex items-center justify-center gap-2.5 w-full py-3 bg-brand-cyan/10 hover:bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/20 rounded-xl transition-all text-sm font-semibold tracking-widest disabled:opacity-40"
           >
             COMPILE REPORT
           </button>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           <div className="lg:col-span-2 space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 mb-4 px-1">Structured Data Preview</p>
              
              <AccordionSection title="CASE SUMMARY" icon={FileText} id="summary">
                 <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-neutral-600 block text-[10px] uppercase tracking-wider">Total Signals</span><span className="font-mono text-lg text-white stat-value">{data.case_summary.total_hts_records}</span></div>
                    <div><span className="text-neutral-600 block text-[10px] uppercase tracking-wider">Geo Intercepts</span><span className="font-mono text-lg text-white stat-value">{data.case_summary.total_gps_points}</span></div>
                    <div className="col-span-2"><span className="text-neutral-600 block text-[10px] uppercase tracking-wider">Observation Window</span><span className="font-mono text-sm text-brand-cyan">{data.case_summary.time_range_covered}</span></div>
                 </div>
              </AccordionSection>

              <AccordionSection title="COMMUNICATIONS LOGS" icon={Target} id="comms">
                 <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-neutral-600 block text-[10px] uppercase tracking-wider">Network Nodes</span><span className="font-mono text-lg text-white stat-value">{data.communication_analysis.unique_numbers}</span></div>
                    <div className="col-span-2"><span className="text-neutral-600 block text-[10px] uppercase tracking-wider">Maximum Frequency Vector</span><span className="font-mono text-sm text-brand-cyan">{data.communication_analysis.top_pair.source} {'→'} {data.communication_analysis.top_pair.target}</span></div>
                 </div>
              </AccordionSection>

              <AccordionSection title="GEOSPATIAL TRACES" icon={Map} id="geo">
                 <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-neutral-600 block text-[10px] uppercase tracking-wider">Distance</span><span className="font-mono text-lg text-white stat-value">{data.movement_analysis.distance_km} km</span></div>
                    <div><span className="text-neutral-600 block text-[10px] uppercase tracking-wider">Stationary Halts</span><span className="font-mono text-lg text-white stat-value">{data.movement_analysis.total_stops}</span></div>
                    <div className="col-span-2"><span className="text-neutral-600 block text-[10px] uppercase tracking-wider">Primary Grid Lock</span><span className="font-mono text-sm text-brand-cyan">Lat: {data.movement_analysis.most_visited_area.lat} / Lng: {data.movement_analysis.most_visited_area.lng}</span></div>
                 </div>
              </AccordionSection>

              <AccordionSection title="CHRONOLOGICAL INTEGRATION" icon={LayoutList} id="chrono">
                 <div className="grid grid-cols-2 gap-4 mb-4">
                    <div><span className="text-neutral-600 block text-[10px] uppercase tracking-wider">Nodes Processed</span><span className="font-mono text-lg text-white stat-value">{data.timeline_overview.total_events}</span></div>
                    <div><span className="text-neutral-600 block text-[10px] uppercase tracking-wider">Overlaps</span><span className="font-mono text-lg text-red-400 stat-value">{data.timeline_overview.correlated_overlaps}</span></div>
                 </div>
                 <div className="p-4 bg-brand-surface border border-brand-border rounded-xl text-xs leading-relaxed font-mono text-neutral-500">
                   {data.final_summary.observation}
                 </div>
              </AccordionSection>

           </div>

           <div className="lg:col-span-1">
              <div className="sticky top-20">
                <Panel glow="cyan" className="!p-6">
                   <h3 className="font-medium text-white tracking-widest text-xs mb-5 border-b border-brand-border pb-3 uppercase">Export Routine</h3>
                   {error && <p className="text-red-400 text-[11px] mb-4">{error}</p>}
                   
                   <button 
                     onClick={handleDownload}
                     disabled={isDownloading}
                     className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-brand-cyan hover:bg-cyan-400 text-black rounded-xl font-bold transition-all disabled:opacity-40 hover:shadow-[0_0_20px_rgba(0,240,255,0.25)] tracking-widest text-sm"
                   >
                     {isDownloading ? <><Loader2 className="w-4 h-4 animate-spin" /> ENCODING...</> : <><Download className="w-4 h-4" /> SECURE PDF</>}
                   </button>
                   
                   <button 
                     onClick={() => setData(null)}
                     className="w-full mt-3 py-2 flex items-center justify-center gap-2 text-[11px] text-neutral-500 hover:text-white transition-colors"
                   >
                     <RotateCcw className="w-3 h-3" /> Reload Dataset
                   </button>
                </Panel>
              </div>
           </div>

        </div>
      )}
    </div>
  );
}
