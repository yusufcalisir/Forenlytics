import { BarChart, Clock } from "lucide-react";

interface VizProps {
  top_numbers: { number: string; calls: number }[];
  timeline: { time: string; count: number }[];
}

export function HtsVisualizations({ top_numbers, timeline }: VizProps) {
  const maxCalls = Math.max(...top_numbers.map(n => n.calls), 1);
  const maxTimeCount = Math.max(...timeline.map(t => t.count), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Top Numbers Bar Chart (CSS based) */}
      <div className="bg-brand-panel border border-brand-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart className="w-5 h-5 text-brand-cyan" />
          <h3 className="font-semibold text-white">Top Target Frequencies</h3>
        </div>
        
        <div className="space-y-4">
          {top_numbers.map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-mono text-neutral-300">{item.number}</span>
                <span className="text-neutral-500">{item.calls} signals</span>
              </div>
              <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-cyan h-full rounded-full transition-all duration-1000"
                  style={{ width: `${(item.calls / maxCalls) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
          {top_numbers.length === 0 && <p className="text-neutral-500 text-sm">No data available</p>}
        </div>
      </div>

      {/* Timeline view */}
      <div className="bg-brand-panel border border-brand-border rounded-xl p-6 flex flex-col h-full max-h-[400px]">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-brand-emerald" />
          <h3 className="font-semibold text-white">Temporal Activity Density</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          {timeline.map((item, i) => {
            const intensityClass = (item.count / maxTimeCount) > 0.7 
              ? "bg-red-500/20 text-red-400 border-red-500/30" 
              : "bg-brand-bg/50 text-neutral-300 border-brand-border";
              
            return (
              <div key={i} className={`p-3 rounded-lg border flex items-center justify-between ${intensityClass}`}>
                 <span className="font-mono text-sm">{item.time}</span>
                 <div className="flex items-center gap-2">
                   <div className="flex gap-0.5">
                     {Array.from({ length: Math.ceil((item.count / maxTimeCount) * 5) }).map((_, idx) => (
                        <span key={idx} className="w-1.5 h-3 bg-current rounded-sm"></span>
                     ))}
                   </div>
                   <span className="w-8 text-right text-xs opacity-70">{item.count}</span>
                 </div>
              </div>
            );
          })}
          {timeline.length === 0 && <p className="text-neutral-500 text-sm">No timeline events detected.</p>}
        </div>
      </div>
    </div>
  );
}
