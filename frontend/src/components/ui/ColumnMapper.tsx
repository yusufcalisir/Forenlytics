"use client";

import { useState, useMemo } from "react";
import { ArrowRight, Check, AlertTriangle, Columns3, Loader2 } from "lucide-react";

interface DetectedColumn {
  original: string;
  mapped_to: string | null;
  samples: string[];
}

interface ColumnMapperProps {
  detectedColumns: DetectedColumn[];
  requiredColumns: string[];
  autoMapping: Record<string, string>;
  onConfirm: (mapping: Record<string, string>) => void;
  isSubmitting?: boolean;
  profileName?: string;
  confidence?: number;
}

const FRIENDLY_NAMES: Record<string, string> = {
  timestamp: "Timestamp / Tarih",
  caller_number: "Caller / Arayan",
  receiver_number: "Receiver / Aranan",
  base_station_id: "Base Station / İstasyon",
  latitude: "Latitude / Enlem",
  longitude: "Longitude / Boylam",
};

export function ColumnMapper({
  detectedColumns,
  requiredColumns,
  autoMapping,
  onConfirm,
  isSubmitting = false,
  profileName,
  confidence,
}: ColumnMapperProps) {
  // Initialize mapping state from auto-mapping
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const col of detectedColumns) {
      if (col.mapped_to) {
        initial[col.original] = col.mapped_to;
      } else if (autoMapping[col.original]) {
        initial[col.original] = autoMapping[col.original];
      }
    }
    return initial;
  });

  // Track which required columns have been assigned
  const assignedCanonical = useMemo(() => {
    const set = new Set<string>();
    Object.values(mapping).forEach((v) => set.add(v));
    return set;
  }, [mapping]);

  const missingRequired = useMemo(
    () => requiredColumns.filter((r) => !assignedCanonical.has(r)),
    [requiredColumns, assignedCanonical]
  );

  const isValid = missingRequired.length === 0;

  const handleSelect = (originalCol: string, canonicalCol: string) => {
    setMapping((prev) => {
      const next = { ...prev };

      // If this canonical column was already assigned to another column, remove it
      for (const [key, val] of Object.entries(next)) {
        if (val === canonicalCol && key !== originalCol) {
          delete next[key];
        }
      }

      if (canonicalCol === "") {
        delete next[originalCol];
      } else {
        next[originalCol] = canonicalCol;
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (isValid) {
      onConfirm(mapping);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Columns3 className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Column Mapping Required</h3>
          <p className="text-neutral-500 text-xs mt-0.5">
            We couldn&apos;t auto-detect all required columns. Please map your CSV columns below.
          </p>
        </div>
      </div>

      {/* Detected profile badge */}
      {profileName && (
        <div className="mb-5 p-3 bg-brand-cyan/5 border border-brand-cyan/15 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500">Detected Format</span>
            <span className="text-xs font-semibold text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded">{profileName}</span>
          </div>
          {confidence !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-500">Confidence</span>
              <div className="w-20 h-1.5 bg-brand-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${confidence > 80 ? 'bg-brand-emerald' : confidence > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(confidence, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-mono font-semibold ${confidence > 80 ? 'text-brand-emerald' : confidence > 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {confidence}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Missing indicator */}
      {missingRequired.length > 0 && (
        <div className="mb-5 p-3 bg-amber-500/8 border border-amber-500/15 rounded-lg flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-amber-400/80 text-xs leading-relaxed">
            <span className="font-semibold">Missing:</span>{" "}
            {missingRequired.map((m) => FRIENDLY_NAMES[m] || m).join(", ")}
          </p>
        </div>
      )}

      {/* Column mapping table */}
      <div className="border border-brand-border rounded-xl overflow-hidden bg-brand-surface/50">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_40px_1fr_120px] gap-0 items-center px-4 py-2.5 bg-brand-panel border-b border-brand-border">
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">CSV Column</span>
          <span />
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Map To</span>
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest text-right">Sample Data</span>
        </div>

        {/* Rows */}
        {detectedColumns.map((col) => {
          const currentMapping = mapping[col.original] || "";
          const isAssigned = !!currentMapping;

          return (
            <div
              key={col.original}
              className={`grid grid-cols-[1fr_40px_1fr_120px] gap-0 items-center px-4 py-3 border-b border-brand-border/50 last:border-b-0 transition-colors ${
                isAssigned ? "bg-brand-emerald/3" : ""
              }`}
            >
              {/* Column name */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-white truncate" title={col.original}>
                  {col.original}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className={`w-3.5 h-3.5 transition-colors ${isAssigned ? "text-brand-emerald" : "text-neutral-700"}`} />
              </div>

              {/* Dropdown */}
              <div>
                <select
                  value={currentMapping}
                  onChange={(e) => handleSelect(col.original, e.target.value)}
                  className={`w-full bg-brand-panel border rounded-lg px-3 py-1.5 text-sm outline-none transition-all cursor-pointer ${
                    isAssigned
                      ? "border-brand-emerald/30 text-brand-emerald"
                      : "border-brand-border text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  <option value="">— Skip —</option>
                  {requiredColumns.map((rc) => {
                    const alreadyUsed = assignedCanonical.has(rc) && currentMapping !== rc;
                    return (
                      <option key={rc} value={rc} disabled={alreadyUsed}>
                        {FRIENDLY_NAMES[rc] || rc} {alreadyUsed ? "(assigned)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Sample data */}
              <div className="text-right">
                <span className="font-mono text-[10px] text-neutral-600 truncate block" title={col.samples.join(", ")}>
                  {col.samples.slice(0, 2).join(", ")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="mt-5 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-cyan hover:bg-cyan-400 active:scale-[0.98] active:brightness-90 text-black rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(0,240,255,0.25)]"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
          ) : (
            <><Check className="w-4 h-4" /> Confirm Mapping</>
          )}
        </button>
      </div>
    </div>
  );
}
