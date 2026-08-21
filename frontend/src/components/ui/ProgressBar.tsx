"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  isLoading: boolean;
  color?: "cyan" | "emerald" | "red";
  className?: string;
  simulateDuration?: number; // ms to reach ~95%
}

export function ProgressBar({ 
  isLoading, 
  color = "cyan", 
  className,
  simulateDuration = 3000 
}: ProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isLoading) {
      setVisible(true);
      setProgress(15);
      const startTime = Date.now();

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const ratio = elapsed / simulateDuration;
        const next = Math.min(92, 15 + 80 * (1 - Math.exp(-ratio * 2.5)));
        setProgress(next);
      }, 100);

      timerRef.current = interval;
    } else {
      setProgress((prev) => (prev > 0 ? 100 : 0));
      const timeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);
      timerRef.current = timeout;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        clearTimeout(timerRef.current);
      }
    };
  }, [isLoading, simulateDuration]);

  if (!visible && progress === 0) return null;

  const colorMap = {
    cyan: "bg-brand-cyan shadow-[0_0_8px_rgba(0,240,255,0.5)]",
    emerald: "bg-brand-emerald shadow-[0_0_8px_rgba(0,255,136,0.5)]",
    red: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
  };

  return (
    <div className={cn("absolute top-0 left-0 w-full h-[2px] bg-white/5 overflow-hidden z-50 pointer-events-none", className)}>
      <div 
        className={cn(
          "h-full transition-all duration-300 ease-out relative",
          colorMap[color]
        )}
        style={{ width: `${progress}%` }}
      >
        <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-white/40 to-transparent animate-pulse" />
      </div>
    </div>
  );
}
