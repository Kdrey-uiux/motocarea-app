import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  ShieldCheck,
  Users
} from 'lucide-react';
import { UserRole } from '../types/admin';
import { 
  verifyStaffCredentials, 
  verifyAdminCredentials 
} from '../utils/staffManager';

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Suriin kung ito ay STAFF account na ginawa ng Admin
      const staffCheck = verifyStaffCredentials(cleanEmail, password);
      if (staffCheck.success && staffCheck.staff) {
        localStorage.setItem('motocare_workshop_auth_override', 'staff');
        setSuccessMessage(`Welcome back, ${staffCheck.staff.fullName}! Pagsasaayos ng workshop console...`);
        setTimeout(() => navigate('/'), 600);
        return;
      } else if (staffCheck.error && !staffCheck.error.startsWith('Account not found')) {
        throw new Error(staffCheck.error);
      }

      // 2. Subukan ang Admin Login sa Supabase Auth
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!authError && authData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', authData.user.id)
            .maybeSingle();

          const role = profile?.role?.toLowerCase();
          if (role === 'customer') {
            await supabase.auth.signOut();
            throw new Error('Access Denied: Ang account na ito ay Customer Rider. Hindi awtorisado sa Workshop Console.');
          }

          const finalRole: UserRole = role === 'staff' ? 'staff' : 'admin';
          localStorage.setItem('motocare_workshop_auth_override', finalRole);
          setSuccessMessage(`Welcome back, ${profile?.full_name || 'Manager'}! Pagsasaayos ng console...`);
          setTimeout(() => navigate('/'), 600);
          return;
        }
      } catch (sbErr) {
        if (sbErr instanceof Error && sbErr.message.includes('Access Denied')) {
          throw sbErr;
        }
      }

      // 3. Suriin kung ito ay Admin account na nilikha ng Super Admin
      const adminCheck = verifyAdminCredentials(cleanEmail, password);
      if (adminCheck.success && adminCheck.admin) {
        localStorage.setItem('motocare_workshop_auth_override', 'admin');
        setSuccessMessage(`Welcome back, ${adminCheck.admin.fullName}! Pagsasaayos ng console...`);
        setTimeout(() => navigate('/'), 600);
        return;
      } else if (adminCheck.error && !adminCheck.error.startsWith('Account not found')) {
        throw new Error(adminCheck.error);
      }

      // 4. Kung walang tumugmang account
      throw new Error(
        'Account not found: Hindi rehistrado ang account na ito sa workshop. Makipag-ugnayan sa Super Admin (Shop Owner) para sa Manager access, o sa Workshop Manager para sa Staff access.'
      );
    } catch (err: unknown) {
      console.error('Workshop authentication error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Invalid workshop credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/75 text-slate-800 flex items-center justify-center p-4 sm:p-6 selection:bg-blue-600 selection:text-white">
      <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Top Header & Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-sm">
            <Wrench className="w-6 h-6" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-1">
              Workshop Operations Terminal
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              MotoCare Operations Console
            </h1>
            <p className="text-xs text-slate-500">
              Santa Maria Hub • Workshop Managers & Staff Only
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
          <Users className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Workshop Personnel Sign In:</strong> Gamitin ang iyong ibinigay na account mula sa Super Admin (Shop Owner) o Workshop Manager.
          </div>
        </div>

        {/* Error / Success Alerts */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-600" />
              Work Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. manager@motocare.ph o staff@motocare.ph"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              Terminal Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="I-enter ang iyong password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs mt-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sinusuri ang Kredensyal...</span>
              </>
            ) : (
              <span>Sign In to Operations Hub</span>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div className="text-center pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            MotoCare Workshop OS • Strictly for Authorized Personnel
          </p>
        </div>
      </div>
    </div>
  );
}
