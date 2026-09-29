import { Shield, Wrench, ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminRedirect() {
  const adminUrl =
    import.meta.env.VITE_ADMIN_URL || 'http://localhost:5174';
  const superAdminUrl =
    import.meta.env.VITE_SUPERADMIN_URL || 'http://localhost:5175';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg">
          <Shield className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Hiwalay na ang Admin Portals
          </h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Upang mas maging mabilis at ligtas ang aplikasyon ng mga kustomer, ang pamamahala ng
            workshop at mga may-ari ng shop ay inilipat sa sariling nakalaang mga sub-portal.
          </p>
        </div>

        <div className="space-y-3 text-left">
          {/* Workshop Admin Portal Button */}
          <a
            href={adminUrl}
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                  Workshop Admin Console
                </p>
                <p className="text-[11px] text-slate-400">
                  Para sa Service Advisor, Dispatch, at Bay Management
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </a>

          {/* Super Admin Owner Portal Button */}
          <a
            href={superAdminUrl}
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-700/60 hover:bg-slate-700 border border-slate-600 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                  Super Admin (Shop Owner)
                </p>
                <p className="text-[11px] text-slate-400">
                  Para sa Financial Analytics at Admin Account Creation
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </a>
        </div>

        <div className="pt-2 border-t border-slate-700/60">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Bumalik sa MotoCare Customer App</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
