import { useState } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  CheckCircle2,
  Scale
} from 'lucide-react';

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
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto animate-in fade-in duration-200 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="bg-white border border-slate-200 text-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all animate-in zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[88vh]">
        
        {/* =========================================================================
            HEADER: Title, Subtitle, Legal Reference & Close Button
            ========================================================================= */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Scale className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="legal-modal-title" className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                  MotoCare Legal & Compliance Portal
                </h2>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  PH Law Compliant
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Republic Act No. 10173 (Data Privacy Act) • Consumer Act of the Philippines
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* =========================================================================
            TABS: Terms of Service vs Privacy Policy Switcher
            ========================================================================= */}
        <div className="px-5 sm:px-6 py-2.5 bg-white border-b border-slate-100 flex items-center justify-start gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy (RA 10173)</span>
          </button>

          <span className="ml-auto text-[11px] text-slate-400 font-medium hidden sm:inline-block">
            Effective: October 2026 • v2.4
          </span>
        </div>

        {/* =========================================================================
            SCROLLABLE CONTENT BODY (Eye-Friendly Calm Slate Styling)
            ========================================================================= */}
        <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1 min-h-0 text-slate-700 text-xs sm:text-[13px] leading-relaxed">
          
          {/* TAB 1: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Executive Summary Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-orange-600" />
                  <span>Executive Summary for Riders</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  This Agreement governs your access to and use of the <strong>MotoCare Workshop Portal</strong> and our motorcycle repair services. By registering an account, you agree to transparent transactions, our daily 10-motorcycle workshop capacity ceiling, pre-intake diagnostic inspections, road safety quality testing, and our standard workmanship warranty.
                </p>
              </div>

              {/* Section 1 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">1</span>
                  Acceptance of Terms & Rider Eligibility
                </h3>
                <p>
                  By creating an account, registering a vehicle, or submitting a service booking on MotoCare, you acknowledge and agree to be bound by these Terms of Service and all statutory laws and administrative regulations of the Republic of the Philippines.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
                  <li>You must be at least eighteen (18) years of age with full legal capacity to enter into binding agreements.</li>
                  <li>You warrant that you are the lawful owner of the motorcycle or have obtained express permission from the registered owner to submit the vehicle for maintenance, repair, and diagnostic procedures.</li>
                  <li>All registration credentials (Full Name, Contact Number, and License Plate) must be truthful, authentic, and accurate.</li>
                </ul>
              </section>

              {/* Section 2 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">2</span>
                  Workshop Capacity & Daily 10-Unit Service Cap
                </h3>
                <p>
                  To guarantee uncompromised mechanical workmanship, prevent floor congestion, and ensure dedicated technician focus, MotoCare enforces a strict maximum cap of <strong>ten (10) service units per operating day</strong>.
                </p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                  <p className="font-semibold text-slate-800 text-xs">Arrival Windows & Grace Period:</p>
                  <p className="text-slate-600 text-xs">
                    Riders select an arrival window (Morning Intake: 08:00 AM – 10:00 AM, or Afternoon Intake: 01:00 PM – 03:00 PM). A <strong>15-minute grace period</strong> is observed. Failure to arrive within the allotted window without prior coordination may result in forfeiture of the guaranteed bay slot to waiting riders.
                  </p>
                </div>
              </section>

              {/* Section 3 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">3</span>
                  Pre-Intake Diagnostics & Disclaimer of Pre-Existing Defects
                </h3>
                <p>
                  Prior to commencing mechanical disassembly or repair (Stage 3 Active Repair), lead technicians conduct an intake checklist and Stage 2 Diagnostic Evaluation.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
                  <li>
                    <strong>Documentation of Pre-Existing Wear:</strong> Structural hairline fractures, chassis rust, stripped bolt threads, unauthorized electrical wire splices, or internal engine sludge accumulated from past neglected oil intervals are documented and recorded.
                  </li>
                  <li>
                    <strong>Exemption of Liability:</strong> MotoCare is not liable for structural fatigue, brittle plastic clips, or latent engine issues caused by prior improper maintenance executed by third-party workshops.
                  </li>
                  <li>
                    <strong>Mandatory Rider Approval:</strong> If technicians identify hidden critical defects during disassembly, work is paused until the rider approves the supplementary estimate via in-app notification or SMS.
                  </li>
                </ul>
              </section>

              {/* Section 4 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">4</span>
                  Quality Assurance Road Testing & Vehicle Release
                </h3>
                <p>
                  By checking in your vehicle into our 5-Stage Service Progression, you expressly authorize our licensed quality assurance technicians to operate the motorcycle on public roads (Stage 4 Quality Road QA) for diagnostic validation within a designated three (3) kilometer safety loop.
                </p>
                <p className="text-xs text-slate-600">
                  Upon reaching Stage 5 (Ready for Release), riders must inspect and collect their motorcycle within three (3) business days. Uncollected motorcycles exceeding five (5) calendar days from official release notice may incur reasonable storage and safekeeping fees.
                </p>
              </section>

              {/* Section 5 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">5</span>
                  Workmanship Warranty & Replacement Parts (Consumer Act RA 7394)
                </h3>
                <p>
                  Pursuant to the Consumer Act of the Philippines (Republic Act No. 7394), MotoCare provides standard warranties on all services rendered:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                    <span className="font-bold text-slate-900 block text-xs">Labor Warranty</span>
                    <span className="text-slate-600 text-[11px] mt-0.5 block">
                      Covered for seven (7) calendar days or 500 kilometers traveled, whichever occurs first from the date of official vehicle release.
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                    <span className="font-bold text-slate-900 block text-xs">Replacement Parts</span>
                    <span className="text-slate-600 text-[11px] mt-0.5 block">
                      Brand-new original and OEM parts carry respective manufacturer warranties. Regular consumable items (brake pads, tires, bulbs) are excluded.
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  *Warranty is voided if the motorcycle is serviced, disassembled, or modified by external mechanics, or subjected to track racing, stunt riding, or severe water immersion after release.
                </p>
              </section>

              {/* Section 6 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">6</span>
                  Electronic Records & Legal Validity (RA 8792)
                </h3>
                <p>
                  Pursuant to the Electronic Commerce Act of 2000 (Republic Act No. 8792), digital service tickets (e.g., #MC-7514), electronic check-in slips, and certified dry-seal hardcopy documents issued through MotoCare carry the full legal validity and enforceability of traditional physical job contracts.
                </p>
              </section>

              {/* Section 7 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">7</span>
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
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>National Privacy Commission (NPC) Compliance Notice</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  MotoCare is committed to protecting your personal information in strict compliance with <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong> and its Implementing Rules and Regulations. We strictly <strong>do not sell, rent, or trade customer contact details with third-party advertisers</strong>.
                </p>
              </div>

              {/* Privacy Section 1 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">1</span>
                  Information We Collect
                </h3>
                <p>
                  When you register and use the MotoCare platform, we collect only the necessary data points required to manage workshop maintenance and vehicle telemetry:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
                    <span className="font-bold text-slate-800 block">Personal Identification Data:</span>
                    <span className="text-slate-600 text-[11px] mt-0.5 block">
                      Full Legal Name (First Name, Last Name), Verified Email Address, and Philippine Mobile Number (+63 9XXXXXXXXX).
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
                    <span className="font-bold text-slate-800 block">Vehicle & Diagnostic Telemetry:</span>
                    <span className="text-slate-600 text-[11px] mt-0.5 block">
                      License Plate Number, Engine Model, Vehicle Category (Scooter, Underbone, Manual), Odometer Readings, and Diagnostic Defect Logs.
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
                    <span className="font-bold text-slate-800 block">Service History & Correspondence:</span>
                    <span className="text-slate-600 text-[11px] mt-0.5 block">
                      Job Order Tickets, Replaced Parts Specifications, Stamped Hardcopy Requests, and Helpdesk Chat Logs with Workshop Advisors.
                    </span>
                  </div>
                </div>
              </section>

              {/* Privacy Section 2 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">2</span>
                  Purpose and Legal Basis for Processing
                </h3>
                <p>
                  Your information is processed under the lawful grounds of contract performance and legitimate business interests:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
                  <li>To authenticate account sign-ins and verify vehicle ownership upon physical workshop intake.</li>
                  <li>To broadcast live 5-stage repair progression updates to your dashboard in real time.</li>
                  <li>To generate official, certified service records with our workshop dry seal for warranty claims and resale value appraisal.</li>
                  <li>To transmit critical safety notifications, booking confirmations, or urgent technical recalls.</li>
                  <li>To maintain workshop capacity integrity and prevent duplicate booking reservations.</li>
                </ul>
              </section>

              {/* Privacy Section 3 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">3</span>
                  Security Standards & Row Level Security (RLS)
                </h3>
                <p>
                  We implement enterprise-grade technical, physical, and organizational security protocols:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
                  <li>
                    <strong>End-to-End Encryption:</strong> All communications between your browser and our infrastructure are encrypted via Transport Layer Security (TLS 1.3). Sensitive credentials are encrypted at rest with AES-256.
                  </li>
                  <li>
                    <strong>Row Level Security (RLS):</strong> Our PostgreSQL database enforces cryptographic Row Level Security. Only you (the authenticated rider) and authorized supervisors assigned to your ticket can view your records.
                  </li>
                  <li>
                    <strong>Zero Third-Party Advertising Monetization:</strong> We do NOT sell, lease, or monetize customer data with marketing brokers or external advertising networks.
                  </li>
                </ul>
              </section>

              {/* Privacy Section 4 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">4</span>
                  Data Subject Rights under Republic Act No. 10173
                </h3>
                <p>
                  Under Chapter VIII of RA 10173, you hold the following statutory rights which you may exercise anytime through your dashboard Settings tab or by contacting our Data Protection Officer:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-bold text-slate-900 block text-xs">1. Right to Be Informed</span>
                    <span className="text-slate-600 text-[11px] block mt-0.5">
                      The right to know what personal data is being collected and how it will be processed.
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-bold text-slate-900 block text-xs">2. Right to Access & Portability</span>
                    <span className="text-slate-600 text-[11px] block mt-0.5">
                      The right to view and export your entire service history and invoices at any time.
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-bold text-slate-900 block text-xs">3. Right to Rectification</span>
                    <span className="text-slate-600 text-[11px] block mt-0.5">
                      The right to dispute inaccuracies and have erroneous contact or vehicle details corrected.
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-bold text-slate-900 block text-xs">4. Right to Erasure / Blocking</span>
                    <span className="text-slate-600 text-[11px] block mt-0.5">
                      The right to request account suspension or data deletion subject to statutory retention laws.
                    </span>
                  </div>
                </div>
              </section>

              {/* Privacy Section 5 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">5</span>
                  Data Retention & Archival Policy
                </h3>
                <p className="text-slate-600">
                  Vehicle service logs, parts replacements, and certified safety inspections are maintained for a period of <strong>five (5) years</strong> from completion. This retention period is mandatory to support mechanical provenance, warranty continuity, and Philippine automotive safety record standards.
                </p>
              </section>

              {/* Privacy Section 6 */}
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 text-[11px] flex items-center justify-center font-mono">6</span>
                  Contact the Data Protection Officer (DPO)
                </h3>
                <p className="text-slate-600">
                  If you have inquiries, concerns, or requests regarding the handling of your personal information, please contact our compliance office directly:
                </p>
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-slate-800">MotoCare Data Privacy Compliance Office</p>
                  <p className="text-slate-600">Email: <span className="font-mono text-orange-600">dpo@motocare.ph</span> | <span className="font-mono text-orange-600">privacy@motocare.ph</span></p>
                  <p className="text-slate-600">Hotline: <span className="font-mono">+63 (02) 8888-MOTO</span></p>
                  <p className="text-slate-500 text-[11px]">National Privacy Commission (NPC) Portal: https://privacy.gov.ph</p>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* =========================================================================
            FOOTER CONTROLS: "Close Window" & "I Have Read & Agree to All Terms"
            ========================================================================= */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${hasAgreed ? 'text-emerald-500' : 'text-slate-400'}`} />
            <span>
              {hasAgreed ? 'You have previously accepted these terms.' : 'Please review all terms carefully before agreeing.'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            >
              Close Window
            </button>

            {onAccept && (
              <button
                type="button"
                onClick={handleAccept}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-orange-500/25 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I Have Read & Agree to All Terms</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
