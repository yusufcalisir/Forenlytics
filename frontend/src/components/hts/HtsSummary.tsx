import { Activity, Users, PhoneCall, TrendingUp } from "lucide-react";

interface SummaryProps {
  data: {
    total_calls: number;
    unique_numbers: number;
    top_pair: { source: string; target: string; weight: number };
  };
}

export function HtsSummary({ data }: SummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="p-6 rounded-xl border border-brand-border bg-brand-panel glow-panel">
        <div className="flex items-center gap-3 text-neutral-400 mb-2">
          <Activity className="w-4 h-4 text-brand-cyan" />
          <span className="text-sm font-medium">Total Signals (Calls)</span>
        </div>
        <p className="text-3xl font-bold text-white tracking-tight">{data.total_calls.toLocaleString()}</p>
      </div>
      
      <div className="p-6 rounded-xl border border-brand-border bg-brand-panel glow-panel">
        <div className="flex items-center gap-3 text-neutral-400 mb-2">
          <Users className="w-4 h-4 text-brand-emerald" />
          <span className="text-sm font-medium">Unique Entities</span>
        </div>
        <p className="text-3xl font-bold text-white tracking-tight">{data.unique_numbers.toLocaleString()}</p>
      </div>

      <div className="p-6 rounded-xl border border-brand-border bg-brand-panel glow-panel col-span-1 lg:col-span-2">
        <div className="flex items-center gap-3 text-neutral-400 mb-2">
          <TrendingUp className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium">Most Active Connection Vector</span>
        </div>
        
        {data.top_pair && data.top_pair.source !== "N/A" ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
             <div className="px-3 py-1.5 bg-neutral-900 rounded border border-neutral-800 text-brand-cyan font-mono text-sm">
                {data.top_pair.source}
             </div>
             <div className="text-neutral-500 hidden sm:block">
               <PhoneCall className="w-4 h-4" />
             </div>
             <div className="text-neutral-500 sm:hidden">↓</div>
             <div className="px-3 py-1.5 bg-neutral-900 rounded border border-neutral-800 text-brand-cyan font-mono text-sm">
                {data.top_pair.target}
             </div>
             <div className="sm:ml-auto px-2 py-1 bg-brand-emerald/10 text-brand-emerald rounded text-xs border border-brand-emerald/20">
               {data.top_pair.weight} Interactions
             </div>
          </div>
        ) : (
          <p className="text-neutral-500 mt-2 text-sm">No vector pairs identified.</p>
        )}
      </div>
    </div>
  );
}
