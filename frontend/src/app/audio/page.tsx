"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mic, Upload, FileAudio, Activity, CheckCircle2, AlertTriangle,
  Radar, ShieldAlert, Fingerprint, X, Info, Clock, Shield,
  Waves, BarChart3, Radio, Sliders, Volume2, Sparkles, Layers,
  ChevronRight, AlertOctagon, Cpu, GitBranch, Scissors, ShieldCheck,
  RotateCcw, Sparkle, Eye
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Panel } from "@/components/ui/Panel";
import { apiClient } from "@/lib/apiClient";
import { clsx } from "clsx";
import { useAppStore } from "@/lib/store";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RadarChart } from "@/components/audio/RadarChart";
import { PitchContourChart } from "@/components/audio/PitchContourChart";
import { MfccBarChart } from "@/components/audio/MfccBarChart";
import { TelemetryTable } from "@/components/audio/TelemetryTable";
import { SuspicionTimeline } from "@/components/audio/SuspicionTimeline";
import { PipelinePreFlight } from "@/components/audio/PipelinePreFlight";
import { PipelineLiveScanner } from "@/components/audio/PipelineLiveScanner";

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = [".wav", ".mp3", ".flac", ".ogg"];
const ACCEPTED_MIME = [
  "audio/wav", "audio/mpeg", "audio/mp3", "audio/flac",
  "audio/ogg", "audio/x-wav", "audio/wave"
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const hasValidExt = ACCEPTED_TYPES.some(ext => name.endsWith(ext));
  const hasValidMime = !file.type || ACCEPTED_MIME.includes(file.type);
  if (!hasValidExt || !hasValidMime) {
    return `Invalid format: "${file.name}". Accepted: WAV, MP3, FLAC, OGG.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB (max ${MAX_FILE_SIZE_MB} MB).`;
  }
  if (file.size < 512) {
    return `File appears empty or corrupt (${file.size} bytes).`;
  }
  return null;
}

async function getAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(isFinite(audio.duration) ? audio.duration : null);
      };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      audio.src = url;
    } catch {
      resolve(null);
    }
  });
}

async function buildWaveformPreview(file: File, points = 80): Promise<number[]> {
  try {
    const ctx = new AudioContext();
    const buf = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(buf);
    const channel = decoded.getChannelData(0);
    const chunkSize = Math.max(1, Math.floor(channel.length / points));
    const result: number[] = [];
    for (let i = 0; i < points; i++) {
      const start = i * chunkSize;
      let max = 0;
      for (let j = start; j < start + chunkSize && j < channel.length; j++) {
        max = Math.max(max, Math.abs(channel[j]));
      }
      result.push(max);
    }
    const maxVal = Math.max(...result, 0.001);
    return result.map(v => Math.round((v / maxVal) * 1000) / 1000);
  } catch {
    return [];
  }
}

function formatDuration(sec: number | null): string {
  if (sec === null || !isFinite(sec)) return "?";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Verdict styling ──────────────────────────────────────────────────────────
function getVerdictStyle(verdict: string | undefined) {
  switch (verdict) {
    case "Very Likely Same Speaker":
      return { ring: "border-green-400", text: "text-green-400", bg: "bg-green-400/10", bar: "bg-green-400" };
    case "Likely Same Speaker":
      return { ring: "border-lime-400", text: "text-lime-400", bg: "bg-lime-400/10", bar: "bg-lime-400" };
    case "Inconclusive":
      return { ring: "border-yellow-400", text: "text-yellow-400", bg: "bg-yellow-400/10", bar: "bg-yellow-400" };
    case "Likely Different Speaker":
      return { ring: "border-orange-400", text: "text-orange-400", bg: "bg-orange-400/10", bar: "bg-orange-400" };
    case "Very Likely Different Speaker":
      return { ring: "border-red-400", text: "text-red-400", bg: "bg-red-400/10", bar: "bg-red-400" };
    default:
      return { ring: "border-neutral-500", text: "text-neutral-400", bg: "bg-neutral-800", bar: "bg-neutral-500" };
  }
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-green-400 border-green-400 bg-green-400/10";
  if (score >= 55) return "text-lime-400 border-lime-400 bg-lime-400/10";
  if (score >= 40) return "text-yellow-400 border-yellow-400 bg-yellow-400/10";
  if (score >= 25) return "text-orange-400 border-orange-400 bg-orange-400/10";
  return "text-red-400 border-red-400 bg-red-400/10";
}

function getDeepfakeRiskStyle(score: number, label: string) {
  if (label === "DEEPFAKE" || score >= 70) {
    return {
      text: "text-red-400",
      border: "border-red-500/30",
      bg: "bg-red-500/10",
      pill: "bg-red-500/20 text-red-300 border border-red-500/40",
      ring: "border-red-500",
      bar: "bg-red-500",
    };
  }
  if (label === "SUSPICIOUS" || label === "UNCERTAIN" || score >= 40) {
    return {
      text: "text-amber-400",
      border: "border-amber-500/30",
      bg: "bg-amber-500/10",
      pill: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
      ring: "border-amber-500",
      bar: "bg-amber-500",
    };
  }
  return {
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    pill: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
    ring: "border-emerald-500",
    bar: "bg-emerald-500",
  };
}

// ── Upload Zone Component ────────────────────────────────────────────────────
interface UploadZoneProps {
  label: string;
  index: number;
  file: File | null;
  duration: number | null;
  preview: number[];
  error: string | null;
  color: "cyan" | "emerald" | "red";
  disabled: boolean;
  onFile: (f: File | null) => void;
  onError: (msg: string | null) => void;
}

function UploadZone({ label, index, file, duration, preview, error, color, disabled, onFile, onError }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ring =
    color === "cyan" ? "border-brand-cyan/30 bg-brand-cyan/5" :
    color === "emerald" ? "border-brand-emerald/30 bg-brand-emerald/5" :
    "border-red-500/30 bg-red-500/5";

  const dragRing =
    color === "cyan" ? "border-brand-cyan/60 bg-brand-cyan/10" :
    color === "emerald" ? "border-brand-emerald/60 bg-brand-emerald/10" :
    "border-red-500/60 bg-red-500/10";

  const hoverRing =
    color === "cyan" ? "hover:border-brand-cyan/25" :
    color === "emerald" ? "hover:border-brand-emerald/25" :
    "hover:border-red-500/25";

  const accentText =
    color === "cyan" ? "text-brand-cyan" :
    color === "emerald" ? "text-brand-emerald" :
    "text-red-400";

  const accentIcon = accentText;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    const err = validateFile(dropped);
    if (err) { onError(err); return; }
    onError(null);
    onFile(dropped);
  }, [disabled, onFile, onError]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const err = validateFile(selected);
    if (err) { onError(err); e.target.value = ""; return; }
    onError(null);
    onFile(selected);
  }, [onFile, onError]);

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
      <div
        className={clsx(
          "text-[11px] font-medium flex items-center justify-between uppercase tracking-wider",
          error ? "text-red-400" : "text-neutral-400"
        )}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span className="w-4 h-4 rounded bg-brand-surface border border-brand-border flex items-center justify-center text-[9px] font-bold text-neutral-400">{index}</span>
          {label}
        </span>
        {duration !== null && (
          <span className={clsx("text-[10px] font-mono", accentText)}>
            {formatDuration(duration)}
          </span>
        )}
      </div>

      {!file ? (
        <label
          onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={clsx(
            "flex flex-col items-center justify-center w-full h-24 border border-dashed rounded-xl cursor-pointer transition-all duration-200 px-3 text-center",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            dragging ? dragRing : `border-brand-border bg-brand-surface ${hoverRing}`,
          )}
        >
          <Upload className={clsx("w-4 h-4 mb-1", dragging ? accentIcon : "text-neutral-500")} />
          <span className="text-[11px] text-neutral-400 truncate max-w-[200px]">
            {dragging ? "Drop audio here" : "Choose or drag audio"}
          </span>
          <span className="text-[9px] text-neutral-600">WAV, MP3, FLAC, OGG (Max 50MB)</span>
          <input ref={inputRef} type="file" className="hidden" accept={ACCEPTED_TYPES.join(",")} onChange={handleChange} disabled={disabled} />
        </label>
      ) : (
        <div className={clsx("w-full border rounded-xl overflow-hidden bg-brand-surface", ring)}>
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileAudio className={clsx("w-5 h-5 shrink-0", accentIcon)} />
              <div className="min-w-0">
                <p className="text-xs text-white font-medium truncate max-w-[150px] sm:max-w-[200px]">{file.name}</p>
                <span className="text-[10px] text-neutral-500 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>
            <button
              onClick={() => { onFile(null); onError(null); }}
              disabled={disabled}
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-500 hover:text-white transition-colors shrink-0"
              title="Remove file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {preview.length > 0 && (
            <div className="relative w-full h-7 flex items-center justify-between gap-px px-2 border-t border-brand-border/40 bg-black/20">
              {preview.map((amp, i) => (
                <div
                  key={i}
                  className={clsx("w-0.5 rounded-full shrink-0 transition-all", color === "cyan" ? "bg-brand-cyan/60" : color === "emerald" ? "bg-brand-emerald/60" : "bg-red-500/60")}
                  style={{ height: `${Math.max(amp * 100, 6)}%` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

// ── Main Audio Studio Content ────────────────────────────────────────────────
function AudioStudioContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");

  // Mode switcher: "compare" (Speaker Comparison) vs "deepfake" (Deepfake Detection)
  const [activeStudioMode, setActiveStudioMode] = useState<"compare" | "deepfake">("compare");

  useEffect(() => {
    if (modeParam === "deepfake" || modeParam === "synth" || modeParam === "splice" || modeParam === "synthetics") {
      setActiveStudioMode("deepfake");
    } else if (modeParam === "compare" || modeParam === "speaker" || modeParam === "verify") {
      setActiveStudioMode("compare");
    }
  }, [modeParam]);

  // Speaker Comparison Files & previews
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [dur1, setDur1] = useState<number | null>(null);
  const [dur2, setDur2] = useState<number | null>(null);
  const [wave1, setWave1] = useState<number[]>([]);
  const [wave2, setWave2] = useState<number[]>([]);
  const [err1, setErr1] = useState<string | null>(null);
  const [err2, setErr2] = useState<string | null>(null);

  // Deepfake Files & previews
  const [dfFile, setDfFile] = useState<File | null>(null);
  const [dfDur, setDfDur] = useState<number | null>(null);
  const [dfWave, setDfWave] = useState<number[]>([]);
  const [dfErr, setDfErr] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [dfError, setDfError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDfUploading, setIsDfUploading] = useState(false);

  // Speaker Comparison In-Depth Tab View
  const [activeSpeakerTab, setActiveSpeakerTab] = useState<"telemetry" | "pitch" | "formants" | "mfcc" | "rhythm" | "waveforms">("telemetry");

  // Deepfake In-Depth Tab View
  const [activeDfTab, setActiveDfTab] = useState<"signals" | "splicing" | "telemetry">("signals");

  const {
    audioSpeakerResult: result,
    audioDeepfakeResult: dfResult,
    setAudioSpeakerResult: setResult,
    setAudioDeepfakeResult: setDfResult,
    activeJobs,
    setActiveJob,
    jobErrors,
    clearJobError,
  } = useAppStore();

  const loading = !!activeJobs["audio_compare"];
  const dfLoading = !!activeJobs["audio_deepfake"];

  useEffect(() => {
    setError(null);
    setDfError(null);
    clearJobError("audio_compare");
    clearJobError("audio_deepfake");
  }, [clearJobError]);

  // ── File Handlers ───────────────────────────────────────────────────────
  const handleFile1 = useCallback(async (f: File | null) => {
    setFile1(f); setWave1([]); setDur1(null); setError(null);
    clearJobError("audio_compare");
    if (!f) return;
    const [d, w] = await Promise.all([getAudioDuration(f), buildWaveformPreview(f)]);
    setDur1(d); setWave1(w);
  }, [clearJobError]);

  const handleFile2 = useCallback(async (f: File | null) => {
    setFile2(f); setWave2([]); setDur2(null); setError(null);
    clearJobError("audio_compare");
    if (!f) return;
    const [d, w] = await Promise.all([getAudioDuration(f), buildWaveformPreview(f)]);
    setDur2(d); setWave2(w);
  }, [clearJobError]);

  const handleDfFile = useCallback(async (f: File | null) => {
    setDfFile(f); setDfWave([]); setDfDur(null); setDfError(null);
    clearJobError("audio_deepfake");
    if (!f) return;
    const [d, w] = await Promise.all([getAudioDuration(f), buildWaveformPreview(f)]);
    setDfDur(d); setDfWave(w);
  }, [clearJobError]);

  // ── Submit Handlers ─────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file1 || !file2) return;
    setError(null); setResult(null); clearJobError("audio_compare");
    setIsUploading(true);
    try {
      const data = await apiClient.uploadAudioPair(file1, file2);
      setActiveJob("audio_compare", data.job_id);
    } catch (err: any) {
      setError(err.message || "Failed to process audio pair.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDfUpload = async () => {
    if (!dfFile) return;
    setDfError(null); setDfResult(null); clearJobError("audio_deepfake");
    setIsDfUploading(true);
    try {
      const data = await apiClient.detectDeepfake(dfFile);
      setActiveJob("audio_deepfake", data.job_id);
    } catch (err: any) {
      setDfError(err.message || "Failed to process audio.");
    } finally {
      setIsDfUploading(false);
    }
  };

  const dfStyle = dfResult ? getDeepfakeRiskStyle(dfResult.deepfake_score, dfResult.label) : null;
  const isComparing = loading || isUploading;
  const isScanningDf = dfLoading || isDfUploading;

  return (
    <div className="animate-in fade-in duration-300 space-y-6 pb-12 max-w-7xl mx-auto">
      
      {/* ═══ TOP HEADER & WORKSPACE MODE SWITCHER ═════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/60 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-brand-cyan" />
            Audio Forensics Intelligence Studio
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Multi-dimensional neural speaker verification &amp; sliding-window synthetic speech diagnostics
          </p>
        </div>

        {/* Studio Segmented Switcher */}
        <div className="flex items-center p-1 bg-brand-surface rounded-xl border border-brand-border shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveStudioMode("compare")}
            className={clsx(
              "px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
              activeStudioMode === "compare"
                ? "bg-brand-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.25)]"
                : "text-neutral-400 hover:text-white"
            )}
          >
            <Mic className="w-4 h-4" />
            <span>Speaker Comparison</span>
            {result && !result.no_speech_detected && (
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Results ready" />
            )}
          </button>

          <button
            onClick={() => setActiveStudioMode("deepfake")}
            className={clsx(
              "px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
              activeStudioMode === "deepfake"
                ? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                : "text-neutral-400 hover:text-white"
            )}
          >
            <Radar className="w-4 h-4" />
            <span>Deepfake Diagnostics</span>
            {dfResult && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" title="Scan ready" />
            )}
          </button>
        </div>
      </div>

      <div className="relative h-1 -mt-3 overflow-hidden rounded-full">
        <ProgressBar isLoading={isComparing || isScanningDf} color={activeStudioMode === "compare" ? "cyan" : "red"} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODE 1: SPEAKER VERIFICATION COCKPIT                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeStudioMode === "compare" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Upload & Action Row */}
          <Panel className="!p-4 sm:!p-5 bg-gradient-to-br from-brand-panel to-brand-panel/90">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                <UploadZone
                  label="Target Specimen (Sample 1)"
                  index={1}
                  file={file1} duration={dur1} preview={wave1} error={err1}
                  color="cyan" disabled={isComparing}
                  onFile={handleFile1} onError={setErr1}
                />
                <UploadZone
                  label="Comparison Specimen (Sample 2)"
                  index={2}
                  file={file2} duration={dur2} preview={wave2} error={err2}
                  color="emerald" disabled={isComparing}
                  onFile={handleFile2} onError={setErr2}
                />
              </div>

              {/* Action Button */}
              <div className="flex flex-col justify-center shrink-0 min-w-[180px]">
                <button
                  onClick={handleUpload}
                  disabled={!file1 || !file2 || !!err1 || !!err2 || isComparing}
                  className="w-full h-12 flex items-center justify-center gap-2 px-5 bg-brand-cyan hover:bg-cyan-400 active:scale-[0.98] text-black font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,240,255,0.2)]"
                >
                  {isComparing ? (
                    <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Fusing 6D...</>
                  ) : (
                    <><Activity className="w-4 h-4" /> Compare Pair</>
                  )}
                </button>
                {result && (
                  <button
                    onClick={() => { setResult(null); setFile1(null); setFile2(null); }}
                    className="mt-2 text-[10px] text-neutral-500 hover:text-neutral-300 text-center flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear analysis
                  </button>
                )}
              </div>
            </div>

            {(error || jobErrors["audio_compare"]) && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center justify-between text-xs text-red-400">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error || jobErrors["audio_compare"]}
                </span>
                <button onClick={() => { setError(null); clearJobError("audio_compare"); }} className="underline text-[10px]">Dismiss</button>
              </div>
            )}
          </Panel>

          {/* Live Scanner during comparison */}
          {isComparing && (
            <PipelineLiveScanner mode="compare" />
          )}

          {/* Pre-Flight Blueprint before comparison */}
          {!isComparing && (!result || result.no_speech_detected) && (
            <PipelinePreFlight mode="compare" />
          )}

          {/* Results Cockpit */}
          {result && !result.no_speech_detected && (
            <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
              
              {/* 1. Integrated Cockpit Overview Card (Score Gauge + Radar + Quick Stats in ONE cohesive panel) */}
              <Panel className="!p-5 sm:!p-6 border-brand-cyan/20">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Left: Composite Score Gauge */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center md:border-r border-brand-border md:pr-6">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-medium mb-1">Composite Match Score</span>
                    
                    <div className="relative w-28 h-28 my-1">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="42"
                          fill="none"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 42}`}
                          strokeDashoffset={`${2 * Math.PI * 42 * (1 - Math.min(100, Math.max(0, result.similarity_score)) / 100)}`}
                          className={clsx("transition-all duration-1000", getVerdictStyle(result.verdict).bar)}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={clsx("text-2xl font-mono font-bold leading-none", getVerdictStyle(result.verdict).text)}>
                          {result.similarity_score}%
                        </span>
                      </div>
                    </div>

                    <div className={clsx("px-3 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider text-center mt-1", getVerdictStyle(result.verdict).ring, getVerdictStyle(result.verdict).text, getVerdictStyle(result.verdict).bg)}>
                      {result.verdict}
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500 mt-1">
                      {result.confidence_level} Confidence • {result.processing_time}s
                    </span>
                  </div>

                  {/* Center: 6-Dimension Radar Chart */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-brand-cyan" /> 6-Axis Acoustic Profile
                    </span>
                    <RadarChart data={result.radar_data || []} size={240} />
                  </div>

                  {/* Right: Quick Dimension Mini-Scores & Synthetic Risk */}
                  <div className="md:col-span-3 space-y-2 md:border-l border-brand-border md:pl-6 text-xs font-mono">
                    <span className="text-[10px] text-neutral-500 font-sans font-semibold uppercase tracking-wider block border-b border-brand-border pb-1">
                      Acoustic Breakdown
                    </span>
                    
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-neutral-400 font-sans">Neural Identity</span>
                        <span className="text-brand-cyan font-bold">{result.dimension_scores?.neural_identity ?? "—"}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400 font-sans">Vocal Tract F1-F4</span>
                        <span className="text-white font-bold">{result.dimension_scores?.formants ?? "—"}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400 font-sans">Pitch (F0)</span>
                        <span className="text-white font-bold">{result.dimension_scores?.pitch ?? "—"}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400 font-sans">Spectral MFCC</span>
                        <span className="text-white font-bold">{result.dimension_scores?.spectral_mfcc ?? "—"}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400 font-sans">Speaking Rhythm</span>
                        <span className="text-white font-bold">{result.dimension_scores?.rhythm ?? "—"}%</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-brand-border/60">
                      <span className="text-[9px] text-neutral-500 font-sans uppercase block mb-1">Specimen Synthetic Risk</span>
                      <div className="grid grid-cols-2 gap-1.5 text-center text-[10px]">
                        <div className="p-1 rounded bg-brand-surface border border-brand-border">
                          <span className="text-neutral-500 text-[8px] block">Tgt</span>
                          <span className="font-bold text-white">{(result.engine_scores?.deepfake_1 ?? 0).toFixed(0)}%</span>
                        </div>
                        <div className="p-1 rounded bg-brand-surface border border-brand-border">
                          <span className="text-neutral-500 text-[8px] block">Comp</span>
                          <span className="font-bold text-white">{(result.engine_scores?.deepfake_2 ?? 0).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </Panel>

              {/* 2. Disagreements Alert (If any) */}
              {result.disagreements && result.disagreements.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                  {result.disagreements.map((d: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-200">
                      <AlertOctagon className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><b>Contradiction Detected:</b> {d.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Deep Acoustic Signal Inspector (Multi-Tab Unified Viewer) */}
              <Panel className="!p-5 space-y-4">
                
                {/* Tab selector */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-cyan" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Acoustic Signal Inspector</span>
                  </div>

                  <div className="flex flex-wrap gap-1 bg-brand-surface p-1 rounded-xl border border-brand-border text-xs">
                    <button
                      onClick={() => setActiveSpeakerTab("telemetry")}
                      className={clsx("px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 font-medium", activeSpeakerTab === "telemetry" ? "bg-brand-cyan text-black font-bold" : "text-neutral-400 hover:text-white")}
                    >
                      <Sliders className="w-3 h-3" /> Matrix
                    </button>
                    <button
                      onClick={() => setActiveSpeakerTab("pitch")}
                      className={clsx("px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 font-medium", activeSpeakerTab === "pitch" ? "bg-brand-cyan text-black font-bold" : "text-neutral-400 hover:text-white")}
                    >
                      <Waves className="w-3 h-3" /> Pitch (F0)
                    </button>
                    <button
                      onClick={() => setActiveSpeakerTab("formants")}
                      className={clsx("px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 font-medium", activeSpeakerTab === "formants" ? "bg-brand-cyan text-black font-bold" : "text-neutral-400 hover:text-white")}
                    >
                      <Sliders className="w-3 h-3" /> Formants
                    </button>
                    <button
                      onClick={() => setActiveSpeakerTab("mfcc")}
                      className={clsx("px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 font-medium", activeSpeakerTab === "mfcc" ? "bg-brand-cyan text-black font-bold" : "text-neutral-400 hover:text-white")}
                    >
                      <BarChart3 className="w-3 h-3" /> 13-MFCC
                    </button>
                    <button
                      onClick={() => setActiveSpeakerTab("rhythm")}
                      className={clsx("px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 font-medium", activeSpeakerTab === "rhythm" ? "bg-brand-cyan text-black font-bold" : "text-neutral-400 hover:text-white")}
                    >
                      <Radio className="w-3 h-3" /> Rhythm
                    </button>
                    <button
                      onClick={() => setActiveSpeakerTab("waveforms")}
                      className={clsx("px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 font-medium", activeSpeakerTab === "waveforms" ? "bg-brand-cyan text-black font-bold" : "text-neutral-400 hover:text-white")}
                    >
                      <Eye className="w-3 h-3" /> Waveforms
                    </button>
                  </div>
                </div>

                {/* TAB: TELEMETRY MATRIX */}
                {activeSpeakerTab === "telemetry" && (
                  <div className="animate-in fade-in duration-200">
                    <TelemetryTable rows={result.dimension_telemetry || []} />
                  </div>
                )}

                {/* TAB: PITCH F0 */}
                {activeSpeakerTab === "pitch" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-neutral-400 font-sans">Dual F0 Intonation Trajectories</span>
                      <div className="flex items-center gap-3">
                        <span className="text-brand-cyan">Tgt: {result.pitch_contours?.feat1?.mean_f0 ?? "—"} Hz</span>
                        <span className="text-brand-emerald">Comp: {result.pitch_contours?.feat2?.mean_f0 ?? "—"} Hz</span>
                        <span className="text-white font-bold">Δ {result.pitch_contours?.comparison?.delta_mean_hz ?? "—"} Hz</span>
                      </div>
                    </div>
                    <div className="p-3 bg-brand-surface rounded-xl border border-brand-border">
                      <PitchContourChart
                        contour1={result.pitch_contours?.audio_1 || []}
                        contour2={result.pitch_contours?.audio_2 || []}
                        mean1={result.pitch_contours?.feat1?.mean_f0}
                        mean2={result.pitch_contours?.feat2?.mean_f0}
                      />
                    </div>
                    {result.pitch_contours?.comparison?.interpretation && (
                      <p className="text-xs text-neutral-400 bg-white/[0.02] p-2.5 rounded-lg border border-brand-border/60">
                        <b>Pitch Interpretation:</b> {result.pitch_contours.comparison.interpretation}
                      </p>
                    )}
                  </div>
                )}

                {/* TAB: FORMANTS */}
                {activeSpeakerTab === "formants" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                      {[
                        { label: "F1 (Pharyngeal)", d1: result.formant_data?.feat1?.f1_hz, d2: result.formant_data?.feat2?.f1_hz, delta: result.formant_data?.comparison?.delta_f1_hz },
                        { label: "F2 (Oral)", d1: result.formant_data?.feat1?.f2_hz, d2: result.formant_data?.feat2?.f2_hz, delta: result.formant_data?.comparison?.delta_f2_hz },
                        { label: "F3 (Tongue)", d1: result.formant_data?.feat1?.f3_hz, d2: result.formant_data?.feat2?.f3_hz, delta: result.formant_data?.comparison?.delta_f3_hz },
                        { label: "F4 (Larynx)", d1: result.formant_data?.feat1?.f4_hz, d2: result.formant_data?.feat2?.f4_hz, delta: result.formant_data?.comparison?.delta_f4_hz },
                      ].map((item, i) => (
                        <div key={i} className="p-3 bg-brand-surface rounded-xl border border-brand-border space-y-1">
                          <span className="text-[10px] text-neutral-500 uppercase block font-sans">{item.label}</span>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-brand-cyan">{item.d1 ?? "—"} Hz</span>
                            <span className="text-brand-emerald">{item.d2 ?? "—"} Hz</span>
                          </div>
                          <span className="text-[10px] text-neutral-400 block pt-1 border-t border-brand-border/40">Δ {item.delta ?? "—"} Hz</span>
                        </div>
                      ))}
                    </div>
                    {result.formant_data?.comparison?.interpretation && (
                      <p className="text-xs text-neutral-400 bg-white/[0.02] p-2.5 rounded-lg border border-brand-border/60">
                        <b>Vocal Tract Anatomy:</b> {result.formant_data.comparison.interpretation}
                      </p>
                    )}
                  </div>
                )}

                {/* TAB: MFCC */}
                {activeSpeakerTab === "mfcc" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="p-3 bg-brand-surface rounded-xl border border-brand-border">
                      <MfccBarChart data={result.spectral_data?.mfcc_comparison || []} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="p-2.5 bg-brand-surface rounded-lg border border-brand-border">
                        <span className="text-[9px] text-neutral-500 uppercase block font-sans">Centroid</span>
                        <span className="text-white font-bold">{result.spectral_data?.feat1?.spectral_centroid_mean ?? "—"} vs {result.spectral_data?.feat2?.spectral_centroid_mean ?? "—"} Hz</span>
                      </div>
                      <div className="p-2.5 bg-brand-surface rounded-lg border border-brand-border">
                        <span className="text-[9px] text-neutral-500 uppercase block font-sans">Rolloff</span>
                        <span className="text-white font-bold">{result.spectral_data?.feat1?.spectral_rolloff_mean ?? "—"} vs {result.spectral_data?.feat2?.spectral_rolloff_mean ?? "—"} Hz</span>
                      </div>
                      <div className="p-2.5 bg-brand-surface rounded-lg border border-brand-border">
                        <span className="text-[9px] text-neutral-500 uppercase block font-sans">Dynamic Range</span>
                        <span className="text-white font-bold">{result.spectral_data?.feat1?.dynamic_range_db ?? "—"} vs {result.spectral_data?.feat2?.dynamic_range_db ?? "—"} dB</span>
                      </div>
                      <div className="p-2.5 bg-brand-surface rounded-lg border border-brand-border">
                        <span className="text-[9px] text-neutral-500 uppercase block font-sans">Crest Factor</span>
                        <span className="text-white font-bold">{result.spectral_data?.feat1?.crest_factor_db ?? "—"} vs {result.spectral_data?.feat2?.crest_factor_db ?? "—"} dB</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: RHYTHM */}
                {activeSpeakerTab === "rhythm" && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                      <div className="p-3 bg-brand-surface rounded-xl border border-brand-border">
                        <span className="text-[10px] text-neutral-500 uppercase block font-sans">Onset Cadence</span>
                        <span className="text-white font-bold">{result.rhythm_data?.feat1?.onset_rate_per_sec ?? "—"} vs {result.rhythm_data?.feat2?.onset_rate_per_sec ?? "—"} /s</span>
                      </div>
                      <div className="p-3 bg-brand-surface rounded-xl border border-brand-border">
                        <span className="text-[10px] text-neutral-500 uppercase block font-sans">Articulation</span>
                        <span className="text-white font-bold">{result.rhythm_data?.feat1?.articulation_rate_per_sec ?? "—"} vs {result.rhythm_data?.feat2?.articulation_rate_per_sec ?? "—"} /s</span>
                      </div>
                      <div className="p-3 bg-brand-surface rounded-xl border border-brand-border">
                        <span className="text-[10px] text-neutral-500 uppercase block font-sans">Speech Ratio</span>
                        <span className="text-white font-bold">{result.rhythm_data?.feat1?.speech_ratio ? `${(result.rhythm_data.feat1.speech_ratio * 100).toFixed(0)}%` : "—"}</span>
                      </div>
                      <div className="p-3 bg-brand-surface rounded-xl border border-brand-border">
                        <span className="text-[10px] text-neutral-500 uppercase block font-sans">Mean Pause</span>
                        <span className="text-white font-bold">{result.rhythm_data?.feat1?.mean_pause_sec ?? "—"} vs {result.rhythm_data?.feat2?.mean_pause_sec ?? "—"}s</span>
                      </div>
                    </div>
                    {result.rhythm_data?.comparison?.interpretation && (
                      <p className="text-xs text-neutral-400 bg-white/[0.02] p-2.5 rounded-lg border border-brand-border/60">
                        <b>Rhythm &amp; Prosody:</b> {result.rhythm_data.comparison.interpretation}
                      </p>
                    )}
                  </div>
                )}

                {/* TAB: WAVEFORMS */}
                {activeSpeakerTab === "waveforms" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    {(["audio_1", "audio_2"] as const).map((key, i) => {
                      const meta = result.file_metadata?.[key];
                      const waveData = result.waveforms?.[key] || [];
                      const color = i === 0 ? "cyan" : "emerald";
                      const label = i === 0 ? "Target Specimen" : "Comparison Specimen";
                      return (
                        <div key={key}>
                          <div className="flex justify-between text-[11px] font-mono mb-1">
                            <span className={color === "cyan" ? "text-brand-cyan" : "text-brand-emerald"}>{label}</span>
                            <span className="text-neutral-500">{meta?.speech_duration_sec}s speech used / {meta?.raw_duration_sec}s total</span>
                          </div>
                          <div className="h-10 bg-brand-surface rounded-lg border border-brand-border flex items-center justify-between gap-px px-2 overflow-hidden">
                            {waveData.map((amp: number, idx: number) => (
                              <div
                                key={idx}
                                className={clsx("w-px rounded-full shrink-0", color === "cyan" ? "bg-brand-cyan/70" : "bg-brand-emerald/70")}
                                style={{ height: `${Math.max(amp * 100, 6)}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </Panel>
            </div>
          )}

          {/* Caveat */}
          <div className="p-3 bg-brand-surface border border-brand-border/60 rounded-xl flex items-center gap-2.5 text-[11px] text-neutral-500">
            <Shield className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>Probabilistic acoustic biometric match. Results are forensic indicators for investigative review, not legal proof.</span>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODE 2: DEEPFAKE & SPLICING DIAGNOSTICS COCKPIT                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeStudioMode === "deepfake" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Upload & Action Row */}
          <Panel className="!p-4 sm:!p-5 bg-gradient-to-br from-brand-panel to-brand-panel/90 border-red-500/20">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <UploadZone
                label="Target Audio Specimen to Inspect"
                index={1}
                file={dfFile} duration={dfDur} preview={dfWave} error={dfErr}
                color="red" disabled={isScanningDf}
                onFile={handleDfFile} onError={setDfErr}
              />

              <div className="flex flex-col justify-center shrink-0 sm:w-56">
                <button
                  onClick={handleDfUpload}
                  disabled={!dfFile || !!dfErr || isScanningDf}
                  className="w-full h-12 flex items-center justify-center gap-2 px-5 bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                >
                  {isScanningDf ? (
                    <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Scanning...</>
                  ) : (
                    <><Activity className="w-4 h-4" /> Run Deepfake Scan</>
                  )}
                </button>
                {dfResult && (
                  <button
                    onClick={() => { setDfResult(null); setDfFile(null); }}
                    className="mt-2 text-[10px] text-neutral-500 hover:text-neutral-300 text-center flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear scan
                  </button>
                )}
              </div>
            </div>

            {(dfError || jobErrors["audio_deepfake"]) && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center justify-between text-xs text-red-400">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {dfError || jobErrors["audio_deepfake"]}
                </span>
                <button onClick={() => { setDfError(null); clearJobError("audio_deepfake"); }} className="underline text-[10px]">Dismiss</button>
              </div>
            )}
          </Panel>

          {/* Live Scanner during deepfake scan */}
          {isScanningDf && (
            <PipelineLiveScanner mode="deepfake" />
          )}

          {/* Pre-Flight Blueprint before deepfake scan */}
          {!isScanningDf && !dfResult && (
            <PipelinePreFlight mode="deepfake" />
          )}

          {/* Deepfake Diagnostics Cockpit */}
          {dfResult && dfStyle && (
            <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
              
              {/* 1. Executive Verdict & Category Header Card */}
              <Panel className="!p-5 sm:!p-6 border-red-500/20">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Left: Gauge */}
                  <div className="md:col-span-4 flex flex-col items-center justify-center md:border-r border-brand-border md:pr-6">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] font-medium mb-1">Synthetic Anomaly Index</span>
                    
                    <div className={clsx("w-28 h-28 my-1 rounded-full border-[5px] flex items-center justify-center flex-col transition-all duration-700", dfStyle.ring)}>
                      <span className="text-2xl font-mono font-bold text-white">{dfResult.deepfake_score}%</span>
                      <span className={clsx("text-[9px] font-bold uppercase tracking-wider", dfStyle.text)}>
                        {dfResult.label}
                      </span>
                    </div>

                    <span className={clsx("px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1", dfStyle.pill)}>
                      {dfResult.confidence} Confidence
                    </span>
                  </div>

                  {/* Right: Category + Interpretation */}
                  <div className="md:col-span-8 space-y-3">
                    <div className={clsx("p-3 rounded-xl border flex items-center gap-2.5", dfStyle.bg, dfStyle.border)}>
                      {dfResult.manipulation_category === "FULLY_SYNTHETIC" ? (
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                      ) : dfResult.manipulation_category === "SPLICED_PARTIAL" ? (
                        <Scissors className="w-5 h-5 text-amber-400 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <span className={clsx("text-xs font-bold uppercase tracking-wider block", dfStyle.text)}>
                          {dfResult.category_label || dfResult.manipulation_category}
                        </span>
                        <p className="text-[11px] text-neutral-300 leading-snug mt-0.5">
                          {dfResult.manipulation_category === "FULLY_SYNTHETIC"
                            ? "Pervasive synthetic speech markers detected across entire sample."
                            : dfResult.manipulation_category === "SPLICED_PARTIAL"
                            ? "Localized synthetic audio detected spliced into natural recording."
                            : "Acoustic parameters conform to authentic human voice physiology."}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-brand-surface rounded-xl border border-brand-border text-xs text-neutral-300 leading-relaxed">
                      {dfResult.interpretation}
                    </div>

                    {dfResult.file_metadata && (
                      <div className="flex items-center gap-4 text-[10px] font-mono text-neutral-500">
                        <span>Speech: {dfResult.file_metadata.speech_duration_sec}s</span>
                        <span>Sample Rate: {dfResult.file_metadata.sample_rate} Hz</span>
                        <span>Processing: {dfResult.processing_time}s</span>
                      </div>
                    )}
                  </div>

                </div>
              </Panel>

              {/* 2. Headline Visual: Suspicion Timeline */}
              <Panel className="!p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-brand-border pb-2.5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-red-400" /> Temporal Localization &amp; Splicing Timeline
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    1.5s Sliding Window
                  </span>
                </div>

                <SuspicionTimeline
                  timeline={dfResult.suspicion_timeline || []}
                  suspectIntervals={dfResult.suspect_intervals || []}
                  boundaryTimestamps={dfResult.boundary_timestamps || []}
                  waveform={dfResult.waveform}
                  durationSec={dfResult.file_metadata?.raw_duration_sec}
                />
              </Panel>

              {/* 3. Deepfake Multi-View Inspector (Signals vs Splicing vs Telemetry) */}
              <Panel className="!p-5 space-y-4">
                
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-red-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Multi-Signal Diagnostics</span>
                  </div>

                  <div className="flex gap-1 bg-brand-surface p-1 rounded-xl border border-brand-border text-xs">
                    <button
                      onClick={() => setActiveDfTab("signals")}
                      className={clsx("px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 font-medium", activeDfTab === "signals" ? "bg-red-500 text-white font-bold" : "text-neutral-400 hover:text-white")}
                    >
                      <Cpu className="w-3 h-3" /> 4 Signals
                    </button>
                    <button
                      onClick={() => setActiveDfTab("splicing")}
                      className={clsx("px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 font-medium", activeDfTab === "splicing" ? "bg-red-500 text-white font-bold" : "text-neutral-400 hover:text-white")}
                    >
                      <Scissors className="w-3 h-3" /> Splicing &amp; Intervals
                    </button>
                    <button
                      onClick={() => setActiveDfTab("telemetry")}
                      className={clsx("px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 font-medium", activeDfTab === "telemetry" ? "bg-red-500 text-white font-bold" : "text-neutral-400 hover:text-white")}
                    >
                      <Sliders className="w-3 h-3" /> Telemetry
                    </button>
                  </div>
                </div>

                {/* TAB: 4 SIGNALS */}
                {activeDfTab === "signals" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-200">
                    
                    {/* Signal 1 */}
                    <div className="p-3.5 bg-brand-surface rounded-xl border border-brand-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase">Signal 1: Primary Spoof Model</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-brand-cyan/20 text-brand-cyan">TRAINED MODEL</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xl font-mono font-bold text-white">{(dfResult.signals?.neural_model?.score ?? dfResult.deepfake_score).toFixed(1)}%</span>
                        <span className="text-[10px] text-neutral-500 font-mono">Wav2Vec2 Sequence Model</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 border-t border-brand-border/40 pt-1.5 leading-snug">
                        {dfResult.signals?.neural_model?.explanation || "Wav2Vec2 fine-tuned classification score."}
                      </p>
                    </div>

                    {/* Signal 2 */}
                    <div className="p-3.5 bg-brand-surface rounded-xl border border-brand-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase">Signal 2: Vocoder Artifacts</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-amber-500/20 text-amber-300">ACOUSTIC HEURISTIC</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xl font-mono font-bold text-white">{(dfResult.signals?.vocoder_artifacts?.score ?? 20).toFixed(1)}%</span>
                        <span className="text-[10px] text-neutral-500 font-mono">High-Freq Ripple &gt;6.5kHz</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 border-t border-brand-border/40 pt-1.5 leading-snug">
                        {dfResult.signals?.vocoder_artifacts?.explanation || "Neural vocoder transposition artifacts."}
                      </p>
                    </div>

                    {/* Signal 3 */}
                    <div className="p-3.5 bg-brand-surface rounded-xl border border-brand-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase">Signal 3: Prosody Naturalness</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-purple-500/20 text-purple-300">STATISTICAL HEURISTIC</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xl font-mono font-bold text-white">{(dfResult.signals?.prosody_naturalness?.score ?? 25).toFixed(1)}%</span>
                        <span className="text-[10px] text-neutral-500 font-mono">F0 Entropy &amp; Cadence</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 border-t border-brand-border/40 pt-1.5 leading-snug">
                        {dfResult.signals?.prosody_naturalness?.explanation || "Intonation modulation and pitch micro-inflections."}
                      </p>
                    </div>

                    {/* Signal 4 */}
                    <div className="p-3.5 bg-brand-surface rounded-xl border border-brand-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase">Signal 4: Spectral Splicing</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-300">TEMPORAL HEURISTIC</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xl font-mono font-bold text-white">{(dfResult.signals?.spectral_consistency?.score ?? 15).toFixed(1)}%</span>
                        <span className="text-[10px] text-neutral-500 font-mono">Boundary Continuity</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 border-t border-brand-border/40 pt-1.5 leading-snug">
                        {dfResult.signals?.spectral_consistency?.explanation || "Acoustic boundary consistency check."}
                      </p>
                    </div>

                  </div>
                )}

                {/* TAB: SPLICING & INTERVALS */}
                {activeDfTab === "splicing" && (
                  <div className="space-y-3 animate-in fade-in duration-200 text-xs">
                    {dfResult.suspect_intervals && dfResult.suspect_intervals.length > 0 ? (
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-red-400 block">Identified Suspicious Segments</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dfResult.suspect_intervals.map((iv: any, i: number) => (
                            <div key={i} className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between font-mono">
                              <span className="font-bold text-red-300">{iv.t_start}s – {iv.t_end}s</span>
                              <span className="text-neutral-400 text-[10px]">Span: {iv.duration_sec}s</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-neutral-400 p-4 bg-brand-surface rounded-xl border border-brand-border text-center">
                        No localized splicing intervals identified. Acoustic timeline is continuous.
                      </p>
                    )}
                  </div>
                )}

                {/* TAB: TELEMETRY */}
                {activeDfTab === "telemetry" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono animate-in fade-in duration-200">
                    <div className="p-2.5 bg-brand-surface rounded-lg border border-brand-border">
                      <span className="text-[9px] text-neutral-500 uppercase block font-sans">Flatness Variance</span>
                      <span className="text-white font-bold">{dfResult.signals?.vocoder_artifacts?.metrics?.spectral_flatness_var ?? "—"}</span>
                    </div>
                    <div className="p-2.5 bg-brand-surface rounded-lg border border-brand-border">
                      <span className="text-[9px] text-neutral-500 uppercase block font-sans">HF Ripple Index</span>
                      <span className="text-white font-bold">{dfResult.signals?.vocoder_artifacts?.metrics?.high_freq_ripple ?? "—"}</span>
                    </div>
                    <div className="p-2.5 bg-brand-surface rounded-lg border border-brand-border">
                      <span className="text-[9px] text-neutral-500 uppercase block font-sans">Pitch Entropy</span>
                      <span className="text-white font-bold">{dfResult.signals?.prosody_naturalness?.metrics?.pitch_entropy ?? "—"}</span>
                    </div>
                    <div className="p-2.5 bg-brand-surface rounded-lg border border-brand-border">
                      <span className="text-[9px] text-neutral-500 uppercase block font-sans">Cadence CoV</span>
                      <span className="text-white font-bold">{dfResult.signals?.prosody_naturalness?.metrics?.cadence_cov ?? "—"}</span>
                    </div>
                  </div>
                )}

              </Panel>
            </div>
          )}

          {/* Caveat */}
          <div className="p-3 bg-brand-surface border border-brand-border/60 rounded-xl flex items-center gap-2.5 text-[11px] text-neutral-500">
            <Shield className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>Probabilistic anomaly indicators. Neural vocoders and advanced synthetic techniques evolve rapidly; corroboration is required.</span>
          </div>

        </div>
      )}

    </div>
  );
}

export default function AudioPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-xs font-mono text-neutral-500 flex items-center justify-center gap-2">
        <span className="w-3 h-3 rounded-full border-2 border-brand-cyan/20 border-t-brand-cyan animate-spin"></span>
        <span>Initializing Forenlytics Audio Studio...</span>
      </div>
    }>
      <AudioStudioContent />
    </Suspense>
  );
}
