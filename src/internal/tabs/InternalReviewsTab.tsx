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

// Status pill: neutral pill with a colored dot (same style as the Queue)
const STATUS_BADGE: Record<ReviewModerationStatus, { label: string; dot: string }> = {
  pending: { label: 'Needs approval', dot: 'bg-orange-500' },
  published: { label: 'Public', dot: 'bg-emerald-500' },
  hidden: { label: 'Hidden', dot: 'bg-slate-400' },
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

  // How many reviews got each star rating (5 → 1)
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => Math.round(r.rating) === stars).length,
  }));
  const maxBucket = Math.max(1, ...distribution.map((d) => d.count));

  const secondaryBtn =
    'px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50';
  const primaryBtn =
    'px-3.5 py-1.5 rounded-full text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-sm shadow-orange-500/25 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 active:scale-95';

  return (
    <div className="space-y-4">
      {/* 1. Summary: public rating, star breakdown, and what needs approval */}
      <section className="bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-3">
          <p className="text-sm text-slate-500">Rating on the website</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="font-display text-5xl font-bold tracking-tight text-slate-900 leading-none">
              {average(publicReviews)}
            </span>
            <span className="text-slate-400 mb-1">/ 5</span>
          </div>
          <div className="mt-2">
            <Stars rating={Number(average(publicReviews)) || 0} size="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {publicReviews.length} public review{publicReviews.length === 1 ? '' : 's'} · {average(reviews)} overall from{' '}
            {reviews.length}
          </p>
        </div>

        <div className="md:col-span-6 space-y-1.5">
          {distribution.map((d) => (
            <div key={d.stars} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-slate-600 flex items-center gap-0.5 shrink-0">
                {d.stars}
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </span>
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${d.stars <= 2 ? 'bg-rose-400' : 'bg-amber-400'}`}
                  style={{ width: `${(d.count / maxBucket) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right text-slate-500 tabular-nums shrink-0">{d.count}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`md:col-span-3 text-left rounded-2xl p-4 transition cursor-pointer ${
            counts.pending > 0 ? 'bg-orange-50 hover:bg-orange-100 border border-orange-200' : 'bg-slate-50 border border-slate-100'
          }`}
        >
          <p className="text-sm text-slate-500">Needs approval</p>
          <p className={`font-display text-4xl font-bold mt-1 ${counts.pending > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
            {counts.pending}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {counts.pending > 0 ? 'New reviews wait here before they go on the website' : 'Nothing waiting'}
          </p>
        </button>
      </section>

      {/* 2. Filter + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center p-1 bg-white border border-slate-200/70 rounded-full card-elevated overflow-x-auto [scrollbar-width:none] max-w-full">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            const alert = tab.id === 'pending' && tab.count > 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                aria-pressed={isActive}
                className={`px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isActive ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                {tab.label}
                <span
                  className={`min-w-[20px] px-1.5 rounded-full text-[11px] font-semibold leading-5 text-center tabular-nums ${
                    alert || isActive ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative sm:ml-auto sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ticket, comment"
            className="w-full bg-white border border-slate-200 rounded-full pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder:not-italic placeholder:text-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition"
          />
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-800 text-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Reviews */}
      {loading ? (
        <div className="p-10 flex items-center justify-center text-slate-400 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading reviews…
        </div>
      ) : visibleReviews.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl sm:rounded-[1.75rem] card-elevated p-12 text-center">
          <span className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6" />
          </span>
          <p className="mt-3 font-display font-bold text-slate-900">
            {search ? 'No reviews match your search' : activeFilter === 'pending' ? 'Nothing waiting for approval' : 'No reviews here'}
          </p>
          <p className="text-sm text-slate-500">Riders can rate a service after their motorcycle is released.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {visibleReviews.map((review) => {
            const ticket = ticketById.get(review.ticket_id);
            const status = getReviewStatus(review);
            const badge = STATUS_BADGE[status];
            const isBusy = busyId === review.id;
            const isReplying = replyingId === review.id;
            const name = ticket?.customer_name || review.display_name;
            const isLow = review.rating <= 2;

            return (
              <article
                key={review.id}
                className={`bg-white border rounded-2xl sm:rounded-[1.5rem] card-elevated p-5 flex flex-col gap-3.5 ${
                  status === 'pending' ? 'border-orange-300 ring-4 ring-orange-100' : 'border-slate-200/70'
                }`}
              >
                {/* Who + rating */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center font-bold shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{name}</p>
                      <p className="text-xs text-slate-500 truncate" title={ticket?.motorcycles?.model || review.bike_model || ''}>
                        {ticket?.motorcycles?.model || review.bike_model}
                      </p>
                      <p className="text-xs text-slate-400">
                        {ticket ? `${ticket.ticket_code} · ` : ''}
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium whitespace-nowrap shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                </div>

                {/* Stars + comment */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Stars rating={review.rating} size="w-4 h-4" />
                    {isLow && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-medium">Low rating</span>
                    )}
                  </div>
                  <p className={`leading-relaxed ${review.comment ? 'text-slate-800' : 'text-sm text-slate-400'}`}>
                    {review.comment ? `“${review.comment}”` : 'No written comment.'}
                  </p>
                </div>

                {/* Shop reply */}
                {isReplying ? (
                  <div className="space-y-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={3}
                      maxLength={500}
                      autoFocus
                      placeholder="Reply as MotoCare (shown publicly under this review)"
                      className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder:not-italic placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 resize-none transition"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingId(null);
                          setReplyText('');
                        }}
                        className={secondaryBtn}
                      >
                        Cancel
                      </button>
                      <button type="button" disabled={isBusy} onClick={() => handleSaveReply(review)} className={primaryBtn}>
                        {isBusy ? 'Saving…' : 'Save reply'}
                      </button>
                    </div>
                  </div>
                ) : (
                  review.shop_reply && (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 mb-0.5">
                        <Reply className="w-3.5 h-3.5" />
                        MotoCare replied
                      </span>
                      {review.shop_reply}
                    </div>
                  )
                )}

                {/* Footer */}
                <div className="mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 truncate">
                    {review.service_type || ticket?.service_type || ''}
                    {review.moderated_by ? ` · ${status === 'hidden' ? 'Hidden' : 'Approved'} by ${review.moderated_by}` : ''}
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
                        className={secondaryBtn}
                      >
                        <Reply className="w-3.5 h-3.5" />
                        {review.shop_reply ? 'Edit reply' : 'Reply'}
                      </button>
                    )}
                    {status === 'published' ? (
                      <button type="button" disabled={isBusy} onClick={() => handleSetPublished(review, false)} className={secondaryBtn}>
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                        Hide
                      </button>
                    ) : (
                      <>
                        {status === 'pending' && (
                          <button type="button" disabled={isBusy} onClick={() => handleSetPublished(review, false)} className={secondaryBtn}>
                            <EyeOff className="w-3.5 h-3.5" />
                            Keep hidden
                          </button>
                        )}
                        <button type="button" disabled={isBusy} onClick={() => handleSetPublished(review, true)} className={primaryBtn}>
                          {isBusy ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : status === 'pending' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          {status === 'pending' ? 'Approve' : 'Show'}
                        </button>
                      </>
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
