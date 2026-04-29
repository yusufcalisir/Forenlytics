"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize, AlertTriangle, Mic, MapPin, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineProps {
  data: any;
}

export function HorizontalTimeline({ data }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Time boundaries
  const timeBounds = useMemo(() => {
    if (!data.events || data.events.length === 0) return null;
    const timestamps = data.events.map((e: any) => new Date(e.timestamp).getTime());
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    // Add 5% padding on both sides
    const padding = (max - min) * 0.05 || 3600000; 
    return { start: min - padding, end: max + padding, duration: (max - min) + (padding * 2) };
  }, [data.events]);

  const eventMap = useMemo(() => {
    const map = new Map();
    if (!data.events) return map;
    data.events.forEach((e: any) => map.set(e.id, e));
    return map;
  }, [data.events]);

  if (!timeBounds) return null;

  // Layer vertical positioning
  const layerTop = {
    "communication": "20%",
    "movement": "50%",
    "manual": "80%"
  };

  const getLeftPos = (ts: string) => {
    const time = new Date(ts).getTime();
    return `${((time - timeBounds.start) / timeBounds.duration) * 100}%`;
  };

  const getWidth = (startStr: string, endStr: string) => {
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    return `${((end - start) / timeBounds.duration) * 100}%`;
  };

  const ICONS = {
    HTS: <Mic className="w-4 h-4 text-brand-cyan" />,
    GPS: <MapPin className="w-4 h-4 text-emerald-500" />,
    EVT: <AlertTriangle className="w-4 h-4 text-yellow-500" />
  };

  return (
    <div className="flex flex-col h-[700px] w-full gap-4 animate-in fade-in">
      
      {/* Controls */}
      <div className="flex justify-between items-center intel-panel !rounded-xl p-3">
        <div className="flex gap-2">
           <button onClick={() => setZoom(z => Math.max(1, z - 0.5))} className="p-2 bg-brand-surface hover:bg-white/[0.06] rounded-lg transition-colors text-neutral-500 hover:text-white border border-brand-border" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
           </button>
           <div className="px-3 py-1 flex items-center text-xs font-mono text-neutral-500 bg-brand-surface rounded-lg border border-brand-border">
             {zoom.toFixed(1)}x
           </div>
           <button onClick={() => setZoom(z => z + 0.5)} className="p-2 bg-brand-surface hover:bg-white/[0.06] rounded-lg transition-colors text-neutral-500 hover:text-white border border-brand-border" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
           </button>
           <button onClick={() => setZoom(1)} className="p-2 ml-2 bg-brand-surface hover:bg-brand-cyan/10 rounded-lg transition-colors text-neutral-500 hover:text-brand-cyan border border-brand-border" title="Reset">
              <Maximize className="w-4 h-4" />
           </button>
        </div>
        <div className="flex gap-6 text-xs font-mono text-neutral-500">
           <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(0,240,255,0.5)]"></span> SIGINT (HTS)</span>
           <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> GEOINT (GPS)</span>
           <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></span> MANUAL / HALT</span>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        
        {/* Timeline Canvas Container */}
        <div 
          className="flex-1 bg-brand-bg border border-brand-border rounded-xl overflow-x-auto overflow-y-hidden relative custom-scrollbar grid-bg"
          ref={containerRef}
        >
          {/* Zoomable Inner Canvas */}
          <div 
            className="h-full relative origin-left transition-all duration-300 ease-out" 
            style={{ width: `${zoom * 100}%`, minWidth: '100%' }}
          >
             
             {/* Grid Lines */}
             <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:5%] pointer-events-none"></div>

             {/* Axis Labels */}
             <div className="absolute top-2 left-4 text-xs font-mono text-neutral-600 pointer-events-none">Start: {new Date(timeBounds.start).toLocaleString()}</div>
             <div className="absolute top-2 right-4 text-xs font-mono text-neutral-600 pointer-events-none">End: {new Date(timeBounds.end).toLocaleString()}</div>

             {/* Clusters (Background shading) */}
             {data.clusters?.map((cluster: any, i: number) => (
                <div 
                   key={i}
                   className="absolute top-0 bottom-0 bg-brand-cyan/5 border-x border-brand-cyan/20 pointer-events-none"
                   style={{ 
                     left: getLeftPos(cluster.start),
                     width: getWidth(cluster.start, cluster.end) 
                   }}
                >
                  <div className="absolute top-1 left-2 text-[10px] text-brand-cyan/50 font-mono tracking-widest">ACTIVITY CLUSTER ({cluster.event_count})</div>
                </div>
             ))}

             {/* SVG Links */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
               {data.events.map((evt: any) => {
                 return evt.linked_events.map((linkedId: string) => {
                   const target = eventMap.get(linkedId);
                   if (!target) return null;
                   
                   // To avoid drawing bidirectional lines twice, only draw if source time < target time
                   if (new Date(evt.timestamp) > new Date(target.timestamp)) return null;

                   const x1 = getLeftPos(evt.timestamp);
                   const y1 = layerTop[evt.layer as keyof typeof layerTop];
                   const x2 = getLeftPos(target.timestamp);
                   const y2 = layerTop[target.layer as keyof typeof layerTop];

                   return (
                     <line 
                       key={`${evt.id}-${linkedId}`}
                       x1={x1} y1={y1} x2={x2} y2={y2}
                       stroke="rgba(0,240,255,0.3)" 
                       strokeWidth="1.5"
                       strokeDasharray="4 4"
                       className="animate-[pulse_2s_easeInOut_infinite]"
                     />
                   );
                 });
               })}
             </svg>

             {/* Events */}
             {data.events.map((evt: any) => (
                <div 
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className={cn(
                    "absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center cursor-pointer z-20 transition-transform hover:scale-150 hover:z-30",
                    evt.type === 'HTS' ? "bg-brand-cyan/20 border-2 border-brand-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]" :
                    evt.type === 'GPS' ? "bg-emerald-500/20 border-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" :
                    "bg-yellow-500/20 border-2 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]",
                    evt.is_anomaly && "ring-2 ring-red-500/50 ring-offset-2 ring-offset-black bg-red-500/20 border-red-500",
                    selectedEvent?.id === evt.id && "scale-150 bg-white"
                  )}
                  style={{
                    left: getLeftPos(evt.timestamp),
                    top: layerTop[evt.layer as keyof typeof layerTop]
                  }}
                  title={evt.title}
                >
                  <div className={cn("scale-[0.6]", selectedEvent?.id === evt.id && "text-black")}>
                    {ICONS[evt.type as keyof typeof ICONS]}
                  </div>
                </div>
             ))}

          </div>
        </div>

        {/* Intelligence Side Panel */}
        <div className="w-80 flex flex-col gap-4">
          
          {selectedEvent ? (
            <div className="intel-panel glow-cyan p-5 flex-1 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 uppercase tracking-widest border-b border-brand-cyan/20 pb-2">
                 <Activity className="w-4 h-4 text-brand-cyan" /> Event Inspection
              </h3>
              <div className="mb-4">
                 <span className="text-xs text-neutral-400 font-mono block mb-1">
                   {new Date(selectedEvent.timestamp).toLocaleString()}
                 </span>
                 <span className="font-medium text-white block">{selectedEvent.title}</span>
                 {selectedEvent.is_anomaly && (
                   <span className="inline-block mt-2 px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[10px] uppercase font-bold tracking-wider">
                      Anomaly Detected
                   </span>
                 )}
              </div>
              
              <div className="space-y-4">
                 <div>
                   <h4 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2">Metadata</h4>
                   <div className="bg-brand-surface rounded-lg border border-brand-border p-3 font-mono text-xs text-neutral-400 whitespace-pre-wrap break-all">
                     {JSON.stringify(selectedEvent.metadata, null, 2)}
                   </div>
                 </div>

                 {selectedEvent.linked_events.length > 0 && (
                   <div>
                     <h4 className="text-[10px] text-brand-cyan uppercase tracking-widest mb-2 flex items-center gap-1">
                       <AlertTriangle className="w-3 h-3" /> Correlated Links
                     </h4>
                     <div className="space-y-2">
                       {selectedEvent.linked_events.map((linkId: string) => {
                         const target = eventMap.get(linkId);
                         if(!target) return null;
                         return (
                           <div key={linkId} className="bg-brand-cyan/5 border border-brand-cyan/20 p-2 rounded text-xs font-mono cursor-pointer hover:bg-brand-cyan/10 transition-colors" onClick={() => setSelectedEvent(target)}>
                              <div className="text-brand-cyan">{target.type} Event</div>
                              <div className="text-neutral-400 truncate">{target.title}</div>
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 )}
              </div>
            </div>
          ) : (
            <div className="intel-panel p-5 flex flex-col flex-1">
              <h3 className="text-sm font-semibold text-brand-emerald flex items-center gap-2 mb-4 uppercase tracking-widest border-b border-brand-border/50 pb-2">
                 Intelligence Story
              </h3>
              <div className="text-sm text-neutral-300 leading-relaxed font-mono flex-1 overflow-y-auto custom-scrollbar whitespace-pre-wrap pr-2">
                 {data.story || "No story generated."}
              </div>
              
              {data.insights && data.insights.length > 0 && (
                <div className="mt-4 pt-4 border-t border-brand-border/50">
                  <h4 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-3">Key Anomalies</h4>
                  <ul className="space-y-2">
                    {data.insights.map((ins: string, idx: number) => (
                       <li key={idx} className="text-xs text-red-400 flex gap-2">
                          <span className="mt-0.5">•</span>
                          <span>{ins}</span>
                       </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
