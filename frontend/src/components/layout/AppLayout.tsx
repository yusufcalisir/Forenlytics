"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { JobPoller } from "./JobPoller";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-brand-bg text-neutral-100 overflow-hidden">
      {/* Mobile top branding */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 flex items-center justify-between px-4 sm:px-5 border-b border-brand-border/80 bg-brand-panel/95 backdrop-blur-xl z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-cyan/20 to-brand-cyan/5 border border-brand-cyan/30 flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.2)]">
            <span className="text-brand-cyan font-bold text-xs">F</span>
          </div>
          <div>
            <h1 className="text-xs font-bold tracking-[0.18em] text-brand-cyan leading-tight">FORENLYTICS</h1>
            <p className="text-[9px] text-neutral-500 uppercase tracking-widest leading-none">Audio Forensics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-surface/80 border border-brand-border text-[10px] text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse"></span>
          <span>Online</span>
        </div>
      </div>
      
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-noise">
          <div className="p-3.5 sm:p-5 md:p-8 max-w-[1400px] mx-auto w-full pt-16 pb-24 md:pt-0 md:pb-8">
            <JobPoller />
            <ErrorBoundary moduleName="Active Module">
              {children}
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Mobile bottom navigation bar */}
      <MobileNav />
    </div>
  );
}

