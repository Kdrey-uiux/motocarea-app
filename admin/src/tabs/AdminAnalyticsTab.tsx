import { useMemo } from 'react';
import { AdminTicket } from '../types/admin';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Layers, 
  PieChart
} from 'lucide-react';

interface AdminAnalyticsTabProps {
  tickets: AdminTicket[];
}

export default function AdminAnalyticsTab({ tickets }: AdminAnalyticsTabProps) {
  // Helper to parse currency estimates like "₱500", "₱550 - ₱850"
  const parseCost = (str?: string): number => {
    if (!str) return 500;
    const clean = str.replace(/[^0-9-]/g, '');
    if (clean.includes('-')) {
      const parts = clean.split('-').map(Number);
      return Math.round((parts[0] + parts[1]) / 2) || 500;
    }
    return Number(clean) || 500;
  };

  const metrics = useMemo(() => {
    const completedTickets = tickets.filter((t) => t.status === 'COMPLETED');
    const activeTickets = tickets.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

    const totalRevenue = completedTickets.reduce((sum, t) => sum + parseCost(t.total_estimate), 0);
    const pipelineValue = activeTickets.reduce((sum, t) => sum + parseCost(t.total_estimate), 0);

    const completionRate = tickets.length > 0 ? Math.round((completedTickets.length / tickets.length) * 100) : 0;

    // Service Breakdown
    const serviceMap: Record<string, { count: number; totalCost: number }> = {};
    tickets.forEach((t) => {
      const name = t.service_type || 'Standard PMS';
      if (!serviceMap[name]) {
        serviceMap[name] = { count: 0, totalCost: 0 };
      }
      serviceMap[name].count += 1;
      serviceMap[name].totalCost += parseCost(t.total_estimate);
    });

    // Stage Distribution
    const stages = [1, 2, 3, 4, 5].map((s) => ({
      stage: s,
      count: activeTickets.filter((t) => (t.stage || 1) === s).length,
    }));

    return {
      totalTickets: tickets.length,
      completedCount: completedTickets.length,
      activeCount: activeTickets.length,
      totalRevenue,
      pipelineValue,
      completionRate,
      services: Object.entries(serviceMap).map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.totalCost,
        percentage: Math.round((data.count / (tickets.length || 1)) * 100),
      })),
      stages,
    };
  }, [tickets]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">Workshop Revenue & Operational Analytics</h2>
        </div>
        <p className="text-xs text-slate-500">
          Financial performance, service volume distribution, and stage pipeline tracking for Santa Maria Workshop Hub.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completed Revenue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-semibold">
            <span>Completed Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₱{metrics.totalRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>From {metrics.completedCount} fulfilled workshop orders</span>
          </p>
        </div>

        {/* In-Progress Pipeline */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-semibold">
            <span>Active Pipeline Value</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₱{metrics.pipelineValue.toLocaleString()}
          </div>
          <p className="text-[11px] text-blue-700 mt-1 flex items-center gap-1 font-medium">
            <span>Across {metrics.activeCount} active shop jobs</span>
          </p>
        </div>

        {/* Total Volume */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-semibold">
            <span>Total Tickets Volume</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {metrics.totalTickets}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Registered customer reservations
          </p>
        </div>

        {/* Completion Rate */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-semibold">
            <span>Turnaround Rate</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {metrics.completionRate}%
          </div>
          <p className="text-[11px] text-purple-700 mt-1">
            Fulfilled and released to riders
          </p>
        </div>
      </div>

      {/* Two Column Grid: Services Breakdown & Stage Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Volume Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Service Package Demand</h3>
            </div>
            <span className="text-xs text-slate-400">Share of Bookings</span>
          </div>

          <div className="space-y-3 pt-1">
            {metrics.services.map((svc) => (
              <div key={svc.name} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">{svc.name}</span>
                  <span className="text-blue-700 font-bold">{svc.count} orders ({svc.percentage}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(svc.percentage, 5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stage Pipeline Funnel */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Active Workshop Workflow Funnel</h3>
            </div>
            <span className="text-xs text-slate-400">Live Stages</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {[
              { s: 1, label: 'Stage 1: Intake & Check-in', color: 'bg-amber-500' },
              { s: 2, label: 'Stage 2: Diagnosis & Teardown', color: 'bg-blue-500' },
              { s: 3, label: 'Stage 3: Bay Service & Parts', color: 'bg-purple-500' },
              { s: 4, label: 'Stage 4: QA & Road Test', color: 'bg-cyan-500' },
              { s: 5, label: 'Stage 5: Ready for Release', color: 'bg-emerald-500' },
            ].map((stageInfo) => {
              const count = metrics.stages.find((x) => x.stage === stageInfo.s)?.count || 0;
              const totalActive = Math.max(metrics.activeCount, 1);
              const pct = Math.round((count / totalActive) * 100);

              return (
                <div
                  key={stageInfo.s}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${stageInfo.color}`} />
                    <span className="text-xs font-semibold text-slate-700">{stageInfo.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-900">{count} units</span>
                    <span className="text-[11px] text-slate-500 font-mono w-10 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
