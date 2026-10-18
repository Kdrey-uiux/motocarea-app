import { useCallback, useEffect, useMemo, useState } from 'react';
import { Star, Search, Eye, EyeOff, CheckCircle2, Reply, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { InternalTicket } from '../types/internal';
import {
  fetchAllReviews,
  getReviewStatus,
  ModeratedReview,
  ReviewModerationStatus,
  saveShopReply,
  setReviewPublished,
} from '../utils/reviewModeration';

interface InternalReviewsTabProps {
  tickets: InternalTicket[];
  currentStaffName?: string;
  /** Called after approve/hide/reply so sidebar badges refresh */
  onChanged?: () => void;
}

type ReviewFilter = ReviewModerationStatus | 'all';

const STATUS_BADGE: Record<ReviewModerationStatus, { label: string; className: string }> = {
  pending: { label: 'Needs approval', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  published: { label: 'Public', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  hidden: { label: 'Hidden', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function Stars({ rating, size = 'w-3.5 h-3.5' }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex items-center" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </span>
  );
}

function average(list: ModeratedReview[]): string {
  if (list.length === 0) return '—';
  return (list.reduce((sum, r) => sum + r.rating, 0) / list.length).toFixed(1);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function InternalReviewsTab({ tickets, currentStaffName = 'Workshop Staff', onChanged }: InternalReviewsTabProps) {
  const [reviews, setReviews] = useState<ModeratedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewFilter | null>(null);
  const [search, setSearch] = useState('');
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
    loadReviews();
  }, [loadReviews]);

  const ticketById = useMemo(() => new Map(tickets.map((t) => [t.id, t])), [tickets]);

  const counts = useMemo(() => {
    const c = { pending: 0, published: 0, hidden: 0, all: reviews.length };
    reviews.forEach((r) => {
      c[getReviewStatus(r)] += 1;
    });
    return c;
  }, [reviews]);

  const publicReviews = useMemo(() => reviews.filter((r) => r.is_published), [reviews]);

  // Open on the queue that needs attention
  const activeFilter: ReviewFilter = filter ?? (counts.pending > 0 ? 'pending' : 'all');

  const visibleReviews = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews.filter((r) => {
      if (activeFilter !== 'all' && getReviewStatus(r) !== activeFilter) return false;
      if (!q) return true;
      const t = ticketById.get(r.ticket_id);
      return [r.display_name, t?.customer_name, r.comment, t?.ticket_code, r.bike_model, t?.motorcycles?.plate_number]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [reviews, activeFilter, search, ticketById]);

  const ticketCodeFor = (review: ModeratedReview) => ticketById.get(review.ticket_id)?.ticket_code || 'REVIEW';

  const afterChange = () => {
    loadReviews();
    onChanged?.();
  };

  const handleSetPublished = async (review: ModeratedReview, publish: boolean) => {
    setBusyId(review.id);
    setErrorMsg(null);
    const res = await setReviewPublished(review, publish, currentStaffName, ticketCodeFor(review));
    setBusyId(null);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update the review.');
      return;
    }
    afterChange();
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
    afterChange();
  };

  const filterTabs: { id: ReviewFilter; label: string; count: number }[] = [
    { id: 'pending', label: 'Needs approval', count: counts.pending },
    { id: 'published', label: 'Public', count: counts.published },
    { id: 'hidden', label: 'Hidden', count: counts.hidden },
    { id: 'all', label: 'All', count: counts.all },
  ];

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500">Public rating (on the website)</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{average(publicReviews)}</span>
            <Stars rating={Number(average(publicReviews)) || 0} size="w-4 h-4" />
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{publicReviews.length} public reviews</p>
        </div>
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`text-left rounded-2xl p-4 border shadow-2xs transition cursor-pointer ${
            counts.pending > 0 ? 'bg-amber-50 border-amber-200 hover:border-amber-300' : 'bg-white border-slate-200/80'
          }`}
        >
          <p className="text-[11px] font-bold text-slate-500">Needs approval</p>
          <p className={`text-2xl font-black mt-1 ${counts.pending > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{counts.pending}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{counts.pending > 0 ? 'Review these first' : 'Nothing waiting'}</p>
        </button>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500">All reviews (incl. hidden)</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{average(reviews)}</span>
            <Stars rating={Number(average(reviews)) || 0} size="w-4 h-4" />
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{reviews.length} total</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isActive ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-white/20'
                      : tab.id === 'pending' && tab.count > 0
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ticket, comment"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:bg-white focus:outline-hidden focus:border-orange-500 transition"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="p-10 flex items-center justify-center text-slate-400 gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading reviews...
        </div>
      ) : visibleReviews.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-bold text-sm text-slate-800">
            {search ? 'No reviews match your search' : activeFilter === 'pending' ? 'Nothing waiting for approval' : 'No reviews here'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleReviews.map((review) => {
            const ticket = ticketById.get(review.ticket_id);
            const status = getReviewStatus(review);
            const badge = STATUS_BADGE[status];
            const isBusy = busyId === review.id;
            const isReplying = replyingId === review.id;
            const name = ticket?.customer_name || review.display_name;
            const bike = [ticket?.motorcycles?.model || review.bike_model, ticket?.motorcycles?.plate_number]
              .filter(Boolean)
              .join(' • ');

            return (
              <article
                key={review.id}
                className={`bg-white border rounded-2xl p-4 shadow-2xs space-y-2.5 ${
                  status === 'pending' ? 'border-amber-300' : 'border-slate-200/80'
                }`}
              >
                {/* Who + rating */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        {name}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {ticket ? `#${ticket.ticket_code} • ` : ''}
                        {bike}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Stars rating={review.rating} />
                    <p className="text-[10px] text-slate-400">{formatDate(review.created_at)}</p>
                  </div>
                </div>

                {/* Comment */}
                <p className="text-xs text-slate-800 leading-relaxed">
                  {review.comment ? `“${review.comment}”` : <span className="text-slate-400 italic">No written comment.</span>}
                </p>

                {/* Shop reply */}
                {isReplying ? (
                  <div className="space-y-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      maxLength={500}
                      autoFocus
                      placeholder="Reply as MotoCare (shown publicly under this review)"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 resize-none"
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
                        {isBusy ? 'Saving...' : 'Save reply'}
                      </button>
                    </div>
                  </div>
                ) : (
                  review.shop_reply && (
                    <div className="pl-3 border-l-2 border-orange-300 text-xs text-slate-600">
                      <span className="font-bold text-orange-700">MotoCare replied: </span>
                      {review.shop_reply}
                    </div>
                  )
                )}

                {/* Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400 truncate">
                    {review.service_type || ticket?.service_type || ''}
                    {review.moderated_by ? ` • ${status === 'hidden' ? 'Hidden' : 'Approved'} by ${review.moderated_by}` : ''}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isReplying && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setReplyingId(review.id);
                          setReplyText(review.shop_reply || '');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        {review.shop_reply ? 'Edit reply' : 'Reply'}
                      </button>
                    )}
                    {status === 'published' ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSetPublished(review, false)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                        Hide
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSetPublished(review, true)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Keep hidden
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
