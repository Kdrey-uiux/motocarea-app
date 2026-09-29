import React, { useState } from 'react';
import { AuditLogEntry } from '../types/superadmin';
import { getAuditLogs } from '../utils/auditLogger';
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  ShieldAlert,
  Clock,
  User,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const SuperAdminAuditTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => getAuditLogs());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const handleRefresh = () => {
    setLogs(getAuditLogs());
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.ticketCode.toLowerCase().includes(search.toLowerCase()) ||
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (categoryFilter === 'ADMIN_ONLY') {
      return log.action.includes('ADMIN');
    }
    if (categoryFilter === 'STAFF_ONLY') {
      return log.action.includes('STAFF');
    }
    if (categoryFilter === 'OPERATIONS') {
      return !log.action.includes('ADMIN') && !log.action.includes('STAFF');
    }
    return true;
  });

  const exportAsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `motocare_master_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ClipboardList className="w-4 h-4" />
            <span>Executive Governance & Compliance</span>
          </div>
          <h2 className="text-2xl font-black text-white">Master Security Audit Trail</h2>
          <p className="text-sm text-slate-400">
            Immutable tracking ng lahat ng mga pagbabago, dispatch, paglikha ng accounts, at ticket lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>I-refresh</span>
          </button>
          <button
            onClick={exportAsJSON}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit Ledger</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hanapin sa ticket, actor, o action..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 whitespace-nowrap mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: 'ALL', label: 'Lahat ng Logs' },
            { id: 'ADMIN_ONLY', label: 'Admin Governance' },
            { id: 'STAFF_ONLY', label: 'Staff Management' },
            { id: 'OPERATIONS', label: 'Workshop Operations' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log Feed */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center text-xs text-slate-400">
          <span>
            Ipinapakita: <strong className="text-white">{filteredLogs.length}</strong> entries
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Audit Logging Active
          </span>
        </div>

        <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Walang tala sa audit log na tumutugma sa filter.
            </div>
          ) : (
            filteredLogs.map((entry) => (
              <div key={entry.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400 font-mono text-xs font-bold border border-slate-700">
                      {entry.ticketCode}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        entry.action.includes('ADMIN')
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : entry.action.includes('STAFF')
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      {entry.action}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-200 mt-2 font-medium leading-relaxed">
                  {entry.details}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pt-2 border-t border-slate-800/60 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Actor:</span>
                    <strong className="text-slate-300">{entry.actor}</strong>
                  </div>

                  {(entry.previousValue || entry.newValue) && (
                    <div className="flex items-center gap-2 text-[11px] font-mono bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800">
                      <span className="text-rose-400 line-through">
                        {entry.previousValue || 'N/A'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                      <span className="text-emerald-400 font-bold">
                        {entry.newValue || 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
