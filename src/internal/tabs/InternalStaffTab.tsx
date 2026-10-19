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
  Users, 
  UserPlus, 
  Search, 
  ShieldAlert, 
  RefreshCw,
  UserCheck,
  UserX,
  Edit3,
  KeyRound,
  X
} from 'lucide-react';
import { toast } from '../utils/toast';

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

      {/* Staff accounts: one table for the owner and all staff */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-orange-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Staff accounts</h2>
            </div>
            <p className="text-xs text-slate-500">People who can log in to this console.</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={refreshStaff}
              disabled={loading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
              title="Refresh staff list"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-orange-500 transition font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              All ({staffList.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
                statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('deactivated')}
              className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
                statusFilter === 'deactivated' ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              Deactivated ({deactivatedCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <th className="px-5 py-3 font-bold">Name</th>
                <th className="px-3 py-3 font-bold">Access</th>
                <th className="px-3 py-3 font-bold">Email</th>
                <th className="px-3 py-3 font-bold">Phone</th>
                <th className="px-3 py-3 font-bold">Status</th>
                <th className="px-5 py-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staff) => (
                <tr
                  key={staff.id}
                  className={`border-b border-slate-100 last:border-0 transition hover:bg-slate-50/70 ${
                    staff.isActive ? '' : 'bg-rose-50/30'
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          staff.isActive
                            ? 'bg-orange-50 text-orange-700 border border-orange-200/80'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {staff.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{staff.fullName}</div>
                        <div className="text-[11px] text-slate-500 truncate">{staff.position}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        staff.role === 'admin'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {staff.role === 'admin' ? 'Owner' : 'Staff'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{staff.email}</td>
                  <td className="px-3 py-3 text-slate-600 tabular-nums whitespace-nowrap">{staff.phone || '—'}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                        staff.isActive ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${staff.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {staff.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(staff)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="Edit details"
                        aria-label={`Edit ${staff.fullName}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetTarget(staff)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="Send password reset link"
                        aria-label={`Send password reset link to ${staff.fullName}`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      {/* The shop owner (admin) account can't be deactivated */}
                      {staff.role !== 'admin' ? (
                        <button
                          type="button"
                          onClick={() => setStatusTarget(staff)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 w-[98px] ${
                            staff.isActive
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {staff.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          <span>{staff.isActive ? 'Deactivate' : 'Reactivate'}</span>
                        </button>
                      ) : (
                        <span className="w-[98px]" aria-hidden="true" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 italic">
                    {loading ? 'Loading accounts...' : 'No accounts match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Staff Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              Confirm Status Change: {statusTarget.fullName}
            </h3>
            <p className="text-xs text-slate-500">
              {statusTarget.isActive
                ? 'Deactivating this account will immediately terminate any active session and revoke terminal login rights.'
                : 'Reactivating will restore floor console access for this personnel.'}
            </p>

            {statusTarget.isActive && (
              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">Reason for Deactivation</label>
                <input
                  type="text"
                  placeholder="e.g. Resigned, End of contract, Temporary leave..."
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs"
                />
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setStatusTarget(null)}
                className="px-4 py-2 text-slate-500 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleToggleStatus}
                className={`px-5 py-2.5 text-white font-bold rounded-xl transition ${
                  statusTarget.isActive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isProcessing ? 'Updating...' : statusTarget.isActive ? 'Deactivate Now' : 'Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Password Reset Confirmation Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
