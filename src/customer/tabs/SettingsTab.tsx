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
  Scale
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
      shortLabel: 'Warranty & Coverage',
      badge: 'Protected',
      icon: ShieldCheck,
      description: '7-day labor coverage, parts assurance, and zero-deposit terms',
    },
    {
      id: 'standards' as SettingsSection,
      label: 'Workshop Community Standards',
      shortLabel: 'Bay Standards',
      badge: 'Code of Conduct',
      icon: Wrench,
      description: 'Bay etiquette, 10-slot capacity rules, and arrival window',
    },
    {
      id: 'privacy' as SettingsSection,
      label: 'Privacy & Data Protection',
      shortLabel: 'Privacy & Data',
      badge: 'Encrypted',
      icon: Lock,
      description: 'Account security, garage records, and Supabase protection',
    },
    {
      id: 'terms' as SettingsSection,
      label: 'System & Legal Terms',
      shortLabel: 'Legal Terms',
      badge: 'v2.4.0',
      icon: FileText,
      description: 'Digital ticket validity, liability limits, and platform policies',
    },
  ];

  return (
    <div className="space-y-3.5 sm:space-y-6 pb-24 sm:pb-12">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-orange-50 text-orange-600 border border-orange-200">
              Official Policies
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400">• Updated for 2026</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Settings, Policies & Standards
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Review your MotoCare customer rights, 7-day labor warranty, bay etiquette, and account security controls.
          </p>
        </div>

        {/* Quick Action Pills */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenPasswordModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs active:scale-95"
          >
            <Key className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span>Change Password</span>
          </button>
          <button
            type="button"
            onClick={onOpenHelpdesk}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition cursor-pointer shadow-sm shadow-orange-500/20 active:scale-95"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>Ask Staff</span>
          </button>
        </div>
      </div>

      {/* 2. Mobile Category Switcher Pills (< lg screens) */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navCategories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeSection === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveSection(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 active:scale-95 ${
                isActive
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-orange-500'}`} />
              <span>{cat.shortLabel || cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Layout: Desktop Sidebar / Content Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Desktop Left Sidebar (hidden on mobile, replaced by horizontal pill bar above) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
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

          {/* Desktop Account Quick Links */}
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

        {/* Right Side: Detailed Content Pane (Immediately visible on mobile!) */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-5">
          {/* SECTION 1: Service Warranty & Guarantees */}
          {activeSection === 'warranty' && (
            <div className="space-y-3 sm:space-y-4">
              {/* Highlight Hero Card - Premium White Certificate Card (Eliminates orange clash) */}
              <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xs space-y-2.5 sm:space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/80 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      Official MotoCare Guarantee
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>100% Free Labor Re-check</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                    7-Day Labor & Workmanship Warranty
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                    Every maintenance procedure performed by our certified technicians is backed by an unconditional 7-day labor warranty. If any symptom recurs within 7 days of counter release, return your unit for immediate prioritized recalibration with zero labor fees.
                  </p>
                </div>
              </div>

              {/* Policy Points Grid (Compact 2-column layout on mobile!) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-2xs space-y-1 sm:space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 sm:mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Zero Advance Deposit</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug mt-0.5">
                      ₱0.00 upfront payment. Settle only after repair is road-tested.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-2xs space-y-1 sm:space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-1.5 sm:mb-2">
                      <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">OEM Parts Transparency</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug mt-0.5">
                      All replaced worn parts are boxed and returned upon pickup.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-2xs space-y-1 sm:space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 sm:mb-2">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">48-Hour Re-Inspection</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug mt-0.5">
                      Warranty claims are prioritized and inspected within 48 hours.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-2xs space-y-1 sm:space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center mb-1.5 sm:mb-2">
                      <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">Fair Price Match</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug mt-0.5">
                      Follows distributor SRP. Zero hidden fees or extra charges.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Workshop Community Standards */}
          {activeSection === 'standards' && (
            <div className="space-y-4 sm:space-y-5">
              <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xs space-y-3.5 sm:space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 sm:pb-4">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold shrink-0">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Workshop Community Standards & Bay Etiquette
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500">
                      Help us maintain an efficient, safe, and respectful environment for all riders.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 sm:space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">1</span>
                      <span>10-Slot Active Bay Capacity</span>
                    </div>
                    <p className="text-slate-500 text-[11px] sm:text-xs pl-7 sm:pl-8 leading-snug">
                      Our Santa Maria workshop operates 10 fully equipped hydraulic service bays. Booking reservations ensure an allocated slot and a scheduled mechanic. Unscheduled walk-ins are placed on standby.
                    </p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">2</span>
                      <span>15-Minute Drop-off Arrival Window</span>
                    </div>
                    <p className="text-slate-500 text-[11px] sm:text-xs pl-7 sm:pl-8 leading-snug">
                      Please arrive within 15 minutes of your confirmed drop-off time. If you expect a delay, notify our service advisor through the in-app Workshop Chat so we can hold your bay allocation.
                    </p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">3</span>
                      <span>Active Bay Safety Zone</span>
                    </div>
                    <p className="text-slate-500 text-[11px] sm:text-xs pl-7 sm:pl-8 leading-snug">
                      For customer safety, the hydraulic lift zone is restricted to certified technicians wearing protective gear. Riders are invited to relax in the air-conditioned customer lounge with live bay monitors.
                    </p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-orange-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">4</span>
                      <span>Personal Belongings & Valuables</span>
                    </div>
                    <p className="text-slate-500 text-[11px] sm:text-xs pl-7 sm:pl-8 leading-snug">
                      Please remove top-box valuables, mobile holders, cameras, and personal effects before handing over the keys. MotoCare provides a secure key lockbox for unit keys during intake.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Privacy & Data Protection */}
          {activeSection === 'privacy' && (
            <div className="space-y-4 sm:space-y-5">
              <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xs space-y-3.5 sm:space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 sm:pb-4">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Privacy Policy & Rider Data Protection
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500">
                      How we protect your account information, vehicle history, and contact details.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 sm:space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <div className="border border-slate-100 rounded-xl sm:rounded-2xl p-3.5 sm:p-4.5 bg-slate-50/70 space-y-1">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">1. Cloud Infrastructure & Encryption</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
                      All rider credentials and motorcycle diagnostic logs are securely stored on Supabase enterprise infrastructure with AES-256 encryption at rest and strict TLS 1.3 in transit.
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-xl sm:rounded-2xl p-3.5 sm:p-4.5 bg-slate-50/70 space-y-1">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">2. Row Level Security (RLS)</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
                      Our database implements cryptographic Row Level Security policies. Only you and authorized workshop staff assigned to your service ticket can access your motorcycle records.
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-xl sm:rounded-2xl p-3.5 sm:p-4.5 bg-slate-50/70 space-y-1">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">3. Zero Third-Party Monetization</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
                      We never sell, rent, or lease your phone number, email address, or riding logs to external advertising networks or data brokers. Communications are strictly operational.
                    </p>
                  </div>

                  <div className="border border-slate-100 rounded-xl sm:rounded-2xl p-3.5 sm:p-4.5 bg-slate-50/70 space-y-1">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">4. Right to Data Portability</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
                      You maintain full ownership of your vehicle service history. You can view, download, and export digital service slips and invoices at any time from the Service Records tab.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: System & Legal Terms */}
          {activeSection === 'terms' && (
            <div className="space-y-4 sm:space-y-5">
              <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 shadow-xs space-y-3.5 sm:space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 sm:pb-4">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      System Terms & Legal Service Agreement
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500">
                      Legal validity of digital service records, release authorizations, and terms of service.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 sm:space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Digital Ticket Legal Validity</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
                      Electronic service ticket numbers generated on this portal serve as legally binding work authorization slips pursuant to the Electronic Commerce Act of 2000 (R.A. 8792).
                    </p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Pre-Existing Conditions & Disclaimer</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
                      Pre-existing structural hairline fractures, deep chassis corrosion, or previous unauthorized electrical splicing documented during the initial Stage 2 Diagnostic Check are exempt from warranty liability.
                    </p>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Unclaimed Vehicle Policy</h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
                      Motorcycles cleared for pickup in Stage 5 that remain unclaimed for more than fourteen (14) calendar days following digital notification are subject to a nominal safekeeping bay storage charge of ₱100/day.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] sm:text-xs text-slate-400 border-t border-slate-100">
                    <span>MotoCare Professional Workshop System</span>
                    <span className="font-mono font-medium text-slate-600">v2.4.0 Production</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Account Quick Links (< lg screens, cleanly positioned at bottom) */}
          <div className="lg:hidden bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900">Account Quick Links</h4>
            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => onNavigateTab('profile')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-slate-700 transition cursor-pointer active:scale-[0.99]"
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
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-slate-700 transition cursor-pointer active:scale-[0.99]"
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
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 text-slate-700 transition cursor-pointer active:scale-[0.99]"
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
      </div>
    </div>
  );
}
