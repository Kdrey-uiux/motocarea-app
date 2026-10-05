import { Wrench, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminRedirect() {
  const adminUrl = import.meta.env.VITE_ADMIN_URL || 'http://localhost:5174';

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-800 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-2xl sm:rounded-[2rem] p-6 sm:p-8 shadow-xs text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center shadow-xs">
          <Wrench className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-bold uppercase tracking-wider">
            Workshop Operations
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            MotoCare Staff & Admin Portal
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            Ang pamamahala sa intake, bay floor, dispatch, at customer service ay matatagpuan sa nakalaang workshop console para sa mga awtorisadong kawani at admin.
          </p>
        </div>

        <div className="space-y-3 text-left">
          {/* Workshop Admin & Staff Console Button */}
          <a
            href={adminUrl}
            className="flex items-center justify-between p-4 rounded-xl sm:rounded-2xl bg-orange-50/70 hover:bg-orange-100/80 border border-orange-200/80 transition-all duration-150 group shadow-xs active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
                  Buksan ang Workshop Console
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  Para sa Service Advisor, Bay Leads, Staff & Admin
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-orange-500 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
          </a>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-600 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Bumalik sa MotoCare Customer App</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
