"use client";

import { useEffect } from "react";
import { LayoutList, Loader2, Database } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Panel } from "@/components/ui/Panel";
import { HorizontalTimeline } from "@/components/timeline/HorizontalTimeline";
import { useAppStore } from "@/lib/store";
import { apiClient } from "@/lib/apiClient";

export default function TimelinePage() {
  const { timelineData: data, activeJobs, jobErrors, setTimelineData } = useAppStore();

  const isProcessing = !!activeJobs["timeline"];
  const error = jobErrors["timeline"];

  // Fetch data on mount if not currently processing and data is missing
  useEffect(() => {
    if (!data && !isProcessing) {
      apiClient.get("/timeline").then(res => {
        if (res && !res.error) {
          if (res.status === "processing") {
            // Register newly triggered orchestrator jobs
            if (res.orchestrator_jobs?.timeline) {
              useAppStore.getState().setActiveJob("timeline", res.orchestrator_jobs.timeline);
            }
            if (res.orchestrator_jobs?.report) {
              useAppStore.getState().setActiveJob("report", res.orchestrator_jobs.report);
            }
          } else {
            setTimelineData(res);
          }
        }
      }).catch(err => {
        console.error("[TimelinePage] Initial fetch failed:", err);
      });
    }
  }, [data, isProcessing, setTimelineData]);

  return (
    <div className="animate-in fade-in duration-300 pb-12">
      <SectionHeader 
        title="Timeline Engine" 
        subtitle="Multi-layer chronological correlation across HTS and GPS modules"
        icon={LayoutList}
      />
      
      {isProcessing ? (
        <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-cyan/8 border border-brand-cyan/10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-brand-cyan" />
          </div>
          <span className="font-mono text-neutral-500 text-xs tracking-widest uppercase">Reconstructing timeline...</span>
        </div>
      ) : !data ? (
         <Panel className="max-w-lg mx-auto !p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center mx-auto mb-4">
              <Database className="w-6 h-6 text-neutral-600" />
            </div>
            <h3 className="text-white font-medium text-base mb-2">Awaiting Intelligence Data</h3>
            <p className="text-neutral-500 text-sm leading-relaxed mb-4">Upload data in the HTS or GPS modules to automatically generate a unified timeline.</p>
            
            <button 
              onClick={() => {
                setTimelineData(null); // Force visual reset
                apiClient.get("/timeline").then(res => {
                   if (res && !res.error) {
                      if (res.status === "processing") {
                         if (res.orchestrator_jobs?.timeline) {
                           useAppStore.getState().setActiveJob("timeline", res.orchestrator_jobs.timeline);
                         }
                         if (res.orchestrator_jobs?.report) {
                           useAppStore.getState().setActiveJob("report", res.orchestrator_jobs.report);
                         }
                      } else {
                        setTimelineData(res);
                      }
                   }
                }).catch(() => {});
              }}
              className="px-6 py-2 bg-brand-surface hover:bg-white/[0.06] text-neutral-300 rounded-xl border border-brand-border transition-all active:scale-[0.98] active:brightness-90 text-sm font-medium"
            >
              Sync Engine
            </button>

            {error && (
              <div className="mt-6 p-3 bg-red-500/8 border border-red-500/15 rounded-lg text-red-400 text-sm text-left">
                <strong>Timeline Generation Failed:</strong>
                <p className="mt-1">{error}</p>
              </div>
            )}
         </Panel>
      ) : (
         <HorizontalTimeline data={data} />
      )}
    </div>
  );
}
