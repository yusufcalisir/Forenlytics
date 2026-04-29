import { useState } from "react";
import { Database } from "lucide-react";

interface DataTableProps {
  rows: any[];
}

export function HtsDataTable({ rows }: DataTableProps) {
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  
  if (!rows || rows.length === 0) {
    return null;
  }

  const columns = Object.keys(rows[0]);
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  
  const currentRows = rows.slice(
    (page - 1) * rowsPerPage, 
    page * rowsPerPage
  );

  return (
    <div className="bg-brand-panel border border-brand-border rounded-xl mt-6 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-bg/50">
         <div className="flex items-center gap-2 text-white">
           <Database className="w-4 h-4 text-brand-cyan" />
           <span className="font-medium text-sm">Raw Telemetry Log</span>
         </div>
         <span className="text-xs text-neutral-500">Showing latest 100 rows</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-400">
          <thead className="text-neutral-300 bg-neutral-900 border-b border-brand-border">
            <tr>
              {columns.map(c => (
                <th key={c} className="px-4 py-3 font-medium capitalize">{c.replace(/_/g, ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, i) => (
              <tr key={i} className="border-b border-brand-border/50 hover:bg-white/5 transition-colors">
                {columns.map(c => (
                  <td key={c} className="px-4 py-3 font-mono text-xs max-w-[200px] truncate">
                     {String(row[c] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="p-4 border-t border-brand-border flex items-center justify-between text-sm">
          <span className="text-neutral-500">
            Page <span className="text-white">{page}</span> of {totalPages}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-neutral-900 border border-brand-border text-neutral-300 disabled:opacity-50 hover:bg-neutral-800 transition-colors"
            >
              Prev
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded bg-neutral-900 border border-brand-border text-neutral-300 disabled:opacity-50 hover:bg-neutral-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
