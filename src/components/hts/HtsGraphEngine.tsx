"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Activity, Users, Zap, Search, Maximize2 } from "lucide-react";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-brand-cyan">
      <Activity className="w-8 h-8 animate-spin mb-4" />
      <span className="font-mono text-sm tracking-widest animate-pulse">RENDERING GRAPH TOPOLOGY...</span>
    </div>
  )
});

export function HtsGraphEngine({ data }: { data: any }) {
  const fgRef = useRef<any>(null);
  const [hoverNode, setHoverNode] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Map API data to ForceGraph format
  const graphData = useMemo(() => {
    return {
      nodes: data.nodes.map((n: any) => ({ ...n, val: Math.max(1, n.metrics.degree * 2) })),
      links: data.edges.map((e: any) => ({ source: e.source, target: e.target, weight: e.weight }))
    };
  }, [data]);

  // Node styling logic
  const getNodeColor = useCallback((node: any) => {
    if (selectedNode && selectedNode.id === node.id) return "#fff";
    if (hoverNode && hoverNode.id === node.id) return "#00f0ff";
    
    // Centrality-based colors
    const c = node.metrics.centrality;
    if (c > 0.05) return "#ef4444"; // Red (Hubs)
    if (c > 0.01) return "#f97316"; // Orange
    return "#3b82f6"; // Blue (Periphery)
  }, [hoverNode, selectedNode]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(8, 2000);
    }
  }, []);

  const resetView = useCallback(() => {
    setSelectedNode(null);
    if (fgRef.current) {
      fgRef.current.zoomToFit(400);
    }
  }, []);

  return (
    <div className="flex h-[800px] w-full gap-4 relative animate-in fade-in duration-500">
      
      {/* Graph Canvas */}
      <div className="flex-1 bg-brand-bg border border-brand-border rounded-xl overflow-hidden relative grid-bg">
        
        {/* Floating Toolbar */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
           <button onClick={resetView} className="p-2 bg-brand-surface hover:bg-brand-cyan/10 border border-brand-border rounded-lg text-neutral-500 hover:text-brand-cyan transition-colors" title="Reset View">
              <Maximize2 className="w-4 h-4" />
           </button>
        </div>

        {/* The Graph */}
        <div className="w-full h-full cursor-move">
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeLabel=""
            nodeColor={getNodeColor}
            nodeRelSize={4}
            linkColor={() => "rgba(255,255,255,0.1)"}
            linkWidth={(link: any) => Math.min(5, Math.max(1, link.weight / 2))}
            onNodeHover={(node) => setHoverNode(node)}
            onNodeClick={handleNodeClick}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
          />
        </div>

        {/* Hover Tooltip (Custom so it looks forensic) */}
        {hoverNode && (
          <div 
            className="absolute z-20 pointer-events-none intel-panel glow-cyan !p-3"
            style={{ 
              top: '20px', 
              left: '20px' 
            }}
          >
            <div className="font-mono text-brand-cyan font-bold text-sm mb-1">{hoverNode.id}</div>
            <div className="text-xs text-neutral-400 grid grid-cols-2 gap-x-4 gap-y-1">
              <span>Degree:</span> <span className="text-white text-right">{hoverNode.metrics.degree}</span>
              <span>Cluster:</span> <span className="text-white text-right">{hoverNode.cluster}</span>
              <span>Centrality:</span> <span className="text-white text-right">{(hoverNode.metrics.centrality).toFixed(3)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Intelligence Side Panel */}
      <div className="w-80 flex flex-col gap-4">
        
        {/* Network Metrics */}
        <div className="intel-panel p-5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 uppercase tracking-widest border-b border-brand-border/50 pb-2">
             <Activity className="w-4 h-4 text-brand-cyan" /> Network Topology
          </h3>
          <div className="space-y-3 font-mono text-xs">
             <div className="flex justify-between">
                <span className="text-neutral-500">Nodes</span>
                <span className="text-white">{data.nodes.length}</span>
             </div>
             <div className="flex justify-between">
                <span className="text-neutral-500">Edges</span>
                <span className="text-white">{data.edges.length}</span>
             </div>
             <div className="flex justify-between">
                <span className="text-neutral-500">Density</span>
                <span className="text-white">{data.graph_metrics.density.toFixed(4)}</span>
             </div>
             <div className="flex justify-between">
                <span className="text-neutral-500">Avg Degree</span>
                <span className="text-white">{data.graph_metrics.avg_degree.toFixed(2)}</span>
             </div>
          </div>
        </div>

        {/* Insights */}
        <div className="intel-panel p-5">
          <h3 className="text-sm font-semibold text-brand-emerald flex items-center gap-2 mb-4 uppercase tracking-widest border-b border-brand-border/50 pb-2">
             <Zap className="w-4 h-4" /> AI Insights
          </h3>
          <div className="space-y-4 text-sm">
             <div>
                <span className="text-neutral-500 block text-xs uppercase tracking-wider mb-1">Primary Hub Node</span>
                <span className="font-mono text-sm text-brand-emerald bg-brand-emerald/8 px-2 py-1 rounded-lg inline-block border border-brand-emerald/15">
                   {data.insights.hub}
                </span>
             </div>
             <div>
                <span className="text-neutral-500 block text-xs uppercase tracking-wider mb-1">Community Clusters</span>
                <span className="text-white font-mono">
                   {data.insights.total_clusters} <span className="text-neutral-500 font-sans text-xs">(Largest: {data.insights.largest_cluster_size} nodes)</span>
                </span>
             </div>
          </div>
        </div>

        {/* Selected Node Details */}
        {selectedNode ? (
          <div className="intel-panel glow-cyan p-5 flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 uppercase tracking-widest border-b border-brand-cyan/20 pb-2">
               <Search className="w-4 h-4 text-brand-cyan" /> Node Inspection
            </h3>
            <div className="mb-4">
               <span className="font-mono text-xl text-brand-cyan block">{selectedNode.id}</span>
               <span className="text-xs text-neutral-500">Cluster {selectedNode.cluster}</span>
            </div>
            
            <div className="space-y-2 font-mono text-xs">
               <div className="flex justify-between p-2.5 bg-brand-surface rounded-lg border border-brand-border">
                 <span className="text-neutral-400">Total Connections</span>
                 <span className="text-white">{selectedNode.metrics.degree}</span>
               </div>
               <div className="flex justify-between p-2.5 bg-brand-surface rounded-lg border border-brand-border">
                 <span className="text-neutral-400">Inbound Calls</span>
                 <span className="text-white">{selectedNode.metrics.in_degree}</span>
               </div>
               <div className="flex justify-between p-2.5 bg-brand-surface rounded-lg border border-brand-border">
                 <span className="text-neutral-400">Outbound Calls</span>
                 <span className="text-white">{selectedNode.metrics.out_degree}</span>
               </div>
               <div className="flex justify-between p-2.5 bg-brand-surface rounded-lg border border-brand-border">
                 <span className="text-neutral-400">Centrality Score</span>
                 <span className="text-brand-cyan">{(selectedNode.metrics.centrality).toFixed(4)}</span>
               </div>
            </div>
          </div>
        ) : (
          <div className="intel-panel !bg-brand-panel/50 p-5 flex flex-col items-center justify-center text-center flex-1">
             <Users className="w-8 h-8 text-neutral-600 mb-2" />
             <p className="text-sm text-neutral-500">Select a node in the graph to view communication profile.</p>
          </div>
        )}

      </div>
    </div>
  );
}
