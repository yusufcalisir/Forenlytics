"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Shield,
  Wifi,
  Mic,
  Radar,
  FileText,
  ShieldCheck,
  LayoutDashboard,
  Scissors,
  ArrowRight,
  X,
  Command,
  Sparkles,
  Zap,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  keywords: string[];
}

const SEARCH_ITEMS: SearchItem[] = [
  {
    id: "speaker-verification",
    title: "Speaker Verification Matrix",
    subtitle: "6D vocal biometric comparison (WavLM, LPC formants, pYIN F0)",
    category: "Pillar 1.0",
    href: "/audio?mode=compare",
    icon: Scale,
    badge: "EER: 6.25%",
    badgeColor: "text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20",
    keywords: ["speaker", "verification", "compare", "voice match", "biometric", "wavlm", "ecapa", "lpc", "pitch", "f0", "formants", "mfcc", "rhythm", "energy", "dual", "pair"],
  },
  {
    id: "deepfake-scanner",
    title: "Deepfake & AI Voice Scan",
    subtitle: "Multi-signal synthetic speech & vocoder artifact detection",
    category: "Pillar 2.0",
    href: "/audio?mode=deepfake",
    icon: Radar,
    badge: "3-Class EER: 20.0%",
    badgeColor: "text-red-400 bg-red-500/10 border-red-500/20",
    keywords: ["deepfake", "synthetic", "ai voice", "vocoder", "hifi-gan", "spoof", "vits", "speecht5", "prosody", "entropy", "wav2vec2", "anomaly", "scan"],
  },
  {
    id: "splice-localization",
    title: "Temporal Splicing Analyzer (✂)",
    subtitle: "1.5s sliding-window MFCC delta & splice boundary marker generator",
    category: "Diagnostic Tool",
    href: "/audio?mode=deepfake",
    icon: Scissors,
    badge: "90% Recall",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    keywords: ["splice", "splicing", "boundary", "cut", "marker", "temporal", "sliding window", "1.5s", "mfcc delta", "noise floor", "jump"],
  },
  {
    id: "forensic-dockets",
    title: "Court-Ready Forensic PDF Dockets",
    subtitle: "Compile official intelligence records with SHA-256 chain of custody",
    category: "Judicial Reports",
    href: "/reports",
    icon: FileText,
    badge: "Court-Ready",
    badgeColor: "text-brand-emerald bg-brand-emerald/10 border-brand-emerald/20",
    keywords: ["report", "reports", "pdf", "docket", "court", "export", "chain of custody", "sha-256", "verdict", "intelligence", "download"],
  },
  {
    id: "calibration-methodology",
    title: "Empirical Calibration Dossier",
    subtitle: "ISO/IEC 17025 benchmark data, ROC AUC curves, and EER operating tradeoff",
    category: "Benchmark & Method",
    href: "/methodology",
    icon: ShieldCheck,
    badge: "ISO/IEC 17025",
    badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    keywords: ["methodology", "calibration", "eer", "auc", "roc", "librispeech", "false acceptance", "far", "frr", "tradeoff", "benchmark", "accuracy"],
  },
  {
    id: "command-center",
    title: "Forensic Command Center",
    subtitle: "Main system telemetry, engine pipeline overview, and quick launchpad",
    category: "Navigation",
    href: "/",
    icon: LayoutDashboard,
    badge: "Operational",
    badgeColor: "text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20",
    keywords: ["dashboard", "home", "overview", "status", "telemetry", "pipeline", "command center", "main"],
  },
];

export function Topbar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter items based on query
  const filteredItems = query.trim() === ""
    ? SEARCH_ITEMS
    : SEARCH_ITEMS.filter((item) => {
        const q = query.toLowerCase().trim();
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
        );
      });

  // Global keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus modal input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        modalInputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation in list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems.length > 0) {
        const item = filteredItems[selectedIndex];
        handleSelect(item.href);
      }
    }
  };

  const handleSelect = (href: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <header className="h-14 border-b border-brand-border bg-brand-bg/90 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 w-full">
        {/* Left: Quick Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div
            onClick={() => setIsOpen(true)}
            className="relative w-full cursor-pointer group flex items-center"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 group-hover:text-brand-cyan transition-colors" />
            <input
              ref={inputRef}
              type="text"
              readOnly
              placeholder="Search modules (Deepfake, Speaker, Reports, Splicing)..."
              className="w-full bg-brand-surface/80 border border-brand-border rounded-xl pl-9 pr-16 py-1.5 text-xs text-neutral-300 placeholder:text-neutral-500 group-hover:border-brand-cyan/40 group-hover:bg-brand-surface transition-all cursor-pointer select-none"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-neutral-500 bg-brand-panel border border-brand-border rounded">
                <Command className="w-2.5 h-2.5" />K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right: Status indicators */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-brand-emerald shadow-[0_0_8px_rgba(0,255,136,0.6)] animate-pulse"></span>
            <span className="hidden sm:inline text-neutral-300">Live Telemetry</span>
          </div>
          <div className="h-4 w-px bg-brand-border hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center text-brand-cyan">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-mono font-semibold text-neutral-300 hidden md:block">
              Analyst_01
            </span>
          </div>
        </div>
      </header>

      {/* Interactive Command Palette Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-brand-panel border border-brand-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Search Input in Modal */}
            <div className="relative border-b border-brand-border/80 p-3 sm:p-4 flex items-center gap-3 bg-brand-surface/50">
              <Search className="w-4 h-4 text-brand-cyan shrink-0" />
              <input
                ref={modalInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                placeholder="Search modules, acoustic engines, splicing markers, or dockets..."
                className="w-full bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-mono px-2 py-1 rounded bg-brand-surface border border-brand-border text-neutral-400 hover:text-white"
              >
                ESC
              </button>
            </div>

            {/* Search Results List */}
            <div className="max-h-[380px] overflow-y-auto custom-scrollbar p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="py-10 text-center text-neutral-500 text-xs">
                  No forensic modules or engines matching &quot;<span className="text-neutral-300">{query}</span>&quot;
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.href)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-150",
                        isSelected
                          ? "bg-brand-cyan/10 border border-brand-cyan/30 text-white shadow-[0_0_15px_rgba(0,240,255,0.08)]"
                          : "border border-transparent text-neutral-300 hover:bg-white/[0.03]"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                            isSelected
                              ? "bg-brand-cyan/20 border-brand-cyan/40 text-brand-cyan scale-105"
                              : "bg-brand-surface border-brand-border text-neutral-400"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs truncate">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span
                                className={cn(
                                  "text-[10px] font-mono px-1.5 py-0.2 rounded border shrink-0",
                                  item.badgeColor
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-3 shrink-0">
                        <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider hidden sm:inline">
                          {item.category}
                        </span>
                        <ArrowRight
                          className={cn(
                            "w-3.5 h-3.5 transition-transform",
                            isSelected
                              ? "text-brand-cyan translate-x-1"
                              : "text-neutral-600"
                          )}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 border-t border-brand-border/60 bg-brand-bg/60 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
              <div className="flex items-center gap-3">
                <span>Navigate: <kbd className="px-1 py-0.5 rounded bg-brand-surface border border-brand-border text-neutral-300">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-brand-surface border border-brand-border text-neutral-300">↓</kbd></span>
                <span>Select: <kbd className="px-1 py-0.5 rounded bg-brand-surface border border-brand-border text-neutral-300">↵</kbd></span>
              </div>
              <span className="text-brand-cyan/80">Forenlytics Command Palette</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
