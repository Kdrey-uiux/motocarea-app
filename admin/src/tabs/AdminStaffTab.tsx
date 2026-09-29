import { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Search, 
  ShieldAlert, 
  Mail, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  RefreshCw,
  AlertTriangle,
  X
} from 'lucide-react';
import { WorkshopStaffMember, UserRole } from '../types/admin';
import { 
  getStaffMembers, 
  createStaffMember, 
  toggleStaffStatus 
} from '../utils/staffManager';
import { canCreateStaffAccount } from '../utils/permissions';

interface AdminStaffTabProps {
  currentRole?: UserRole;
}

export default function AdminStaffTab({ currentRole = 'admin' }: AdminStaffTabProps) {
  const [staffList, setStaffList] = useState<WorkshopStaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<WorkshopStaffMember | null>(null);
  const [disableReason, setDisableReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state para sa Create Staff
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('Service Advisor & Intake Officer');
  const [customPosition, setCustomPosition] = useState('');
  const [password, setPassword] = useState('MotoStaff2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load staff roster
  const loadStaff = () => {
    setStaffList(getStaffMembers());
  };

  useEffect(() => {
    loadStaff();
  }, []);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchesSearch =
        staff.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.phone.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || staff.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [staffList, searchQuery, statusFilter]);

  // Metric counts
  const totalCount = staffList.length;
  const activeCount = useMemo(() => staffList.filter((s) => s.status === 'active').length, [staffList]);
  const disabledCount = useMemo(() => staffList.filter((s) => s.status === 'disabled').length, [staffList]);

  // Handle Generate Password
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = 'MS-';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  // Submit Create Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !email.trim()) {
      setFormError('Pakipunan ang buong pangalan at email address ng staff.');
      return;
    }

    if (!email.includes('@')) {
      setFormError('Mangyaring maglagay ng wastong email address.');
      return;
    }

    const finalPosition = position === 'Custom' ? customPosition.trim() || 'Workshop Staff' : position;

    setIsProcessing(true);
    const result = await createStaffMember({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      position: finalPosition,
      password: password,
      creatorName: 'Admin / Owner',
    });

    setIsProcessing(false);

    if (result.success && result.staff) {
      loadStaff();
      setIsCreateModalOpen(false);
      setFeedbackMessage({
        type: 'success',
        text: `Matagumpay na nagawa ang staff account para kay ${result.staff.fullName} (${result.staff.email})! Initial Password: ${password}`,
      });
      // Reset form
      setFullName('');
      setEmail('');
      setPhone('');
      setPosition('Service Advisor & Intake Officer');
      setCustomPosition('');
      setPassword('MotoStaff2026!');
    } else {
      setFormError(result.error || 'Hindi nagawang lumikha ng staff account.');
    }
  };

  // Submit Toggle Status
  const handleConfirmStatusToggle = async () => {
    if (!statusTarget) return;

    setIsProcessing(true);
    const result = await toggleStaffStatus(
      statusTarget.id,
      'Admin / Owner',
      statusTarget.status === 'active' ? disableReason : undefined
    );
    setIsProcessing(false);

    if (result.success && result.staff) {
      loadStaff();
      const actionWord = result.staff.status === 'active' ? 'ENABLED' : 'DISABLED';
      setFeedbackMessage({
        type: 'success',
        text: `Ang account ni ${result.staff.fullName} ay matagumpay na na-${actionWord}. Awtomatiko itong naitala sa Audit Trail.`,
      });
      setStatusTarget(null);
      setDisableReason('');
    } else {
      setFeedbackMessage({
        type: 'error',
        text: result.error || 'Hindi na-update ang status ng staff account.',
      });
      setStatusTarget(null);
    }
  };

  const isAuthorized = canCreateStaffAccount(currentRole);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Staff & Crew Directory
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Admin Exclusive
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Pamahalaan ang mga account ng staff, mekaniko, intake officers, at ang kanilang access status.
          </p>
        </div>

        {/* Create Staff Button (Admin Only) */}
        {isAuthorized && (
          <button
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New Staff Account</span>
          </button>
        )}
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start justify-between border ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Staff Roster</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Registered personnel</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Active / Enabled</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{activeCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Maaaring mag-login sa portal</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Disabled / Suspended</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{disabledCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Nakaharang ang access sa login</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <UserX className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hanapin sa pangalan, email, posisyon..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Staff ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('disabled')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'disabled'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Disabled ({disabledCount})
          </button>
        </div>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Position / Role</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Date Added</th>
                <th className="py-3 px-4 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Walang natagpuang staff account</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Subukang baguhin ang iyong search query o mag-create ng bagong staff account.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const isActive = staff.status === 'active';
                  const initials = staff.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isActive
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-slate-200 text-slate-500 border border-slate-300'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {staff.fullName}
                            </p>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {staff.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Position */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {staff.position}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {staff.phone || 'N/A'}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active & Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Disabled / Locked
                          </span>
                        )}
                      </td>

                      {/* Date Added */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(staff.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Access Controls (Enable/Disable Button) */}
                      <td className="py-3.5 px-4 text-right">
                        {isAuthorized ? (
                          <button
                            onClick={() => {
                              setStatusTarget(staff);
                              setDisableReason('');
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                              isActive
                                ? 'bg-white hover:bg-rose-50 text-rose-600 border-rose-200 hover:border-rose-300 shadow-2xs'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Disable Account</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Enable Account</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No permission</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW STAFF ACCOUNT (Admin Exclusive)                      */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Create New Staff Account</h3>
                  <p className="text-xs text-slate-500">Authorized Personnel Registration</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Buong Pangalan ng Kawani (Full Name) *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Hal. Pedro Reyes"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Work / Workshop Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pedro.staff@motocare.ph"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                  />
                </div>
              </div>

              {/* Phone & Position Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0917-123-4567"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Designation / Posisyon
                  </label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                  >
                    <option value="Service Advisor & Intake Officer">Service Advisor & Intake Officer</option>
                    <option value="Chief Technician / Bay Lead">Chief Technician / Bay Lead</option>
                    <option value="Transmission & CVT Specialist">Transmission & CVT Specialist</option>
                    <option value="Engine & Electrical Specialist">Engine & Electrical Specialist</option>
                    <option value="Junior Mechanic / Apprentice">Junior Mechanic / Apprentice</option>
                    <option value="Custom">Other Custom Designation...</option>
                  </select>
                </div>
              </div>

              {position === 'Custom' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    I-type ang Custom Posisyon
                  </label>
                  <input
                    type="text"
                    value={customPosition}
                    onChange={(e) => setCustomPosition(e.target.value)}
                    placeholder="Hal. Parts & Inventory Custodian"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                  />
                </div>
              )}

              {/* Initial Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Temporary / Initial Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Maaaring baguhin ng staff ang kanilang password sa kanilang unang pagpasok.
                </p>
              </div>

              {/* Security Note */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                <Key className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Audit Protected:</strong> Awtomatikong itatala sa Immutable Audit Log ang paggawa ng account na ito kasama ang iyong Admin credentials.
                </span>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Confirm & Create Staff</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIRM ENABLE / DISABLE STATUS TOGGLE                           */}
      {/* ========================================================================= */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  statusTarget.status === 'active'
                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`}
              >
                {statusTarget.status === 'active' ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {statusTarget.status === 'active'
                    ? `I-disable ang Account ni ${statusTarget.fullName}?`
                    : `Muling I-enable ang Account ni ${statusTarget.fullName}?`}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {statusTarget.email} • {statusTarget.position}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
              {statusTarget.status === 'active' ? (
                <>
                  <p className="font-semibold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Mawawalan ng access sa Login Portal:
                  </p>
                  <p>
                    Kapag na-disable, <strong>agad na haharangin</strong> ang empleyadong ito sa pag-login sa <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-800">/admin/login</code>. Hindi na siya makakapasok sa workshop console hangga't hindi ito muling binubuksan ng Admin.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Ipapahintulot muli ang Login:
                  </p>
                  <p>
                    Muling magiging <strong>Active</strong> ang staff na ito at makakapag-login na siya muli upang mag-assist sa tickets at queue dispatching.
                  </p>
                </>
              )}
            </div>

            {/* Opsyonal na dahilan kung idi-disable */}
            {statusTarget.status === 'active' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Dahilan ng Pag-disable (Opsyonal para sa Audit Log)
                </label>
                <input
                  type="text"
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  placeholder="Hal. Resigned, Temporary Leave, Suspended..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStatusTarget(null);
                  setDisableReason('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmStatusToggle}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                  statusTarget.status === 'active'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isProcessing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : statusTarget.status === 'active' ? (
                  <UserX className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {statusTarget.status === 'active' ? 'Confirm & Disable' : 'Confirm & Re-Enable'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
