import { Mic, MapPin, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TimelineEventProps {
  data: any;
}

export function TimelineEvent({ data }: TimelineEventProps) {
  const [expanded, setExpanded] = useState(false);

  const isHTS = data.type === 'HTS';

  const ICONS = {
    HTS: <Mic className="w-4 h-4 text-brand-cyan" />,
    GPS: <MapPin className="w-4 h-4 text-emerald-500" />,
    EVT: <AlertTriangle className="w-4 h-4 text-yellow-500" />
  };

  const ringColors = {
    HTS: "ring-brand-cyan/20 border-brand-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]",
    GPS: "ring-emerald-500/20 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
    EVT: "ring-yellow-500/20 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]"
  };

  return (
    <div className="relative pl-10 md:pl-0 w-full mb-8 group">
      {/* Desktop Layout Line */}
      <div className="hidden md:block absolute left-[50%] top-6 bottom-[-2.5rem] w-px bg-brand-border -translate-x-[0.5px]"></div>
      
      {/* Mobile Layout Line */}
      <div className="md:hidden absolute left-[19px] top-6 bottom-[-2.5rem] w-px bg-brand-border"></div>

      <div className={cn("relative flex items-start", isHTS ? "md:justify-start" : "md:justify-end")}>
        
        {/* The Node dot */}
        <div className={cn(
          "absolute left-0 md:left-1/2 md:-translate-x-1/2 mt-1 w-10 h-10 rounded-full bg-brand-bg border-2 flex items-center justify-center z-10 transition-transform group-hover:scale-110",
          ringColors[data.type as keyof typeof ringColors]
        )}>
          {ICONS[data.type as keyof typeof ICONS]}
        </div>

        {/* Content Card */}
        <div className={cn(
          "w-full md:w-[45%] bg-brand-panel border rounded-xl overflow-hidden transition-all duration-300",
          data.correlated ? "border-brand-cyan/50 shadow-[0_0_20px_rgba(0,240,255,0.15)]" : "border-brand-border hover:border-neutral-700"
        )}>
           <div 
             className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
             onClick={() => setExpanded(!expanded)}
           >
              <div className="flex justify-between items-start mb-2">
                <span className="font-mono text-xs text-neutral-400">{data.timestamp_str}</span>
                {data.correlated && (
                  <span className="px-2 py-0.5 bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 rounded text-[10px] uppercase font-bold tracking-wider animate-[pulse_2s_easeInOut_infinite]">
                     Linked Event
                  </span>
                )}
              </div>
              <h4 className="text-white font-medium text-sm mb-1">{data.title}</h4>
              
              {data.insight && (
                <div className="mt-3 text-xs text-brand-cyan border-l-2 border-brand-cyan pl-3 py-1 bg-brand-cyan/5">
                   {data.insight}
                </div>
              )}

              <div className="flex items-center justify-end mt-2 text-neutral-600">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 group-hover:text-white transition-colors" />}
              </div>
           </div>
           
           {/* Detailed Metadata (expanded) */}
           {expanded && (
             <div className="p-4 bg-neutral-950 border-t border-brand-border font-mono text-[11px] text-neutral-400 overflow-x-auto">
                <pre>{JSON.stringify(data.metadata, null, 2)}</pre>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
