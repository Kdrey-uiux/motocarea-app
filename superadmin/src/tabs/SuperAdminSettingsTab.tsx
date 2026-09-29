import React, { useState } from 'react';
import { SystemSettings } from '../types/superadmin';
import { getSystemSettings, saveSystemSettings } from '../utils/superAdminManager';
import {
  Sliders,
  Store,
  ShieldAlert,
  Save,
  CheckCircle,
  Database,
  Building,
  Phone,
  Mail,
  AlertTriangle,
} from 'lucide-react';

interface SuperAdminSettingsTabProps {
  ownerName: string;
}

export const SuperAdminSettingsTab: React.FC<SuperAdminSettingsTabProps> = ({ ownerName }) => {
  const [settings, setSettings] = useState<SystemSettings>(() => getSystemSettings());
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await saveSystemSettings(settings, ownerName);
    setSaving(false);
    setSuccessMsg('Matagumpay na na-update ang Workshop Master Policies & Settings!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Sliders className="w-4 h-4" />
          <span>System Governance</span>
        </div>
        <h2 className="text-2xl font-black text-white">Workshop Master Policies & Configuration</h2>
        <p className="text-sm text-slate-400">
          Pang-global na mga setting ng iyong motorcycle service network na naaapektuhan ang Admin at Customer portals.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Workshop Profile */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-800 pb-3">
            <Store className="w-5 h-5 text-amber-400" />
            <span>Workshop Business Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Opisyal na Pangalan ng Shop
              </label>
              <input
                type="text"
                value={settings.shopName}
                onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Slogan / Tagline
              </label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Opisyal na Address ng Workshop Facility
            </label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Owner Direct Email
              </label>
              <input
                type="email"
                value={settings.ownerEmail}
                onChange={(e) => setSettings({ ...settings, ownerEmail: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Executive Support Hotline
              </label>
              <input
                type="text"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Operational & Pricing Parameters */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-800 pb-3">
            <Building className="w-5 h-5 text-amber-400" />
            <span>Capacity & Financial Parameters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Dedicated Lift Bays Count
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={settings.defaultBayCount}
                onChange={(e) =>
                  setSettings({ ...settings, defaultBayCount: parseInt(e.target.value) || 4 })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Kasalukuyang naka-setup sa Bay 01-04</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={settings.currencySymbol}
                onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Philippine Peso (₱)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                VAT / Tax Markup (%)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={settings.taxRatePercent}
                onChange={(e) =>
                  setSettings({ ...settings, taxRatePercent: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Standard PH VAT rate (12%)</p>
            </div>
          </div>
        </div>

        {/* Emergency System Maintenance Toggle */}
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Emergency Maintenance Lock</h4>
                <p className="text-xs text-slate-400">
                  Pansamantalang ihinto ang pagtanggap ng bagong booking mula sa Customer app
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emergencyMaintenanceMode}
                onChange={(e) =>
                  setSettings({ ...settings, emergencyMaintenanceMode: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Nai-save...' : 'I-save ang Lahat ng Pagbabago'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
