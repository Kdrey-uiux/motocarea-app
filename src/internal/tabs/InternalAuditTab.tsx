import { useState, useMemo, useEffect, useCallback } from 'react';
import { UserRole, AuditLogEntry } from '../types/internal';
import { canViewAuditLogs } from '../utils/permissions';
import { fetchDatabaseAuditLogs } from '../utils/databaseAuditLogger';
import { 
  Download, 
  Search, 
  ShieldAlert, 
  RefreshCw 
} from '../../components/icons';
import { toast } from '../utils/toast';

interface InternalAuditTabProps {
  currentRole: UserRole;
}

type AuditDateFilter = 'ALL' | 'TODAY' | 'YESTERDAY' | 'PAST_7_DAYS' | 'THIS_MONTH';

export default function InternalAuditTab({ currentRole }: InternalAuditTabProps) {
  // Permission Guard: Shop Owner Only
  if (!canViewAuditLogs(currentRole)) {
    return (
      <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-base text-slate-900">403 Forbidden: System Audit Restricted</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          System audit trails and cross-device floor action history are restricted to the Shop Owner (Admin).
        </p>
      </div>
    );
  }

  return <AuditTrail />;
}

function AuditTrail() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<AuditDateFilter>('ALL');
  const [actorFilter, setActorFilter] = useState<string>('ALL');

  // The spinner starts on (initial load) or from the Refresh button
  const loadLogs = useCallback(() => {
    return fetchDatabaseAuditLogs().then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, []);
  const refreshLogs = () => {
    setLoading(true);
    loadLogs();
  };

  useEffect(() => {
    loadLogs();
    window.addEventListener('motocare_audit_updated', loadLogs);
    return () => window.removeEventListener('motocare_audit_updated', loadLogs);
  }, [loadLogs]);

  // Distinct Staff Actors
  const uniqueActors = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.actor && l.actor.trim()) set.add(l.actor.trim());
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filtering
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();

    return logs.filter((log) => {
      // Date filter
      const logDate = new Date(log.timestamp);
      if (dateFilter === 'TODAY' && logDate.toDateString() !== todayStr) return false;
      if (dateFilter === 'YESTERDAY') {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        if (logDate.toDateString() !== yest.toDateString()) return false;
      }
      if (dateFilter === 'PAST_7_DAYS') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (logDate < weekAgo) return false;
      }
      if (dateFilter === 'THIS_MONTH') {
        if (
          logDate.getFullYear() !== now.getFullYear() ||
          logDate.getMonth() !== now.getMonth()
        ) {
          return false;
        }
      }

      // Staff Actor filter
      if (actorFilter !== 'ALL' && log.actor.trim() !== actorFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          log.ticketCode.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.actor.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          (log.previousValue && log.previousValue.toLowerCase().includes(q)) ||
          (log.newValue && log.newValue.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [logs, dateFilter, actorFilter, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.info('No audit logs available to export.');
      return;
    }

    const headers = ['Timestamp', 'Staff Actor', 'Action', 'Ticket #', 'Old Value', 'New Value', 'Details'];
    const rows = filteredLogs.map((l) => [
      `"${new Date(l.timestamp).toLocaleString('en-US')}"`,
      `"${l.actor.replace(/"/g, '""')}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"#${l.ticketCode}"`,
      `"${(l.previousValue || '-').replace(/"/g, '""')}"`,
      `"${(l.newValue || '-').replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MotoCare_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-end gap-2 px-1">

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshLogs}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Refresh database logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by action, actor, ticket #, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-orange-500 transition font-medium"
            />
          </div>

          {/* Date Range Filter */}
          <div className="sm:col-span-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as AuditDateFilter)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today Only</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="PAST_7_DAYS">Past 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
            </select>
          </div>

          {/* Staff Member Filter */}
          <div className="sm:col-span-3">
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium"
            >
              <option value="ALL">All Staff Members</option>
              {uniqueActors.map((actor, idx) => (
                <option key={idx} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>Showing {filteredLogs.length} of {logs.length} audit trail records</span>
          {actorFilter !== 'ALL' && (
            <span className="font-semibold text-orange-600">Filtered by: {actorFilter}</span>
          )}
        </div>
      </div>

      {/* Structured Audit Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Staff Actor</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Ticket #</th>
                <th className="p-3.5">Old Value</th>
                <th className="p-3.5">New Value</th>
                <th className="p-3.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isStage = log.action.includes('STAGE');
                  const isPayment = log.action.includes('PAYMENT');
                  const isCancel = log.action.includes('CANCEL');
                  const isStaff = log.action.includes('STAFF');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {log.actor}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCancel
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : isPayment
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isStage
                              ? 'bg-orange-50 text-orange-800 border border-orange-200'
                              : isStaff
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono font-bold text-orange-600 whitespace-nowrap">
                        {log.ticketCode ? `#${log.ticketCode}` : '-'}
                      </td>

                      <td className="p-3.5 text-slate-500 text-[11px]">
                        {log.previousValue || '-'}
                      </td>

                      <td className="p-3.5 font-bold text-slate-900 text-[11px]">
                        {log.newValue || '-'}
                      </td>

                      <td className="p-3.5 text-slate-600 text-[11px] max-w-xs truncate">
                        {log.details}
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
