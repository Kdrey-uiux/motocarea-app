import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Quote, Bike, MessageSquarePlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseTicketReview, formatPublicReviewerName } from '../../utils/ticketReviews';

interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  display_name: string;
  bike_model: string | null;
  service_type: string | null;
  shop_reply?: string | null;
  created_at: string;
}

interface ReviewStats {
  review_count: number;
  average_rating: number;
}

const MAX_FEATURED_REVIEWS = 6;

function StarRow({ rating, size = 'w-4 h-4' }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
        />
      ))}
    </div>
  );
}

function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// PostgREST error code when a table/view does not exist yet (migration 08 not applied)
const TABLE_NOT_FOUND = 'PGRST205';
// Postgres error code for a column that does not exist yet
const COLUMN_NOT_FOUND = '42703';

/**
 * Fallback for databases without the customer_reviews table yet: reads the
 * [REVIEW:{...}] tag from completed tickets. Only the parsed review fields are
 * kept; once migration 08 is applied the table is used instead.
 */
async function fetchReviewsFromTickets(): Promise<{ reviews: PublicReview[] | null; stats: ReviewStats | null }> {
  const { data, error } = await supabase
    .from('service_tickets')
    .select('id, notes, service_type')
    .like('notes', '%[REVIEW:%');

  if (error) {
    console.warn('Failed to load customer reviews from tickets:', error.message);
    return { reviews: null, stats: null };
  }

  const all: PublicReview[] = (data || [])
    .map((t) => {
      const review = parseTicketReview(t.notes);
      if (!review) return null;
      return {
        id: t.id,
        rating: review.rating,
        comment: review.comment?.trim() || null,
        display_name: formatPublicReviewerName(review.reviewer_name),
        bike_model: review.bike_model || null,
        service_type: t.service_type || null,
        created_at: review.reviewed_at,
      };
    })
    .filter((r): r is PublicReview => r !== null)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = all.reduce((sum, r) => sum + r.rating, 0);
  return {
    reviews: all.filter((r) => r.comment).slice(0, MAX_FEATURED_REVIEWS),
    stats: {
      review_count: all.length,
      average_rating: all.length > 0 ? Math.round((total / all.length) * 10) / 10 : 0,
    },
  };
}

const BASE_REVIEW_COLUMNS = 'id, rating, comment, display_name, bike_model, service_type, created_at';

function queryPublishedReviews(columns: string) {
  return supabase
    .from('customer_reviews')
    .select(columns)
    .eq('is_published', true)
    .not('comment', 'is', null)
    .neq('comment', '')
    .order('created_at', { ascending: false })
    .limit(MAX_FEATURED_REVIEWS)
    .returns<PublicReview[]>();
}

async function fetchPublicReviews(): Promise<{ reviews: PublicReview[] | null; stats: ReviewStats | null }> {
  const [firstReviewsRes, statsRes] = await Promise.all([
    queryPublishedReviews(`${BASE_REVIEW_COLUMNS}, shop_reply`),
    supabase.from('customer_review_stats').select('review_count, average_rating').maybeSingle(),
  ]);
  let reviewsRes = firstReviewsRes;

  // shop_reply arrives with migration 10; keep the section working on databases without it
  if (reviewsRes.error?.code === COLUMN_NOT_FOUND) {
    reviewsRes = await queryPublishedReviews(BASE_REVIEW_COLUMNS);
  }

  if (reviewsRes.error?.code === TABLE_NOT_FOUND) {
    return fetchReviewsFromTickets();
  }
  if (reviewsRes.error) {
    console.warn('Failed to load customer reviews:', reviewsRes.error.message);
  }
  return {
    reviews: reviewsRes.error ? null : reviewsRes.data || [],
    stats:
      !statsRes.error && statsRes.data
        ? {
            review_count: Number(statsRes.data.review_count) || 0,
            average_rating: Number(statsRes.data.average_rating) || 0,
          }
        : null,
  };
}

export default function CustomerReviewsSection() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(() => {
    fetchPublicReviews().then((result) => {
      if (result.reviews) setReviews(result.reviews);
      if (result.stats) setStats(result.stats);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadReviews();

    // New or edited reviews appear live without a page refresh
    const channel = supabase
      .channel('landing_customer_reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_reviews' }, () => {
        loadReviews();
      })
      // Reviews are also written to ticket notes (used by the fallback before migration 08)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'service_tickets' }, (payload) => {
        if (String((payload.new as { notes?: string } | null)?.notes || '').includes('[REVIEW:')) {
          loadReviews();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReviews]);

  const hasReviews = (stats?.review_count || 0) > 0;
  const ratingLabel = useMemo(() => (stats ? stats.average_rating.toFixed(1) : '0.0'), [stats]);

  return (
    <section
      id="reviews"
      className="scroll-mt-16 sm:scroll-mt-20 py-12 sm:py-20 px-3.5 sm:px-6 lg:px-8 bg-slate-100/50 border-b border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-orange-600 text-xs font-bold tracking-wider uppercase bg-orange-50 border border-orange-200/80 px-3 py-1 rounded-full">
            Rider Feedback
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight pt-1">
            What Our Customers Say
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto">
            Real ratings and feedback from riders after their motorcycle was serviced at MotoCare.
          </p>

          {hasReviews && stats && (
            <div className="inline-flex items-center gap-3 mt-3 px-4 py-2 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-2xl font-bold text-slate-900">{ratingLabel}</span>
              <div className="flex flex-col items-start gap-0.5">
                <StarRow rating={stats.average_rating} />
                <span className="text-[11px] text-slate-500 font-medium">
                  Based on {stats.review_count} verified {stats.review_count === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-3 animate-pulse">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-5/6 bg-slate-100 rounded" />
                <div className="h-3 w-1/2 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {reviews.map((r) => (
              <figure
                key={r.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-orange-300 transition duration-150 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <StarRow rating={r.rating} />
                    <Quote className="w-5 h-5 text-orange-200" />
                  </div>
                  <blockquote className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                    “{r.comment}”
                  </blockquote>
                  {r.shop_reply && (
                    <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-100 text-[11px] sm:text-xs text-slate-700 leading-relaxed">
                      <span className="font-bold text-orange-700">MotoCare replied:</span> {r.shop_reply}
                    </div>
                  )}
                </div>
                <figcaption className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/70 flex items-center justify-center text-orange-600 font-bold text-sm shrink-0">
                    {r.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{r.display_name}</p>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      {r.bike_model && (
                        <>
                          <Bike className="w-3 h-3 shrink-0" />
                          <span className="truncate">{r.bike_model}</span>
                          <span aria-hidden="true">•</span>
                        </>
                      )}
                      <span className="shrink-0">{formatReviewDate(r.created_at)}</span>
                    </p>
                    {r.service_type && (
                      <p className="text-[10px] text-orange-600 font-semibold truncate mt-0.5">{r.service_type}</p>
                    )}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto text-center bg-white border border-dashed border-slate-300 rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200/70 flex items-center justify-center mx-auto">
              <MessageSquarePlus className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900">
              {hasReviews ? 'Ratings are in — written feedback coming soon' : 'No reviews yet'}
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Riders can rate their service from the dashboard once their motorcycle is released.
              Book a service and be among the first to share your experience.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition"
            >
              Book a Service
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
