"use client";

import { useState } from "react";
import { Mic, Upload, FileAudio, Activity, CheckCircle2, AlertTriangle, Radar, ShieldAlert, Fingerprint } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Panel } from "@/components/ui/Panel";
import { apiClient } from "@/lib/apiClient";
import { clsx } from "clsx";
import { useAppStore } from "@/lib/store";

export default function AudioPage() {
  // Audio Comparison State
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Deepfake State
  const [dfFile, setDfFile] = useState<File | null>(null);
  const [dfError, setDfError] = useState<string | null>(null);

  const {
    audioSpeakerResult: result,
    audioDeepfakeResult: dfResult,
    setAudioSpeakerResult: setResult,
    setAudioDeepfakeResult: setDfResult,
    resetAudioSpeaker: resetResultStore,
    resetAudioDeepfake: resetDfResultStore,
    activeJobs,
    setActiveJob,
    jobErrors,
    clearJobError,
  } = useAppStore();

  const loading = !!activeJobs["audio_compare"];
  const dfLoading = !!activeJobs["audio_deepfake"];

  const handleUpload = async () => {
    if (!file1 || !file2) return;
    setError(null);
    setResult(null);
    clearJobError("audio_compare");
    try {
      const data = await apiClient.uploadAudioPair(file1, file2);
      setActiveJob("audio_compare", data.job_id);
    } catch (err: any) {
      setError(err.message || "Failed to process audio pair.");
    }
  };

  const handleDfUpload = async () => {
    if (!dfFile) return;
    setDfError(null);
    setDfResult(null);
    clearJobError("audio_deepfake");
    try {
      const data = await apiClient.detectDeepfake(dfFile);
      setActiveJob("audio_deepfake", data.job_id);
    } catch (err: any) {
      setDfError(err.message || "Failed to process audio.");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-400 border-green-400";
    if (score >= 40) return "text-yellow-400 border-yellow-400";
    return "text-red-400 border-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-green-400/10";
    if (score >= 40) return "bg-yellow-400/10";
    return "bg-red-400/10";
  };

  const getRiskColor = (label: string) => {
    if (label === "REAL") return "text-green-400 border-green-400 bg-green-400/10";
    if (label === "UNCERTAIN") return "text-yellow-400 border-yellow-400 bg-yellow-400/10";
    if (label === "DEEPFAKE") return "text-red-400 border-red-400 bg-red-400/10";
    return "text-neutral-400 border-neutral-400 bg-neutral-900";
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-14 pb-16">
      
      {/* SECTION 1: AUDIO COMPARISON */}
      <section>
        <SectionHeader 
          title="Audio Analysis" 
          subtitle="Acoustic fingerprinting and structural signal comparison"
          icon={Mic}
        />
        
        {/* Upload Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* Upload 1 */}
          <Panel className="group hover:!border-brand-cyan/20">
            <div className="mb-3 text-xs font-medium text-neutral-400 flex items-center gap-2 uppercase tracking-widest">
              <span className="w-5 h-5 rounded bg-brand-surface flex items-center justify-center text-[10px] font-bold text-neutral-500">1</span> 
              Target Sample
            </div>
            {!file1 ? (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-brand-border rounded-xl cursor-pointer bg-brand-surface hover:border-brand-cyan/25 transition-all duration-200">
                <Upload className="w-5 h-5 text-neutral-600 mb-2" />
                <span className="text-[11px] text-neutral-500">Upload .wav or .mp3</span>
                <input type="file" className="hidden" accept=".wav,.mp3" onChange={(e) => setFile1(e.target.files?.[0] || null)} />
              </label>
            ) : (
              <div className="flex items-center justify-between w-full h-28 px-4 border border-brand-cyan/20 bg-brand-cyan/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileAudio className="w-7 h-7 text-brand-cyan" />
                  <div>
                    <p className="text-sm text-white font-medium truncate max-w-[180px]">{file1.name}</p>
                    <p className="text-[11px] text-brand-cyan">{(file1.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button onClick={() => setFile1(null)} className="text-[10px] text-neutral-500 hover:text-white transition-colors">Clear</button>
              </div>
            )}
          </Panel>

          {/* Upload 2 */}
          <Panel className="group hover:!border-brand-emerald/20">
            <div className="mb-3 text-xs font-medium text-neutral-400 flex items-center gap-2 uppercase tracking-widest">
              <span className="w-5 h-5 rounded bg-brand-surface flex items-center justify-center text-[10px] font-bold text-neutral-500">2</span> 
              Comparison Sample
            </div>
            {!file2 ? (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-brand-border rounded-xl cursor-pointer bg-brand-surface hover:border-brand-emerald/25 transition-all duration-200">
                <Upload className="w-5 h-5 text-neutral-600 mb-2" />
                <span className="text-[11px] text-neutral-500">Upload .wav or .mp3</span>
                <input type="file" className="hidden" accept=".wav,.mp3" onChange={(e) => setFile2(e.target.files?.[0] || null)} />
              </label>
            ) : (
              <div className="flex items-center justify-between w-full h-28 px-4 border border-brand-emerald/20 bg-brand-emerald/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileAudio className="w-7 h-7 text-brand-emerald" />
                  <div>
                    <p className="text-sm text-white font-medium truncate max-w-[180px]">{file2.name}</p>
                    <p className="text-[11px] text-brand-emerald">{(file2.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button onClick={() => setFile2(null)} className="text-[10px] text-neutral-500 hover:text-white transition-colors">Clear</button>
              </div>
            )}
          </Panel>
        </div>

        {/* Action */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleUpload}
            disabled={!file1 || !file2 || loading}
            className="flex items-center gap-2.5 px-6 py-2.5 bg-brand-cyan hover:bg-cyan-400 text-black font-semibold rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(0,240,255,0.25)]"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Processing...</>
            ) : (
              <><Activity className="w-4 h-4" /> Analyze Pair</>
            )}
          </button>
          {(error || jobErrors["audio_compare"]) && <p className="text-red-400 text-xs flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5"/> {error || jobErrors["audio_compare"]}</p>}
        </div>

        {/* Results */}
        {result && (
          <Panel className="animate-in slide-in-from-bottom-4 duration-500 !p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="col-span-1 lg:border-r border-brand-border lg:pr-8 flex flex-col items-center justify-center">
                <p className="text-neutral-500 text-[10px] mb-5 uppercase tracking-[0.2em] font-medium">Correlation</p>
                <div className={clsx("w-40 h-40 rounded-full border-[6px] flex items-center justify-center flex-col", getScoreColor(result.similarity_score), getScoreBg(result.similarity_score))}>
                  <span className="text-4xl font-mono font-bold stat-value">{result.similarity_score}</span>
                  <span className="text-[10px] opacity-60 mt-0.5 uppercase tracking-wider">Similarity</span>
                </div>
                <div className="mt-6">
                  <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", getScoreBg(result.similarity_score), getScoreColor(result.similarity_score))}>
                    <CheckCircle2 className="w-3 h-3" /> {result.confidence_level}
                  </span>
                </div>
              </div>

              <div className="col-span-2">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                  <div className="p-3 border border-brand-border rounded-xl bg-brand-surface">
                    <p className="text-[10px] text-neutral-600 mb-1 tracking-wider uppercase">WavLM</p>
                    <p className="text-lg font-mono text-white stat-value">{result.engine_scores.wavlm.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 border border-brand-border rounded-xl bg-brand-surface">
                    <p className="text-[10px] text-neutral-600 mb-1 tracking-wider uppercase">Wav2Vec2 Sim</p>
                    <p className="text-lg font-mono text-white stat-value">{result.engine_scores.embedding.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 border border-brand-border rounded-xl bg-brand-surface">
                    <p className="text-[10px] text-neutral-600 mb-1 tracking-wider uppercase">Biometric</p>
                    <p className="text-lg font-mono text-white stat-value">{result.engine_scores.biometric.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 border border-brand-border rounded-xl bg-brand-surface">
                    <p className="text-[10px] text-neutral-600 mb-1 tracking-wider uppercase">Signal</p>
                    <p className="text-lg font-mono text-white stat-value">{result.engine_scores.signal.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 border border-brand-border rounded-xl bg-brand-surface">
                    <p className="text-[10px] text-neutral-600 mb-1 tracking-wider uppercase">Synthetic Risk</p>
                    <p className="text-lg font-mono text-white stat-value">{Math.max(result.engine_scores.deepfake_1, result.engine_scores.deepfake_2).toFixed(1)}%</p>
                  </div>
                </div>

                <p className="text-white font-medium text-xs mb-3 uppercase tracking-widest border-b border-brand-border pb-2">Analysis Breakdown</p>
                <ul className="text-xs text-neutral-400 space-y-2 mb-6 list-disc pl-4">
                  {result.breakdown.map((item: string, idx: number) => (
                    <li key={idx} className={item.includes("WARNING") ? "text-red-400" : ""}>{item}</li>
                  ))}
                </ul>

                <div>
                  <p className="text-white text-xs font-medium border-b border-brand-border pb-2.5 mb-3 uppercase tracking-widest">Acoustic Envelopes</p>
                  <div className="relative w-full h-14 bg-brand-surface rounded-xl border border-brand-border overflow-hidden mb-2.5">
                    <div className="absolute inset-0 flex items-center justify-between gap-[1px] px-2">
                      {result.waveforms.audio_1.map((amp: number, i: number) => (
                        <div key={`w1-${i}`} className="w-1 bg-brand-cyan/60 rounded-full shrink-0 hover:bg-brand-cyan transition-colors" style={{ height: `${Math.max(amp * 100, 4)}%` }} />
                      ))}
                    </div>
                    <div className="absolute top-1 left-2 text-[9px] text-brand-cyan/60 font-mono">Target</div>
                  </div>
                  <div className="relative w-full h-14 bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-between gap-[1px] px-2">
                      {result.waveforms.audio_2.map((amp: number, i: number) => (
                        <div key={`w2-${i}`} className="w-1 bg-brand-emerald/60 rounded-full shrink-0 hover:bg-brand-emerald transition-colors" style={{ height: `${Math.max(amp * 100, 4)}%` }} />
                      ))}
                    </div>
                    <div className="absolute top-1 left-2 text-[9px] text-brand-emerald/60 font-mono">Comparison</div>
                  </div>
                  <p className="text-[10px] text-neutral-600 text-right mt-2 font-mono">{result.processing_time}s</p>
                </div>
              </div>
            </div>
          </Panel>
        )}
      </section>

      {/* SECTION 2: DEEPFAKE DETECTION */}
      <section className="pt-8 border-t border-brand-border/50">
        <SectionHeader 
          title="Deepfake Detection" 
          subtitle="Synthetic anomaly scanning and vocoder artifact detection"
          icon={Radar}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <Panel className="group hover:!border-red-500/20">
            <div className="mb-3 text-xs font-medium text-neutral-400 uppercase tracking-widest">Target Audio</div>
            {!dfFile ? (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-brand-border rounded-xl cursor-pointer bg-brand-surface hover:border-red-500/25 transition-all duration-200">
                <Upload className="w-5 h-5 text-neutral-600 mb-2" />
                <span className="text-[11px] text-neutral-500">Upload .wav or .mp3</span>
                <input type="file" className="hidden" accept=".wav,.mp3" onChange={(e) => setDfFile(e.target.files?.[0] || null)} />
              </label>
            ) : (
              <div className="flex items-center justify-between w-full h-28 px-4 border border-red-500/20 bg-red-500/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <FileAudio className="w-7 h-7 text-red-500" />
                  <div>
                    <p className="text-sm text-white font-medium truncate max-w-[200px]">{dfFile.name}</p>
                    <p className="text-[11px] text-red-400">{(dfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button onClick={() => setDfFile(null)} className="text-[10px] text-neutral-500 hover:text-white border px-2 py-0.5 rounded border-brand-border bg-brand-surface transition-colors">Clear</button>
              </div>
            )}
          </Panel>

          <Panel className="flex flex-col justify-center gap-4">
            <div className="p-3 bg-brand-surface border border-brand-border rounded-xl text-[11px] text-neutral-500 flex items-start gap-2.5">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
              <p>Probabilistic anomaly detection engine. Results are forensic indicators, not legal proof.</p>
            </div>
            
            <button
              onClick={handleDfUpload}
              disabled={!dfFile || dfLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {dfLoading ? (
                <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Scanning...</>
              ) : (
                <><Activity className="w-4 h-4" /> Run Deepfake Scan</>
              )}
            </button>
            {(dfError || jobErrors["audio_deepfake"]) && <p className="text-red-400 text-xs flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5"/> {dfError || jobErrors["audio_deepfake"]}</p>}
          </Panel>
        </div>

        {dfResult && (
          <Panel className="animate-in slide-in-from-bottom-4 duration-500 !p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="col-span-1 lg:border-r border-brand-border lg:pr-8 flex flex-col items-center justify-center">
                <p className="text-neutral-500 text-[10px] mb-5 uppercase tracking-[0.2em] font-medium">Anomaly Status</p>
                <div className={clsx("w-40 h-40 rounded-full border-[6px] flex items-center justify-center flex-col", getRiskColor(dfResult.label))}>
                  <span className="text-4xl font-mono font-bold text-white stat-value">{dfResult.deepfake_score}</span>
                  <span className="text-[10px] opacity-70 mt-0.5 uppercase text-white font-semibold tracking-widest">{dfResult.label}</span>
                </div>
                <div className="mt-6">
                  <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", getRiskColor(dfResult.label))}>
                    <Fingerprint className="w-3 h-3" /> {dfResult.confidence}
                  </span>
                </div>
              </div>

              <div className="col-span-2 flex flex-col justify-center">
                <p className="text-white font-medium text-sm mb-3">Diagnostic Interpretation</p>
                <div className="p-4 bg-brand-surface rounded-xl border border-brand-border mb-5">
                  <p className="text-neutral-400 text-sm leading-relaxed">{dfResult.interpretation}</p>
                </div>

                <p className="text-white font-medium text-xs mb-4 border-b border-brand-border pb-2 uppercase tracking-widest">Anomaly Attribution</p>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1.5 uppercase font-medium">
                      <span className="text-neutral-500">Embedding Over-smoothing</span>
                      <span className="text-white font-mono stat-value">{dfResult.metrics.embedding_variance}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1.5 uppercase font-medium">
                      <span className="text-neutral-500">Zero-Crossing Irregularity</span>
                      <span className="text-white font-mono stat-value">{dfResult.metrics.zcr_variance}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1.5 uppercase font-medium">
                      <span className="text-neutral-500">Spectral Rolloff Variance</span>
                      <span className="text-white font-mono stat-value">{dfResult.metrics.rolloff_variance}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-dashed border-brand-border/50 flex justify-between items-center text-[10px] text-neutral-600 uppercase tracking-widest font-mono">
                  <span>Scan Complete</span>
                  <span>{dfResult.processing_time}s</span>
                </div>
              </div>
            </div>
          </Panel>
        )}
      </section>
    </div>
  );
}
