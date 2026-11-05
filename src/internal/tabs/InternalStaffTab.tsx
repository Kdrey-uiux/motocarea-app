import { useState, useMemo, useEffect, useCallback } from 'react';
import { InternalStaffMember, UserRole } from '../types/internal';
import { canManageStaff } from '../utils/permissions';
import { 
  fetchDatabaseStaffMembers, 
  createDatabaseStaffMember, 
  updateDatabaseStaffMember,
  toggleDatabaseStaffStatus,
  sendStaffPasswordResetEmail 
} from '../utils/databaseStaffManager';
import { 
  UserPlus, 
  Search, 
  ShieldAlert, 
  RefreshCw,
  UserCheck,
  UserX,
  Edit3,
  KeyRound,
  X
} from '../../components/icons';
import { toast } from '../utils/toast';
import { ScrollLock } from '../../hooks/useLockBodyScroll';

// Random 12-character starting password (no look-alike characters), shown once to the admin
function generateStaffPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

interface InternalStaffTabProps {
  currentRole: UserRole;
  currentStaffName?: string;
}

export default function InternalStaffTab({
  currentRole,
  currentStaffName = 'Shop Owner',
}: InternalStaffTabProps) {
  // Permission Guard: Shop Owner Only
  if (!canManageStaff(currentRole)) {
    return (
      <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-base text-slate-900">Admin Access Only</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Only the Shop Owner or Admin has permission to manage workshop staff accounts.
        </p>
      </div>
    );
  }

  return <StaffManagement currentStaffName={currentStaffName} />;
}

function StaffManagement({ currentStaffName }: { currentStaffName: string }) {
  const [staffList, setStaffList] = useState<InternalStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<InternalStaffMember | null>(null);
  const [statusTarget, setStatusTarget] = useState<InternalStaffMember | null>(null);
  const [resetTarget, setResetTarget] = useState<InternalStaffMember | null>(null);
  const [disableReason, setDisableReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(generateStaffPassword);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // The spinner starts on (initial load) or from the Refresh button
  const loadStaff = useCallback(() => {
    return fetchDatabaseStaffMembers().then((data) => {
      setStaffList(data);
      setLoading(false);
    });
  }, []);
  const refreshStaff = () => {
    setLoading(true);
    loadStaff();
  };

  useEffect(() => {
    loadStaff();
    window.addEventListener('motocare_staff_updated', loadStaff);
    return () => window.removeEventListener('motocare_staff_updated', loadStaff);
  }, [loadStaff]);

  const filteredStaff = useMemo(() => {
    // Owner first, then staff by name
    const ordered = [...staffList].sort(
      (a, b) =>
        Number(b.role === 'admin') - Number(a.role === 'admin') || a.fullName.localeCompare(b.fullName)
    );
    return ordered.filter((s) => {
      if (statusFilter === 'active' && !s.isActive) return false;
      if (statusFilter === 'deactivated' && s.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.position.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [staffList, statusFilter, searchQuery]);

  const activeCount = useMemo(() => staffList.filter((s) => s.isActive).length, [staffList]);
  const deactivatedCount = useMemo(() => staffList.filter((s) => !s.isActive).length, [staffList]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !email.trim()) {
      setFormError('Please fill in both full name and work email.');
      return;
    }

    setIsProcessing(true);
    const result = await createDatabaseStaffMember({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || 'N/A',
      position: 'Staff',
      password: password.trim(),
      creatorName: currentStaffName,
    });
    setIsProcessing(false);

    if (result.success && result.staff) {
      await loadStaff();
      setIsCreateModalOpen(false);
      setFeedback(
        result.warning
          ? { type: 'error', text: `Account created for ${result.staff.fullName}. ${result.warning}` }
          : {
              type: 'success',
              text: `Staff account created for ${result.staff.fullName}. They can log in now at /internal/login.`,
            }
      );
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword(generateStaffPassword());
    } else {
      setFormError(result.error || 'Failed to provision staff account.');
    }
  };

  const handleOpenEdit = (staff: InternalStaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.fullName);
    setEditPhone(staff.phone);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setIsProcessing(true);
    const result = await updateDatabaseStaffMember({
      id: editingStaff.id,
      fullName: editName,
      phone: editPhone,
      // Staff are all one level; the owner keeps their own title
      position: editingStaff.role === 'admin' ? editingStaff.position : 'Staff',
      actorName: currentStaffName,
    });
    setIsProcessing(false);

    if (result.success) {
      await loadStaff();
      setEditingStaff(null);
      setFeedback({
        type: 'success',
        text: `Updated personnel details for ${editName}.`,
      });
    } else {
      toast.error(result.error || 'Failed to update personnel records.');
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    const staff = resetTarget;

    setIsProcessing(true);
    const result = await sendStaffPasswordResetEmail(staff.email, currentStaffName);
    setIsProcessing(false);

    if (result.success) {
      setResetTarget(null);
      setFeedback({
        type: 'success',
        text: `Password recovery dispatched to ${staff.email}.`,
      });
    } else {
      toast.error(result.error || 'Failed to send password reset email.');
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    setIsProcessing(true);
    const result = await toggleDatabaseStaffStatus(
      statusTarget.id,
      currentStaffName,
      disableReason.trim()
    );
    setIsProcessing(false);

    if (result.success) {
      await loadStaff();
      setStatusTarget(null);
      setDisableReason('');
      setFeedback({
        type: 'success',
        text: `Updated status for ${statusTarget.fullName}.`,
      });
    } else {
      toast.error(result.error || 'Failed to toggle personnel status.');
    }
  };

  return (
    <div className="space-y-6">

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Team: one card per person, with labeled actions (no icon-only buttons) */}
      <div className="bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">Staff accounts</h2>
            <p className="text-sm text-slate-500">People who can sign in to this console.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={refreshStaff}
              disabled={loading}
              className="w-11 h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition cursor-pointer disabled:opacity-60"
              title="Refresh"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-none h-11 px-5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add staff</span>
            </button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
            />
          </div>

          <div className="flex gap-1 p-1 bg-slate-100/80 rounded-full self-start sm:self-auto">
            {(
              [
                ['all', `All ${staffList.length}`],
                ['active', `Active ${activeCount}`],
                ['deactivated', `Turned off ${deactivatedCount}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id)}
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === id ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ul className="divide-y divide-slate-100">
          {filteredStaff.map((staff) => (
            <li
              key={staff.id}
              className={`px-4 sm:px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 ${staff.isActive ? '' : 'bg-slate-50/60'}`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
                    staff.isActive
                      ? 'bg-gradient-to-tr from-orange-500 to-amber-400 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {staff.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`text-[15px] font-semibold truncate ${staff.isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                      {staff.fullName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        staff.role === 'admin' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {staff.role === 'admin' ? 'Owner' : 'Staff'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                        staff.isActive ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${staff.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {staff.isActive ? 'Active' : 'Turned off'}
                    </span>
                  </div>
                  {staff.position && staff.position !== (staff.role === 'admin' ? 'Owner' : 'Staff') && (
                    <p className="text-sm text-slate-500 truncate">{staff.position}</p>
                  )}
                  <p className="mt-0.5 text-sm text-slate-500 break-all">
                    {staff.email}
                    {staff.phone && staff.phone !== 'N/A' && <span className="tabular-nums"> · {staff.phone}</span>}
                  </p>
                </div>
              </div>

              {/* Actions: words, not just icons */}
              <div className="flex flex-wrap gap-2 md:justify-end md:shrink-0 pl-14 md:pl-0">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(staff)}
                  className="h-9 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setResetTarget(staff)}
                  className="h-9 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 transition cursor-pointer flex items-center gap-1.5"
                  title="Email a link to set a new password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Reset password
                </button>
                {/* The shop owner (admin) account can't be turned off */}
                {staff.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => setStatusTarget(staff)}
                    className={`h-9 px-3.5 rounded-full border text-sm font-medium transition cursor-pointer flex items-center gap-1.5 ${
                      staff.isActive
                        ? 'border-rose-200 bg-white hover:bg-rose-50 text-rose-600'
                        : 'border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {staff.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    {staff.isActive ? 'Turn off account' : 'Turn on account'}
                  </button>
                )}
              </div>
            </li>
          ))}
          {filteredStaff.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-slate-500">
              {loading ? 'Loading accounts…' : 'No accounts match your search.'}
            </li>
          )}
        </ul>
      </div>

      {/* Provision Staff Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <ScrollLock />
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-orange-600" />
                <span>Create Staff Account</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arnel Santos"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Work Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. arnel.tech@motocare.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 0917-123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="font-bold text-slate-700">Access</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  Staff
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Initial Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setPassword(generateStaffPassword())}
                    className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer shrink-0"
                    title="Generate a new random password"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Copy this and give it to the staff member. They can log in right away and change it later via Reset Password.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl"
                >
                  {isProcessing ? 'Creating...' : 'Create Staff Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <ScrollLock />
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-orange-600" />
                <span>Edit Staff Records: {editingStaff.fullName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>


              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl"
                >
                  {isProcessing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {statusTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <ScrollLock />
          <div className="bg-white border border-slate-200/80 rounded-[1.75rem] p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">
                {statusTarget.isActive ? 'Turn off' : 'Turn on'} {statusTarget.fullName}’s account?
              </h3>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                {statusTarget.isActive
                  ? 'They are signed out right away and can no longer sign in to the console. You can turn it back on anytime.'
                  : 'They can sign in to the console again.'}
              </p>
            </div>

            {statusTarget.isActive && (
              <div>
                <label htmlFor="disable-reason" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Reason <span className="font-normal text-slate-400">(for the Activity Logs)</span>
                </label>
                <input
                  id="disable-reason"
                  type="text"
                  placeholder="e.g. Resigned, end of contract, on leave"
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
                />
              </div>
            )}

            <div className="pt-1 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStatusTarget(null)}
                disabled={isProcessing}
                className="h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleToggleStatus}
                className={`h-11 rounded-full text-white text-sm font-semibold transition cursor-pointer disabled:opacity-60 ${
                  statusTarget.isActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isProcessing ? 'Saving…' : statusTarget.isActive ? 'Turn off account' : 'Turn on account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Password Reset Confirmation Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <ScrollLock />
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">Send password reset link?</h3>
                  <p className="text-[11px] text-slate-500 truncate">{resetTarget.fullName} · {resetTarget.position}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                disabled={isProcessing}
                className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Email will be sent to</span>
              <span className="font-bold text-slate-900 break-all">{resetTarget.email}</span>
            </div>

            <p className="text-xs text-slate-500">
              They'll get an email with a link to set a new password. Their current password keeps working until they change it.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-slate-500 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleResetPassword}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {isProcessing ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
