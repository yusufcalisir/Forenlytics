import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  isLoading: boolean;
  color?: "cyan" | "emerald" | "red";
  className?: string;
  simulateDuration?: number; // ms to reach ~90%
}

export function ProgressBar({ 
  isLoading, 
  color = "cyan", 
  className,
  simulateDuration = 3000 
}: ProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLoading) {
      setProgress(0);
      const startTime = Date.now();
      
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const ratio = elapsed / simulateDuration;
        
        // Asymptotic approach to 95%
        const nextProgress = Math.min(95, 100 * (1 - Math.exp(-ratio * 2)));
        setProgress(nextProgress);
      }, 50);
    } else {
      if (progress > 0) {
        setProgress(100);
        interval = setTimeout(() => setProgress(0), 400) as any;
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading, simulateDuration]);

  if (progress === 0 && !isLoading) return null;

  const colorMap = {
    cyan: "bg-brand-cyan shadow-[0_0_8px_rgba(0,240,255,0.5)]",
    emerald: "bg-brand-emerald shadow-[0_0_8px_rgba(0,255,136,0.5)]",
    red: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
  };

  return (
    <div className={cn("absolute top-0 left-0 w-full h-[2px] bg-white/5 overflow-hidden z-50", className)}>
      <div 
        className={cn(
          "h-full transition-all duration-300 ease-out relative",
          colorMap[color]
        )}
        style={{ width: `${progress}%` }}
      >
        {/* Animated pulse effect */}
        <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-white/40 to-transparent animate-pulse" />
      </div>
    </div>
  );
}
