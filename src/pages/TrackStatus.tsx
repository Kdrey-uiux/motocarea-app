import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Search,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertCircle,
  Bike,
  ShieldCheck,
  Calendar,
  Radio,
  Loader2,
  Store
} from 'lucide-react';
import MotoCareLogo from '../components/brand/MotoCareLogo';

interface PublicTicket {
  id: string;
  ticket_code: string;
  service_type: string;
  stage: number;
  assigned_bay: string;
  assigned_mechanic: string;
  estimated_pickup: string;
  total_estimate: string;
  status: string;
  dropoff_date?: string;
  created_at: string;
  motorcycles?: {
    model: string;
    plate_number: string;
  } | null;
}

const FUNCTION_NOT_FOUND = 'PGRST202';

/**
 * Public ticket lookup. Uses the track_ticket() database function (migration 11), which
 * returns only public-safe fields. Falls back to a direct read on older databases.
 */
async function lookupPublicTicket(code: string): Promise<PublicTicket | null> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('track_ticket', { p_code: code });
  if (!rpcError) return (rpcData as PublicTicket | null) || null;
  if (rpcError.code !== FUNCTION_NOT_FOUND) throw rpcError;

  const { data, error } = await supabase
    .from('service_tickets')
    .select(
      'id, ticket_code, service_type, stage, assigned_bay, assigned_mechanic, estimated_pickup, total_estimate, status, dropoff_date, created_at, motorcycles (model, plate_number)'
    )
    .eq('ticket_code', code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const rawBike = data.motorcycles as PublicTicket['motorcycles'] | PublicTicket['motorcycles'][];
  return {
    ...data,
    motorcycles: (Array.isArray(rawBike) ? rawBike[0] : rawBike) || null,
  } as PublicTicket;
}

type TicketKind = 'account' | 'walkin';

// YYYY-MM-DD of a timestamp in Philippine time (the shop's calendar day)
function manilaDateKey(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

/**
 * Whether a code belongs to a rider account or is a walk-in ticket (null = not found).
 * Uses ticket_lookup_kind() (migration 12); older databases fall back to a direct read.
 */
async function lookupTicketKind(code: string): Promise<TicketKind | null> {
  const { data, error } = await supabase.rpc('ticket_lookup_kind', { p_code: code });
  if (!error) return (data as TicketKind | null) || null;
  if (error.code !== FUNCTION_NOT_FOUND) throw error;

  const { data: row } = await supabase
    .from('service_tickets')
    .select('user_id')
    .eq('ticket_code', code)
    .maybeSingle();
  if (row) return row.user_id ? 'account' : 'walkin';
  // The row may just be hidden by row-level security; let the public lookup decide
  return (await lookupPublicTicket(code)) ? 'account' : null;
}

/**
 * Walk-in lookup: returns the ticket only when the creation date matches.
 * The database checks the date (migration 12); older databases check it here.
 */
async function lookupWalkInTicket(code: string, createdOn: string): Promise<PublicTicket | null> {
  const { data, error } = await supabase.rpc('track_ticket', { p_code: code, p_created_on: createdOn });
  if (!error) return (data as PublicTicket | null) || null;
  if (error.code !== FUNCTION_NOT_FOUND) throw error;

  const found = await lookupPublicTicket(code);
  return found && manilaDateKey(found.created_at) === createdOn ? found : null;
}

function isSearchableCode(code: string): boolean {
  return Boolean(code) && code !== 'MC-' && code !== 'MC-W-';
}

function normalizeTicketCode(input: string): string {
  let cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('MC-')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.startsWith('W-')) {
    return `MC-W-${cleaned.slice(2).replace(/\D/g, '')}`;
  } else if (cleaned.startsWith('W')) {
    return `MC-W-${cleaned.slice(1).replace(/\D/g, '')}`;
  } else {
    return `MC-${cleaned.replace(/\D/g, '')}`;
  }
}

export default function TrackStatus() {
  const { ticketCode } = useParams<{ ticketCode?: string }>();
  const navigate = useNavigate();

  const [ticketInput, setTicketInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Walk-in tickets (no rider account) need the ticket's creation date before details are shown
  const [verifyCode, setVerifyCode] = useState<string | null>(null);
  const [verifyDate, setVerifyDate] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  // Codes the visitor already verified this visit, so live refreshes keep working
  // A walk-in slip's QR code links to /track/MC-W-1234?d=YYYY-MM-DD: the date on the slip,
  // so scanning it shows the status right away (a wrong date falls back to the form)
  const [verifiedDates] = useState(() => {
    const dates = new Map<string, string>();
    const qrDate = new URLSearchParams(window.location.search).get('d');
    if (ticketCode && qrDate && /^\d{4}-\d{2}-\d{2}$/.test(qrDate)) {
      dates.set(normalizeTicketCode(ticketCode), qrDate);
    }
    return dates;
  });

  // Looks up a (normalized) code; the spinner is switched on by whoever starts the search
  const fetchTicket = useCallback((cleanCode: string) => {
    const notFound = `No service record found for ticket code "${cleanCode}". Please verify your ticket reference.`;
    return lookupTicketKind(cleanCode)
      .then(async (kind) => {
        if (!kind) {
          setTicket(null);
          setVerifyCode(null);
          setErrorMsg(notFound);
          return;
        }

        const verifiedOn = verifiedDates.get(cleanCode);
        if (kind === 'walkin' && !verifiedOn) {
          // Ask for the creation date before showing anything
          setTicket(null);
          setErrorMsg(null);
          setVerifyCode(cleanCode);
          return;
        }

        const data = kind === 'walkin' && verifiedOn
          ? await lookupWalkInTicket(cleanCode, verifiedOn)
          : await lookupPublicTicket(cleanCode);
        if (!data && kind === 'walkin') {
          // The saved or scanned date didn't match: ask for it instead
          verifiedDates.delete(cleanCode);
          setTicket(null);
          setErrorMsg(null);
          setVerifyCode(cleanCode);
          return;
        }
        setVerifyCode(null);
        setTicket(data);
        setErrorMsg(data ? null : notFound);
      })
      .catch((err: unknown) => {
        console.error('Track lookup error:', err);
        setErrorMsg(err instanceof Error ? err.message : 'Unable to fetch ticket details.');
        setTicket(null);
      })
      .finally(() => setLoading(false));
  }, [verifiedDates]);

  const handleVerifyWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode || !verifyDate) return;
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const data = await lookupWalkInTicket(verifyCode, verifyDate);
      if (!data) {
        setVerifyError(
          "The ticket number and date don't match our records. Check the date on your slip from the counter, or ask our staff."
        );
        return;
      }
      verifiedDates.set(verifyCode, verifyDate);
      setVerifyCode(null);
      setVerifyDate('');
      setTicket(data);
    } catch (err: unknown) {
      console.error('Walk-in verification error:', err);
      setVerifyError(err instanceof Error ? err.message : 'Unable to verify the ticket. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // The code in the URL (/track/MC-1234) fills the search box and starts the lookup
  const urlCode = ticketCode ? normalizeTicketCode(ticketCode) : '';
  const urlCodeIsValid = isSearchableCode(urlCode);
  const [shownUrlCode, setShownUrlCode] = useState('');
  if (urlCode !== shownUrlCode) {
    setShownUrlCode(urlCode);
    if (urlCodeIsValid) {
      setTicketInput(urlCode.startsWith('MC-') ? urlCode.slice(3) : urlCode);
      setLoading(true);
      setErrorMsg(null);
    }
  }
  useEffect(() => {
    if (urlCodeIsValid) fetchTicket(urlCode);
  }, [urlCode, urlCodeIsValid, fetchTicket]);

  // Live real-time updates for customers tracking their active service
  useEffect(() => {
    if (!ticket?.id && !ticket?.ticket_code) return;

    const currentTicketCode = ticket.ticket_code;
    const currentTicketId = ticket.id;

    const channel = supabase
      .channel(`public_track_realtime_${currentTicketCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_tickets',
          filter: `id=eq.${currentTicketId}`,
        },
        () => {
          fetchTicket(currentTicketCode);
        }
      )
      .on(
        'broadcast',
        { event: 'TICKET_DISPATCH_SYNC' },
        (payload: { payload?: { ticket_code?: string; id?: string } }) => {
          if (
            payload?.payload?.ticket_code === currentTicketCode ||
            payload?.payload?.id === currentTicketId
          ) {
            fetchTicket(currentTicketCode);
          }
        }
      )
      .subscribe();

    // Visitors who aren't signed in don't receive database change events, so also poll
    const pollInterval = setInterval(() => fetchTicket(currentTicketCode), 30000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [ticket?.id, ticket?.ticket_code, fetchTicket]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeTicketCode(ticketInput);
    if (!isSearchableCode(normalized)) return;
    if (normalized === urlCode) {
      // Same code as the URL: search again
      setLoading(true);
      setErrorMsg(null);
      fetchTicket(normalized);
    } else {
      navigate(`/track/${normalized}`, { replace: true });
    }
  };

  const stages = [
    {
      step: 1,
      name: 'Intake',
      desc: 'Unit Logged',
      guidance: 'Motorcycle checked in at MotoCare reception. Initial intake and mechanic inspection underway.',
    },
    {
      step: 2,
      name: 'Inspect',
      desc: 'Diagnostics',
      guidance: 'Comprehensive diagnostic scan and physical inspection underway. Advisor will prepare official parts estimate.',
    },
    {
      step: 3,
      name: 'Service',
      desc: 'Repair Work',
      guidance: 'Active service, parts replacement, and fluid replenishment currently in progress on the workshop bay.',
    },
    {
      step: 4,
      name: 'Test',
      desc: 'Road Test',
      guidance: 'Senior technician is conducting quality check, safety torquing, and calibration road testing.',
    },
    {
      step: 5,
      name: 'Ready',
      desc: 'Released',
      guidance: 'All workshop services completed! Motorcycle is cleaned and ready for counter collection at MotoCare reception.',
    },
  ];

  const isCompleted = ticket?.status === 'COMPLETED';
  const isCancelled = ticket?.status === 'CANCELLED' || ticket?.status === 'CANCELLED_BY_ADMIN';
  const isMissed = ticket?.status === 'MISSED' || ticket?.status === 'NO_SHOW';
  const isReady = !isCompleted && (ticket?.status === 'READY_FOR_PICKUP' || ticket?.stage === 5);
  const isWalkIn = Boolean(ticket?.ticket_code?.startsWith('MC-W-'));
  // An online booking still at Stage 1 without a bay hasn't started intake yet
  const isWaitingForIntake =
    !isCompleted && !isCancelled && !isMissed && !isWalkIn && ticket?.stage === 1 && !ticket?.assigned_bay;
  const isClosedEarly = isCancelled || isMissed;
  const effectiveStage = isCompleted ? 5 : (ticket?.stage || 1);

  const statusBadge = isCompleted
    ? { label: 'Completed & Released', tone: 'emerald' }
    : isCancelled
    ? { label: 'Cancelled', tone: 'slate' }
    : isMissed
    ? { label: 'Missed Drop-off', tone: 'rose' }
    : isReady
    ? { label: 'Ready for Pickup', tone: 'emerald' }
    : isWaitingForIntake
    ? { label: 'Waiting for Intake', tone: 'amber' }
    : { label: 'In Workshop', tone: 'orange' };

  const phaseText = isCompleted
    ? 'All services completed! Motorcycle was officially released to customer.'
    : isCancelled
    ? 'This booking was cancelled. Book again anytime from your MotoCare account.'
    : isMissed
    ? 'The drop-off window passed without check-in. Sign in to your MotoCare account to reschedule.'
    : isWaitingForIntake
    ? `Booking received for ${ticket?.dropoff_date || 'your drop-off date'}. Bring your motorcycle to MotoCare reception during your arrival window; intake starts once it is checked in.`
    : stages[effectiveStage - 1]?.guidance;

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-800 flex flex-col font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Top Navigation */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 py-2 text-xs font-semibold text-slate-600 hover:text-orange-600 transition whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" />
            <span><span className="hidden sm:inline">Back to </span>Home</span>
          </Link>

          <MotoCareLogo className="h-10 sm:h-11 w-auto text-slate-900" />

          <Link
            to="/login"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-3.5 py-2 rounded-full border border-orange-200/80 transition whitespace-nowrap"
          >
            Log In
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Search Header */}
        <div className="text-center space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 border border-orange-200/80 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
            <Radio className="w-3.5 h-3.5 text-orange-500" />
            Live Workshop Dispatch Tracker
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Track Your Motorcycle Service
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Enter your service ticket reference code to inspect real-time bay progress, assigned mechanic, and estimated pickup.
          </p>

          <form onSubmit={handleSearch} className="max-w-md mx-auto pt-2">
            <div className="relative flex items-center bg-white border border-slate-200/90 rounded-full shadow-xs focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition p-1.5 pl-3 sm:pl-3.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
              
              {/* Permanent MC- Prefix Badge */}
              <div className="px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-orange-700 font-bold font-mono text-xs select-none shrink-0 flex items-center mr-2">
                MC-
              </div>

              <input
                type="text"
                autoCapitalize="characters"
                maxLength={10}
                value={ticketInput}
                onChange={(e) => {
                  let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                  if (val.startsWith('MC-')) val = val.slice(3);
                  setTicketInput(val.slice(0, 10));
                }}
                placeholder="4821 or W-4821"
                className="w-full bg-transparent text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-mono font-bold tracking-wider focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !ticketInput.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 sm:px-5 py-2 rounded-full transition flex items-center gap-1 shadow-sm shadow-orange-500/20 active:scale-95 cursor-pointer shrink-0"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Track'}
              </button>
            </div>
          </form>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Walk-in Verification (ticket has no rider account) */}
        {verifyCode && !ticket && (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 shadow-xs space-y-5 animate-in fade-in max-w-md mx-auto w-full">
            <div className="text-center space-y-2">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center mx-auto">
                <Store className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Verify your walk-in ticket</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                This ticket was created at our counter and isn't linked to a MotoCare account. To protect your
                details, confirm the date the shop created your ticket.
              </p>
            </div>

            {verifyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{verifyError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyWalkIn} className="space-y-3.5 text-xs">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Ticket number</span>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 tracking-wider">
                  {verifyCode}
                </div>
              </div>
              <div>
                <label htmlFor="walkin-created-date" className="font-bold text-slate-700 block mb-1">
                  Date the ticket was created
                </label>
                <input
                  id="walkin-created-date"
                  type="date"
                  required
                  value={verifyDate}
                  max={manilaDateKey(new Date().toISOString())}
                  onChange={(e) => {
                    setVerifyDate(e.target.value);
                    setVerifyError(null);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                />
                <p className="text-[11px] text-slate-400 mt-1">It's the date on your slip from the counter.</p>
              </div>
              <button
                type="submit"
                disabled={isVerifying || !verifyDate}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-full transition flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 active:scale-[0.98] cursor-pointer"
              >
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{isVerifying ? 'Checking...' : 'Verify & Show Status'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Ticket Details Card */}
        {ticket && (
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 shadow-xs space-y-6 animate-in fade-in">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200/80 text-orange-600 text-xs font-bold font-mono">
                    #{ticket.ticket_code}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 border ${
                      {
                        emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                        slate: 'text-slate-600 bg-slate-100 border-slate-200',
                        rose: 'text-rose-700 bg-rose-50 border-rose-200',
                        amber: 'text-amber-800 bg-amber-50 border-amber-200',
                        orange: 'text-orange-700 bg-orange-50 border-orange-200',
                      }[statusBadge.tone]
                    }`}
                  >
                    {statusBadge.tone === 'emerald' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : statusBadge.tone === 'orange' ? (
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    ) : null}
                    {statusBadge.label}
                  </span>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <Bike className="w-5 h-5 text-slate-400 shrink-0" />
                  <h2 className="text-base sm:text-xl font-bold text-slate-900">
                    {ticket.motorcycles?.model || 'Motorcycle Unit'}{' '}
                    <span className="text-slate-500 font-mono text-sm font-semibold">
                      ({ticket.motorcycles?.plate_number || 'N/A'})
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-slate-500">{ticket.service_type}</p>
              </div>

              <div className="p-3.5 sm:p-0 rounded-2xl bg-slate-50 sm:bg-transparent border sm:border-0 border-slate-200 sm:text-right space-y-1">
                <span className="text-[11px] text-slate-400 block uppercase font-medium tracking-wider">
                  {isCompleted ? 'Completion Date' : 'Estimated Pickup'}
                </span>
                <span className="text-sm font-bold text-slate-900 block">
                  {isCompleted
                    ? 'Service Fully Rendered'
                    : isClosedEarly
                    ? '—'
                    : ticket.estimated_pickup || 'To be assessed upon arrival'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Lead Mechanic:{' '}
                  <strong className="text-orange-600 font-semibold">{ticket.assigned_mechanic || 'To be assigned'}</strong>
                </span>
              </div>
            </div>

            {/* Stepper */}
            <div className="space-y-3 py-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">
                  {isCompleted ? 'Final Workshop Status' : 'Live Repair Progress'}
                </span>
                <span className={`font-semibold ${isCompleted ? 'text-emerald-600 font-bold' : isClosedEarly ? 'text-slate-500' : 'text-orange-600'}`}>
                  {isCompleted
                    ? 'Completed (All 5 Stages Cleared)'
                    : isClosedEarly
                    ? statusBadge.label
                    : isWaitingForIntake
                    ? 'Waiting for drop-off'
                    : `Stage ${effectiveStage} of 5: ${stages[effectiveStage - 1]?.name}`}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {stages.map((st) => {
                  const isDone = isCompleted || (!isClosedEarly && !isWaitingForIntake && st.step < effectiveStage);
                  const isCurrent = !isCompleted && !isClosedEarly && st.step === effectiveStage;

                  return (
                    <div key={st.step} className="space-y-1.5 text-center">
                      <div
                        className={`h-2.5 rounded-full transition-all flex items-center justify-center ${
                          isDone
                            ? 'bg-emerald-500'
                            : isCurrent
                            ? 'bg-orange-500 animate-pulse'
                            : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`text-[10px] sm:text-[11px] font-semibold truncate ${
                          isDone
                            ? 'text-emerald-700'
                            : isCurrent
                            ? 'text-orange-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {st.name}
                      </div>
                      <div className="text-[9px] text-slate-400 hidden sm:block truncate">
                        {st.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3-Column Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">
                  Service Bay
                </span>
                <span className="font-bold text-slate-800 text-xs block">
                  {isCompleted ? 'Cleared & Released' : isClosedEarly ? '—' : ticket.assigned_bay || 'To be assigned'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">
                  Payment
                </span>
                {/* No payments go through the system: the final amount is settled in cash at pickup */}
                <span className="font-semibold text-slate-700 text-xs block">
                  Pay at the counter on pickup
                </span>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">
                  Drop-off Date
                </span>
                <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {ticket.dropoff_date || new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Stage-Aware Workshop Status & Guidance (Privacy-Compliant) */}
            <div className="p-4 bg-orange-50/60 border border-orange-200/70 rounded-2xl text-xs space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">
                  Current Workshop Phase
                </span>
              </div>
              <p className="text-slate-700 font-medium leading-relaxed">
                {phaseText}
              </p>
            </div>

            {/* Privacy Shield & Public Telemetry Notice */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-2.5 text-[11px] text-slate-500 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Public Workshop Telemetry:</strong> Customer personal contact details and private instructions are protected and hidden.
              </span>
            </div>

            {/* Footer Validation */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 border-t border-slate-100">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                Verified Workshop Record
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                MotoCare Service Hub
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}