import { useState, useMemo } from 'react';
import { InternalTicket, UserRole } from '../types/internal';
import { canViewFinancialRevenue } from '../utils/permissions';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  Layers, 
  ShieldAlert, 
  Banknote, 
  QrCode, 
  CreditCard, 
  Calendar, 
  Users, 
  Wrench 
} from 'lucide-react';

interface InternalAnalyticsTabProps {
  tickets: InternalTicket[];
  currentRole: UserRole;
}

type AnalyticsDateRange = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

export default function InternalAnalyticsTab({
  tickets,
  currentRole,
}: InternalAnalyticsTabProps) {
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('THIS_WEEK');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Strict Permission Guard: Restricted to Shop Owner (Admin)
  if (!canViewFinancialRevenue(currentRole)) {
    return (
      <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-base text-slate-900">403 Forbidden: Restricted Financial Analytics</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Financial revenue analytics and mechanic commission tracking are exclusively restricted to the Shop Owner (Admin).
        </p>
      </div>
    );
  }

  // Filter completed/paid tickets within selected date range
  const filteredCompletedTickets = useMemo(() => {
    const completed = tickets.filter(
      (t) => t.status === 'COMPLETED' || t.payment_status === 'PAID'
    );

    const now = new Date();
    const todayStr = now.toDateString();

    return completed.filter((t) => {
      const ticketDate = new Date(t.paid_at || t.updated_at || t.created_at);

      if (dateRange === 'TODAY') {
        return ticketDate.toDateString() === todayStr;
      }

      if (dateRange === 'YESTERDAY') {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        return ticketDate.toDateString() === yest.toDateString();
      }

      if (dateRange === 'THIS_WEEK') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return ticketDate >= weekAgo;
      }

      if (dateRange === 'THIS_MONTH') {
        return (
          ticketDate.getFullYear() === now.getFullYear() &&
          ticketDate.getMonth() === now.getMonth()
        );
      }

      if (dateRange === 'CUSTOM' && customStartDate) {
        const start = new Date(customStartDate);
        const end = customEndDate ? new Date(customEndDate) : new Date();
        end.setHours(23, 59, 59, 999);
        return ticketDate >= start && ticketDate <= end;
      }

      return true;
    });
  }, [tickets, dateRange, customStartDate, customEndDate]);

  // Aggregated Analytics
  const analytics = useMemo(() => {
    const totalRevenue = filteredCompletedTickets.reduce(
      (sum, t) => sum + (t.total_amount || 0),
      0
    );
    const partsRevenue = filteredCompletedTickets.reduce(
      (sum, t) => sum + (t.parts_cost || 0),
      0
    );
    const laborRevenue = filteredCompletedTickets.reduce(
      (sum, t) => sum + (t.labor_cost || 0),
      0
    );
    const discountRevenue = filteredCompletedTickets.reduce(
      (sum, t) => sum + (t.discount_amount || 0),
      0
    );

    const cashTotal = filteredCompletedTickets
      .filter((t) => t.payment_method === 'CASH' || !t.payment_method)
      .reduce((sum, t) => sum + (t.total_amount || 0), 0);

    const gcashTotal = filteredCompletedTickets
      .filter((t) => t.payment_method === 'GCASH')
      .reduce((sum, t) => sum + (t.total_amount || 0), 0);

    const mayaTotal = filteredCompletedTickets
      .filter((t) => t.payment_method === 'MAYA')
      .reduce((sum, t) => sum + (t.total_amount || 0), 0);

    // Mechanic Labor & Performance Breakdown
    const mechanicMap: Record<
      string,
      { count: number; laborTotal: number; partsTotal: number; grossTotal: number }
    > = {};

    filteredCompletedTickets.forEach((t) => {
      const tech = t.assigned_mechanic || 'Unassigned Intake';
      if (!mechanicMap[tech]) {
        mechanicMap[tech] = { count: 0, laborTotal: 0, partsTotal: 0, grossTotal: 0 };
      }
      mechanicMap[tech].count += 1;
      mechanicMap[tech].laborTotal += t.labor_cost || 0;
      mechanicMap[tech].partsTotal += t.parts_cost || 0;
      mechanicMap[tech].grossTotal += t.total_amount || 0;
    });

    const mechanicBreakdown = Object.entries(mechanicMap).map(([name, data]) => ({
      name,
      ...data,
      // 40% standard workshop labor commission simulation
      estimatedCommission: Math.round(data.laborTotal * 0.4),
    }));

    // Daily Sales Chart Data (Past 7 Days)
    const last7Days: { label: string; dateStr: string; amount: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toDateString();
      const dayTickets = tickets.filter(
        (t) =>
          (t.status === 'COMPLETED' || t.payment_status === 'PAID') &&
          new Date(t.paid_at || t.updated_at || t.created_at).toDateString() === dStr
      );
      const amount = dayTickets.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      last7Days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount,
        count: dayTickets.length,
      });
    }

    const maxDayAmount = Math.max(...last7Days.map((d) => d.amount), 1000);

    return {
      completedCount: filteredCompletedTickets.length,
      totalRevenue,
      partsRevenue,
      laborRevenue,
      discountRevenue,
      cashTotal,
      gcashTotal,
      mayaTotal,
      mechanicBreakdown,
      last7Days,
      maxDayAmount,
    };
  }, [filteredCompletedTickets, tickets]);

  return (
    <div className="space-y-6">
      {/* Top Banner and Date Range Filter */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Workshop Financial Revenue & Performance Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Realized cash collections, technician commission tracking, and gross sales reporting.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs">
          {[
            { id: 'TODAY' as AnalyticsDateRange, label: 'Today' },
            { id: 'YESTERDAY' as AnalyticsDateRange, label: 'Yesterday' },
            { id: 'THIS_WEEK' as AnalyticsDateRange, label: 'This Week' },
            { id: 'THIS_MONTH' as AnalyticsDateRange, label: 'This Month' },
            { id: 'CUSTOM' as AnalyticsDateRange, label: 'Custom' },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setDateRange(r.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                dateRange === r.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Inputs if Custom is selected */}
      {dateRange === 'CUSTOM' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-700">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
            />
          </div>
        </div>
      )}

      {/* Revenue KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Realized Revenue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Realized Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 block">
            ₱{analytics.totalRevenue.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-700 font-bold block pt-1">
            ✓ Strictly paid & released tickets ({analytics.completedCount} orders)
          </span>
        </div>

        {/* Labor Revenue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Labor Service Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black font-mono text-blue-700 block">
            ₱{analytics.laborRevenue.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block pt-1">
            Pure workmanship earnings
          </span>
        </div>

        {/* Parts & Consumables Revenue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Parts & Lube Gross</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black font-mono text-purple-700 block">
            ₱{analytics.partsRevenue.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block pt-1">
            Replaced components & fluids
          </span>
        </div>

        {/* Settlements Mix */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2">
          <span className="text-xs font-semibold text-slate-500 block">
            Payment Method Mix
          </span>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="flex items-center gap-1 text-slate-600">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Cash:
              </span>
              <span className="font-mono font-bold text-slate-900">₱{analytics.cashTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1 text-slate-600">
                <QrCode className="w-3.5 h-3.5 text-blue-600" /> GCash:
              </span>
              <span className="font-mono font-bold text-slate-900">₱{analytics.gcashTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1 text-slate-600">
                <CreditCard className="w-3.5 h-3.5 text-purple-600" /> Maya:
              </span>
              <span className="font-mono font-bold text-slate-900">₱{analytics.mayaTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Daily Sales Bar Chart (Past 7 Days Trend) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Daily Realized Sales Trend (Past 7 Days)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Total completed volume per day
          </span>
        </div>

        {/* CSS/SVG Responsive Bar Chart */}
        <div className="h-48 pt-6 flex items-end justify-between gap-2 sm:gap-4 border-b border-slate-100">
          {analytics.last7Days.map((day, idx) => {
            const heightPercent = Math.max(
              8,
              Math.round((day.amount / analytics.maxDayAmount) * 100)
            );

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-mono font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  ₱{day.amount.toLocaleString()}
                </div>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full max-w-[48px] rounded-t-xl transition-all duration-300 relative ${
                    day.amount > 0
                      ? 'bg-orange-500 group-hover:bg-orange-600 shadow-xs'
                      : 'bg-slate-100'
                  }`}
                />
                <div className="text-center pt-1">
                  <span className="text-[11px] font-bold text-slate-700 block">{day.label}</span>
                  <span className="text-[9px] text-slate-400 block">{day.dateStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mechanic Labor & Performance Breakdown (Payroll & Commission) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Mechanic Labor & Performance Breakdown (Commission Tracker)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Simulated 40% technician commission share on labor
          </span>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Technician / Specialist</th>
                <th className="p-3 text-center">Completed Work Orders</th>
                <th className="p-3 text-right">Labor Generated</th>
                <th className="p-3 text-right">Parts Replaced</th>
                <th className="p-3 text-right">Total Gross</th>
                <th className="p-3 text-right text-emerald-800">Est. Commission (40%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.mechanicBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                    No completed work orders logged in this date range.
                  </td>
                </tr>
              ) : (
                analytics.mechanicBreakdown.map((tech, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-900">{tech.name}</td>
                    <td className="p-3 text-center font-semibold text-slate-700">{tech.count} visits</td>
                    <td className="p-3 text-right font-mono font-medium text-blue-700">
                      ₱{tech.laborTotal.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      ₱{tech.partsTotal.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      ₱{tech.grossTotal.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-emerald-700">
                      ₱{tech.estimatedCommission.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
