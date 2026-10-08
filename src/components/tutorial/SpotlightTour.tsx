import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Compass,
  Wrench,
  Calendar,
  FileText,
  MessageSquare,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2
} from 'lucide-react';
import { TabType } from '../../types/dashboard';

export interface TourStep {
  id: number;
  targetSelector: string;
  requiredTab: TabType;
  icon: typeof Compass;
  badge: { en: string; tl: string };
  title: { en: string; tl: string };
  description: { en: string; tl: string };
  tip: { en: string; tl: string };
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    targetSelector: '#tour-nav-tabs',
    requiredTab: 'overview',
    icon: Compass,
    badge: {
      en: 'STEP 1 OF 5 • NAVIGATION',
      tl: 'HAKBANG 1 NG 5 • MENU',
    },
    title: {
      en: 'Main Navigation Menu',
      tl: 'Pangunahing Menu ng Dashboard',
    },
    description: {
      en: 'Quickly switch between live repair tracking, booking a service slot, and viewing your certified maintenance records.',
      tl: 'Madaling lumipat sa live repair status, pagpapa-schedule ng serbisyo, at pagtingin sa iyong opisyal na service history.',
    },
    tip: {
      en: 'Tip: Your active repair status stays saved in real-time when switching tabs.',
      tl: 'Tip: Ligtas at naka-save ang iyong data kahit magpalipat-lipat ka ng tab.',
    },
  },
  {
    id: 2,
    targetSelector: '#tour-active-tracker',
    requiredTab: 'overview',
    icon: Wrench,
    badge: {
      en: 'STEP 2 OF 5 • LIVE PROGRESS',
      tl: 'HAKBANG 2 NG 5 • LIVE PROGRESS',
    },
    title: {
      en: 'Live 5-Stage Repair Progress',
      tl: 'Live 5-Stage Pagsubaybay sa Gawa',
    },
    description: {
      en: 'Watch your motorcycle advance live from Intake → Inspection → Active Repair → Road QA → Ready for Pickup without refreshing.',
      tl: 'Subaybayan ang motor nang live mula Check-in hanggang Road QA at Pickup nang hindi mo na kailangang mag-refresh.',
    },
    tip: {
      en: 'Tip: Tap any milestone pillar to view the mechanic\'s inspection checklist.',
      tl: 'Tip: Pindutin ang bawat milestone para makita ang eksaktong ginawa ng mekaniko.',
    },
  },
  {
    id: 3,
    targetSelector: '#tour-booking-packages',
    requiredTab: 'book',
    icon: Calendar,
    badge: {
      en: 'STEP 3 OF 5 • SERVICE BOOKING',
      tl: 'HAKBANG 3 NG 5 • PAG-BOOK NG SERBISYO',
    },
    title: {
      en: 'Daily Slots & Service Packages',
      tl: 'Arawang Slots at Serbisyo',
    },
    description: {
      en: 'Select from our maintenance suites with upfront pricing. We maintain a strict 10-motorcycle daily cap to ensure technician focus.',
      tl: 'Pumili ng tamang serbisyo na may malinaw na presyo. May 10-motor limit kada araw para tutok at pulido ang asikaso sa motor.',
    },
    tip: {
      en: 'Tip: Reserve the Morning Intake window (8–10 AM) for expedited same-day release.',
      tl: 'Tip: Piliin ang Morning slot (8–10 AM) para mas maagang makuha ang motor sa parehong araw.',
    },
  },
  {
    id: 4,
    targetSelector: '#tour-records-header',
    requiredTab: 'history',
    icon: FileText,
    badge: {
      en: 'STEP 4 OF 5 • SERVICE RECORDS',
      tl: 'HAKBANG 4 NG 5 • OPISYAL NA REKORD',
    },
    title: {
      en: 'Certified Stamped Records',
      tl: 'Opisyal na Rekord at Tatak ng Talyer',
    },
    description: {
      en: 'Review your complete digital logbook or tap "Request Certified Hardcopy" for an officially stamped document with our workshop dry seal.',
      tl: 'Nakatala rito ang pinalitang piyesa. Pindutin ang "Request Certified Hardcopy" para humiling ng may opisyal na tatak (dry seal) na papel.',
    },
    tip: {
      en: 'Tip: Stamped service records provide verified proof of maintenance to boost resale value.',
      tl: 'Tip: Mas mataas maibebenta ang motor kapag may kumpletong rekord at tatak ng regular na maintenance.',
    },
  },
  {
    id: 5,
    targetSelector: '#tour-helpdesk-chat',
    requiredTab: 'overview',
    icon: MessageSquare,
    badge: {
      en: 'STEP 5 OF 5 • SUPPORT & CHAT',
      tl: 'HAKBANG 5 NG 5 • CHAT AT GABAY',
    },
    title: {
      en: 'Workshop Chat & Public Tracking',
      tl: 'Mensahe sa Mekaniko at Gabay',
    },
    description: {
      en: 'Message our service advisors directly using the chat button, or track your repair anywhere at /track with your Ticket Code (#MC-XXXX).',
      tl: 'Direktang kausapin ang service advisor gamit ang chat button, o i-track ang motor sa /track gamit ang Ticket Code (#MC-XXXX).',
    },
    tip: {
      en: 'Tip: You can re-open this guide anytime via the User Guide button in the top menu.',
      tl: 'Tip: Maaari mong buksan muli ang gabay na ito gamit ang User Guide button sa menu.',
    },
  },
];

interface SpotlightTourProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export default function SpotlightTour({
  isOpen,
  onClose,
  userId,
  activeTab,
  onTabChange,
}: SpotlightTourProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [lang, setLang] = useState<'en' | 'tl'>('en');
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const mountTimeoutRef = useRef<number | null>(null);

  const currentStep = TOUR_STEPS[currentStepIdx];
  const isFirstStep = currentStepIdx === 0;
  const isLastStep = currentStepIdx === TOUR_STEPS.length - 1;

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

  const handleToggleLang = (newLang: 'en' | 'tl') => {
    setLang(newLang);
    try {
      localStorage.setItem('motocare_tour_lang', newLang);
    } catch {
      // ignore
    }
  };

  // Measure target DOM element accurately
  const measureTarget = useCallback((selector: string) => {
    let el = document.querySelector(selector);
    // Mobile fallback if navbar tabs are hidden inside hamburger menu or have 0 width
    if (selector === '#tour-nav-tabs') {
      if (!el || (el instanceof HTMLElement && (el.offsetParent === null || el.getBoundingClientRect().width === 0))) {
        el = document.querySelector('#tour-header-bar');
      }
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        });
        return true;
      }
    }
    setTargetRect(null);
    return false;
  }, []);

  // Window resize & scroll listeners (immediate measurement on open)
  useEffect(() => {
    if (!isOpen) return;

    const updateDimensions = () => {
      if (typeof window === 'undefined') return;
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
      if (currentStep) {
        measureTarget(currentStep.targetSelector);
      }
    };

    updateDimensions();

    window.addEventListener('resize', updateDimensions, { passive: true });
    window.addEventListener('scroll', updateDimensions, { passive: true });
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('scroll', updateDimensions);
    };
  }, [isOpen, currentStep, measureTarget]);

  // Navigate to step with calm tab switching and smooth scrolling
  const navigateToStep = useCallback((stepIdx: number) => {
    if (stepIdx < 0 || stepIdx >= TOUR_STEPS.length) return;
    const nextStep = TOUR_STEPS[stepIdx];

    if (mountTimeoutRef.current) {
      window.clearTimeout(mountTimeoutRef.current);
      mountTimeoutRef.current = null;
    }

    setIsTransitioning(true);
    setCurrentStepIdx(stepIdx);

    if (nextStep.requiredTab !== activeTab) {
      onTabChange(nextStep.requiredTab);
      // Wait for tab view to mount in the DOM smoothly
      mountTimeoutRef.current = window.setTimeout(() => {
        let el = document.querySelector(nextStep.targetSelector);
        if (nextStep.targetSelector === '#tour-nav-tabs') {
          if (!el || (el instanceof HTMLElement && (el.offsetParent === null || el.getBoundingClientRect().width === 0))) {
            el = document.querySelector('#tour-header-bar');
          }
        }

        if (nextStep.targetSelector === '#tour-nav-tabs' || nextStep.targetSelector === '#tour-header-bar') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        window.setTimeout(() => {
          measureTarget(nextStep.targetSelector);
          setIsTransitioning(false);
        }, 180);
      }, 150);
    } else {
      let el = document.querySelector(nextStep.targetSelector);
      if (nextStep.targetSelector === '#tour-nav-tabs') {
        if (!el || (el instanceof HTMLElement && (el.offsetParent === null || el.getBoundingClientRect().width === 0))) {
          el = document.querySelector('#tour-header-bar');
        }
      }

      if (nextStep.targetSelector === '#tour-nav-tabs' || nextStep.targetSelector === '#tour-header-bar') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      mountTimeoutRef.current = window.setTimeout(() => {
        measureTarget(nextStep.targetSelector);
        setIsTransitioning(false);
      }, 150);
    }
  }, [activeTab, onTabChange, measureTarget]);

  // Initial trigger on open
  useEffect(() => {
    if (isOpen) {
      navigateToStep(0);
    } else {
      setTargetRect(null);
    }
    return () => {
      if (mountTimeoutRef.current) {
        window.clearTimeout(mountTimeoutRef.current);
        mountTimeoutRef.current = null;
      }
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      } else if (e.key === 'ArrowRight' && !isTransitioning) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !isTransitioning) {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTransitioning, currentStepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const handleDismiss = () => {
    try {
      const storageKey = userId ? `motocare_tour_seen_${userId}` : 'motocare_tour_seen_guest';
      localStorage.setItem(storageKey, 'true');
      localStorage.setItem('motocare_tour_seen', 'true');
    } catch {
      // ignore
    }
    onClose();
  };

  const handleNext = () => {
    if (isTransitioning) return;
    if (!isLastStep) {
      navigateToStep(currentStepIdx + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (isTransitioning) return;
    if (!isFirstStep) {
      navigateToStep(currentStepIdx - 1);
    }
  };

  const StepIcon = currentStep.icon;
  const isMobile = viewport.width < 768;

  // Anti-clipping dynamic placement for mobile & desktop
  const targetCenterY = targetRect ? targetRect.top + targetRect.height / 2 : viewport.height / 2;
  const isTargetInLowerHalf = targetCenterY > viewport.height / 2;

  // Multi-Directional Anti-Collision Placement Engine for Desktop / Tablet
  const getDesktopStyle = (): React.CSSProperties => {
    // Mobile screens strictly use pure CSS classes (inset-x-3 etc.), NO inline positioning!
    if (!targetRect || isMobile) return {};

    const cardWidth = Math.min(390, viewport.width - 32);
    const cardEstHeight = 245;
    const gap = 16;
    const padding = 16;

    const clampX = (val: number) => Math.max(padding, Math.min(val, viewport.width - cardWidth - padding));
    const clampY = (val: number) => Math.max(padding, Math.min(val, viewport.height - cardEstHeight - padding));

    interface PositionCandidate {
      name: string;
      left: number;
      top: number;
    }

    // Directional candidates around target
    const candidates: PositionCandidate[] = [
      // 1. To the Left of target (Center vertically)
      {
        name: 'left-center',
        left: targetRect.left - cardWidth - gap,
        top: clampY(targetRect.top + targetRect.height / 2 - cardEstHeight / 2),
      },
      // 2. To the Right of target (Center vertically)
      {
        name: 'right-center',
        left: targetRect.right + gap,
        top: clampY(targetRect.top + targetRect.height / 2 - cardEstHeight / 2),
      },
      // 3. Below target (Center horizontally)
      {
        name: 'bottom-center',
        left: clampX(targetRect.left + targetRect.width / 2 - cardWidth / 2),
        top: targetRect.bottom + gap,
      },
      // 4. Above target (Center horizontally)
      {
        name: 'top-center',
        left: clampX(targetRect.left + targetRect.width / 2 - cardWidth / 2),
        top: targetRect.top - cardEstHeight - gap,
      },
      // 5. To the Left of target (Top aligned)
      {
        name: 'left-top',
        left: targetRect.left - cardWidth - gap,
        top: clampY(targetRect.top),
      },
      // 6. To the Right of target (Top aligned)
      {
        name: 'right-top',
        left: targetRect.right + gap,
        top: clampY(targetRect.top),
      },
      // 7. Below target (Right aligned)
      {
        name: 'bottom-right',
        left: clampX(targetRect.right - cardWidth),
        top: targetRect.bottom + gap,
      },
      // 8. Above target (Right aligned)
      {
        name: 'top-right',
        left: clampX(targetRect.right - cardWidth),
        top: targetRect.top - cardEstHeight - gap,
      },
      // 9. Floating Bottom-Right Corner (Safe fallback for huge screen-filling containers)
      {
        name: 'viewport-bottom-right',
        left: viewport.width - cardWidth - padding - 8,
        top: viewport.height - cardEstHeight - padding - 8,
      },
      // 10. Floating Top-Right Corner (Safe fallback)
      {
        name: 'viewport-top-right',
        left: viewport.width - cardWidth - padding - 8,
        top: padding + 60,
      },
    ];

    // Helper to calculate overlap area with target
    const getOverlap = (candLeft: number, candTop: number) => {
      const cRight = candLeft + cardWidth;
      const cBottom = candTop + cardEstHeight;
      const xOverlap = Math.max(0, Math.min(cRight, targetRect.right) - Math.max(candLeft, targetRect.left));
      const yOverlap = Math.max(0, Math.min(cBottom, targetRect.bottom) - Math.max(candTop, targetRect.top));
      return xOverlap * yOverlap;
    };

    // Helper to test if completely within viewport
    const isInsideViewport = (candLeft: number, candTop: number) => {
      return (
        candLeft >= padding - 1 &&
        candLeft + cardWidth <= viewport.width - padding + 1 &&
        candTop >= padding - 1 &&
        candTop + cardEstHeight <= viewport.height - padding + 1
      );
    };

    // 1st priority: Find candidates with ZERO overlap that fit completely in viewport
    const zeroOverlapCandidates = candidates.filter(
      (c) => isInsideViewport(c.left, c.top) && getOverlap(c.left, c.top) === 0
    );

    let chosenLeft: number;
    let chosenTop: number;

    if (zeroOverlapCandidates.length > 0) {
      chosenLeft = zeroOverlapCandidates[0].left;
      chosenTop = zeroOverlapCandidates[0].top;
    } else {
      // 2nd priority: Find candidate that strictly minimizes overlap with target
      let best = candidates[0];
      let minOverlap = Infinity;
      for (const c of candidates) {
        const clampedL = clampX(c.left);
        const clampedT = clampY(c.top);
        const overlap = getOverlap(clampedL, clampedT);
        if (overlap < minOverlap) {
          minOverlap = overlap;
          best = { name: c.name, left: clampedL, top: clampedT };
        }
      }
      chosenLeft = clampX(best.left);
      chosenTop = clampY(best.top);
    }

    return {
      top: `${chosenTop}px`,
      left: `${chosenLeft}px`,
      width: `${cardWidth}px`,
    };
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none pointer-events-auto font-sans">
      {/* 1. Calm, Eye-Friendly Backdrop Mask (Soft Slate, No Blinking) */}
      <svg
        className={`fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-300 ${
          isTransitioning ? 'opacity-30' : 'opacity-100'
        }`}
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="motocare-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={Math.max(0, targetRect.left - 6)}
                y={Math.max(0, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="20"
                ry="20"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.58)"
          mask="url(#motocare-spotlight-mask)"
        />
      </svg>

      {/* 2. Smooth Element Highlight Focus Ring */}
      {targetRect && (
        <div
          className={`fixed pointer-events-none transition-all duration-300 ease-out z-50 rounded-2xl sm:rounded-3xl border-2 border-orange-500 shadow-[0_0_0_4px_rgba(249,115,22,0.25)] ${
            isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* 3. Streamlined, Compact Guide Card (Guaranteed Zero Clipping on Any Screen) */}
      <div
        className={`fixed z-[60] transition-all duration-200 ease-out box-border ${
          isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        } ${
          isMobile
            ? isTargetInLowerHalf
              ? 'top-4 inset-x-3 w-auto max-w-[calc(100vw-24px)]'
              : 'bottom-4 inset-x-3 w-auto max-w-[calc(100vw-24px)]'
            : 'w-[420px] max-w-[calc(100vw-32px)]'
        }`}
        style={!isMobile ? getDesktopStyle() : undefined}
      >
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-5 flex flex-col space-y-2.5 max-h-[85vh] sm:max-h-[300px] overflow-y-auto">
          
          {/* Header Row: Badge, Language Toggle (EN/TL), and Close Button */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 shrink-0">
            <span className="text-[10px] font-extrabold tracking-wider text-orange-600 bg-orange-50 border border-orange-200/80 px-2.5 py-0.5 rounded-full uppercase">
              {currentStep.badge[lang]}
            </span>

            <div className="flex items-center gap-1.5">
              {/* Language Switcher */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200/60 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleToggleLang('en')}
                  className={`px-2 py-0.5 rounded-full transition-all text-[10px] cursor-pointer ${
                    lang === 'en'
                      ? 'bg-orange-500 text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Switch to English"
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLang('tl')}
                  className={`px-2 py-0.5 rounded-full transition-all text-[10px] cursor-pointer ${
                    lang === 'tl'
                      ? 'bg-orange-500 text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Lumipat sa Tagalog"
                >
                  TL
                </button>
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title={lang === 'tl' ? 'Isara' : 'Dismiss Tour'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Punchy, Short Content Body */}
          <div className="space-y-1.5 flex-1 min-h-0 text-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-orange-500/25">
                <StepIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                {currentStep.title[lang]}
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-snug">
              {currentStep.description[lang]}
            </p>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl px-2.5 py-1.5 flex items-start gap-1.5 text-xs text-amber-900">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span className="text-[11px] font-medium leading-tight">
                {currentStep.tip[lang]}
              </span>
            </div>
          </div>

          {/* Footer Controls: Dots, Skip, Back, Next */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
            {/* Step Dots */}
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((step, idx) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => !isTransitioning && navigateToStep(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIdx
                      ? 'w-4 bg-orange-500'
                      : idx < currentStepIdx
                      ? 'w-1.5 bg-orange-300'
                      : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                  }`}
                  title={`Step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleDismiss}
                className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              >
                {lang === 'tl' ? 'Laktawan' : 'Skip'}
              </button>

              <button
                type="button"
                onClick={handlePrev}
                disabled={isFirstStep || isTransitioning}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-0.5 transition cursor-pointer whitespace-nowrap ${
                  isFirstStep || isTransitioning
                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{lang === 'tl' ? 'Bumalik' : 'Back'}</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isTransitioning}
                className="px-3 sm:px-3.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs shadow-orange-500/25 cursor-pointer whitespace-nowrap"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{lang === 'tl' ? 'Tapos' : 'Finish'}</span>
                  </>
                ) : (
                  <>
                    <span>{lang === 'tl' ? 'Susunod' : 'Next'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
