import Link from "next/link";
import { LucideIcon, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  className?: string;
  accentColor?: string;
}

export function DashboardCard({ title, description, icon: Icon, href, className, accentColor = "brand-cyan" }: DashboardCardProps) {
  const content = (
    <div className={cn(
      "intel-panel p-6 flex flex-col h-full group/card cursor-pointer",
      className
    )}>
      {/* Top row: icon + arrow */}
      <div className="flex items-start justify-between mb-5">
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300",
          `bg-${accentColor}/8 group-hover/card:bg-${accentColor}/15`
        )}
          style={{
            backgroundColor: `color-mix(in srgb, var(--color-${accentColor}) 8%, transparent)`,
          }}
        >
          <Icon className="w-5 h-5 text-brand-cyan transition-transform duration-300 group-hover/card:scale-110" />
        </div>
        {href && (
          <ArrowUpRight className="w-4 h-4 text-neutral-700 group-hover/card:text-brand-cyan group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5 transition-all duration-200" />
        )}
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-neutral-100 mb-2 tracking-tight group-hover/card:text-white transition-colors">{title}</h3>
      
      {/* Description */}
      <p className="text-[13px] text-neutral-500 leading-relaxed flex-1">{description}</p>

      {/* Bottom accent line */}
      <div className="mt-5 h-px w-full bg-gradient-to-r from-brand-cyan/20 via-brand-cyan/5 to-transparent"></div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
