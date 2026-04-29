"use client";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Safe dynamic import preventing Next.js window-hydration errors
const MapEngine = dynamic(() => import("./MapEngine"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-brand-bg text-brand-cyan border border-brand-border rounded-xl">
      <Loader2 className="w-8 h-8 animate-spin mb-4" />
      <span className="font-mono text-sm tracking-widest animate-pulse">INITIALIZING SPATIAL ENGINE</span>
    </div>
  )
});

export function InteractiveMap({ data, timeIndex }: { data: any, timeIndex: number }) {
  return <MapEngine data={data} timeIndex={timeIndex} />;
}
