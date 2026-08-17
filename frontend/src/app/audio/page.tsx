"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Mic, Upload, FileAudio, Activity, CheckCircle2, AlertTriangle,
  Radar, ShieldAlert, Fingerprint, X, Info, Clock, Shield
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Panel } from "@/components/ui/Panel";
import { apiClient } from "@/lib/apiClient";
import { clsx } from "clsx";
import { useAppStore } from "@/lib/store";
import { ProgressBar } from "@/components/ui/ProgressBar";

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = [".wav", ".mp3", ".flac", ".ogg"];
const ACCEPTED_MIME = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/flac", "audio/ogg", "audio/x-wav", "audio/wave"];

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

async function buildWaveformPreview(file: File, points = 100): Promise<number[]> {
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

// ── Upload Zone Component ────────────────────────────────────────────────────
interface UploadZoneProps {
  label: string;
  index: number;
  file: File | null;
  duration: number | null;
  preview: number[];
  error: string | null;
  color: "cyan" | "emerald";
  disabled: boolean;
  onFile: (f: File | null) => void;
  onError: (msg: string | null) => void;
}

function UploadZone({ label, index, file, duration, preview, error, color, disabled, onFile, onError }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ring = color === "cyan" ? "border-brand-cyan/30 bg-brand-cyan/5" : "border-brand-emerald/30 bg-brand-emerald/5";
  const dragRing = color === "cyan" ? "border-brand-cyan/60 bg-brand-cyan/10" : "border-brand-emerald/60 bg-brand-emerald/10";
  const hoverRing = color === "cyan" ? "hover:border-brand-cyan/25" : "hover:border-brand-emerald/25";
  const accentText = color === "cyan" ? "text-brand-cyan" : "text-brand-emerald";
  const accentIcon = color === "cyan" ? "text-brand-cyan" : "text-brand-emerald";

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
    <div className="flex flex-col gap-2">
      <div
        className={clsx(
          "mb-1 text-xs font-medium flex items-center gap-2 uppercase tracking-widest",
          error ? "text-red-400" : "text-neutral-400"
        )}
      >
        <span className="w-5 h-5 rounded bg-brand-surface flex items-center justify-center text-[10px] font-bold text-neutral-500">{index}</span>
        {label}
      </div>

      {!file ? (
        <label
          onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={clsx(
            "flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
            disabled ? "opacity-50 cursor-not-allowed" : "",
            dragging ? dragRing : `border-brand-border bg-brand-surface ${hoverRing}`,
          )}
        >
          <Upload className={clsx("w-5 h-5 mb-2", dragging ? accentIcon : "text-neutral-600")} />
          <span className="text-[11px] text-neutral-500">
            {dragging ? "Drop to upload" : `Drag & drop or click — WAV, MP3, FLAC, OGG`}
          </span>
          <span className="text-[10px] text-neutral-600 mt-1">Max {MAX_FILE_SIZE_MB} MB</span>
          <input ref={inputRef} type="file" className="hidden" accept={ACCEPTED_TYPES.join(",")} onChange={handleChange} disabled={disabled} />
        </label>
      ) : (
        <div className={clsx("w-full border rounded-xl overflow-hidden", ring)}>
          {/* File info row */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileAudio className={clsx("w-6 h-6 shrink-0", accentIcon)} />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-white font-medium truncate max-w-[130px] sm:max-w-[220px] md:max-w-[260px]">{file.name}</p>
                <div className={clsx("flex items-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] mt-0.5", accentText)}>
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  {duration !== null && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDuration(duration)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => { onFile(null); onError(null); }}
              disabled={disabled}
              className="ml-2 p-1.5 rounded-lg hover:bg-white/10 text-neutral-500 hover:text-white transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Waveform preview */}
          {preview.length > 0 && (
            <div className={clsx("relative w-full h-10 flex items-center justify-between gap-px px-2 border-t", color === "cyan" ? "border-brand-cyan/15" : "border-brand-emerald/15")}>
              {preview.map((amp, i) => (
                <div
                  key={i}
                  className={clsx("w-0.5 rounded-full shrink-0 transition-all", color === "cyan" ? "bg-brand-cyan/50" : "bg-brand-emerald/50")}
                  style={{ height: `${Math.max(amp * 100, 4)}%` }}
                />
              ))}
              <div className={clsx("absolute top-1 left-2 text-[8px] font-mono opacity-50", accentText)}>Preview</div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5 animate-in fade-in">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

// ── Processing Status Bar ───────────────────────────────────────────────────
const PHASES = [
  "Uploading files",
  "Preprocessing & VAD",
  "Extracting WavLM embeddings",
  "Running biometric analysis",
  "Fusing engines",
];

function ProcessingStatus({ loading }: { loading: boolean }) {
  const [phase, setPhase] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading) { setPhase(0); return; }
    const advance = () => {
      setPhase(p => {
        const next = p + 1;
        if (next < PHASES.length - 1) {
          timerRef.current = setTimeout(advance, 4000);
        }
        return next < PHASES.length ? next : p;
      });
    };
    timerRef.current = setTimeout(advance, 3000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); setPhase(0); };
  }, [loading]);

  if (!loading) return null;

  return (
    <Panel className="!p-8 flex flex-col items-center justify-center border-dashed border-brand-cyan/30 bg-brand-cyan/[0.03]">
      <div className="w-14 h-14 rounded-full border-[3px] border-brand-cyan/20 border-t-brand-cyan animate-spin mb-5" />
      <h3 className="text-white font-medium text-base mb-1">Deep Forensic Scan in Progress</h3>
      <p className={clsx("text-sm font-mono animate-pulse mb-6", "text-brand-cyan")}>
        {PHASES[phase]}...
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {PHASES.map((p, i) => (
          <div
            key={i}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all",
              i < phase ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/20" :
              i === phase ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/40 animate-pulse" :
              "bg-brand-surface border border-brand-border text-neutral-600"
            )}
          >
            {i < phase ? "✓ " : ""}{p}
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Similarity Score Gauge ──────────────────────────────────────────────────
function ScoreGauge({ score, verdict }: { score: number; verdict: string }) {
  const style = getVerdictStyle(verdict);
  const pct = Math.min(100, Math.max(0, score));

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Circular gauge */}
      <div className="relative w-32 h-32 sm:w-36 sm:h-36">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
            className={clsx("transition-all duration-1000", style.bar)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={clsx("text-2xl sm:text-3xl font-mono font-bold leading-none", style.text)}>{score}</span>
          <span className="text-[9px] text-neutral-500 mt-0.5 uppercase tracking-widest">/ 100</span>
        </div>
      </div>
      {/* Verdict badge */}
      <div className={clsx("px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider text-center", style.ring, style.text, style.bg)}>
        {verdict || "No Verdict"}
      </div>
    </div>
  );
}

// ── Score Bar ───────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.round(Math.min(100, Math.max(0, (value / max) * 100)));
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1 uppercase font-mono">
        <span className="text-neutral-500">{label}</span>
        <span className="text-white">{value.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-brand-surface overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all duration-700", getScoreColor(value).split(" ")[0].replace("text-", "bg-"))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AudioPage() {
  // Files & previews
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [dur1, setDur1] = useState<number | null>(null);
  const [dur2, setDur2] = useState<number | null>(null);
  const [wave1, setWave1] = useState<number[]>([]);
  const [wave2, setWave2] = useState<number[]>([]);
  const [err1, setErr1] = useState<string | null>(null);
  const [err2, setErr2] = useState<string | null>(null);

  // Deepfake
  const [dfFile, setDfFile] = useState<File | null>(null);
  const [dfDur, setDfDur] = useState<number | null>(null);
  const [dfWave, setDfWave] = useState<number[]>([]);
  const [dfErr, setDfErr] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [dfError, setDfError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDfUploading, setIsDfUploading] = useState(false);

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

  // Clear stale errors on mount
  useEffect(() => {
    setError(null);
    setDfError(null);
    clearJobError("audio_compare");
    clearJobError("audio_deepfake");
  }, [clearJobError]);

  // ── File handlers with async preview generation ─────────────────────────
  const handleFile1 = useCallback(async (f: File | null) => {
    setFile1(f); setWave1([]); setDur1(null);
    setError(null);
    clearJobError("audio_compare");
    if (!f) return;
    const [d, w] = await Promise.all([getAudioDuration(f), buildWaveformPreview(f)]);
    setDur1(d); setWave1(w);
  }, [clearJobError]);

  const handleFile2 = useCallback(async (f: File | null) => {
    setFile2(f); setWave2([]); setDur2(null);
    setError(null);
    clearJobError("audio_compare");
    if (!f) return;
    const [d, w] = await Promise.all([getAudioDuration(f), buildWaveformPreview(f)]);
    setDur2(d); setWave2(w);
  }, [clearJobError]);

  const handleDfFile = useCallback(async (f: File | null) => {
    setDfFile(f); setDfWave([]); setDfDur(null);
    setDfError(null);
    clearJobError("audio_deepfake");
    if (!f) return;
    const [d, w] = await Promise.all([getAudioDuration(f), buildWaveformPreview(f)]);
    setDfDur(d); setDfWave(w);
  }, [clearJobError]);

  // ── Submit handlers ─────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file1 || !file2) return;
    setError(null);
    setResult(null);
    clearJobError("audio_compare");
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
    setDfError(null);
    setDfResult(null);
    clearJobError("audio_deepfake");
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

  const getRiskColor = (label: string) => {
    if (label === "REAL") return "text-green-400 border-green-400 bg-green-400/10";
    if (label === "UNCERTAIN") return "text-yellow-400 border-yellow-400 bg-yellow-400/10";
    if (label === "DEEPFAKE") return "text-red-400 border-red-400 bg-red-400/10";
    return "text-neutral-400 border-neutral-600 bg-neutral-900";
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-14 pb-16">

      {/* ═══ SECTION 1: SPEAKER COMPARISON ═══════════════════════════════ */}
      <section>
        <SectionHeader
          title="Speaker Comparison"
          subtitle="Multi-engine neural biometric fusion for forensic voice identity analysis"
          icon={Mic}
        />
        <div className="relative h-1 mb-6 -mt-2 overflow-hidden rounded-full">
          <ProgressBar isLoading={loading || isUploading} color="cyan" />
        </div>

        {/* Upload Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <Panel className="group hover:!border-brand-cyan/20">
            <UploadZone
              label="Target Sample"
              index={1}
              file={file1} duration={dur1} preview={wave1} error={err1}
              color="cyan" disabled={loading || isUploading}
              onFile={handleFile1} onError={setErr1}
            />
          </Panel>
          <Panel className="group hover:!border-brand-emerald/20">
            <UploadZone
              label="Comparison Sample"
              index={2}
              file={file2} duration={dur2} preview={wave2} error={err2}
              color="emerald" disabled={loading || isUploading}
              onFile={handleFile2} onError={setErr2}
            />
          </Panel>
        </div>

        {/* Action Row */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleUpload}
              disabled={!file1 || !file2 || !!err1 || !!err2 || loading || isUploading}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 sm:py-2.5 bg-brand-cyan hover:bg-cyan-400 active:scale-[0.98] active:brightness-90 text-black font-semibold rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(0,240,255,0.25)]"
            >
              {loading || isUploading ? (
                <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> {isUploading ? "Uploading..." : "Processing..."}</>
              ) : (
                <><Activity className="w-4 h-4" /> Analyze Pair</>
              )}
            </button>
          </div>

          {(error || jobErrors["audio_compare"]) && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium">Analysis Failed</p>
                <p className="text-xs text-red-400/70 mt-1">{error || jobErrors["audio_compare"]}</p>
                <button onClick={() => { setError(null); clearJobError("audio_compare"); }} className="mt-2 text-[10px] text-red-400 underline hover:text-red-300">Dismiss</button>
              </div>
            </div>
          )}
        </div>

        {/* Results / Loading */}
        {(loading || isUploading) && !result ? (
          <ProcessingStatus loading={true} />
        ) : result ? (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">

            {/* No-speech warning */}
            {result.no_speech_detected && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-orange-400 font-medium">No Speech Detected</p>
                  <p className="text-xs text-orange-400/70 mt-1">
                    Could not detect sufficient speech in: {(result.no_speech_files || []).join(", ")}. Comparison cannot be performed.
                  </p>
                </div>
              </div>
            )}

            {/* Main result card */}
            {!result.no_speech_detected && (
              <Panel className="!p-4 sm:!p-6">
                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 sm:gap-8">
                  {/* Score gauge */}
                  <div className="flex flex-col items-center justify-center gap-2 lg:pr-8 lg:border-r border-brand-border pb-6 lg:pb-0 border-b lg:border-b-0">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em] mb-2">Similarity Score</p>
                    <ScoreGauge score={result.similarity_score} verdict={result.verdict} />
                    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider mt-2", getScoreColor(result.similarity_score))}>
                      <CheckCircle2 className="w-3 h-3" /> {result.confidence_level} Confidence
                    </span>
                  </div>

                  {/* Detail panel */}
                  <div className="space-y-6">
                    {/* Engine scores */}
                    <div>
                      <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-3 border-b border-brand-border pb-2">Engine Scores</p>
                      <div className="space-y-2.5">
                        <ScoreBar label="WavLM-SV Neural" value={result.engine_scores?.wavlm ?? 0} />
                        <ScoreBar label="Secondary Embedding (ECAPA)" value={result.engine_scores?.embedding ?? 0} />
                        <ScoreBar label="Vocal Biometrics" value={result.engine_scores?.biometric ?? 0} />
                        <ScoreBar label="Signal Environment" value={result.engine_scores?.signal ?? 0} />
                      </div>
                    </div>

                    {/* Synthetic risk */}
                    <div>
                      <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-2">Synthetic Risk</p>
                      <div className="grid grid-cols-2 gap-3">
                        {["deepfake_1", "deepfake_2"].map((k, i) => {
                          const v = result.engine_scores?.[k] ?? 0;
                          const riskColor = v > 60 ? "text-red-400 bg-red-400/10 border-red-400/30" : v > 30 ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" : "text-green-400 bg-green-400/10 border-green-400/30";
                          return (
                            <div key={k} className={clsx("p-2.5 rounded-xl border text-center", riskColor)}>
                              <p className="text-[9px] uppercase tracking-wider mb-1 opacity-60">Audio {i + 1}</p>
                              <p className="text-lg font-mono font-bold">{v.toFixed(0)}%</p>
                              <p className="text-[9px] opacity-60">{v > 60 ? "HIGH RISK" : v > 30 ? "UNCERTAIN" : "LIKELY REAL"}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Breakdown */}
                    {result.breakdown?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-2 border-b border-brand-border pb-2">Analysis Breakdown</p>
                        <ul className="space-y-1.5">
                          {result.breakdown.map((item: string, idx: number) => (
                            <li key={idx} className={clsx("text-xs flex items-start gap-2", item.includes("⚠") || item.includes("WARNING") ? "text-orange-400" : "text-neutral-400")}>
                              <span className="shrink-0 mt-0.5 opacity-50">•</span> {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Panel>
            )}

            {/* Post-VAD duration + waveforms */}
            {result.file_metadata && !result.no_speech_detected && (
              <Panel className="!p-5">
                <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-4 border-b border-brand-border pb-2">
                  Acoustic Envelopes (Post-VAD Speech Segments)
                </p>
                <div className="space-y-3">
                  {(["audio_1", "audio_2"] as const).map((key, i) => {
                    const meta = result.file_metadata[key];
                    const waveData = result.waveforms?.[key] || [];
                    const color = i === 0 ? "brand-cyan" : "brand-emerald";
                    const label = i === 0 ? "Target" : "Comparison";
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-[10px] mb-1.5">
                          <span className={`font-mono text-${color}`}>{label}</span>
                          <span className="text-neutral-600">
                            {meta?.speech_duration_sec}s speech used of {meta?.raw_duration_sec}s total
                          </span>
                        </div>
                        <div className="relative w-full h-12 bg-brand-surface rounded-xl border border-brand-border overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-between gap-px px-2">
                            {waveData.map((amp: number, idx: number) => (
                              <div
                                key={idx}
                                className={`w-px rounded-full shrink-0 bg-${color}/50`}
                                style={{ height: `${Math.max(amp * 100, 3)}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-right text-[10px] text-neutral-600 font-mono">{result.processing_time}s processing</div>
              </Panel>
            )}

            {/* Forensic caveat */}
            {result.forensic_caveat && (
              <div className="p-4 bg-brand-surface border border-brand-border/60 rounded-xl flex items-start gap-3">
                <Shield className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-neutral-500 leading-relaxed">{result.forensic_caveat}</p>
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* ═══ SECTION 2: DEEPFAKE DETECTION ══════════════════════════════ */}
      <section className="pt-8 border-t border-brand-border/50">
        <SectionHeader
          title="Deepfake Detection"
          subtitle="Synthetic anomaly scanning and vocoder artifact detection"
          icon={Radar}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <Panel className="group hover:!border-red-500/20">
            <UploadZone
              label="Target Audio"
              index={1}
              file={dfFile} duration={dfDur} preview={dfWave} error={dfErr}
              color="cyan" disabled={dfLoading || isDfUploading}
              onFile={handleDfFile} onError={setDfErr}
            />
          </Panel>

          <Panel className="flex flex-col justify-center gap-4" loading={dfLoading}>
            <div className="p-3 bg-brand-surface border border-brand-border rounded-xl text-[11px] text-neutral-500 flex items-start gap-2.5">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
              <p>Probabilistic signal-level anomaly detection. Heuristic thresholds only — not validated against a labeled deepfake dataset. Results are forensic indicators, not legal proof.</p>
            </div>
            <button
              onClick={handleDfUpload}
              disabled={!dfFile || !!dfErr || dfLoading || isDfUploading}
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-red-600 hover:bg-red-500 active:scale-[0.98] active:brightness-90 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {dfLoading || isDfUploading ? (
                <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> {isDfUploading ? "Uploading..." : "Scanning..."}</>
              ) : (
                <><Activity className="w-4 h-4" /> Run Deepfake Scan</>
              )}
            </button>
            {(dfError || jobErrors["audio_deepfake"]) && (
              <p className="text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {dfError || jobErrors["audio_deepfake"]}
              </p>
            )}
          </Panel>
        </div>

        {dfResult && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <Panel className="!p-4 sm:!p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="col-span-1 lg:border-r border-brand-border lg:pr-8 flex flex-col items-center justify-center pb-6 lg:pb-0 border-b lg:border-b-0">
                  <p className="text-neutral-500 text-[10px] mb-5 uppercase tracking-[0.2em] font-medium">Anomaly Status</p>
                  <div className={clsx("w-32 h-32 sm:w-36 sm:h-36 rounded-full border-[6px] flex items-center justify-center flex-col", getRiskColor(dfResult.label))}>
                    <span className="text-2xl sm:text-3xl font-mono font-bold text-white">{dfResult.deepfake_score}</span>
                    <span className="text-[10px] opacity-70 mt-0.5 uppercase text-white font-semibold tracking-widest">{dfResult.label}</span>
                  </div>
                  <div className="mt-5">
                    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider", getRiskColor(dfResult.label))}>
                      <Fingerprint className="w-3 h-3" /> {dfResult.confidence}
                    </span>
                  </div>
                </div>

                <div className="col-span-2 flex flex-col justify-center gap-5">
                  <div>
                    <p className="text-white font-medium text-sm mb-2">Diagnostic Interpretation</p>
                    <div className="p-4 bg-brand-surface rounded-xl border border-brand-border">
                      <p className="text-neutral-400 text-xs leading-relaxed">{dfResult.interpretation}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-white font-medium text-xs mb-3 border-b border-brand-border pb-2 uppercase tracking-widest">Anomaly Attribution</p>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] uppercase font-medium">
                        <span className="text-neutral-500">ZCR Irregularity Variance</span>
                        <span className="text-white font-mono">{dfResult.metrics?.zcr_variance ?? "—"}</span>
                      </div>
                      <div className="flex justify-between text-[10px] uppercase font-medium">
                        <span className="text-neutral-500">Spectral Rolloff Variance</span>
                        <span className="text-white font-mono">{dfResult.metrics?.rolloff_variance ?? "—"}</span>
                      </div>
                      <div className="flex justify-between text-[10px] uppercase font-medium">
                        <span className="text-neutral-500">Embedding Over-smoothing</span>
                        <span className="text-white font-mono">{dfResult.metrics?.embedding_variance ?? "—"}</span>
                      </div>
                    </div>
                  </div>

                  {dfResult.file_metadata && (
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div className="p-2.5 bg-brand-surface rounded-xl border border-brand-border">
                        <p className="text-neutral-600 uppercase mb-1">Speech Used</p>
                        <p className="font-mono text-white">{dfResult.file_metadata.speech_duration_sec}s</p>
                      </div>
                      <div className="p-2.5 bg-brand-surface rounded-xl border border-brand-border">
                        <p className="text-neutral-600 uppercase mb-1">Processing</p>
                        <p className="font-mono text-white">{dfResult.processing_time}s</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Panel>

            {dfResult.forensic_caveat && (
              <div className="p-4 bg-brand-surface border border-brand-border/60 rounded-xl flex items-start gap-3">
                <Shield className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-neutral-500 leading-relaxed">{dfResult.forensic_caveat}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
