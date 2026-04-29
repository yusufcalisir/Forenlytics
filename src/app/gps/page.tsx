"use client";

import { useState, useEffect } from "react";
import { Map, Upload, Loader2, AlertCircle, Play, Pause, Route, MapPin, Navigation, Activity, ShieldAlert, RotateCcw } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Panel } from "@/components/ui/Panel";
import { ColumnMapper } from "@/components/ui/ColumnMapper";
import { apiClient } from "@/lib/apiClient";
import { InteractiveMap } from "@/components/gps/InteractiveMap";

import { useAppStore } from "@/lib/store";

export default function GPSPage() {
  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);

  const {
    gpsAnalysisData: analysisData,
    gpsMappingData: mappingData,
    setGpsAnalysisData: setAnalysisData,
    setGpsMappingData: setMappingData,
    resetGps: handleResetStore,
    activeJobs,
    setActiveJob,
    jobErrors,
    clearJobError,
  } = useAppStore();

  const isUploading = !!activeJobs["gps_upload"];
  const isMapping = !!activeJobs["gps_mapping"];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeIndex, setTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setMappingData(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a target GPS CSV or JSON file first.");
      return;
    }

    try {
      setError(null);
      setMappingData(null);
      clearJobError("gps_upload");
      setIsSubmitting(true);
      const uploadResult = await apiClient.uploadGps(file);
      setActiveJob("gps_upload", uploadResult.job_id);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during processing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMappingConfirm = async (mapping: Record<string, string>) => {
    try {
      setError(null);
      clearJobError("gps_mapping");
      const confirmResult = await apiClient.confirmGpsMapping(mapping);
      setActiveJob("gps_mapping", confirmResult.job_id);
    } catch (err: any) {
      setError(err.message || "Mapping confirmation failed.");
    }
  };

  const handleReset = () => {
    handleResetStore();
    setFile(null);
    setError(null);
    setTimeIndex(0);
    setIsPlaying(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && analysisData?.points) {
      interval = setInterval(() => {
        setTimeIndex((prev) => {
          if (prev >= analysisData.points.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const step = Math.max(1, Math.floor(analysisData.points.length / 200));
          return Math.min(prev + step, analysisData.points.length - 1);
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying, analysisData]);

  const togglePlay = () => {
    if (timeIndex >= (analysisData?.points.length || 0) - 1) {
      setTimeIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="animate-in fade-in duration-300 h-full flex flex-col">
      {!analysisData ? (
        <>
          <SectionHeader 
            title="GPS Tracking Engine" 
            subtitle="Spatial coordinate triangulation and movement analysis"
            icon={Map}
          >
            {mappingData && (
              <button 
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 border border-brand-border bg-brand-surface hover:bg-brand-border/50 rounded-lg text-xs text-neutral-400 hover:text-white transition-all"
              >
                <RotateCcw className="w-3 h-3" /> New Dataset
              </button>
            )}
          </SectionHeader>

          {/* Column Mapping UI */}
          {mappingData ? (
            <Panel className="!p-6 w-full">
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
          ) : (
            /* Upload Portal */
            <Panel className="max-w-2xl mx-auto !p-8 w-full">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-brand-cyan/8 border border-brand-cyan/10 flex items-center justify-center mx-auto mb-4">
                  <Map className="w-6 h-6 text-brand-cyan/60" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1.5">Initialize Spatial Engine</h3>
                <p className="text-neutral-500 text-sm">Upload a GPS coordinate file to visualize spatial movement.</p>
                <p className="text-neutral-600 text-xs mt-1">Any CSV/JSON format is supported — columns will be auto-detected.</p>
              </div>
              
              <div className="space-y-5">
                 <div className="w-full relative group">
                   <input 
                     type="file" 
                     accept=".csv,.json"
                     onChange={handleFileChange}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                   />
                   <div className={`w-full p-7 border-2 border-dashed rounded-xl text-center transition-all duration-200 ${file ? 'border-brand-emerald/40 bg-brand-emerald/5' : 'border-brand-border group-hover:border-brand-cyan/30 bg-brand-surface'}`}>
                      {file ? (
                        <p className="text-brand-emerald font-mono text-sm">{file.name} ({Math.round(file.size / 1024)} KB)</p>
                      ) : (
                        <div className="flex flex-col items-center text-neutral-500">
                           <Upload className="w-6 h-6 mb-2.5 text-neutral-600 group-hover:text-brand-cyan/50 transition-colors" />
                           <span className="text-sm">Click to browse or drag file here</span>
                           <span className="text-[11px] mt-1.5 text-neutral-600">Auto-detects columns from any CSV/JSON format</span>
                        </div>
                      )}
                   </div>
                 </div>
                 
                 {(error || jobErrors["gps_upload"]) && (
                    <div className="p-3 bg-red-500/8 border border-red-500/15 rounded-lg flex items-start gap-2.5 text-red-400 text-sm">
                       <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                       <p>{error || jobErrors["gps_upload"]}</p>
                    </div>
                 )}

                 <button 
                    onClick={handleUpload}
                    disabled={!file || isUploading || isSubmitting}
                    className="w-full flex items-center justify-center gap-2.5 py-3 bg-brand-cyan hover:bg-cyan-400 text-black rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(0,240,255,0.25)]"
                 >
                    {(isUploading || isSubmitting) ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing Coordinates...</>
                    ) : (
                      <><Map className="w-4 h-4" /> Plot Journey</>
                    )}
                 </button>
              </div>
            </Panel>
          )}
        </>
      ) : (
        <div className="fixed inset-0 md:left-[72px] overflow-hidden z-0">
          {/* Leaflet Canvas */}
          <InteractiveMap data={analysisData} timeIndex={timeIndex} />

          {/* Floating UI Shell */}
          <div className="absolute top-5 left-5 z-10 w-72 flex flex-col gap-3 pointer-events-none">
            
            {/* Summary Widget */}
            <div className="intel-panel !bg-brand-panel/92 backdrop-blur-xl p-4 pointer-events-auto">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-semibold text-sm text-white tracking-tight flex items-center gap-2">
                   <Navigation className="w-3.5 h-3.5 text-brand-cyan" />
                   Journey Summary
                 </h3>
                 <button 
                    onClick={handleReset}
                    className="text-[10px] text-neutral-500 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
               </div>
               
               <div className="space-y-3">
                 <div className="flex items-center justify-between">
                   <span className="text-neutral-500 text-xs flex items-center gap-2">
                      <Route className="w-3.5 h-3.5" /> Distance
                   </span>
                   <span className="font-mono text-white text-sm stat-value">{analysisData.summary?.total_distance_km || analysisData.total_distance_km} <span className="text-[10px] text-neutral-600">km</span></span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-neutral-500 text-xs flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" /> Stops
                   </span>
                   <span className="font-mono text-white text-sm stat-value">{analysisData.summary?.total_stops || analysisData.total_stops}</span>
                 </div>
                 
                 {analysisData.movement_score !== undefined && (
                   <div className="flex items-center justify-between">
                     <span className="text-neutral-500 text-xs flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> Score
                     </span>
                     <span className={`font-mono font-semibold text-sm stat-value ${analysisData.movement_score > 80 ? 'text-brand-emerald' : analysisData.movement_score > 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {analysisData.movement_score}<span className="text-neutral-600 text-[10px] font-normal"> / 100</span>
                     </span>
                   </div>
                 )}
                 
                 {analysisData.speed_anomalies !== undefined && (
                   <div className="flex items-center justify-between">
                     <span className="text-neutral-500 text-xs flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5" /> Anomalies
                     </span>
                     <span className={`font-mono text-sm stat-value ${analysisData.speed_anomalies.length > 0 ? 'text-red-400' : 'text-brand-emerald'}`}>
                        {analysisData.speed_anomalies.length}
                     </span>
                   </div>
                 )}
                 <div className="pt-3 border-t border-brand-border/50">
                    <span className="text-[10px] text-brand-cyan/60 mb-1 block uppercase tracking-widest">Primary Sector</span>
                     <span className="font-mono text-[11px] text-neutral-400 bg-brand-surface px-2 py-1 rounded inline-block border border-brand-border">
                        LAT: {(analysisData.summary?.top_area || analysisData.most_visited_areas?.[0])?.lat} / LNG: {(analysisData.summary?.top_area || analysisData.most_visited_areas?.[0])?.lng}
                     </span>
                 </div>
               </div>
            </div>

            {/* Stops List */}
            {analysisData.stops?.length > 0 && (
              <div className="intel-panel !bg-brand-panel/92 backdrop-blur-xl p-4 pointer-events-auto max-h-52 overflow-y-auto custom-scrollbar">
                 <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest mb-3">Stationary Events</h4>
                 <div className="space-y-2.5">
                   {analysisData.stops.map((stop: any, idx: number) => (
                      <div key={idx} className="border-l-2 border-brand-cyan/40 pl-3">
                        <span className="text-[11px] text-neutral-400 block">{stop.start_time.split(' ')[1]} - {stop.end_time.split(' ')[1]}</span>
                        <span className="text-[11px] font-mono text-brand-cyan block">{stop.duration_minutes} mins</span>
                      </div>
                   ))}
                 </div>
              </div>
            )}

            {/* Anomalies List */}
            {analysisData.speed_anomalies && analysisData.speed_anomalies.length > 0 && (
              <div className="intel-panel !bg-brand-panel/92 backdrop-blur-xl !border-red-500/15 p-4 pointer-events-auto max-h-52 overflow-y-auto custom-scrollbar">
                 <h4 className="text-[10px] font-semibold text-red-500/70 uppercase tracking-widest mb-3">Detected Anomalies</h4>
                 <div className="space-y-2.5">
                   {analysisData.speed_anomalies.map((anomaly: any, idx: number) => (
                      <div key={idx} className="border-l-2 border-red-500/50 pl-3">
                        <span className="text-[11px] text-neutral-400 block">{anomaly.start_timestamp.split(' ')[1]}</span>
                        {anomaly.is_teleport ? (
                           <span className="text-[11px] font-mono text-red-400 block font-bold">TELEPORT: {anomaly.distance_km}km</span>
                        ) : (
                           <span className="text-[11px] font-mono text-red-400 block">SPEED: {anomaly.speed_kmh} km/h</span>
                        )}
                      </div>
                   ))}
                 </div>
              </div>
            )}
          </div>

          {/* Temporal Scrubber */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 w-[80%] max-w-3xl intel-panel !bg-brand-panel/92 backdrop-blur-xl p-4 flex items-center gap-4 pointer-events-auto">
             <button 
                onClick={togglePlay}
                className="w-9 h-9 shrink-0 bg-brand-cyan/15 hover:bg-brand-cyan text-brand-cyan hover:text-black rounded-lg flex items-center justify-center transition-all duration-200 border border-brand-cyan/20"
             >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
             </button>
             
             <div className="flex-1">
               <input 
                 type="range" 
                 min="0" 
                 max={analysisData.points.length - 1} 
                 value={timeIndex}
                 onChange={(e) => {
                   setTimeIndex(parseInt(e.target.value));
                   setIsPlaying(false);
                 }}
                 className="w-full"
               />
               <div className="flex justify-between items-center mt-2 px-0.5">
                  <span className="text-[10px] font-mono text-neutral-600">{analysisData.points[0].timestamp}</span>
                  <span className="text-[10px] font-mono text-brand-emerald font-semibold tracking-wide border border-brand-emerald/15 bg-brand-emerald/8 px-2 py-0.5 rounded">
                    {analysisData.points[timeIndex].timestamp}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-600">{analysisData.points[analysisData.points.length - 1].timestamp}</span>
               </div>
             </div>
          </div>

        </div>
      )}
    </div>
  );
}
