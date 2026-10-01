import { useState } from 'react';
import {
  ShieldCheck,
  Wrench,
  Lock,
  FileText,
  Key,
  MessageSquare,
  User,
  CheckCircle2,
  ChevronRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { TabType } from '../../types/dashboard';

interface SettingsTabProps {
  onOpenPasswordModal: () => void;
  onOpenHelpdesk: () => void;
  onNavigateTab: (tab: TabType) => void;
}

type SettingsSection = 'warranty' | 'standards' | 'privacy' | 'terms';

export default function SettingsTab({
  onOpenPasswordModal,
  onOpenHelpdesk,
  onNavigateTab,
}: SettingsTabProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('warranty');

  const navCategories = [
    {
      id: 'warranty' as SettingsSection,
      label: 'Service Warranty & Guarantees',
      badge: 'Protected',
      icon: ShieldCheck,
      description: '7-day labor coverage, parts assurance, and zero-deposit terms',
    },
    {
      id: 'standards' as SettingsSection,
      label: 'Workshop Community Standards',
      badge: 'Code of Conduct',
      icon: Wrench,
      description: 'Bay etiquette, 10-slot capacity rules, and arrival window',
    },
    {
      id: 'privacy' as SettingsSection,
      label: 'Privacy & Data Protection',
      badge: 'Encrypted',
      icon: Lock,
      description: 'Account security, garage records, and Supabase protection',
    },
    {
      id: 'terms' as SettingsSection,
      label: 'System & Legal Terms',
      badge: 'v2.4.0',
      icon: FileText,
      description: 'Digital ticket validity, liability limits, and platform policies',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">
              Official Policies
            </span>
            <span className="text-xs text-slate-400">• Updated for 2026</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Settings, Policies & Standards
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Review your MotoCare customer rights, 7-day labor warranty, bay etiquette, and account security controls.
          </p>
        </div>

        {/* Quick Action Pills */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenPasswordModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-xs"
          >
            <Key className="w-3.5 h-3.5 text-orange-500" />
            <span>Change Password</span>
          </button>
          <button
            type="button"
            onClick={onOpenHelpdesk}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition cursor-pointer shadow-sm shadow-orange-500/20"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Ask Advisor</span>
          </button>
        </div>
      </div>

      {/* 2. Main Layout: Left Navigation / Right Policy Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Category Switcher & Quick Shortcuts */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-4 shadow-xs space-y-2">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Policy Categories
            </div>

            <div className="space-y-1.5">
              {navCategories.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeSection === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveSection(cat.id)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-orange-50 text-orange-600 group-hover:bg-orange-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {cat.label}
                        </div>
                        <div className={`text-[11px] truncate ${isActive ? 'text-orange-100' : 'text-slate-400'}`}>
                          {cat.badge}
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isActive ? 'text-white translate-x-0.5' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side Card: Account Quick Shortcuts */}
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Account Quick Links</h4>
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => onNavigateTab('profile')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-slate-700 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold">My Garage & Profile</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={onOpenPasswordModal}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-slate-700 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Key className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold">Security & Password</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={onOpenHelpdesk}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-slate-700 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold">Workshop Support Chat</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Detailed Content Pane */}
        <div className="lg:col-span-8 space-y-5">
          {/* SECTION 1: Service Warranty & Guarantees */}
          {activeSection === 'warranty' && (
            <div className="space-y-5">
              {/* Highlight Hero Card */}
              <div className="bg-gradient-to-br from-orange-500 via-amber-600 to-slate-900 rounded-[2rem] p-6 text-white shadow-lg space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-xs font-semibold text-orange-200">
                  <ShieldCheck className="w-4 h-4 text-white" />
                  <span>Verified MotoCare Rider Protection</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                  7-Day Labor & Workmanship Guarantee
                </h3>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-xl">
                  Every maintenance procedure performed by our certified technicians is backed by an unconditional 7-day labor warranty. If any symptom recurs within 7 days of counter release, return your unit for immediate prioritized recalibration with zero labor fees.
                </p>
              </div>

              {/* Policy Points Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-[1.75rem] p-5 shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Zero Advance Deposit</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Reservations on the MotoCare digital platform require ₱0.00 upfront payment. You only settle the service invoice at the shop counter after the repair is completed and road-tested.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-[1.75rem] p-5 shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">OEM Parts Transparency</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    All replaced components (worn spark plugs, brake pads, belts, and filters) are neatly boxed and presented to you upon pickup so you can verify physical replacement.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-[1.75rem] p-5 shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">48-Hour Rapid Re-Inspection</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Warranty claims are flagged as urgent and assigned immediately to the head mechanic within 48 hours to minimize any downtime for daily commuters.
                  </p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-[1.75rem] p-5 shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Fair Price Match</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    All fluids, lubricants, and standard replacement consumables follow authorized distributor SRP. No hidden shop fees or unapproved line-item charges.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Workshop Community Standards */}
          {activeSection === 'standards' && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Workshop Community Standards & Bay Etiquette
                    </h3>
                    <p className="text-xs text-slate-500">
                      Help us maintain an efficient, safe, and respectful environment for all riders.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center text-xs">1</span>
                      10-Slot Active Bay Capacity
                    </div>
                    <p className="text-slate-500 text-xs">
                      Our Santa Maria workshop operates 10 fully equipped hydraulic service bays. Booking reservations ensure an allocated slot and a scheduled mechanic. Unscheduled walk-ins are placed on standby.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center text-xs">2</span>
                      15-Minute Drop-off Arrival Window
                    </div>
                    <p className="text-slate-500 text-xs">
                      Please arrive within 15 minutes of your confirmed drop-off time. If you expect a delay, notify our service advisor through the in-app Workshop Chat so we can hold your bay allocation.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center text-xs">3</span>
                      Active Bay Safety Zone
                    </div>
                    <p className="text-slate-500 text-xs">
                      For customer safety, the hydraulic lift zone is restricted to certified technicians wearing protective gear. Riders are invited to relax in the air-conditioned customer lounge with live bay monitors.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center text-xs">4</span>
                      Personal Belongings & Valuables
                    </div>
                    <p className="text-slate-500 text-xs">
                      Please remove top-box valuables, mobile holders, cameras, and personal effects before handing over the keys. MotoCare provides a secure key lockbox for unit keys during intake.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Privacy & Data Protection */}
          {activeSection === 'privacy' && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Privacy Policy & Rider Data Protection
                    </h3>
                    <p className="text-xs text-slate-500">
                      How we protect your account information, vehicle history, and contact details.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <div className="border border-slate-100 rounded-2xl p-4.5 bg-slate-50/70 space-y-1.5">
                    <h4 className="font-bold text-slate-900">1. Cloud Infrastructure & Encryption</h4>
                    <p className="text-xs text-slate-500">
                      All rider credentials and motorcycle diagnostic logs are securely stored on Supabase enterprise infrastructure with AES-256 encryption at rest and strict TLS 1.3 in transit.
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-2xl p-4.5 bg-slate-50/70 space-y-1.5">
                    <h4 className="font-bold text-slate-900">2. Row Level Security (RLS)</h4>
                    <p className="text-xs text-slate-500">
                      Our database implements cryptographic Row Level Security policies. Only you and authorized workshop staff assigned to your service ticket can access your motorcycle records.
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-2xl p-4.5 bg-slate-50/70 space-y-1.5">
                    <h4 className="font-bold text-slate-900">3. Zero Third-Party Monetization</h4>
                    <p className="text-xs text-slate-500">
                      We never sell, rent, or lease your phone number, email address, or riding logs to external advertising networks or data brokers. Communications are strictly operational.
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-2xl p-4.5 bg-slate-50/70 space-y-1.5">
                    <h4 className="font-bold text-slate-900">4. Right to Data Portability</h4>
                    <p className="text-xs text-slate-500">
                      You maintain full ownership of your vehicle service history. You can view, download, and export digital service slips and invoices at any time from the Service Records tab.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: System & Legal Terms */}
          {activeSection === 'terms' && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      System Terms & Legal Service Agreement
                    </h3>
                    <p className="text-xs text-slate-500">
                      Legal validity of digital service records, release authorizations, and terms of service.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <h4 className="font-bold text-slate-900">Digital Ticket Legal Validity</h4>
                    <p className="text-xs text-slate-500">
                      Electronic service ticket numbers generated on this portal serve as legally binding work authorization slips pursuant to the Electronic Commerce Act of 2000 (R.A. 8792).
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <h4 className="font-bold text-slate-900">Pre-Existing Conditions & Disclaimer</h4>
                    <p className="text-xs text-slate-500">
                      Pre-existing structural hairline fractures, deep chassis corrosion, or previous unauthorized electrical splicing documented during the initial Stage 2 Diagnostic Check are exempt from warranty liability.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <h4 className="font-bold text-slate-900">Unclaimed Vehicle Policy</h4>
                    <p className="text-xs text-slate-500">
                      Motorcycles cleared for pickup in Stage 5 that remain unclaimed for more than fourteen (14) calendar days following digital notification are subject to a nominal safekeeping bay storage charge of ₱100/day.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
                    <span>MotoCare Professional Workshop System</span>
                    <span className="font-mono font-medium text-slate-600">v2.4.0 Production</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
