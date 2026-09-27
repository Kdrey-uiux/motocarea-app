import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  Clock, 
  RefreshCw, 
  LogOut, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  Shield,
  UserCheck
} from 'lucide-react';
import { AdminTicket, UserRole } from '../../types/admin';

interface AdminHeaderProps {
  tickets: AdminTicket[];
  loading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
  currentRole?: UserRole;
  onToggleRole?: () => void;
}

export default function AdminHeader({
  tickets,
  loading,
  onRefresh,
  onLogout,
  onToggleMobileMenu,
  currentRole = 'admin',
  onToggleRole,
}: AdminHeaderProps) {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString('en-US', {
          timeZone: 'Asia/Manila',
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const inShopCount = tickets.filter(
    (t) => t.status === 'IN_PROGRESS' || t.stage < 5
  ).length;

  const readyCount = tickets.filter(
    (t) => t.status === 'READY_FOR_PICKUP' || (t.stage === 5 && t.status !== 'COMPLETED')
  ).length;

  const completedCount = tickets.filter((t) => t.status === 'COMPLETED').length;

  return (
    <header className="bg-white border-b border-slate-200/90 text-slate-800 px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Branding & Mobile Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onToggleMobileMenu && (
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="md:hidden p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                title="Toggle Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Wrench className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  MotoCare
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
                  Shop Operations
                </span>

                {/* Role Badge with Quick Switcher for testing */}
                {onToggleRole && (
                  <button
                    type="button"
                    onClick={onToggleRole}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase transition border ${
                      currentRole === 'staff'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    }`}
                    title="Click to toggle between Staff and Admin view"
                  >
                    {currentRole === 'staff' ? (
                      <>
                        <UserCheck className="w-3 h-3 text-amber-600" />
                        <span>Staff User (Restricted)</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-3 h-3 text-emerald-600" />
                        <span>Admin (Full Access)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Santa Maria Main Workshop Hub</span>
                <span className="hidden lg:inline text-slate-300">•</span>
                <span className="hidden lg:inline text-slate-500 font-mono text-[11px]">
                  {currentTime ? `${currentTime} PHT` : 'Loading clock...'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Live KPIs (Strictly Operational Counts) */}
        <div className="hidden sm:flex items-center gap-2 lg:gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80 text-xs">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-medium">In Workshop:</span>
            <span className="font-bold text-slate-900 text-xs">{inShopCount}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
            <AlertCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-medium">Ready for Release:</span>
            <span className="font-bold text-slate-900 text-xs">{readyCount}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-medium">Completed:</span>
            <span className="font-bold text-slate-900 text-xs">{completedCount}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Direct Switcher to Customer View */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition shadow-2xs"
            title="Switch to Customer/Rider View"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Customer View</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
            title="Refresh Real-time Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
