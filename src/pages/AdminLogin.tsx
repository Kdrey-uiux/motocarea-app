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
  UserPlus, 
  LogIn, 
  CheckCircle2,
  Phone,
  User,
  ShieldCheck
} from 'lucide-react';
import { UserRole } from '../types/admin';
import { 
  verifyStaffCredentials, 
  verifyAdminCredentials, 
  createAdminAccount,
  getAdminAccounts,
  getStaffMembers
} from '../utils/staffManager';

type AuthMode = 'signin' | 'register_admin';

export default function AdminLogin() {
  const navigate = useNavigate();

  // Tinitingnan kung mayroon nang nagawang account
  const [hasExistingAccounts, setHasExistingAccounts] = useState<boolean>(() => {
    const admins = getAdminAccounts();
    const staff = getStaffMembers();
    return admins.length > 0 || staff.length > 0;
  });

  // Kung wala pang account, strictly 'register_admin' agad ang mode
  const [mode, setMode] = useState<AuthMode>(() => {
    const admins = getAdminAccounts();
    const staff = getStaffMembers();
    return (admins.length > 0 || staff.length > 0) ? 'signin' : 'register_admin';
  });

  // Sign In states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register Admin states
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPosition, setRegPosition] = useState('Shop Owner / Managing Director');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // =========================================================================
  // SUBMIT: SIGN IN (Lalabas lamang kapag may nagawa nang account)
  // =========================================================================
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
        setSuccessMessage(`Welcome back, ${staffCheck.staff.fullName}! Pagsasaayos ng console...`);
        setTimeout(() => navigate('/admin'), 600);
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
            throw new Error('Access Denied: Ang account na ito ay Customer Rider.');
          }

          const finalRole: UserRole = role === 'staff' ? 'staff' : 'admin';
          localStorage.setItem('motocare_workshop_auth_override', finalRole);
          setSuccessMessage(`Welcome back, ${profile?.full_name || 'Admin'}! Pagsasaayos ng console...`);
          setTimeout(() => navigate('/admin'), 600);
          return;
        }
      } catch (sbErr) {
        if (sbErr instanceof Error && sbErr.message.includes('Access Denied')) {
          throw sbErr;
        }
      }

      // 3. Suriin kung ito ay Admin account sa local workshop registry
      const adminCheck = verifyAdminCredentials(cleanEmail, password);
      if (adminCheck.success && adminCheck.admin) {
        localStorage.setItem('motocare_workshop_auth_override', 'admin');
        setSuccessMessage(`Welcome back, ${adminCheck.admin.fullName}! Pagsasaayos ng console...`);
        setTimeout(() => navigate('/admin'), 600);
        return;
      } else if (adminCheck.error && !adminCheck.error.startsWith('Account not found')) {
        throw new Error(adminCheck.error);
      }

      // 4. Kung walang tumugmang account
      throw new Error(
        'Account not found: Hindi rehistrado ang account na ito. Mangyaring gumawa muna ng account gamit ang "Create Admin Account" bago mag-login.'
      );
    } catch (err: unknown) {
      console.error('Workshop authentication error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Invalid workshop credentials.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // SUBMIT: REGISTER ADMIN ACCOUNT
  // =========================================================================
  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = regEmail.trim().toLowerCase();

    try {
      if (regPassword.length < 6) {
        throw new Error('Ang password ay dapat hindi bababa sa 6 characters.');
      }

      if (regPassword !== confirmPassword) {
        throw new Error('Hindi magkatugma ang Password at Confirm Password.');
      }

      const result = await createAdminAccount({
        fullName: fullName.trim(),
        email: cleanEmail,
        phone: regPhone.trim(),
        position: regPosition,
        password: regPassword,
      });

      if (!result.success || !result.admin) {
        throw new Error(result.error || 'Nabigong irehistro ang Admin account.');
      }

      // May nagawa nang account: puwede nang lumabas ang Sign-In option!
      setHasExistingAccounts(true);
      setEmail(cleanEmail);
      setPassword('');
      setMode('signin');
      setSuccessMessage(
        `Matagumpay na nagawa ang iyong Admin account (${cleanEmail})! Maaari ka na ngayong mag-Sign In gamit ang iyong bagong password.`
      );

      // Linisin ang form
      setFullName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      console.error('Admin registration error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Nabigong lumikha ng account.');
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
              Authorized Personnel Terminal
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Workshop Operations Portal
            </h1>
            <p className="text-xs text-slate-500">
              Santa Maria Hub • Staff & Management System
            </p>
          </div>
        </div>

        {/* Dynamic Mode Switcher: 
            Lalabas lamang ang "Sign In" button kapag may nagawa nang account.
            Kung wala pang account, Create Account banner lamang ang nakalagay. */}
        {hasExistingAccounts ? (
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('register_admin');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'register_admin'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Admin Account</span>
            </button>
          </div>
        ) : (
          <div className="py-2.5 px-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-center">
            <span className="text-xs font-bold text-blue-800 flex items-center justify-center gap-1.5">
              <UserPlus className="w-4 h-4 text-blue-600" />
              Initial Setup: Gumawa ng Unang Admin Account
            </span>
          </div>
        )}

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

        {/* ========================================================================= */}
        {/* FORM 1: SIGN IN (Available lamang kapag mayroon nang account)              */}
        {/* ========================================================================= */}
        {mode === 'signin' && hasExistingAccounts && (
          <form onSubmit={handleSignIn} className="space-y-4">
            {/* Email */}
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
                placeholder="I-type ang iyong rehistradong work email"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                Password
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

            {/* Submit Button */}
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
                <span>Sign In to Workshop Console</span>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* FORM 2: CREATE ADMIN ACCOUNT                                              */}
        {/* ========================================================================= */}
        {(mode === 'register_admin' || !hasExistingAccounts) && (
          <form onSubmit={handleRegisterAdmin} className="space-y-3.5">
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Admin & Management Registration:</strong> Ang form na ito ay para sa Shop Owner o Workshop Administrator.
              </span>
            </div>

            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Buong Pangalan (Full Name) *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Hal. Juan Dela Cruz"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
            </div>

            {/* Work Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                Official Admin Work Email *
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="owner@motocare.ph o admin@shop.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
            </div>

            {/* Phone & Position Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="0917-000-0000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Designation / Role
                </label>
                <select
                  value={regPosition}
                  onChange={(e) => setRegPosition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                >
                  <option value="Shop Owner / Managing Director">Shop Owner</option>
                  <option value="General Workshop Manager">General Manager</option>
                  <option value="Operations Administrator">Operations Admin</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                Password (min. 6 characters) *
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Lumikha ng password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                Kumpirmahin ang Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulitin ang password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Nirerehistro ang Admin Account...</span>
                </>
              ) : (
                <span>Register & Create Admin Account</span>
              )}
            </button>
          </form>
        )}

        {/* Security & Access Notice (Walang Customer Rider Link) */}
        <div className="text-center pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            MotoCare Operations OS • Exclusive for Workshop Personnel
          </p>
        </div>
      </div>
    </div>
  );
}
