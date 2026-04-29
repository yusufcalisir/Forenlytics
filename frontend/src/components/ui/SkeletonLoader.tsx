import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
}

export function SkeletonLoader({ className }: SkeletonLoaderProps) {
  return (
    <div className={cn("animate-pulse bg-brand-border/50 rounded-md", className)} />
  );
}

export function ModuleSkeleton() {
  return (
    <div className="space-y-6 w-full mt-6">
      <SkeletonLoader className="h-8 w-1/3 md:w-1/4 lg:w-1/6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkeletonLoader className="h-32 w-full rounded-xl" />
        <SkeletonLoader className="h-32 w-full rounded-xl" />
        <SkeletonLoader className="h-32 w-full rounded-xl" />
      </div>
      <SkeletonLoader className="h-96 w-full rounded-xl" />
    </div>
  );
}
