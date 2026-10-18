import { useState, useMemo, useEffect } from 'react';
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
  Mail, 
  Phone, 
  RefreshCw,
  UserCheck,
  UserX,
  Edit3,
  KeyRound,
  X
} from 'lucide-react';
import { toast } from '../utils/toast';
import MechanicsManager from '../components/MechanicsManager';

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

  const [staffList, setStaffList] = useState<InternalStaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<InternalStaffMember | null>(null);
  const [statusTarget, setStatusTarget] = useState<InternalStaffMember | null>(null);
  const [disableReason, setDisableReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('Service Advisor & Intake Officer');
  const [password, setPassword] = useState('MotoStaff2026!');
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPosition, setEditPosition] = useState('');

  const loadStaff = async () => {
    setLoading(true);
    const data = await fetchDatabaseStaffMembers();
    setStaffList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStaff();
    const handleUpdate = () => loadStaff();
    window.addEventListener('motocare_staff_updated', handleUpdate);
    return () => window.removeEventListener('motocare_staff_updated', handleUpdate);
  }, []);

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
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
      position: position.trim(),
      password: password.trim(),
      creatorName: currentStaffName,
    });
    setIsProcessing(false);

    if (result.success && result.staff) {
      await loadStaff();
      setIsCreateModalOpen(false);
      setFeedback({
        type: 'success',
        text: `Successfully provisioned personnel account for ${result.staff.fullName}!`,
      });
      setFullName('');
      setEmail('');
      setPhone('');
      setPosition('Service Advisor & Intake Officer');
      setPassword('MotoStaff2026!');
    } else {
      setFormError(result.error || 'Failed to provision staff account.');
    }
  };

  const handleOpenEdit = (staff: InternalStaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.fullName);
    setEditPhone(staff.phone);
    setEditPosition(staff.position);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setIsProcessing(true);
    const result = await updateDatabaseStaffMember({
      id: editingStaff.id,
      fullName: editName,
      phone: editPhone,
      position: editPosition,
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

  const handleResetPassword = async (staff: InternalStaffMember) => {
    if (!confirm(`Dispatch password recovery instructions to ${staff.email}?`)) return;

    setIsProcessing(true);
    const result = await sendStaffPasswordResetEmail(staff.email, currentStaffName);
    setIsProcessing(false);

    if (result.success) {
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
      {/* Shop mechanics (names only, no accounts) */}
      <MechanicsManager currentStaffName={currentStaffName} />

      {/* Header and Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-orange-600" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Staff accounts
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            People who can log in to this console.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadStaff}
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
            <span>+ Add Staff Member</span>
          </button>
        </div>
      </div>

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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block mb-1">Total Staff</span>
          <span className="text-2xl font-black text-slate-900">{staffList.length}</span>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-emerald-700 font-semibold block mb-1">Active Staff</span>
          <span className="text-2xl font-black text-emerald-700">{activeCount}</span>
        </div>
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-rose-700 font-semibold block mb-1">Inactive</span>
          <span className="text-2xl font-black text-rose-700">{deactivatedCount}</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, position, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-orange-500 transition font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            All ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
              statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('deactivated')}
            className={`px-3 py-1.5 rounded-full font-bold transition cursor-pointer ${
              statusFilter === 'deactivated' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Deactivated ({deactivatedCount})
          </button>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStaff.map((staff) => (
          <div
            key={staff.id}
            className={`bg-white border rounded-2xl p-5 shadow-xs space-y-3 transition ${
              staff.isActive ? 'border-slate-200/90' : 'border-rose-200 bg-rose-50/15 opacity-80'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                    staff.isActive
                      ? 'bg-orange-50 text-orange-700 border border-orange-200/80'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {staff.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{staff.fullName}</h4>
                  <p className="text-xs text-slate-500">{staff.position}</p>
                </div>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  staff.isActive
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {staff.isActive ? 'Active' : 'Deactivated'}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-600 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{staff.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{staff.phone}</span>
              </div>
            </div>

            {/* Actions: Edit, Reset Password, Deactivate */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(staff)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  title="Edit staff details"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleResetPassword(staff)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  title="Send password reset link"
                >
                  <KeyRound className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset Pass</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStatusTarget(staff)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  staff.isActive
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
              >
                {staff.isActive ? (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    <span>Deactivate</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Reactivate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Provision Staff Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-orange-600" />
                <span>Provision New Staff Account</span>
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

              <div>
                <label className="font-bold text-slate-700 block mb-1">Role & Position</label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                >
                  <option value="Service Advisor & Intake Officer">Service Advisor & Intake Officer</option>
                  <option value="Master Tech & Engine Specialist">Master Tech & Engine Specialist</option>
                  <option value="CVT & Transmission Specialist">CVT & Transmission Specialist</option>
                  <option value="Electrical & FI Diagnostician">Electrical & FI Diagnostician</option>
                  <option value="Fast Lube & PMS Technician">Fast Lube & PMS Technician</option>
                  <option value="Cashier & Front Desk">Cashier & Front Desk</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                />
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
                  {isProcessing ? 'Provisioning...' : 'Provision Account'}
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

              <div>
                <label className="font-bold text-slate-700 block mb-1">Position / Specialization</label>
                <input
                  type="text"
                  required
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
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

    </div>
  );
}
