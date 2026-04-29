import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { ProgressBar } from "./ProgressBar";

interface PanelProps {
  children: ReactNode;
  className?: string;
  glow?: "cyan" | "emerald" | "red" | "none";
  noPadding?: boolean;
  loading?: boolean;
}

export function Panel({ children, className, glow = "none", noPadding = false, loading = false }: PanelProps) {
  const glowMap = {
    cyan: "glow-cyan",
    emerald: "glow-emerald",
    red: "glow-red",
    none: ""
  };

  return (
    <div className={cn(
      "intel-panel relative overflow-hidden",
      !noPadding && "p-5",
      glowMap[glow],
      className
    )}>
      {loading && <ProgressBar isLoading={loading} color={glow !== "none" ? (glow as any) : "cyan"} />}
      {children}
    </div>
  );
}
