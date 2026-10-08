import { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Bike,
  Calendar,
  Wrench,
  MessageSquare,
  CheckCircle2,
  BookOpen,
  ShieldCheck,
  Clock,
  FileText,
  Gauge
} from 'lucide-react';

export interface RiderTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  onStartBooking?: () => void;
}

interface StepContent {
  id: number;
  badge: { en: string; tl: string };
  title: { en: string; tl: string };
  subtitle: { en: string; tl: string };
  description: { en: string; tl: string };
  points: { en: string[]; tl: string[] };
  tip: { en: string; tl: string };
  icon: typeof Bike;
  previewType: 'garage' | 'stepper' | 'booking' | 'records' | 'helpdesk';
}

const STEPS: StepContent[] = [
  {
    id: 1,
    icon: Bike,
    previewType: 'garage',
    badge: {
      en: 'STEP 1 OF 5 • DIGITAL GARAGE',
      tl: 'HAKBANG 1 NG 5 • GARAHE NG MOTOR',
    },
    title: {
      en: 'Digital Garage & Vehicle Registry',
      tl: 'Digital na Garahe at Rehistro ng Motor',
    },
    subtitle: {
      en: 'Keep all your motorcycles organized in a single dashboard',
      tl: 'Lahat ng motor mo, naka-save sa iisang profile',
    },
    description: {
      en: 'Every motorcycle you bring to MotoCare is provisioned with a secure digital profile. Easily monitor your registered license plates, service odometer intervals, and maintenance records.',
      tl: 'Bawat motor na ipinapasok mo sa MotoCare ay may sariling digital profile. Ligtas na nakatago ang plaka, odometer reading, at kumpletong maintenance records sa iisang screen.',
    },
    points: {
      en: [
        'Supports multiple motorcycles (Scooters, Underbones, Manuals) under one rider profile.',
        'Automatic garage registration whenever you book with a new license plate.',
        'Encrypted, cloud-synced service ledger accessible anywhere.',
      ],
      tl: [
        'Pwedeng magrehistro ng maraming motor (Scooter, Underbone, Manual) sa iisang account.',
        'Kusang naitatala sa garahe ang motor kapag nag-book ka gamit ang bagong plaka.',
        'Ligtas at laging accessible sa cloud ang talaan ng bawat motor mo.',
      ],
    },
    tip: {
      en: 'Rider Tip: Enter your license plate accurately so our intake advisor can confirm your vehicle immediately upon arrival.',
      tl: 'Rider Tip: Ilagay nang tama ang plaka para mabilis ma-confirm ng intake advisor ang motor mo pagdating sa talyer.',
    },
  },
  {
    id: 2,
    icon: Wrench,
    previewType: 'stepper',
    badge: {
      en: 'STEP 2 OF 5 • LIVE PROGRESS',
      tl: 'HAKBANG 2 NG 5 • LIVE PROGRESS',
    },
    title: {
      en: 'Live 5-Stage Service Progression',
      tl: 'Live 5-Stage Pagsubaybay sa Gawa',
    },
    subtitle: {
      en: 'Watch each repair milestone happen live with zero guessing',
      tl: 'Subaybayan ang bawat yugto ng pag-ayos nang live at walang hulaan',
    },
    description: {
      en: 'Experience complete transparency while your ride is serviced. Floor technicians advance each milestone live, updating your dashboard screen automatically without manual page refreshes.',
      tl: 'Siguradong kampante ka habang ginagawa ang motor. Bawat hakbang ay ina-update ng mekaniko nang live sa screen mo nang hindi mo kailangang mag-refresh ng page.',
    },
    points: {
      en: [
        '5 Clear Milestones: Intake → Diagnostics → Active Repair → Road Test QA → Ready for Pickup.',
        'Assigned Workshop Bay (Bay 01 to 04) and Lead Technician displayed on your screen.',
        'Instant status updates stream seamlessly via Supabase Realtime.',
      ],
      tl: [
        '5 Malinaw na Yugto: Check-in → Inspeksyon → Pag-ayos → Road Test QA → Handa na I-pickup.',
        'Kitang-kita kung aling bay (Bay 01-04) at sinong Lead Mechanic ang gumagawa sa motor.',
        'Kusang nag-u-update ang status bar gamit ang real-time shop telemetry.',
      ],
    },
    tip: {
      en: 'Rider Tip: When Stage 5 lights up green, your motorcycle has passed final road test QA and is ready for pickup!',
      tl: 'Rider Tip: Kapag nag-green ang Stage 5, pasado na sa road test ang motor at handa na itong i-release sa iyo!',
    },
  },
  {
    id: 3,
    icon: Calendar,
    previewType: 'booking',
    badge: {
      en: 'STEP 3 OF 5 • SERVICE BOOKING',
      tl: 'HAKBANG 3 NG 5 • PAG-BOOK NG SERBISYO',
    },
    title: {
      en: 'Service Scheduling & Transparent Pricing',
      tl: 'Pagpapa-schedule at Malinaw na Presyo',
    },
    subtitle: {
      en: 'Guaranteed daily service slots with a strict 10-bike shop limit',
      tl: 'May garantisadong slot at 10-motor limit para sa pulidong gawa',
    },
    description: {
      en: 'Reserve your preferred arrival window and choose from our preventive maintenance packages: Synthetic Oil Change, Scooter CVT Cleaning, Brake & Chain Overhaul, or FI Diagnostics.',
      tl: 'Magpa-reserve ng oras at pumili ng kailangang serbisyo: Change Oil, CVT Cleaning (para sa panginginig/dragging), Tune-up ng preno at kadena, o Computer FI Scan.',
    },
    points: {
      en: [
        'Strict 10-motorcycle daily cap prevents shop congestion and technician rush.',
        'Upfront labor and parts price estimates provided before you drop off your ride.',
        'Pre-intake symptom notes allow mechanics to prepare diagnostic tools in advance.',
      ],
      tl: [
        'May 10-motor limit kada araw para hindi magka-ipon-ipon at pulido ang asikaso sa motor.',
        'Malinaw ang presyo ng piyesa at labor bago pa man dalhin sa talyer para walang gulat.',
        'Pwede maglagay ng reklamo o kakaibang tunog para handa agad ang gamit ng mekaniko.',
      ],
    },
    tip: {
      en: 'Rider Tip: Select the Morning Intake window (08:00 AM – 10:00 AM) for expedited turnaround and same-day release.',
      tl: 'Rider Tip: Piliin ang Morning Intake (8:00 AM - 10:00 AM) para mas maagang matapos at ma-release ang motor sa parehong araw.',
    },
  },
  {
    id: 4,
    icon: FileText,
    previewType: 'records',
    badge: {
      en: 'STEP 4 OF 5 • OFFICIAL RECORDS',
      tl: 'HAKBANG 4 NG 5 • OPISYAL NA REKORD',
    },
    title: {
      en: 'Official Records & Stamped Copies',
      tl: 'Mga Opisyal na Rekord at Tatak ng Talyer',
    },
    subtitle: {
      en: 'Preserve manufacturer warranty and vehicle resale appraisal',
      tl: 'Pangalagaan ang warranty at mas mataas na presyo kapag ibebenta',
    },
    description: {
      en: 'Maintain a verified digital logbook of every replacement part and maintenance job. Request an officially stamped physical document with our workshop dry seal with just one click.',
      tl: 'Nakatago rito ang kumpletong talaan ng pinalitang piyesa at resibo. Sa isang click lang, maaari kang humiling ng opisyal na dokumentong may dry seal ng talyer.',
    },
    points: {
      en: [
        'Detailed maintenance ledger recording parts replaced, fluid specs, and mechanics.',
        'One-click "Request Certified Hardcopy" feature directly inside your Service Records tab.',
        'Official stamped paperwork provides authenticated proof of maintenance for buyers.',
      ],
      tl: [
        'Kumpletong talaan ng pinalitang langis, piyesa, at mekanikong gumawa.',
        'Isang pindot lang sa "Request Certified Hardcopy" para sa opisyal na may tatak na papel.',
        'Patunay na alaga ang motor para mas mataas ang bentahe kung ibebenta sa future.',
      ],
    },
    tip: {
      en: 'Rider Tip: Certified hardcopy requests notify the front desk immediately so your documents are pre-stamped before pickup.',
      tl: 'Rider Tip: Kapag nag-request ka ng hardcopy, inihahanda na agad ng front desk ang tatak bago ka pa dumating sa pickup.',
    },
  },
  {
    id: 5,
    icon: MessageSquare,
    previewType: 'helpdesk',
    badge: {
      en: 'STEP 5 OF 5 • HELPDESK & TRACKING',
      tl: 'HAKBANG 5 NG 5 • CHAT AT TRACKING',
    },
    title: {
      en: 'Workshop Chat & Public Ticket Tracking',
      tl: 'Direktang Chat sa Talyer at Public Tracking',
    },
    subtitle: {
      en: 'Consult directly with advisors or check repair status on the go',
      tl: 'Mabilis na mensahe sa mekaniko at pagsusuri kahit walang login',
    },
    description: {
      en: 'Consult with service advisors anytime using our in-app chat button. Additionally, every booking generates a reference code (e.g., #MC-7514) that anyone can track at /track without logging in.',
      tl: 'May tanong tungkol sa motor o kakaibang ingay? Gamitin ang orange chat button para makausap ang talyer. Bawat booking ay may Ticket Code (#MC-7514) na pwedeng i-track sa /track kahit walang login.',
    },
    points: {
      en: [
        'Real-time chat with workshop service advisors during business hours (8 AM - 6 PM).',
        'Public tracking at /track using your unique Ticket Code—shareable with family.',
        'Reopen this guide anytime via the "User Guide" button in your top navigation menu.',
      ],
      tl: [
        'Real-time chat sa service advisor araw-araw mula 8:00 AM hanggang 6:00 PM.',
        'Maaaring tingnan sa /track gamit ang Ticket Code—pwedeng i-share sa pamilya o kaibigan.',
        'Maaaring buksan muli ang gabay na ito anumang oras gamit ang "User Guide" button sa menu.',
      ],
    },
    tip: {
      en: 'Rider Tip: Bookmark or screenshot your Ticket Code so you can check your repair progress anywhere in seconds.',
      tl: 'Rider Tip: I-screenshot o i-save ang Ticket Code para madaling matingnan sa mobile browser habang nasa biyahe o trabaho.',
    },
  },
];

export default function RiderTutorialModal({
  isOpen,
  onClose,
  userId,
  onStartBooking,
}: RiderTutorialModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [lang, setLang] = useState<'en' | 'tl'>('en');

  // Load language preference from localStorage
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('motocare_tour_lang');
      if (savedLang === 'tl' || savedLang === 'en') {
        setLang(savedLang);
      }
    } catch {
      // ignore
    }
  }, []);

  // Reset to first step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation (Esc to close, Arrow keys for step navigation)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      } else if (e.key === 'ArrowRight') {
        if (currentStepIndex < STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  const currentStep = STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const handleToggleLang = (newLang: 'en' | 'tl') => {
    setLang(newLang);
    try {
      localStorage.setItem('motocare_tour_lang', newLang);
    } catch {
      // ignore
    }
  };

  const handleDismiss = () => {
    try {
      const storageKey = userId ? `motocare_tutorial_completed_${userId}` : 'motocare_tutorial_completed_guest';
      localStorage.setItem(storageKey, 'true');
      localStorage.setItem(`motocare_spotlight_tour_completed_${userId || 'guest'}`, 'true');
    } catch {
      // ignore
    }
    onClose();
  };

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    handleDismiss();
    if (onStartBooking) {
      onStartBooking();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 text-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all animate-in zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[88vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
      >
        {/* =========================================================================
            1. TOP HEADER: Branding, Language Toggle, and Close
            ========================================================================= */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs shadow-orange-500/25 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span id="guide-title" className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                  MotoCare Rider Guide
                </span>
                <span className="hidden xs:inline-block text-[10px] px-2 py-0.5 rounded-full bg-orange-100/90 text-orange-700 font-bold uppercase tracking-wider">
                  Handbook
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {lang === 'tl' ? `Hakbang ${currentStepIndex + 1} ng ${STEPS.length}` : `Step ${currentStepIndex + 1} of ${STEPS.length}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bilingual Switcher (EN / TL) */}
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-full border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleToggleLang('en')}
                className={`px-2.5 py-0.5 rounded-full transition-all text-[11px] cursor-pointer ${
                  lang === 'en'
                    ? 'bg-orange-500 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleToggleLang('tl')}
                className={`px-2.5 py-0.5 rounded-full transition-all text-[11px] cursor-pointer ${
                  lang === 'tl'
                    ? 'bg-orange-500 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Lumipat sa Tagalog"
              >
                TL
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              title={lang === 'tl' ? 'Isara ang Gabay' : 'Close Walkthrough'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. STEP TABS NAVIGATOR: Jump directly to any topic without friction
            ========================================================================= */}
        <div className="px-3 sm:px-6 py-2 bg-white border-b border-slate-100 flex items-center justify-between gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
          {STEPS.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className="flex-1 min-w-[50px] py-1 group flex flex-col items-center gap-1 cursor-pointer transition-all"
                title={step.title[lang]}
              >
                <div
                  className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-orange-500 shadow-xs shadow-orange-500/40'
                      : isCompleted
                      ? 'bg-orange-300'
                      : 'bg-slate-100 group-hover:bg-slate-200'
                  }`}
                />
                <span
                  className={`text-[10px] font-bold tracking-tight truncate max-w-[90px] transition-colors ${
                    isActive ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  {lang === 'tl' ? `Hakbang ${idx + 1}` : `Step ${idx + 1}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            3. SCROLLABLE CONTENT BODY (Zero clipping, smoothly scrolls on any mobile)
            ========================================================================= */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          
          {/* VISUAL MINI-PREVIEW MOCKUP (Clear visual context for riders) */}
          <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50 to-slate-100/60 p-3.5 sm:p-4 shadow-xs">
            {currentStep.previewType === 'garage' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-slate-800">Yamaha NMAX 155 ABS</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {lang === 'tl' ? 'Nasa Garahe' : 'In Digital Garage'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      {lang === 'tl' ? 'Rehistradong Plaka' : 'Plate Number'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 inline-block bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      NMX 8821
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-slate-400" />
                      {lang === 'tl' ? 'Odometer' : 'Current Odometer'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 inline-block">
                      12,450 km
                    </span>
                  </div>
                </div>
              </div>
            )}

            {currentStep.previewType === 'stepper' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-orange-500" />
                    Ticket #MC-7514 • NMX 8821
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                    Stage 3 Active
                  </span>
                </div>

                {/* 5-Stage Stepper Miniature */}
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {[
                    { label: 'Intake', state: 'done' },
                    { label: 'Inspect', state: 'done' },
                    { label: 'Repair', state: 'active' },
                    { label: 'Road QA', state: 'pending' },
                    { label: 'Release', state: 'pending' },
                  ].map((st, i) => (
                    <div key={i} className="text-center">
                      <div
                        className={`h-2 rounded-full mb-1 transition-all ${
                          st.state === 'done'
                            ? 'bg-emerald-500'
                            : st.state === 'active'
                            ? 'bg-orange-500 shadow-xs ring-2 ring-orange-200'
                            : 'bg-slate-200'
                        }`}
                      />
                      <span className={`text-[9px] font-bold block truncate ${
                        st.state === 'active' ? 'text-orange-600' : 'text-slate-400'
                      }`}>
                        {st.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-2 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                  <span className="font-medium">
                    {lang === 'tl' ? 'Bay 02 • Master Tech Ramon' : 'Bay 02 • Master Tech Ramon'}
                  </span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Live Telemetry
                  </span>
                </div>
              </div>
            )}

            {currentStep.previewType === 'booking' && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    {lang === 'tl' ? 'Pang-araw-araw na Kapasidad' : 'Daily Workshop Capacity'}
                  </span>
                  <span className="font-bold text-orange-600 text-[11px]">
                    7 / 10 slots booked
                  </span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full rounded-full w-[70%]" />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="bg-white p-2 rounded-xl border border-orange-200/80 bg-orange-50/40">
                    <span className="text-[10px] font-bold text-orange-700 block">
                      {lang === 'tl' ? 'Recommended Slot' : 'Recommended Slot'}
                    </span>
                    <span className="font-semibold text-slate-800">08:00 AM – 10:00 AM</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      {lang === 'tl' ? 'Presyo ng Serbisyo' : 'Package Estimate'}
                    </span>
                    <span className="font-semibold text-slate-800">₱1,250 (CVT + Oil)</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep.previewType === 'records' && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-orange-500" />
                    <span className="font-bold text-slate-800">
                      {lang === 'tl' ? 'Sertipikadong Talaan ng Talyer' : 'Certified Service Certificate'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    Official Dry Seal
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div className="text-[11px] space-y-0.5">
                    <p className="font-bold text-slate-800">Job Order #MC-7514</p>
                    <p className="text-slate-500 text-[10px]">CVT Cleaning & Synthetic Lube • Passed QA</p>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-orange-500 text-white text-[10px] font-bold shadow-2xs">
                    Stamped & Ready
                  </div>
                </div>
              </div>
            )}

            {currentStep.previewType === 'helpdesk' && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                    <span className="font-bold text-slate-800">
                      {lang === 'tl' ? 'Live Chat sa Service Advisor' : 'Live Chat with Service Advisor'}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online (8AM - 6PM)
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="bg-white p-2 rounded-xl rounded-tl-xs border border-slate-200/80 max-w-[85%] text-slate-700">
                    {lang === 'tl' 
                      ? 'Rider: Sir may clicking sound po sa front brake tuwing pipreno.'
                      : 'Rider: I hear a clicking sound on the front brake during sudden stops.'}
                  </div>
                  <div className="bg-orange-500 text-white p-2 rounded-xl rounded-tr-xs ml-auto max-w-[85%] text-[11px] font-medium shadow-2xs">
                    {lang === 'tl'
                      ? 'Advisor: Sige sir, idadagdag natin sa caliper inspection agad pagdating mo!'
                      : 'Advisor: Got it! We added front caliper inspection to your work order.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP HEADER: Badge, Title, and Subtitle */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold tracking-widest text-orange-600 bg-orange-50 border border-orange-200/80 px-2.5 py-0.5 rounded-full uppercase inline-block">
              {currentStep.badge[lang]}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {currentStep.title[lang]}
            </h3>
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              {currentStep.subtitle[lang]}
            </p>
          </div>

          {/* DESCRIPTION */}
          <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed font-normal">
            {currentStep.description[lang]}
          </p>

          {/* KEY POINTS CHECKLIST */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
            <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-500" />
              <span>{lang === 'tl' ? 'Mahahalagang Dapat Tandaan:' : 'Key Operational Highlights:'}</span>
            </h4>
            <div className="space-y-1.5">
              {currentStep.points[lang].map((point, pIdx) => (
                <div key={pIdx} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                  <span className="leading-relaxed">{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PRO-TIP BOX */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="text-[11px] font-medium leading-relaxed">
              {currentStep.tip[lang]}
            </span>
          </div>
        </div>

        {/* =========================================================================
            4. FIXED FOOTER CONTROLS: Back, Progress Dots, Next / Action Button
            ========================================================================= */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between gap-2 shrink-0">
          {/* Previous Button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirstStep}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
              isFirstStep
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{lang === 'tl' ? 'Bumalik' : 'Previous'}</span>
          </button>

          {/* Center: Dot Indicators */}
          <div className="hidden xs:flex items-center gap-1.5">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStepIndex
                    ? 'w-5 bg-orange-500 shadow-xs'
                    : idx < currentStepIndex
                    ? 'w-2 bg-orange-300'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
                title={`Go to Step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Right: Next or Action CTA */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-2.5 sm:px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              {lang === 'tl' ? 'Laktawan' : 'Skip'}
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-4 sm:px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-orange-500/25 cursor-pointer"
            >
              {isLastStep ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{lang === 'tl' ? 'Simulan ang Booking' : 'Get Started'}</span>
                </>
              ) : (
                <>
                  <span>{lang === 'tl' ? 'Susunod' : 'Next'}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
