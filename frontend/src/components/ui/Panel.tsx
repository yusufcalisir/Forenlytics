import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  glow?: "cyan" | "emerald" | "red" | "none";
  noPadding?: boolean;
}

export function Panel({ children, className, glow = "none", noPadding = false }: PanelProps) {
  const glowMap = {
    cyan: "glow-cyan",
    emerald: "glow-emerald",
    red: "glow-red",
    none: ""
  };

  return (
    <div className={cn(
      "intel-panel",
      !noPadding && "p-5",
      glowMap[glow],
      className
    )}>
      {children}
    </div>
  );
}
