import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, CircleX, Clock, Info, Layers, LayoutGrid, Loader2, Mail, MapPin, Phone, RefreshCw, X } from '../../components/icons';
import { ScrollLock } from '../../hooks/useLockBodyScroll';
import {
  DEFAULT_SITE_CONTENT,
  getSiteContent,
  saveSiteContent,
  SITE_LIMITS,
  type SiteContent,
} from '../../utils/siteContent';
import { recordAuditLog } from '../utils/databaseAuditLogger';
import { toast } from '../utils/toast';

type Section = 'shop' | 'home' | 'services';

const SECTIONS: { id: Section; label: string; icon: typeof MapPin }[] = [
  { id: 'shop', label: 'Shop details', icon: MapPin },
  { id: 'home', label: 'Home page', icon: LayoutGrid },
  { id: 'services', label: 'Services', icon: Layers },
];

const INPUT =
  'w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition';
const INPUT_WITH_ICON = INPUT.replace('px-3.5', 'pl-10 pr-3.5');

function Field({
  id,
  label,
  hint,
  icon: Icon,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  icon?: typeof MapPin;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5 min-w-0">
      <label htmlFor={id} className="text-sm font-semibold text-slate-800 block">
        {label}
      </label>
      {Icon ? (
        <div className="relative">
          <Icon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          {children}
        </div>
      ) : (
        children
      )}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold text-slate-400 pt-1">{children}</p>;
}

/** What is wrong with the form, and which section to show for it */
function findProblem(c: SiteContent): { section: Section; message: string } | null {
  const required: [Section, string, string][] = [
    ['shop', c.address, 'Please enter the shop address.'],
    ['shop', c.phone, 'Please enter the shop phone number.'],
    ['shop', c.openDays, 'Please enter the days the shop is open.'],
    ['shop', c.openHours, 'Please enter the opening hours.'],
    ['home', c.heroLocation, 'Please enter the location shown above the headline.'],
    ['home', c.heroHeadline, 'Please enter the headline.'],
    ['home', c.heroDescription, 'Please enter the description under the headline.'],
  ];
  for (const [section, value, message] of required) {
    if (!value.trim()) return { section, message };
  }

  if (!/^\+?[0-9][0-9 ()-]{6,18}$/.test(c.phone.trim())) {
    return { section: 'shop', message: 'Please enter a valid phone number.' };
  }
  if (c.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) {
    return { section: 'shop', message: 'Please enter a valid email address, or leave it empty.' };
  }

  const words = c.heroHeadline.trim().split(/\s+/);
  if (words.length < 2) return { section: 'home', message: 'The headline needs at least two words.' };
  if (words.some((word) => word.length > SITE_LIMITS.headlineWord)) {
    return { section: 'home', message: `Each headline word can have up to ${SITE_LIMITS.headlineWord} letters, so it fits on phones.` };
  }

  const incomplete = c.services.findIndex((card) => !card.title.trim() || !card.description.trim());
  if (incomplete !== -1) return { section: 'services', message: `Please complete service card ${incomplete + 1}.` };

  return null;
}

/** Owner only: the parts of the public website that are safe to change without breaking it */
export default function WebsiteContentModal({
  currentUserName,
  onClose,
}: {
  currentUserName: string;
  onClose: () => void;
}) {
  const [content, setContent] = useState<SiteContent>(getSiteContent);
  const [section, setSection] = useState<Section>('shop');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedContent] = useState<SiteContent>(getSiteContent);
  const [askDiscard, setAskDiscard] = useState(false);
  const [restored, setRestored] = useState(false);

  const hasChanges = JSON.stringify(content) !== JSON.stringify(savedContent);
  const isOriginal = JSON.stringify(content) === JSON.stringify(DEFAULT_SITE_CONTENT);

  // Closing with unsaved edits asks first, so a misclick can't lose them
  const requestClose = () => {
    if (hasChanges) setAskDiscard(true);
    else onClose();
  };

  const update = (patch: Partial<SiteContent>) => {
    setContent((prev) => ({ ...prev, ...patch }));
    setErrorMsg(null);
    setRestored(false);
    setAskDiscard(false);
  };

  const updateCard = (index: number, patch: Partial<SiteContent['services'][number]>) => {
    setContent((prev) => ({
      ...prev,
      services: prev.services.map((card, i) => (i === index ? { ...card, ...patch } : card)),
    }));
    setErrorMsg(null);
    setRestored(false);
    setAskDiscard(false);
  };

  const headlineWords = content.heroHeadline.trim().split(/\s+/).filter(Boolean);
  const headlineLast = headlineWords[headlineWords.length - 1] ?? 'Headline';
  const headlineLead = headlineWords.slice(0, -1).join(' ');

  const handleSave = async () => {
    const problem = findProblem(content);
    if (problem) {
      setSection(problem.section);
      setErrorMsg(problem.message);
      return;
    }

    const cleaned: SiteContent = {
      ...content,
      address: content.address.trim(),
      phone: content.phone.trim(),
      email: content.email.trim(),
      openDays: content.openDays.trim(),
      openHours: content.openHours.trim(),
      closedDays: content.closedDays.trim(),
      heroLocation: content.heroLocation.trim(),
      heroHeadline: content.heroHeadline.trim().replace(/\s+/g, ' '),
      heroDescription: content.heroDescription.trim(),
      services: content.services.map((card) => ({ title: card.title.trim(), description: card.description.trim() })),
    };

    setSaving(true);
    const result = await saveSiteContent(cleaned, currentUserName);
    setSaving(false);
    if (!result.success) {
      setErrorMsg(result.error || 'The website content could not be saved.');
      return;
    }

    recordAuditLog({
      ticketCode: 'WORKSHOP',
      action: 'WEBSITE_UPDATED',
      actor: currentUserName,
      details: 'Updated the website content.',
    });
    toast.success('The website was updated.');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <ScrollLock />
      <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">Website content</h3>
              <p className="text-sm text-slate-500">Changes show on the website right after you save.</p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-0.5 p-1 rounded-full bg-slate-100" role="tablist" aria-label="Website content">
            {SECTIONS.map((item) => {
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSection(item.id)}
                  className={`flex items-center justify-center gap-1.5 px-1 py-2 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer ${
                    isActive ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <item.icon className="hidden min-[400px]:block w-3.5 h-3.5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 overflow-y-auto space-y-4 flex-1 min-h-0">
          {errorMsg && (
            <p role="alert" className="px-3.5 py-2.5 rounded-2xl bg-rose-50 text-rose-700 text-sm">
              {errorMsg}
            </p>
          )}

          {section === 'shop' && (
            <>
              <GroupLabel>Contact</GroupLabel>
              <Field id="site-address" label="Address" icon={MapPin}>
                <input
                  id="site-address"
                  type="text"
                  maxLength={SITE_LIMITS.address}
                  value={content.address}
                  onChange={(e) => update({ address: e.target.value })}
                  className={INPUT_WITH_ICON}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="site-phone" label="Phone" icon={Phone}>
                  <input
                    id="site-phone"
                    type="tel"
                    maxLength={SITE_LIMITS.phone}
                    value={content.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    className={INPUT_WITH_ICON}
                  />
                </Field>
                <Field id="site-email" label="Email (optional)" icon={Mail}>
                  <input
                    id="site-email"
                    type="email"
                    maxLength={SITE_LIMITS.email}
                    value={content.email}
                    onChange={(e) => update({ email: e.target.value })}
                    className={INPUT_WITH_ICON}
                  />
                </Field>
              </div>
              <GroupLabel>Business hours</GroupLabel>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field id="site-days" label="Open days" icon={Calendar}>
                  <input
                    id="site-days"
                    type="text"
                    maxLength={SITE_LIMITS.openDays}
                    value={content.openDays}
                    onChange={(e) => update({ openDays: e.target.value })}
                    className={INPUT_WITH_ICON}
                  />
                </Field>
                <Field id="site-hours" label="Open hours" icon={Clock}>
                  <input
                    id="site-hours"
                    type="text"
                    maxLength={SITE_LIMITS.openHours}
                    value={content.openHours}
                    onChange={(e) => update({ openHours: e.target.value })}
                    className={INPUT_WITH_ICON}
                  />
                </Field>
                <Field id="site-closed" label="Closed on" icon={CircleX}>
                  <input
                    id="site-closed"
                    type="text"
                    maxLength={SITE_LIMITS.closedDays}
                    value={content.closedDays}
                    onChange={(e) => update({ closedDays: e.target.value })}
                    className={INPUT_WITH_ICON}
                  />
                </Field>
              </div>
              <p className="px-3.5 py-2.5 rounded-2xl bg-orange-50/70 text-xs text-slate-600 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-px" />
                This only changes what riders read. Booking days and arrival times stay the same.
              </p>
            </>
          )}

          {section === 'home' && (
            <>
              <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-orange-50/60 to-transparent px-4 py-5 text-center">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 break-words">{content.heroLocation || 'Location'}</p>
                <p className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight break-words">
                  {headlineLead}
                  {headlineLead && ' '}
                  <span className="text-orange-500">{headlineLast}</span>
                </p>
                <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto break-words">{content.heroDescription || 'Description'}</p>
              </div>
              <Field id="site-location" label="Location above the headline">
                <input
                  id="site-location"
                  type="text"
                  maxLength={SITE_LIMITS.heroLocation}
                  value={content.heroLocation}
                  onChange={(e) => update({ heroLocation: e.target.value })}
                  className={INPUT}
                />
              </Field>
              <Field id="site-headline" label="Headline" hint="The last word is shown in orange.">
                <input
                  id="site-headline"
                  type="text"
                  maxLength={SITE_LIMITS.heroHeadline}
                  value={content.heroHeadline}
                  onChange={(e) => update({ heroHeadline: e.target.value })}
                  className={INPUT}
                />
              </Field>
              <Field id="site-description" label="Description" hint={`${content.heroDescription.length} of ${SITE_LIMITS.heroDescription} characters`}>
                <textarea
                  id="site-description"
                  rows={3}
                  maxLength={SITE_LIMITS.heroDescription}
                  value={content.heroDescription}
                  onChange={(e) => update({ heroDescription: e.target.value })}
                  className={`${INPUT} resize-none`}
                />
              </Field>
            </>
          )}

          {section === 'services' && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {content.services.map((card, index) => (
                <li key={index} className="p-3.5 rounded-2xl border border-slate-200/70 space-y-3 min-w-0">
                  <span className="inline-flex w-6 h-6 rounded-lg bg-orange-50 text-orange-600 text-xs font-bold items-center justify-center">
                    {index + 1}
                  </span>
                  <Field id={`site-card-title-${index}`} label="Name">
                    <input
                      id={`site-card-title-${index}`}
                      type="text"
                      maxLength={SITE_LIMITS.serviceTitle}
                      value={card.title}
                      onChange={(e) => updateCard(index, { title: e.target.value })}
                      className={INPUT}
                    />
                  </Field>
                  <Field id={`site-card-description-${index}`} label="Description">
                    <textarea
                      id={`site-card-description-${index}`}
                      rows={3}
                      maxLength={SITE_LIMITS.serviceDescription}
                      value={card.description}
                      onChange={(e) => updateCard(index, { description: e.target.value })}
                      className={`${INPUT} resize-none`}
                    />
                  </Field>
                </li>
              ))}
            </ul>
          )}
        </div>

        {askDiscard ? (
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <p className="text-sm font-medium text-slate-800">Discard your changes?</p>
            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAskDiscard(false)}
                className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 shrink-0 space-y-2">
            {restored && hasChanges && (
              <p role="status" className="text-xs text-slate-500">
                Original text is back in the form. Press Save to apply it.
              </p>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setContent(DEFAULT_SITE_CONTENT);
                  setErrorMsg(null);
                  setRestored(true);
                }}
                disabled={saving || isOriginal}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                Reset to original
              </button>
              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={requestClose}
                  disabled={saving}
                  className="px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="px-5 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/25 transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
