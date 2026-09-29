import React, { useState } from 'react';
import { WorkshopAdminAccount, WorkshopStaffMember } from '../types/superadmin';
import {
  createAdminAccount,
  toggleAdminStatus,
  resetAdminPassword,
  deleteAdminAccount,
  getWorkshopStaff,
} from '../utils/superAdminManager';
import {
  Shield,
  UserPlus,
  Lock,
  Unlock,
  KeyRound,
  Trash2,
  CheckCircle,
  AlertCircle,
  Search,
  Users,
  Wrench,
  Clock,
  Sparkles,
} from 'lucide-react';

interface SuperAdminAdminsTabProps {
  admins: WorkshopAdminAccount[];
  onAdminsUpdated: () => void;
  ownerName: string;
}

export const SuperAdminAdminsTab: React.FC<SuperAdminAdminsTabProps> = ({
  admins,
  onAdminsUpdated,
  ownerName,
}) => {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<WorkshopAdminAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  
  // Create Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    position: 'Chief Workshop Manager',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const staffList = getWorkshopStaff();

  const filteredAdmins = admins.filter(
    (a) =>
      a.fullName.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.position.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) {
      setFeedback({ type: 'error', message: 'Pakilagay ang pangalan at email ng Admin.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const res = await createAdminAccount({
      ...formData,
      password: formData.password || 'admin123',
      creatorName: ownerName,
    });

    setSubmitting(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Matagumpay na nagawa ang Admin account para kay ${formData.fullName}! Maaari na siyang mag-login sa Workshop Admin console.`,
      });
      setShowCreateModal(false);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        position: 'Chief Workshop Manager',
        password: '',
      });
      onAdminsUpdated();
    } else {
      setFeedback({ type: 'error', message: res.error || 'Nabigong lumikha ng Admin.' });
    }
  };

  const handleToggleStatus = async (admin: WorkshopAdminAccount) => {
    const isDeactivating = admin.status === 'active';
    const confirmMsg = isDeactivating
      ? `Sigurado ka bang nais mong I-DISABLE ang Admin account ni ${admin.fullName}? Hindi na siya makakapasok sa Admin portal.`
      : `I-ENABLE muli ang account ni ${admin.fullName}?`;

    if (!window.confirm(confirmMsg)) return;

    const res = await toggleAdminStatus(
      admin.id,
      ownerName,
      isDeactivating ? 'Suspended by Owner' : undefined
    );

    if (res.success) {
      onAdminsUpdated();
    } else {
      alert(res.error);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetModal || !newPasswordInput) return;

    const res = await resetAdminPassword(showResetModal.id, newPasswordInput, ownerName);
    if (res.success) {
      alert(`Matagumpay na napalitan ang password para kay ${showResetModal.fullName}.`);
      setShowResetModal(null);
      setNewPasswordInput('');
      onAdminsUpdated();
    } else {
      alert(res.error);
    }
  };

  const handleDelete = async (admin: WorkshopAdminAccount) => {
    if (
      !window.confirm(
        `Babala: Nais mo bang permanenteng burahin ang Admin account ni ${admin.fullName}? Ang aksyong ito ay hindi na maibabalik.`
      )
    )
      return;

    const res = await deleteAdminAccount(admin.id, ownerName);
    if (res.success) {
      onAdminsUpdated();
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs hover:underline ml-4 text-slate-400"
          >
            Isara
          </button>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Administrative Governance</span>
          </div>
          <h2 className="text-2xl font-black text-white">Workshop Admins & Managers</h2>
          <p className="text-sm text-slate-400">
            Lumikha, mag-suspend, o mag-reset ng mga kredensyal ng Workshop Managers na namamahala sa pang-araw-araw na operasyon.
          </p>
        </div>

        <button
          onClick={() => {
            setFeedback(null);
            setShowCreateModal(true);
          }}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Create Admin Account</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hanapin sa pangalan, email, o posisyon..."
            className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Kabuuan: <strong className="text-white">{admins.length}</strong> Admins</span>
          <span>·</span>
          <span>Aktibo: <strong className="text-emerald-400">{admins.filter((a) => a.status === 'active').length}</strong></span>
          <span>·</span>
          <span>Naka-suspend: <strong className="text-rose-400">{admins.filter((a) => a.status === 'disabled').length}</strong></span>
        </div>
      </div>

      {/* Admins Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Admin Name & Details</th>
                <th className="py-3.5 px-4">Position / Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created By</th>
                <th className="py-3.5 px-4 text-right">Owner Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                    Walang natagpuang Admin account na tumutugma sa iyong paghahanap.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-bold">
                          {admin.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white leading-tight">{admin.fullName}</p>
                          <p className="text-xs text-slate-400">{admin.email}</p>
                          <p className="text-[11px] text-slate-500">{admin.phone}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-medium text-slate-200">{admin.position}</span>
                      <p className="text-[11px] text-slate-500">Workshop Operational Tier</p>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          admin.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            admin.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        {admin.status === 'active' ? 'Active / Allowed' : 'Suspended / Locked'}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-xs text-slate-400">
                      <p>{admin.createdBy || 'Super Admin (Owner)'}</p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Status Toggle */}
                        <button
                          onClick={() => handleToggleStatus(admin)}
                          className={`p-2 rounded-lg text-xs font-medium border transition-colors ${
                            admin.status === 'active'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                          title={admin.status === 'active' ? 'Suspend Admin Access' : 'Reactivate Admin'}
                        >
                          {admin.status === 'active' ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            setShowResetModal(admin);
                            setNewPasswordInput('');
                          }}
                          className="p-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:border-slate-600 transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(admin)}
                          className="p-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                          title="Delete Admin Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hierarchy Info: Admin -> Staff Delegation */}
      <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 mb-2 text-slate-200 font-bold text-sm">
          <Users className="w-4 h-4 text-amber-400" />
          <span>Workshop Staff (Mechanics) Managed by Admins</span>
        </div>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Ang mga sumusunod na staff at mekaniko ay nilikha at pinangangasiwaan ng iyong mga Workshop Admin.
          Hindi kailangang makialam ng Super Admin sa pang-araw-araw na pag-dispatch ng mekaniko maliban kung kailangan ng executive review.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {staffList.length === 0 ? (
            <p className="text-xs text-slate-500 italic col-span-full">
              Wala pang nilikhang staff account ang mga Admin.
            </p>
          ) : (
            staffList.map((staff) => (
              <div
                key={staff.id}
                className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 text-blue-400 flex items-center justify-center font-bold text-xs">
                    <Wrench className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">{staff.fullName}</p>
                    <p className="text-[10px] text-slate-400">{staff.position}</p>
                  </div>
                </div>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    staff.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {staff.status.toUpperCase()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CREATE ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white">Create New Workshop Admin</h3>
                <p className="text-xs text-slate-400">
                  Magtalaga ng bagong Manager na may access sa Workshop Admin Console
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name ng Admin *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Hal. Engr. Marco Santos"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address (Login ID) *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin@motocare.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+63 917 111 2233"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Posisyon / Administrative Title
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Chief Workshop Manager">Chief Workshop Manager</option>
                  <option value="Floor Operations Supervisor">Floor Operations Supervisor</option>
                  <option value="Service Advisor Lead">Service Advisor Lead</option>
                  <option value="Quality Control Inspector Lead">Quality Control Inspector Lead</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Temporary Initial Password
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Iwanang blangko para sa default: admin123"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Kanselahin
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Nirerehistro...' : 'Gawin ang Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              Reset Password: {showResetModal.fullName}
            </h3>
            <p className="text-xs text-slate-400">
              Magtalaga ng bagong password para sa Admin account na ito ({showResetModal.email}).
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="text"
                required
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Bagong password..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Kanselahin
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400"
                >
                  I-save ang Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
