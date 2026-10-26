import { useState, type ReactNode } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  CheckCircle2,
  Scale
} from 'lucide-react';
import { SHOP_INFO } from '../../utils/shopInfo';
import { ScrollLock } from '../../hooks/useLockBodyScroll';

export interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
  onAccept?: () => void;
  hasAgreed?: boolean;
}

/** One numbered section: same heading and text size everywhere */
function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0">
          {n}
        </span>
        {title}
      </h3>
      <div className="space-y-2.5 pl-[34px]">{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-4 space-y-1.5 marker:text-orange-400">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Summary({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-orange-50/60 p-4 space-y-1.5">
      <p className="flex items-center gap-2 font-semibold text-slate-900">
        <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
        {title}
      </p>
      <p>{children}</p>
    </div>
  );
}

export default function LegalTermsModal({
  isOpen,
  onClose,
  initialTab = 'terms',
  onAccept,
  hasAgreed = false,
}: LegalTermsModalProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-5 animate-in fade-in duration-200 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      // The landing page's smooth scroll (Lenis) leaves the mouse wheel to this modal
      data-lenis-prevent
    >
      <ScrollLock />
      <div className="bg-white text-slate-800 w-full max-w-3xl rounded-t-[1.75rem] sm:rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[92dvh] sm:max-h-[88vh]">
        
        {/* =========================================================================
            HEADER: Title, Subtitle, Legal Reference & Close Button
            ========================================================================= */}
        <div className="px-5 sm:px-6 pt-5 pb-4 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h2 id="legal-modal-title" className="font-display text-lg font-bold tracking-tight text-slate-900">
                Terms & privacy
              </h2>
              <p className="text-sm text-slate-500 truncate">Updated October 2026</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* =========================================================================
            TABS: Terms of Service vs Privacy Policy Switcher
            ========================================================================= */}
        <div className="mx-5 sm:mx-6 mb-3 p-1 rounded-full bg-slate-100 flex sm:inline-flex sm:self-start items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'terms' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'privacy' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy</span>
          </button>

        </div>

        {/* =========================================================================
            SCROLLABLE CONTENT BODY (Eye-Friendly Calm Slate Styling)
            ========================================================================= */}
        <div className="px-5 sm:px-7 py-5 sm:py-6 overflow-y-auto flex-1 min-h-0 border-t border-slate-200/80 text-slate-600 text-[15px] sm:text-sm leading-relaxed">
          
          {/* TAB 1: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-7 animate-in fade-in duration-150">
              <Summary title="In short">
                These terms cover your MotoCare account and the repair services you book through it. Bookings are
                limited to one per service bay each day, every repair starts with an inspection, you approve any extra parts first, you pay in
                cash when you pick up, and our workmanship carries a 7-day warranty.
              </Summary>

              <Section n={1} title="Your account">
                <Bullets
                  items={[
                    'You must be at least 18 years old.',
                    'You must own the motorcycle you book, or have the owner’s permission to have it serviced.',
                    'Your name, mobile number, email, and plate number must be true and up to date.',
                    'Keep your password to yourself. You are responsible for bookings made from your account. Tell us right away if you think someone else used it.',
                    'Sign-in and sign-up pass a quick automated security check (Cloudflare) that blocks bots.',
                  ]}
                />
              </Section>

              <Section n={2} title="Bookings, arrival windows, and cancelling">
                <Bullets
                  items={[
                    'We accept one online booking per service bay per day, Monday to Saturday. The calendar shows how many slots are left. We are closed on Sundays. Walk-ins are served when a bay is free.',
                    'Choose an arrival window: 8:00 AM – 10:00 AM, 10:00 AM – 1:00 PM, or 1:00 PM – 4:00 PM. The shop confirms each online booking.',
                    'There is a 30-minute grace period after your window ends. After that, the booking is marked as missed and the slot goes to other riders, unless you told the shop beforehand.',
                    'You can cancel or move a booking online until work on your motorcycle starts. After that, message the shop.',
                  ]}
                />
              </Section>

              <Section n={3} title="Inspection, estimates, and extra work">
                <Bullets
                  items={[
                    'Every motorcycle is checked at intake (Stage 1) and inspected in the bay (Stage 2) before any repair (Stage 3).',
                    'Prices shown in the app are estimates. The final amount is confirmed at the shop after the inspection.',
                    'If we find another part that needs work, we ask you first, through the shop chat or by phone, and only do it once you approve.',
                    'Existing damage we find during the inspection (for example rust, cracks, or old wiring repairs) is noted on your record. We are not responsible for problems caused by earlier work done elsewhere.',
                  ]}
                />
              </Section>

              <Section n={4} title="Road test, release, and payment">
                <Bullets
                  items={[
                    'You allow our mechanics to test ride your motorcycle near the shop during Stage 4 (Quality Testing) to confirm the repair.',
                    'We notify you when your motorcycle is ready (Stage 5). Please inspect it and collect it during shop hours.',
                    'Payment is made in cash at the counter when you pick up. No payment is taken online.',
                    'Please remove valuables before drop-off. We are not responsible for items left on or in the motorcycle.',
                  ]}
                />
              </Section>

              <Section n={5} title="Warranty (Consumer Act, RA 7394)">
                <Bullets
                  items={[
                    'Workmanship: 7 calendar days from release. If a problem from our work comes back in that time, we re-check and fix it with no labor charge. Message the shop first, then bring the motorcycle with your ticket number or gate pass.',
                    'Parts we install carry their manufacturer’s warranty. Normal wear of consumables (brake pads, tires, bulbs) is not covered.',
                    'The warranty does not cover work done elsewhere after release, accidents, misuse, racing, or flood damage.',
                  ]}
                />
              </Section>

              <Section n={6} title="Reviews">
                <p>
                  You can rate a completed service. The shop checks reviews before they appear on the website, and may
                  hide ones that are abusive or unrelated to the service. Published reviews show your first name and last
                  initial, your motorcycle model, and the service.
                </p>
              </Section>

              <Section n={7} title="Electronic records (RA 8792)">
                <p>
                  Under the Electronic Commerce Act of 2000, electronic records count like paper ones. Your ticket number,
                  job order, and gate pass are the record of the work you approved and the work we did.
                </p>
              </Section>

              <Section n={8} title="Changes, governing law, and disputes">
                <Bullets
                  items={[
                    'We may update these terms. Changes are posted here, and the date at the top shows the latest version.',
                    'These terms follow the laws of the Philippines. If there is a problem, message the shop first so we can settle it. You may also bring a consumer complaint to the Department of Trade and Industry (DTI).',
                  ]}
                />
              </Section>
            </div>
          )}

          {/* TAB 2: PRIVACY POLICY (DATA PRIVACY ACT OF 2012, RA 10173) */}
          {activeTab === 'privacy' && (
            <div className="space-y-7 animate-in fade-in duration-150">
              <Summary title="In short">
                We collect only what we need to book and repair your motorcycle, we never sell it, and only you and
                MotoCare staff can see your records. This policy follows the Data Privacy Act of 2012 (RA 10173).
              </Summary>

              <Section n={1} title="Who we are">
                <p>
                  {SHOP_INFO.name}, {SHOP_INFO.address}, is responsible for your personal information (the personal
                  information controller under RA 10173). Our Data Protection Officer is the shop owner; see “Contact us”
                  below.
                </p>
              </Section>

              <Section n={2} title="What we collect">
                <Bullets
                  items={[
                    'Account: your name, email address, and mobile number. If you sign in with Google, we receive your name and email from Google.',
                    'Motorcycle: plate number, brand, model, year, and the problems you describe when booking.',
                    'Service records: your bookings, repair stages, assigned bay and mechanic, hardcopy requests, chats with the shop, and reviews.',
                  ]}
                />
                <p>
                  We do not collect sensitive personal information such as government ID numbers, and we do not take
                  payment details, since you pay in cash at the shop. MotoCare is not meant for children under 18.
                </p>
              </Section>

              <Section n={3} title="Why we use it">
                <Bullets
                  items={[
                    'To create your account, sign you in, and keep it secure (contract, and our legitimate interest in preventing misuse).',
                    'To book, repair, and release your motorcycle, and show its live repair stage on your dashboard (contract).',
                    'To email you when a booking is confirmed, the day before drop-off, and when your motorcycle is ready (contract).',
                    'To keep service records for warranty claims and the printed copies you request (contract, legal obligation).',
                    'To keep the daily booking limit fair and stop duplicate bookings (legitimate interest).',
                  ]}
                />
                <p>By creating an account, you agree to this policy. You can withdraw your consent anytime (see “Your rights”).</p>
              </Section>

              <Section n={4} title="Who we share it with">
                <p>
                  Only MotoCare staff can see your records. We never sell, rent, or trade your information, and we do not
                  use it for ads. We use these service providers to run MotoCare, and they handle data only on our
                  instructions:
                </p>
                <Bullets
                  items={[
                    'Supabase: our database and sign-in service.',
                    'Vercel: hosts the website.',
                    'Resend: sends our booking emails.',
                    'Cloudflare: the security check on sign-in and sign-up.',
                    'Google: “Continue with Google” sign-in and the shop map.',
                  ]}
                />
                <p>
                  Some of these providers store data on servers outside the Philippines. We choose providers with strong security
                  and only share what each one needs. We share information with the government only when the law requires it.
                </p>
              </Section>

              <Section n={5} title="Cookies and browser storage">
                <Bullets
                  items={[
                    'Your sign-in is kept in your browser’s storage so you stay signed in. The staff console sign-in ends when the tab is closed.',
                    'We also save small settings on your device, such as light or dark mode and whether you have seen the app guide. These contain no personal details.',
                    'The Cloudflare security check, Google sign-in, and the Google map may set their own cookies under their own policies.',
                  ]}
                />
              </Section>

              <Section n={6} title="How we protect it">
                <Bullets
                  items={[
                    'All connections use HTTPS encryption.',
                    'Database rules (row level security) let you see only your own records; other riders cannot see them.',
                    'Passwords are handled by our sign-in service and are never visible to shop staff.',
                    'Staff actions are recorded in an activity log, and only active staff accounts can open the workshop console.',
                  ]}
                />
                <p>
                  If a data breach affects your information, we will notify the National Privacy Commission and you within
                  72 hours of finding out, as the law requires.
                </p>
              </Section>

              <Section n={7} title="How long we keep it">
                <p>
                  We keep your account and service history while your account is active, so warranty claims and past
                  records stay available. When you ask us to delete your account, we delete or anonymize your personal
                  information, except records we must keep by law.
                </p>
              </Section>

              <Section n={8} title="Your rights (RA 10173)">
                <Bullets
                  items={[
                    'Be informed about how your information is used (this policy).',
                    'Access your information and get a copy of it.',
                    'Correct wrong details. You can edit most of them in My Profile.',
                    'Object to how we use your information, or withdraw your consent.',
                    'Have your information deleted or blocked.',
                    'Data portability: get your records in a commonly used format.',
                    'Be compensated for damages caused by wrong or unlawful use of your information.',
                    'File a complaint with the National Privacy Commission (privacy.gov.ph).',
                  ]}
                />
              </Section>

              <Section n={9} title="Contact us">
                <p>For privacy questions or to use any of your rights, contact our Data Protection Officer:</p>
                <div className="rounded-xl bg-slate-50 p-3.5 space-y-0.5">
                  <p className="font-semibold text-slate-900">{SHOP_INFO.name} · Data Protection Officer</p>
                  <p>{SHOP_INFO.address}</p>
                  <p>Phone: {SHOP_INFO.phone}, or use “Message the shop” in your dashboard.</p>
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* =========================================================================
            FOOTER CONTROLS: "Close Window" & "I Have Read & Agree to All Terms"
            ========================================================================= */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${hasAgreed ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span>
              {hasAgreed ? 'You have previously accepted these terms.' : 'Please review all terms carefully before agreeing.'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition cursor-pointer"
            >
              Close
            </button>

            {onAccept && (
              <button
                type="button"
                onClick={handleAccept}
                className="flex-[2] sm:flex-none px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-md shadow-orange-500/25 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I agree</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
