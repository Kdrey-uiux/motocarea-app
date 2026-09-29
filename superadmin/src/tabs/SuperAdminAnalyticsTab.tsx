import React, { useEffect, useState } from 'react';
import { ExecutiveKpiMetrics } from '../types/superadmin';
import { getExecutiveMetrics } from '../utils/superAdminManager';
import {
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  Layers,
  Wrench,
  Bike,
  Activity,
  ArrowUpRight,
} from 'lucide-react';

export const SuperAdminAnalyticsTab: React.FC = () => {
  const [metrics, setMetrics] = useState<ExecutiveKpiMetrics>({
    totalRevenue: 42850,
    completedTicketsCount: 14,
    activeAdminsCount: 2,
    activeStaffCount: 4,
    registeredFleetCount: 38,
    averageTicketValue: 3060,
    bayUtilizationRate: 75,
    totalPendingOrders: 5,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExecutiveMetrics().then((res) => {
      setMetrics(res);
      setLoading(false);
    });
  }, []);

  const bayData = [
    { id: 'bay-1', name: 'Bay 01 (Quick Service)', tech: 'Kuya Jun', status: 'OCCUPIED', utilization: '92%', tickets: 8 },
    { id: 'bay-2', name: 'Bay 02 (Heavy Repairs)', tech: 'Master Leo', status: 'OCCUPIED', utilization: '84%', tickets: 4 },
    { id: 'bay-3', name: 'Bay 03 (CVT & Tuning)', tech: 'Bong CVT', status: 'OCCUPIED', utilization: '78%', tickets: 6 },
    { id: 'bay-4', name: 'Bay 04 (Electrical/QC)', tech: 'Sparky Arnel', status: 'AVAILABLE', utilization: '65%', tickets: 3 },
  ];

  const revenueStreams = [
    { category: 'Periodic Maintenance Service (PMS)', share: '45%', amount: '₱19,280', color: 'bg-amber-400' },
    { category: 'CVT Overhaul & Belt Upgrades', share: '28%', amount: '₱12,000', color: 'bg-emerald-400' },
    { category: 'Brake, Tires & Suspension Overhaul', share: '16%', amount: '₱6,850', color: 'bg-blue-400' },
    { category: 'FI Cleaning & Diagnostic Scans', share: '11%', amount: '₱4,720', color: 'bg-purple-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Executive Business Health & Financial Ledger</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Financial & Workshop Executive Overview
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time business performance across customer bookings, bay utilization, and revenue generation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/60 text-right">
            <p className="text-xs text-slate-400">Target Monthly Gross</p>
            <p className="text-lg font-bold text-emerald-400">₱100,000.00</p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 hover:border-amber-500/40 transition-colors shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Revenue</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3">
            ₱{metrics.totalRevenue.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400 font-medium">
            <ArrowUpRight className="w-4 h-4" />
            <span>+18.4% vs last period</span>
          </div>
        </div>

        {/* Average Ticket Value */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 hover:border-emerald-500/40 transition-colors shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Ticket Size</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3">
            ₱{metrics.averageTicketValue.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{metrics.completedTicketsCount} jobs completed</span>
          </div>
        </div>

        {/* Bay Utilization Rate */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 hover:border-blue-500/40 transition-colors shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bay Utilization</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3">
            {metrics.bayUtilizationRate}%
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-400">
            <Layers className="w-4 h-4" />
            <span>4 Dedicated Lift Bays</span>
          </div>
        </div>

        {/* Active Workforce */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800/80 hover:border-purple-500/40 transition-colors shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Staff & Fleet</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Bike className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-3">
            {metrics.registeredFleetCount} <span className="text-sm font-normal text-slate-400">Bikes</span>
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-purple-400">
            <Wrench className="w-4 h-4" />
            <span>{metrics.activeAdminsCount} Admins · {metrics.activeStaffCount} Technicians</span>
          </div>
        </div>
      </div>

      {/* Detail Section: Bay Productivity & Service Revenue Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bay Productivity */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Lift Bay Productivity</h3>
              <p className="text-xs text-slate-400">Capacity and turnaround per active bay</p>
            </div>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700">
              Bays 01-04 Active
            </span>
          </div>

          <div className="space-y-3.5">
            {bayData.map((bay) => (
              <div
                key={bay.id}
                className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between hover:bg-slate-800/80 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{bay.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        bay.status === 'OCCUPIED'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {bay.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Assigned: {bay.tech}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-amber-400">{bay.utilization}</p>
                  <p className="text-[11px] text-slate-500">{bay.tickets} jobs served</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Streams Mix */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Service Revenue Distribution</h3>
              <p className="text-xs text-slate-400">Top earning workshop service categories</p>
            </div>
            <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
              Gross Margins
            </span>
          </div>

          <div className="space-y-4">
            {revenueStreams.map((stream, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-300">{stream.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{stream.amount}</span>
                    <span className="text-slate-400">({stream.share})</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`${stream.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: stream.share }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-xs text-slate-300">
            <span>Parts to Labor Ratio:</span>
            <span className="font-semibold text-white">62% Parts / 38% Workshop Labor</span>
          </div>
        </div>
      </div>
    </div>
  );
};
