import { useState } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  CheckCircle2,
  Scale
} from 'lucide-react';
import { SHOP_INFO } from '../../utils/shopInfo';

export interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
  onAccept?: () => void;
  hasAgreed?: boolean;
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
    >
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
        <div className="px-5 sm:px-7 py-5 sm:py-6 space-y-6 overflow-y-auto flex-1 min-h-0 border-t border-slate-200/80 text-slate-600 text-sm leading-relaxed">
          
          {/* TAB 1: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Executive Summary Card */}
              <div className="bg-orange-50/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4 text-orange-600" />
                  <span>Executive Summary for Riders</span>
                </div>
                <p className="text-slate-600 text-[13px] leading-relaxed">
                  This Agreement governs your access to and use of the <strong>MotoCare Workshop Portal</strong> and our motorcycle repair services. By registering an account, you agree to transparent transactions, our limit of 6 online bookings per day, the bay inspection before repairs, quality testing before release, and our 7-day workmanship warranty.
                </p>
              </div>

              {/* Section 1 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">1</span>
                  Acceptance of Terms & Rider Eligibility
                </h3>
                <p>
                  By creating an account, registering a vehicle, or submitting a service booking on MotoCare, you acknowledge and agree to be bound by these Terms of Service and all statutory laws and administrative regulations of the Republic of the Philippines.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[13px]">
                  <li>You must be at least eighteen (18) years of age with full legal capacity to enter into binding agreements.</li>
                  <li>You warrant that you are the lawful owner of the motorcycle or have obtained express permission from the registered owner to submit the vehicle for maintenance, repair, and diagnostic procedures.</li>
                  <li>All registration credentials (Full Name, Contact Number, and License Plate) must be truthful, authentic, and accurate.</li>
                </ul>
              </section>

              {/* Section 2 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">2</span>
                  Workshop Capacity & Daily 6-Unit Service Cap
                </h3>
                <p>
                  To guarantee uncompromised mechanical workmanship, prevent floor congestion, and ensure dedicated technician focus, MotoCare enforces a strict maximum cap of <strong>six (6) service units per operating day</strong>.
                </p>
                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <p className="font-semibold text-slate-800 text-[13px]">Arrival Windows & Grace Period:</p>
                  <p className="text-slate-600 text-[13px]">
                    Riders select an arrival window: 8:00 AM – 10:00 AM, 10:00 AM – 1:00 PM, or 1:00 PM – 4:00 PM. A <strong>30-minute grace period</strong> is observed after the window ends. After that, the booking is marked as missed and the slot is released to other riders, unless you coordinated with the shop beforehand.
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">3</span>
                  Pre-Intake Diagnostics & Disclaimer of Pre-Existing Defects
                </h3>
                <p>
                  Before any repair work (Stage 3 Repair), our mechanics check the motorcycle at intake (Stage 1) and inspect it in the bay (Stage 2 Bay Inspection).
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[13px]">
                  <li>
                    <strong>Documentation of Pre-Existing Wear:</strong> Structural hairline fractures, chassis rust, stripped bolt threads, unauthorized electrical wire splices, or internal engine sludge accumulated from past neglected oil intervals are documented and recorded.
                  </li>
                  <li>
                    <strong>Exemption of Liability:</strong> MotoCare is not liable for structural fatigue, brittle plastic clips, or latent engine issues caused by prior improper maintenance executed by third-party workshops.
                  </li>
                  <li>
                    <strong>Mandatory Rider Approval:</strong> If technicians identify hidden critical defects during disassembly, work on that item waits until the rider approves the added estimate through the shop chat or by phone.
                  </li>
                </ul>
              </section>

              {/* Section 4 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">4</span>
                  Quality Assurance Road Testing & Vehicle Release
                </h3>
                <p>
                  By checking in your vehicle into our 5-Stage Service Progression, you authorize our mechanics to test ride the motorcycle near the shop during Stage 4 Quality Testing to confirm the repair.
                </p>
                <p className="text-[13px] text-slate-600">
                  Once the motorcycle reaches Stage 5 (Ready for Release), you will be notified. Please inspect and collect it promptly during shop hours; payment is made in cash at the counter on pickup.
                </p>
              </section>

              {/* Section 5 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">5</span>
                  Workmanship Warranty & Replacement Parts (Consumer Act RA 7394)
                </h3>
                <p>
                  Pursuant to the Consumer Act of the Philippines (Republic Act No. 7394), MotoCare provides standard warranties on all services rendered:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[13px]">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="font-bold text-slate-900 block text-[13px]">Labor Warranty</span>
                    <span className="text-slate-600 text-[13px] mt-0.5 block">
                      Covered for seven (7) calendar days from the date the motorcycle is released.
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="font-bold text-slate-900 block text-[13px]">Replacement Parts</span>
                    <span className="text-slate-600 text-[13px] mt-0.5 block">
                      Installed parts carry their manufacturer's warranty. Normal wear of consumables (brake pads, tires, bulbs) is excluded.
                    </span>
                  </div>
                </div>
                <p className="text-[13px] text-slate-500 italic">
                  *Warranty is voided if the motorcycle is serviced, disassembled, or modified by external mechanics, or subjected to track racing, stunt riding, or severe water immersion after release.
                </p>
              </section>

              {/* Section 6 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">6</span>
                  Electronic Records & Legal Validity (RA 8792)
                </h3>
                <p>
                  Under the Electronic Commerce Act of 2000 (Republic Act No. 8792), electronic records are recognized like paper ones. Your digital ticket (e.g., MC-7514), job order, and gate pass serve as the record of the work you authorized and the work we performed.
                </p>
              </section>

              {/* Section 7 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">7</span>
                  Governing Law & Dispute Resolution
                </h3>
                <p>
                  These Terms of Service are governed by and construed in accordance with the laws of the Republic of the Philippines. Any controversy or dispute arising from service delivery shall first be submitted to mutual amicable settlement or mediation through the Department of Trade and Industry (DTI) Fair Trade Enforcement Bureau before seeking judicial recourse.
                </p>
              </section>
            </div>
          )}

          {/* TAB 2: PRIVACY POLICY (DATA PRIVACY ACT OF 2012 / RA 10173) */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Compliance Notice Card */}
              <div className="bg-orange-50/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>National Privacy Commission (NPC) Compliance Notice</span>
                </div>
                <p className="text-slate-600 text-[13px] leading-relaxed">
                  MotoCare is committed to protecting your personal information in strict compliance with <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong> and its Implementing Rules and Regulations. We strictly <strong>do not sell, rent, or trade customer contact details with third-party advertisers</strong>.
                </p>
              </div>

              {/* Privacy Section 1 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">1</span>
                  Information We Collect
                </h3>
                <p>
                  When you register and use the MotoCare platform, we collect only what we need to run your service:
                </p>
                <div className="space-y-2 text-[13px]">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="font-bold text-slate-800 block">Personal Identification Data:</span>
                    <span className="text-slate-600 text-[13px] mt-0.5 block">
                      Full name, email address, and Philippine mobile number (+63 9XXXXXXXXX).
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="font-bold text-slate-800 block">Motorcycle Details:</span>
                    <span className="text-slate-600 text-[13px] mt-0.5 block">
                      Plate number, brand and model, and the problems you report when booking.
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="font-bold text-slate-800 block">Service History & Correspondence:</span>
                    <span className="text-slate-600 text-[13px] mt-0.5 block">
                      Service tickets and their stages, hardcopy requests, your chats with the shop, and reviews you write.
                    </span>
                  </div>
                </div>
              </section>

              {/* Privacy Section 2 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">2</span>
                  Purpose and Legal Basis for Processing
                </h3>
                <p>
                  Your information is processed under the lawful grounds of contract performance and legitimate business interests:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[13px]">
                  <li>To sign you in and match your motorcycle at drop-off.</li>
                  <li>To show live 5-stage repair updates on your dashboard.</li>
                  <li>To print service records you request for warranty claims or resale.</li>
                                    <li>To email you when a booking is confirmed, the day before your drop-off, and when your motorcycle is ready for pickup. Emails go through our email provider (Resend) and contain only your name, ticket number, motorcycle, and schedule.</li>
                  <li>To maintain workshop capacity integrity and prevent duplicate booking reservations.</li>
                </ul>
              </section>

              {/* Privacy Section 3 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">3</span>
                  Security Standards & Row Level Security (RLS)
                </h3>
                <p>
                  We protect your data with these measures:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[13px]">
                  <li>
                    <strong>Encrypted connections:</strong> Everything between your browser and our servers travels over HTTPS. Data is stored with our database provider (Supabase), and passwords are never visible to shop staff.
                  </li>
                  <li>
                    <strong>Row Level Security (RLS):</strong> Database rules make sure only you and MotoCare staff can view your records. Other riders cannot.
                  </li>
                  <li>
                    <strong>Zero Third-Party Advertising Monetization:</strong> We do NOT sell, lease, or monetize customer data with marketing brokers or external advertising networks.
                  </li>
                </ul>
              </section>

              {/* Privacy Section 4 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">4</span>
                  Data Subject Rights under Republic Act No. 10173
                </h3>
                <p>
                  Under RA 10173, you have the following rights. You can use them through My Profile or by messaging the shop:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                  <div className="p-3 rounded-xl bg-slate-50 ">
                    <span className="font-bold text-slate-900 block text-[13px]">1. Right to Be Informed</span>
                    <span className="text-slate-600 text-[13px] block mt-0.5">
                      The right to know what personal data is being collected and how it will be processed.
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 ">
                    <span className="font-bold text-slate-900 block text-[13px]">2. Right to Access & Portability</span>
                    <span className="text-slate-600 text-[13px] block mt-0.5">
                      The right to view your service history and request printed copies of your records.
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 ">
                    <span className="font-bold text-slate-900 block text-[13px]">3. Right to Rectification</span>
                    <span className="text-slate-600 text-[13px] block mt-0.5">
                      The right to dispute inaccuracies and have erroneous contact or vehicle details corrected.
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 ">
                    <span className="font-bold text-slate-900 block text-[13px]">4. Right to Erasure / Blocking</span>
                    <span className="text-slate-600 text-[13px] block mt-0.5">
                      The right to request account suspension or data deletion subject to statutory retention laws.
                    </span>
                  </div>
                </div>
              </section>

              {/* Privacy Section 5 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">5</span>
                  Data Retention & Archival Policy
                </h3>
                <p className="text-slate-600">
                  We keep your service history for as long as you have an account, so warranty claims and past records stay available. You can ask us to delete your account and data anytime.
                </p>
              </section>

              {/* Privacy Section 6 */}
              <section className="space-y-2">
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0">6</span>
                  Contact Us About Your Data
                </h3>
                <p className="text-slate-600">
                  If you have inquiries, concerns, or requests regarding the handling of your personal information, please contact our compliance office directly:
                </p>
                <div className="bg-slate-50 p-3 rounded-xl text-[13px] space-y-1">
                  <p className="font-bold text-slate-800">{SHOP_INFO.name}</p>
                  <p className="text-slate-600">{SHOP_INFO.address}</p>
                  <p className="text-slate-600">Phone: {SHOP_INFO.phone} · or use Message the shop in your dashboard</p>
                  <p className="text-slate-500 text-[13px]">National Privacy Commission (NPC) Portal: https://privacy.gov.ph</p>
                </div>
              </section>
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
