interface FilterProps {
  filters: { HTS: boolean, GPS: boolean, EVT: boolean };
  setFilters: (f: any) => void;
  metrics: { hts: number, gps: number, total: number };
}

export function TimelineFilterPanel({ filters, setFilters, metrics }: FilterProps) {
  const toggle = (key: keyof typeof filters) => {
    setFilters({ ...filters, [key]: !filters[key] });
  };

  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 glow-panel">
      <div className="text-sm text-center md:text-left w-full md:w-auto border-b md:border-b-0 border-brand-border pb-4 md:pb-0">
        <span className="text-white font-medium block">Correlation Engine Active</span>
        <p className="text-neutral-500 text-xs mt-1">Total synchronized elements: {metrics.total}</p>
      </div>
      
      <div className="flex flex-wrap justify-center items-center gap-3">
        <button 
          onClick={() => toggle('HTS')}
          className={`px-4 py-2 rounded-md text-xs font-mono border transition-all ${filters.HTS ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'bg-transparent border-brand-border hover:border-neutral-700 text-neutral-500'}`}
        >
          SIGINT [{metrics.hts}]
        </button>
        <button 
          onClick={() => toggle('GPS')}
          className={`px-4 py-2 rounded-md text-xs font-mono border transition-all ${filters.GPS ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-transparent border-brand-border hover:border-neutral-700 text-neutral-500'}`}
        >
          GEOINT [{metrics.gps}]
        </button>
        <button 
          onClick={() => toggle('EVT')}
          className={`px-4 py-2 rounded-md text-xs font-mono border transition-all ${filters.EVT ? 'bg-yellow-500/15 border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-transparent border-brand-border hover:border-neutral-700 text-neutral-500'}`}
        >
          EVENTS
        </button>
      </div>
    </div>
  );
}
