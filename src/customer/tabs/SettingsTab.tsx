import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, ChevronRight } from '../../components/icons';
import { TabType } from '../../types/dashboard';
import { TIME_SLOTS } from '../../utils/bookingLifecycle';
import { FIXED_WORKSHOP_CAPACITY } from '../../utils/workshopCapacity';
import { SHOP_INFO } from '../../utils/shopInfo';
import LegalTermsModal from '../../components/legal/LegalTermsModal';
import type { ThemePreference } from '../../utils/theme';

interface SettingsTabProps {
  onOpenPasswordModal: () => void;
  onOpenHelpdesk: () => void;
  onNavigateTab: (tab: TabType) => void;
  themePreference?: ThemePreference;
  onChangeTheme?: (preference: ThemePreference) => void;
}

const APPEARANCE_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

type SettingsSection = 'warranty' | 'booking' | 'privacy' | 'account';

const SECTIONS = [
  { id: 'warranty' as SettingsSection, label: 'Warranty & payment', hint: '7-day workmanship warranty' },
  { id: 'booking' as SettingsSection, label: 'Booking rules', hint: 'Windows, grace period, cancelling' },
  { id: 'privacy' as SettingsSection, label: 'Privacy & your data', hint: 'What we keep and who sees it' },
  { id: 'account' as SettingsSection, label: 'Account & security', hint: 'Password and sign-in' },
];

// "08:00 AM - 10:00 AM" -> "8:00 AM – 10:00 AM"
const formatWindow = (id: string) => id.replace(/^0/, '').replace(' - 0', ' – ').replace(' - ', ' – ');

const card = 'bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated';

/** One rule: a check icon, a bold title, and a plain explanation */
function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-0.5 text-sm text-slate-500 leading-relaxed">{children}</div>
    </li>
  );
}

/** A content card with an icon header and a list of rules */
function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${card} p-5 sm:p-6`}>
      <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500">{subtitle}</p>
      <ul className="mt-4 pt-4 border-t border-slate-100 divide-y divide-slate-100">{children}</ul>
    </div>
  );
}

export default function SettingsTab({
  onOpenPasswordModal,
  onOpenHelpdesk,
  onNavigateTab,
  themePreference = 'system',
  onChangeTheme,
}: SettingsTabProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('warranty');
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy' | null>(null);

  const quickLinks = [
    { label: 'My profile & motorcycles', onClick: () => onNavigateTab('profile') },
    { label: 'Change password', onClick: onOpenPasswordModal },
    { label: 'Message the shop', onClick: onOpenHelpdesk },
    { label: 'Full terms & privacy policy', onClick: () => setLegalTab('terms') },
  ];

  return (
    <div className="space-y-4 sm:space-y-5 pb-24 sm:pb-12">
      {/* Header */}
      <div className={`${card} p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-[-0.03em] leading-tight">
            Settings & <span className="text-orange-500">policies</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500 max-w-xl leading-relaxed">
            How bookings, the warranty, and your data work at MotoCare.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenPasswordModal}
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition cursor-pointer active:scale-95"
          >
            <span className="sm:hidden">Password</span>
            <span className="hidden sm:inline">Change password</span>
          </button>
          <button
            type="button"
            onClick={onOpenHelpdesk}
            className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-4 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 transition cursor-pointer active:scale-95"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            Ask the shop
          </button>
        </div>
      </div>

      {/* Phones and tablets: all four sections visible, two per row on phones */}
      <div className="lg:hidden grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              aria-pressed={isActive}
              className={`px-3 py-2.5 rounded-full text-xs font-semibold text-center truncate border transition cursor-pointer ${
                isActive
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Desktop: section list + quick links */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <nav className={`${card} p-2`}>
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative w-full px-4 py-3 rounded-2xl flex items-center gap-3 text-left transition cursor-pointer ${
                    isActive ? 'bg-orange-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {isActive && <span aria-hidden="true" className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-orange-500" />}
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${isActive ? 'text-orange-700' : 'text-slate-900'}`}>
                      {section.label}
                    </span>
                    <span className="block text-xs text-slate-400 truncate">{section.hint}</span>
                  </span>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-300'}`} />
                </button>
              );
            })}
          </nav>

          <QuickLinks links={quickLinks} />
        </div>

        {/* Content */}
        <div className="lg:col-span-8 space-y-4">
          {activeSection === 'warranty' && (
            <>
              <SectionCard title="Warranty" subtitle="Covers the work we did on your motorcycle.">
                <Rule title="7-day workmanship warranty">
                  If a problem from the work we did comes back within 7 calendar days of release, bring the motorcycle
                  back and we&apos;ll re-check and fix it with no labor charge.
                </Rule>
                <Rule title="Replaced parts">Parts we install carry their manufacturer&apos;s warranty.</Rule>
                <Rule title="How to claim">
                  Message the shop first, then bring the motorcycle with your ticket number or gate pass.
                </Rule>
                <Rule title="Not covered">
                  Problems from work done elsewhere after release, accidents, misuse, and normal wear of consumables
                  like brake pads, tires, and bulbs.
                </Rule>
              </SectionCard>

              <SectionCard title="Payment" subtitle="Nothing is paid online.">
                <Rule title="Pay at the counter on pickup">
                  You pay in cash at the shop when you collect your motorcycle. There is no deposit and no online
                  payment.
                </Rule>
                <Rule title="Prices are estimates">
                  Service prices shown in the app are estimates. The final amount is confirmed at the shop after the
                  inspection.
                </Rule>
                <Rule title="Extra parts need your OK">
                  If the mechanic finds something else that needs replacing, we ask you first before doing it.
                </Rule>
              </SectionCard>
            </>
          )}

          {activeSection === 'booking' && (
            <SectionCard
              title="Booking rules"
              subtitle="The same rules the booking calendar follows."
            >
              <Rule title={`Monday to Saturday, up to ${FIXED_WORKSHOP_CAPACITY} bookings a day`}>
                We&apos;re closed on Sundays. Once a day has {FIXED_WORKSHOP_CAPACITY} bookings, it shows as Full.
              </Rule>
              <Rule title="Pick an arrival window">
                <span className="flex flex-wrap gap-1.5 mt-1.5">
                  {TIME_SLOTS.map((slot) => (
                    <span
                      key={slot.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium"
                    >
                      {formatWindow(slot.id)}
                    </span>
                  ))}
                </span>
              </Rule>
              <Rule title={`${TIME_SLOTS[0].graceMinutes}-minute grace period`}>
                You can still check in up to {TIME_SLOTS[0].graceMinutes} minutes after your window ends. After that the
                booking is marked as missed and the slot opens for other riders. Running late? Message the shop before
                your window ends.
              </Rule>
              <Rule title="Cancelling or changing">
                You can cancel or move your booking online until work starts. After that, message the shop.
              </Rule>
              <Rule title="Walk-ins are welcome">
                No booking? Come during shop hours and get a ticket at the counter, as long as there&apos;s room.
              </Rule>
              <Rule title="Before you hand over the keys">
                Please take valuables out of the top box and remove phone holders and cameras.
              </Rule>
              <li className="pt-3.5">
                <p className="text-sm text-slate-500 leading-relaxed">
                  <span className="font-semibold text-slate-700">Shop hours:</span> {SHOP_INFO.hours}
                  <br />
                  {SHOP_INFO.address} · {SHOP_INFO.phone}
                </p>
              </li>
            </SectionCard>
          )}

          {activeSection === 'privacy' && (
            <SectionCard title="Privacy & your data" subtitle="Following the Data Privacy Act (RA 10173).">
              <Rule title="What we keep">
                Your name, email, and phone number; your motorcycles; your bookings and service history; your chats
                with the shop; and any reviews you write.
              </Rule>
              <Rule title="Who can see it">
                Only you and MotoCare staff. Other riders can never see your profile, motorcycles, or tickets.
              </Rule>
              <Rule title="The public tracking page">
                Anyone with your ticket number sees only the service, the repair stage, and a partly hidden plate
                number. Keep your ticket number to yourself.
              </Rule>
              <Rule title="Emails we send">
                A confirmation when your booking is accepted, a reminder the day before drop-off, and a notice when
                your motorcycle is ready. They&apos;re sent through our email provider (Resend).
              </Rule>
              <Rule title="We never sell your data">Your details are used only to run your service, never for ads.</Rule>
              <Rule title="Fix or delete your data">
                Edit your details anytime in My Profile. To delete your account, message the shop.
              </Rule>
              <li>
                <button
                  type="button"
                  onClick={() => setLegalTab('privacy')}
                  className="text-sm font-semibold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1 cursor-pointer"
                >
                  Read the full privacy policy
                  <ChevronRight className="w-4 h-4" />
                </button>
              </li>
            </SectionCard>
          )}

          {activeSection === 'account' && (
            <SectionCard title="Account & security" subtitle="Keep your account safe.">
              {onChangeTheme && (
                <Rule title="Appearance">
                  <span className="block">Light, dark, or follow your phone&apos;s setting. Saved on this device.</span>
                  <span className="mt-2 inline-grid grid-cols-3 gap-1 p-1 rounded-full bg-slate-100" role="radiogroup" aria-label="Appearance">
                    {APPEARANCE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={themePreference === option.id}
                        onClick={() => onChangeTheme(option.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                          themePreference === option.id ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </span>
                </Rule>
              )}
              <Rule title="Your password stays private">
                Passwords are handled by our sign-in service (Supabase Auth). Not even the shop staff can see it.
              </Rule>
              <Rule title="Use a strong password">
                At least 8 characters with upper and lower case letters, a number, and a symbol.{' '}
                <button
                  type="button"
                  onClick={onOpenPasswordModal}
                  className="font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                >
                  Change password
                </button>
              </Rule>
              <Rule title="Signed up with Google?">
                You can keep using &quot;Continue with Google&quot;. Google handles that sign-in.
              </Rule>
              <Rule title="Secure connection">Everything between your phone and our servers is encrypted (HTTPS).</Rule>
              <Rule title="On a shared phone or computer">Sign out when you&apos;re done.</Rule>
            </SectionCard>
          )}

          {/* Phones: quick links under the content */}
          <div className="lg:hidden">
            <QuickLinks links={quickLinks} />
          </div>
        </div>
      </div>

      {legalTab &&
        createPortal(
          <LegalTermsModal key={legalTab} isOpen initialTab={legalTab} onClose={() => setLegalTab(null)} />,
          document.body
        )}
    </div>
  );
}

function QuickLinks({
  links,
}: {
  links: { label: string; onClick: () => void }[];
}) {
  return (
    <div className={`${card} p-2`}>
      <p className="px-3 pt-2 pb-1 text-xs font-medium text-slate-400">Quick links</p>
      {links.map((link) => (
        <button
          key={link.label}
          type="button"
          onClick={link.onClick}
          className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left hover:bg-slate-50 transition cursor-pointer"
        >
          <span className="flex-1 text-sm font-medium text-slate-700">{link.label}</span>
          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
        </button>
      ))}
    </div>
  );
}
