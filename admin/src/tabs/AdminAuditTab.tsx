import { useState, useEffect, useMemo } from 'react';
import { getAuditLogs } from '../utils/auditLogger';
import { AuditLogEntry } from '../types/admin';
import { 
  ShieldCheck, 
  Search, 
  Download, 
  RefreshCw, 
  ArrowRight, 
  Clock, 
  Lock
} from 'lucide-react';

export default function AdminAuditTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const loadLogs = () => {
    setLogs(getAuditLogs());
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Ticket Code', 'Action', 'Actor', 'Details', 'Previous Value', 'New Value'];
    const rows = logs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.ticketCode}"`,
      `"${l.action}"`,
      `"${l.actor}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${(l.previousValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `motocare_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          log.ticketCode?.toLowerCase().includes(query) ||
          log.actor?.toLowerCase().includes(query) ||
          log.details?.toLowerCase().includes(query) ||
          log.action?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [logs, actionFilter, searchQuery]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'STAGE_CHANGE':
        return { label: 'Stage Progression', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'BAY_ASSIGNMENT':
        return { label: 'Bay Assignment', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'MECHANIC_ASSIGNMENT':
        return { label: 'Mechanic Assigned', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'TICKET_COMPLETED':
        return { label: 'Job Completed', color: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'TICKET_DISPATCHED':
        return { label: 'Intake Dispatched', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'STATUS_CHANGE':
        return { label: 'Status Update', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'TICKET_CANCELLED':
        return { label: 'Ticket Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: action, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">Workshop Operations Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-500">
            Immutable tracking of ticket dispatching, stage advancements, bay relocations, and mechanic assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadLogs}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Immutable (Append-Only)</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by ticket code, mechanic, advisor, or action details..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-xs">
          {['ALL', 'STAGE_CHANGE', 'BAY_ASSIGNMENT', 'MECHANIC_ASSIGNMENT', 'TICKET_COMPLETED'].map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => setActionFilter(action)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                actionFilter === action
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {action === 'ALL' ? 'All Events' : action.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Change History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    Walang audit records na tumutugma sa filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const formattedTime = new Date(log.timestamp).toLocaleString('en-PH', {
                    dateStyle: 'short',
                    timeStyle: 'medium',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formattedTime}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        #{log.ticketCode}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {log.actor}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                        {log.details}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.previousValue || log.newValue ? (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-slate-400 line-through">
                              {log.previousValue || 'N/A'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="text-emerald-700 font-semibold">
                              {log.newValue}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
