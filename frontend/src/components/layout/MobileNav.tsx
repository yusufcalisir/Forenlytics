"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mic, FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/audio", label: "Audio", icon: Mic },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/methodology", label: "Methodology", icon: ShieldCheck },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-brand-panel/95 backdrop-blur-2xl border-t border-brand-border/80 z-40 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
      <div className="grid grid-cols-4 gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 relative",
                isActive
                  ? "text-brand-cyan bg-brand-cyan/[0.08]"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]"
              )}
            >
              {isActive && (
                <div className="absolute -top-2 w-8 h-1 rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)]" />
              )}
              <Icon className={cn("w-5 h-5 mb-1 transition-transform", isActive ? "scale-110" : "")} />
              <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
