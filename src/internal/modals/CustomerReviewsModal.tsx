import { useCallback, useEffect, useMemo, useState } from 'react';
import { InternalTicket } from '../types/internal';
import {
  fetchAllReviews,
  getReviewStatus,
  ModeratedReview,
  ReviewModerationStatus,
  saveShopReply,
  setReviewPublished,
} from '../utils/reviewModeration';
import {
  X,
  Star,
  MessageSquare,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  Reply,
  AlertCircle,
  Loader2,
  Clock,
} from 'lucide-react';

interface CustomerReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: InternalTicket[];
  currentStaffName?: string;
}

type ReviewFilter = ReviewModerationStatus | 'all';

const STATUS_BADGE: Record<ReviewModerationStatus, { label: string; className: string }> = {
  pending: { label: 'Needs Approval', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  published: { label: 'Public', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  hidden: { label: 'Hidden', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Recent Visit';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function CustomerReviewsModal({
  isOpen,
  onClose,
  tickets,
  currentStaffName = 'Workshop Staff',
}: CustomerReviewsModalProps) {
  const [reviews, setReviews] = useState<ModeratedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewFilter | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const loadReviews = useCallback(() => {
    fetchAllReviews().then((res) => {
      setReviews(res.reviews);
      setErrorMsg(res.error || null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (isOpen) loadReviews();
  }, [isOpen, loadReviews]);

  // Ticket context (full customer name, plate, mechanic) for each review
  const ticketById = useMemo(() => {
    const map = new Map<string, InternalTicket>();
    tickets.forEach((t) => map.set(t.id, t));
    return map;
  }, [tickets]);

  const counts = useMemo(() => {
    const c = { pending: 0, published: 0, hidden: 0, all: reviews.length };
    reviews.forEach((r) => {
      c[getReviewStatus(r)] += 1;
    });
    return c;
  }, [reviews]);

  // Default to the queue that needs attention
  const activeFilter: ReviewFilter = filter ?? (counts.pending > 0 ? 'pending' : 'all');

  const visibleReviews = useMemo(
    () => (activeFilter === 'all' ? reviews : reviews.filter((r) => getReviewStatus(r) === activeFilter)),
    [reviews, activeFilter]
  );

  const stats = useMemo(() => {
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      dist[star] += 1;
      sum += r.rating;
    });
    const total = reviews.length;
    return {
      avgRating: total > 0 ? (sum / total).toFixed(1) : '0.0',
      totalCount: total,
      fiveStarPct: total > 0 ? Math.round((dist[5] / total) * 100) : 0,
      distribution: dist,
    };
  }, [reviews]);

  const ticketCodeFor = (review: ModeratedReview) => ticketById.get(review.ticket_id)?.ticket_code || 'REVIEW';

  const handleSetPublished = async (review: ModeratedReview, publish: boolean) => {
    setBusyId(review.id);
    setErrorMsg(null);
    const res = await setReviewPublished(review, publish, currentStaffName, ticketCodeFor(review));
    setBusyId(null);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update the review.');
      return;
    }
    loadReviews();
  };

  const handleSaveReply = async (review: ModeratedReview) => {
    setBusyId(review.id);
    setErrorMsg(null);
    const res = await saveShopReply(review, replyText, currentStaffName, ticketCodeFor(review));
    setBusyId(null);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to save the reply.');
      return;
    }
    setReplyingId(null);
    setReplyText('');
    loadReviews();
  };

  if (!isOpen) return null;

  const filterTabs: { id: ReviewFilter; label: string; count: number }[] = [
    { id: 'pending', label: 'Needs Approval', count: counts.pending },
    { id: 'published', label: 'Public', count: counts.published },
    { id: 'hidden', label: 'Hidden', count: counts.hidden },
    { id: 'all', label: 'All', count: counts.all },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 text-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Star className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900">Customer Reviews & Feedback</h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200">
                  {stats.totalCount} {stats.totalCount === 1 ? 'Review' : 'Reviews'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Approve, hide, or reply to reviews before they appear on the public website.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Top Score Summary Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center bg-white border border-amber-200 rounded-2xl px-5 py-3 shadow-2xs">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{stats.avgRating}</span>
                <div className="flex items-center text-amber-500 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.round(parseFloat(stats.avgRating)) ? 'fill-amber-400 text-amber-500' : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Out of 5.0</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Workshop Quality Score</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                  {stats.totalCount > 0
                    ? `${stats.fiveStarPct}% of riders rated their service 5 stars. 1–2 star reviews wait for your approval before going public.`
                    : 'Customer ratings submitted through the rider dashboard will appear here in real time.'}
                </p>
              </div>
            </div>

            <div className="space-y-1 text-xs min-w-[140px] border-t sm:border-t-0 sm:border-l border-amber-200/60 pt-3 sm:pt-0 sm:pl-4">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star] || 0;
                const pct = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <span className="w-4 font-bold text-slate-700">{star}★</span>
                    <div className="flex-1 h-2 bg-slate-200/70 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-5 text-right font-mono text-[10px] text-slate-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => {
              const isActive = activeFilter === tab.id;
              const isUrgent = tab.id === 'pending' && tab.count > 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`min-w-5 px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      isUrgent ? 'bg-amber-500 text-white' : isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Reviews Feed List */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-8 flex items-center justify-center text-slate-400 gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading reviews...
              </div>
            ) : visibleReviews.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="font-bold text-sm text-slate-800">
                  {activeFilter === 'pending' ? 'Nothing waiting for approval' : 'No reviews here'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Customers are prompted to rate their service after their motorcycle is released.
                </p>
              </div>
            ) : (
              visibleReviews.map((review) => {
                const ticket = ticketById.get(review.ticket_id);
                const status = getReviewStatus(review);
                const badge = STATUS_BADGE[status];
                const isBusy = busyId === review.id;
                const isReplying = replyingId === review.id;
                const customerName = ticket?.customer_name || review.display_name;

                return (
                  <div
                    key={review.id}
                    className={`p-4 bg-white border rounded-2xl shadow-xs space-y-3 transition ${
                      status === 'pending' ? 'border-amber-300' : 'border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    {/* Header Row: Customer, Rating & Date */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {customerName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900">{customerName}</h4>
                            {ticket && (
                              <span className="font-mono text-[11px] text-orange-600 font-bold">#{ticket.ticket_code}</span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}>
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {ticket?.motorcycles?.model || review.bike_model || 'Motorcycle Unit'}
                            {ticket?.motorcycles?.plate_number ? ` • Plate: ${ticket.motorcycles.plate_number}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-200'}`}
                            />
                          ))}
                          <span className="font-bold text-xs text-slate-800 ml-1.5">{review.rating}.0</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{formatDate(review.created_at)}</span>
                      </div>
                    </div>

                    {/* Customer comment */}
                    {review.comment ? (
                      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-xs text-slate-800 italic leading-relaxed">
                        "{review.comment}"
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No written comment provided.</p>
                    )}

                    {/* Shop reply (display or editor) */}
                    {isReplying ? (
                      <div className="space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                          maxLength={500}
                          placeholder="Write a reply from MotoCare (shown publicly under this review)..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingId(null);
                              setReplyText('');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleSaveReply(review)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer disabled:opacity-50"
                          >
                            {isBusy ? 'Saving...' : 'Save Reply'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      review.shop_reply && (
                        <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-100 text-xs text-slate-700 leading-relaxed">
                          <span className="font-bold text-orange-700">MotoCare replied:</span> {review.shop_reply}
                          {review.replied_by && (
                            <span className="block text-[10px] text-slate-400 mt-1">— {review.replied_by}</span>
                          )}
                        </div>
                      )
                    )}

                    {/* Footer: service + moderation actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="text-[11px] text-slate-500 min-w-0">
                        <span className="truncate block">
                          Service: <strong className="text-slate-700">{review.service_type || ticket?.service_type || '—'}</strong>
                        </span>
                        {review.moderated_by && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" /> {status === 'hidden' ? 'Hidden' : 'Approved'} by {review.moderated_by}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isReplying && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setReplyingId(review.id);
                              setReplyText(review.shop_reply || '');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            {review.shop_reply ? 'Edit Reply' : 'Reply'}
                          </button>
                        )}
                        {status === 'published' ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleSetPublished(review, false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                            Hide
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleSetPublished(review, true)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : status === 'pending' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                            {status === 'pending' ? 'Approve' : 'Show'}
                          </button>
                        )}
                        {status === 'pending' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleSetPublished(review, false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            Keep Hidden
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
