import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
  children?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, icon: Icon, className, children }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8", className)}>
      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
        {Icon && (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-cyan/8 border border-brand-cyan/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-brand-cyan" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white leading-tight truncate">{title}</h2>
          {subtitle && <p className="text-xs sm:text-[13px] text-neutral-500 mt-0.5 line-clamp-2">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-start sm:self-auto">{children}</div>}
    </div>
  );
}
