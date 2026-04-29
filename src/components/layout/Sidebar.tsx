"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Map, Mic, FileText, LayoutDashboard, LayoutList, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, shortLabel: "DASH" },
  { href: "/audio", label: "Audio Analysis", icon: Mic, shortLabel: "AUD" },
  { href: "/hts", label: "HTS Analyzer", icon: Activity, shortLabel: "HTS" },
  { href: "/gps", label: "GPS Tracking", icon: Map, shortLabel: "GPS" },
  { href: "/timeline", label: "Timeline", icon: LayoutList, shortLabel: "TML" },
  { href: "/reports", label: "Reports", icon: FileText, shortLabel: "RPT" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-[72px] hover:w-64 group/sidebar bg-brand-panel border-r border-brand-border h-screen flex-col transition-all duration-300 ease-out z-30 overflow-hidden">
      
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-brand-border/60">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-cyan/20 to-brand-cyan/5 border border-brand-cyan/20 flex items-center justify-center shrink-0">
            <span className="text-brand-cyan font-bold text-sm tracking-tighter">F</span>
          </div>
          <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            <h1 className="text-sm font-bold tracking-[0.2em] text-brand-cyan leading-none">FORENLYTICS</h1>
            <p className="text-[10px] text-neutral-600 mt-1 uppercase tracking-widest">Command Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 flex flex-col gap-1 custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group/link overflow-hidden",
                isActive
                  ? "bg-brand-cyan/8 text-brand-cyan nav-glow"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                isActive
                  ? "bg-brand-cyan/10"
                  : "bg-transparent group-hover/link:bg-white/[0.04]"
              )}>
                <Icon className={cn("w-[18px] h-[18px] transition-colors", isActive ? "text-brand-cyan" : "text-neutral-500 group-hover/link:text-neutral-300")} />
              </div>
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap text-[13px]">
                {item.label}
              </span>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover/sidebar:opacity-60 transition-opacity text-brand-cyan shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Status */}
      <div className="px-3 py-4 border-t border-brand-border/60">
        <div className="flex items-center gap-3 px-3">
          <div className="w-2 h-2 rounded-full bg-brand-emerald shadow-[0_0_8px_rgba(0,255,136,0.5)] shrink-0"></div>
          <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap text-[11px] text-neutral-500 uppercase tracking-widest">
            System Online
          </span>
        </div>
      </div>
    </aside>
  );
}
