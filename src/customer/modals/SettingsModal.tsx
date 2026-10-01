import { useState } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsSection = 'warranty' | 'standards' | 'privacy' | 'about';

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('warranty');

  if (!isOpen) return null;

  const sections = [
    { id: 'warranty' as SettingsSection, label: 'Service Warranty & Guarantees', icon: ShieldCheck },
    { id: 'standards' as SettingsSection, label: 'Workshop Community Standards', icon: Wrench },
    { id: 'privacy' as SettingsSection, label: 'Privacy & Data Protection', icon: Lock },
    { id: 'about' as SettingsSection, label: 'System & Legal Terms', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-[2rem] max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative max-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Settings, Policies & Community Standards
              </h3>
              <p className="text-xs text-slate-500">
                Official MotoCare customer guidelines, guarantees, and legal terms
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-slate-100 -mx-1 px-1">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto py-4 space-y-4 text-xs text-slate-700 pr-1 flex-1">
          {/* SECTION 1: SERVICE WARRANTY */}
          {activeSection === 'warranty' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  7-Day Comprehensive Workshop Workmanship Guarantee
                </span>
                <p className="text-[11px] leading-relaxed text-emerald-900">
                  Every completed service ticket performed at MotoCare includes a 7-day labor warranty. If issues directly related to the rendered service persist, vehicle re-inspection is free of charge.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  Transparent Billing & Zero-Advance Guarantee
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-1">
                    <strong className="block text-slate-900 font-semibold">No Upfront Deposits</strong>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      You will never be asked for advance reservation payments. You only pay at the counter upon vehicle release and satisfaction.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-1">
                    <strong className="block text-slate-900 font-semibold">Genuine Parts Guarantee</strong>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      All fluids (Yamalube, Castrol, Motul) and replacement parts are guaranteed authentic, brand-new, and sealed before installation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-1.5">
                <strong className="block text-slate-900 font-semibold">Parts Replacement Verification</strong>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Replaced old parts (worn brake pads, spark plugs, filters) are returned to the motorcycle owner upon pickup for full visual verification.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 2: WORKSHOP COMMUNITY STANDARDS */}
          {activeSection === 'standards' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-orange-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-orange-800">
                  <Wrench className="w-4 h-4 text-orange-600" />
                  Workshop Bay Etiquette & Standards
                </span>
                <p className="text-[11px] leading-relaxed text-orange-900">
                  MotoCare enforces a maximum capacity of 10 service appointments per day to maintain top-tier diagnostic precision and prevent rushed repairs.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>Arrival Window Commitment</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Please arrive within your selected arrival time window. If you anticipate a delay exceeding 45 minutes, notify the workshop helpdesk so your bay assignment is preserved.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>Personal Belongings Policy</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Please remove helmet, personal valuables, wallets, and documents from the motorcycle utility box (U-box) before handing vehicle keys to the intake technician.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Safety in Service Bays</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    For customer safety, the mechanical lift bay area is restricted to certified mechanics and technicians wearing PPE. Owners may observe from the air-conditioned customer lounge.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: PRIVACY & DATA PROTECTION */}
          {activeSection === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-blue-800">
                  <Lock className="w-4 h-4 text-blue-600" />
                  Data Security & Privacy Commitment
                </span>
                <p className="text-[11px] leading-relaxed text-blue-900">
                  Your personal credentials, phone number, vehicle plate numbers, and service history are encrypted and strictly protected.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-1">
                  <strong className="block text-slate-900 font-semibold">1. Account Authentication</strong>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    User sessions and passwords are encrypted using industry-standard bcrypt hashing via Supabase Auth. Workshop staff never have access to plain-text passwords.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-1">
                  <strong className="block text-slate-900 font-semibold">2. Vehicle Information Usage</strong>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Plate numbers and odometer readings are utilized exclusively for technical warranty logging, preventive maintenance scheduling, and official service receipt generation.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-1">
                  <strong className="block text-slate-900 font-semibold">3. Zero Third-Party Sharing</strong>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    MotoCare will never sell, rent, or share your contact number with telemarketers or external advertisers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: ABOUT & LEGAL */}
          {activeSection === 'about' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xs">
                    MC
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">MotoCare Customer Portal</h4>
                    <span className="text-[10px] text-slate-500">Version 2.4.0 (Enterprise Production Build)</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  MotoCare is a certified workshop management and customer care ecosystem built for seamless vehicle tracking, transparent service package booking, and immutable maintenance records.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-1">
                <strong className="block text-slate-900 font-semibold">Digital Service Slip Legal Validity</strong>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Exported CSV maintenance logs and printable digital service slips generated by this application serve as official proof of workshop maintenance for vehicle warranty and resale appraisal purposes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            MotoCare Customer Portal • All Rights Reserved
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
}
