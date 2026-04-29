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
    <div className={cn("flex items-start justify-between gap-4 mb-8", className)}>
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-brand-cyan/8 border border-brand-cyan/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-brand-cyan" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white leading-tight">{title}</h2>
          {subtitle && <p className="text-[13px] text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
    </div>
  );
}
