"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { JobPoller } from "./JobPoller";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-brand-bg text-neutral-100 overflow-hidden">
      {/* Mobile top branding */}
      <div className="md:hidden fixed top-0 inset-x-0 flex items-center justify-between px-5 py-3 border-b border-brand-border bg-brand-panel/95 backdrop-blur-xl z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-cyan/20 to-brand-cyan/5 border border-brand-cyan/20 flex items-center justify-center">
            <span className="text-brand-cyan font-bold text-xs">F</span>
          </div>
          <h1 className="text-sm font-bold tracking-[0.15em] text-brand-cyan">FORENLYTICS</h1>
        </div>
      </div>
      
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-noise">
          <div className="p-5 md:p-8 max-w-[1400px] mx-auto w-full mt-[52px] md:mt-0">
            <JobPoller />
            <ErrorBoundary moduleName="Active Module">
              {children}
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}
