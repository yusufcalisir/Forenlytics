import { DashboardCard } from "@/components/ui/DashboardCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Activity, Map, Mic, FileText, LayoutList, Shield } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hero Header */}
      <SectionHeader 
        title="System Overview" 
        subtitle="Real-time status across all connected forensic modules"
        icon={Shield}
      >
        <div className="px-3 py-1.5 bg-brand-emerald/8 border border-brand-emerald/15 rounded-lg text-brand-emerald text-[11px] flex items-center gap-2 uppercase tracking-widest font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald shadow-[0_0_6px_rgba(0,255,136,0.5)]"></span>
          Operational
        </div>
      </SectionHeader>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <DashboardCard 
          href="/audio"
          title="Audio Analysis" 
          description="Acoustic fingerprinting, speaker verification, and deepfake anomaly detection."
          icon={Mic}
        />
        <DashboardCard 
          href="/hts"
          title="HTS Analyzer" 
          description="Communication graph intelligence, network topology mapping, and cluster detection."
          icon={Activity}
        />
        <DashboardCard 
          href="/gps"
          title="GPS Tracking" 
          description="Spatial movement reconstruction, stop detection, speed anomalies, and teleportation alerts."
          icon={Map}
        />
        <DashboardCard 
          href="/timeline"
          title="Timeline Engine" 
          description="Multi-layer chronological correlation across HTS, GPS, and manual event sources."
          icon={LayoutList}
        />
        <DashboardCard 
          href="/reports"
          title="Intelligence Reports" 
          description="Compile forensic dockets with cross-module correlation data and export as PDF artifacts."
          icon={FileText}
        />
      </div>
    </div>
  );
}
