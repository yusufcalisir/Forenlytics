"use client";

import { Search, Shield, Wifi } from "lucide-react";

export function Topbar() {
  return (
    <header className="h-14 border-b border-brand-border bg-brand-bg/90 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-20 w-full">
      {/* Left: Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-sm w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600" />
          <input 
            type="text" 
            placeholder="Search modules..." 
            className="w-full bg-brand-surface border border-brand-border rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-brand-cyan/30 focus:ring-1 focus:ring-brand-cyan/20 transition-all text-neutral-300 placeholder:text-neutral-600"
          />
        </div>
      </div>
      
      {/* Right: Status indicators */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 text-[11px] text-neutral-500 uppercase tracking-widest">
          <Wifi className="w-3 h-3 text-brand-emerald" />
          <span className="hidden lg:inline">Connected</span>
        </div>
        <div className="h-4 w-px bg-brand-border"></div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <span className="text-xs font-medium text-neutral-400 hidden md:block">Analyst_01</span>
        </div>
      </div>
    </header>
  );
}
