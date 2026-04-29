"use client";

import { useState } from "react";
import { Activity, Upload, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { HtsGraphEngine } from "@/components/hts/HtsGraphEngine";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Panel } from "@/components/ui/Panel";
import { ColumnMapper } from "@/components/ui/ColumnMapper";
import { apiClient } from "@/lib/apiClient";

import { useAppStore } from "@/lib/store";

export default function HTSPage() {
  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);

  const {
    htsAnalysisData: analysisData,
    htsMappingData: mappingData,
    setHtsAnalysisData: setAnalysisData,
    setHtsMappingData: setMappingData,
    resetHts: handleResetStore,
    activeJobs,
    setActiveJob,
    jobErrors,
    clearJobError,
  } = useAppStore();

  const isUploading = !!activeJobs["hts_upload"];
  const isMapping = !!activeJobs["hts_mapping"];
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setMappingData(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a target CSV file first.");
      return;
    }

    try {
      setError(null);
      setMappingData(null);
      clearJobError("hts_upload");
      setIsSubmitting(true);
      const uploadResult = await apiClient.uploadHts(file);
      setActiveJob("hts_upload", uploadResult.job_id);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during processing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMappingConfirm = async (mapping: Record<string, string>) => {
    try {
      setError(null);
      clearJobError("hts_mapping");
      const confirmResult = await apiClient.confirmHtsMapping(mapping);
      setActiveJob("hts_mapping", confirmResult.job_id);
    } catch (err: any) {
      setError(err.message || "Mapping confirmation failed.");
    }
  };

  const handleReset = () => {
    handleResetStore();
    setFile(null);
    setError(null);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <SectionHeader 
        title="HTS Analyzer" 
        subtitle="Communication graph intelligence and network topology mapping"
        icon={Activity}
      >
        {(analysisData || mappingData) && (
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 border border-brand-border bg-brand-surface hover:bg-brand-border/50 rounded-lg text-xs text-neutral-400 hover:text-white transition-all"
          >
            <RotateCcw className="w-3 h-3" /> New Dataset
          </button>
        )}
      </SectionHeader>
      
      {/* Upload Portal */}
      {!analysisData && !mappingData && (
        <Panel 
          className="max-w-2xl mx-auto !p-8"
          loading={isUploading || isSubmitting}
        >
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-brand-cyan/8 border border-brand-cyan/10 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6 text-brand-cyan/60" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1.5">Initialize Data Stream</h3>
            <p className="text-neutral-500 text-sm">Upload an HTS Call Detail Record CSV to begin analysis.</p>
            <p className="text-neutral-600 text-xs mt-1">Any CSV format is supported — columns will be auto-detected.</p>
          </div>
          
          <div className="space-y-5">
             <div className="w-full relative group">
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full p-7 border-2 border-dashed rounded-xl text-center transition-all duration-200 ${file ? 'border-brand-emerald/40 bg-brand-emerald/5' : 'border-brand-border group-hover:border-brand-cyan/30 bg-brand-surface'}`}>
                   {file ? (
                     <p className="text-brand-emerald font-mono text-sm">{file.name} ({Math.round(file.size / 1024)} KB)</p>
                   ) : (
                     <div className="flex flex-col items-center text-neutral-500">
                        <Upload className="w-6 h-6 mb-2.5 text-neutral-600 group-hover:text-brand-cyan/50 transition-colors" />
                        <span className="text-sm">Click to browse or drag CSV file here</span>
                        <span className="text-[11px] mt-1.5 text-neutral-600">Auto-detects columns from any CSV format</span>
                     </div>
                   )}
                </div>
             </div>
             
             {(error || jobErrors["hts_upload"]) && (
                <div className="p-3 bg-red-500/8 border border-red-500/15 rounded-lg flex items-start gap-2.5 text-red-400 text-sm">
                   <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                   <p>{error || jobErrors["hts_upload"]}</p>
                </div>
             )}

             <button 
                onClick={handleUpload}
                disabled={!file || isUploading || isSubmitting}
                className="w-full flex items-center justify-center gap-2.5 py-3 bg-brand-cyan hover:bg-cyan-400 active:scale-[0.98] active:brightness-90 text-black rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(0,240,255,0.25)]"
             >
                {(isUploading || isSubmitting) ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing Vectors...</>
                ) : (
                  <><Activity className="w-4 h-4" /> Run HTS Analysis</>
                )}
             </button>
          </div>
        </Panel>
      )}

      {/* Column Mapping UI */}
      {mappingData && !analysisData && (
        <Panel 
          className="!p-6"
          loading={isMapping}
        >
          {error && (
            <div className="mb-4 p-3 bg-red-500/8 border border-red-500/15 rounded-lg flex items-start gap-2.5 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <ColumnMapper
            detectedColumns={mappingData.detected_columns}
            requiredColumns={mappingData.required_columns}
            autoMapping={mappingData.auto_mapping}
            onConfirm={handleMappingConfirm}
            isSubmitting={isMapping}
            profileName={mappingData.profile_name}
            confidence={mappingData.confidence}
          />
        </Panel>
      )}

      {/* Analysis Results View */}
      {analysisData && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
           <HtsGraphEngine data={analysisData} />
        </div>
      )}
    </div>
  );
}
