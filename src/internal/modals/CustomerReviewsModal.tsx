import { useMemo } from 'react';
import { InternalTicket } from '../types/internal';
import { parseTicketReview, TicketReview } from '../../utils/ticketReviews';
import { 
  X, 
  Star, 
  MessageSquare, 
  Sparkles
} from 'lucide-react';

interface CustomerReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: InternalTicket[];
}

interface ExtractedReviewItem {
  ticketCode: string;
  serviceType: string;
  assignedBay?: string | null;
  assignedMechanic?: string | null;
  motorcycleModel: string;
  plateNumber: string;
  customerName: string;
  review: TicketReview;
}

export default function CustomerReviewsModal({
  isOpen,
  onClose,
  tickets,
}: CustomerReviewsModalProps) {
  // Extract all verified reviews across all tickets
  const reviewItems = useMemo<ExtractedReviewItem[]>(() => {
    const list: ExtractedReviewItem[] = [];

    tickets.forEach((t) => {
      const parsed = parseTicketReview(t.notes);
      if (parsed) {
        list.push({
          ticketCode: t.ticket_code,
          serviceType: t.service_type || 'General Motorcycle Service',
          assignedBay: t.assigned_bay,
          assignedMechanic: t.assigned_mechanic,
          motorcycleModel: t.motorcycles?.model || parsed.bike_model || 'Motorcycle Unit',
          plateNumber: t.motorcycles?.plate_number || 'NO PLATE',
          customerName: parsed.reviewer_name || t.customer_name || 'Verified Rider',
          review: parsed,
        });
      }
    });

    // Sort newest first
    list.sort((a, b) => {
      const dateA = new Date(a.review.reviewed_at || 0).getTime();
      const dateB = new Date(b.review.reviewed_at || 0).getTime();
      return dateB - dateA;
    });

    return list;
  }, [tickets]);

  // Aggregate statistics
  const stats = useMemo(() => {
    if (reviewItems.length === 0) {
      return {
        avgRating: '5.0',
        totalCount: 0,
        fiveStarPct: 100,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
      };
    }

    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    reviewItems.forEach((item) => {
      const r = Math.min(5, Math.max(1, Math.round(item.review.rating)));
      dist[r] = (dist[r] || 0) + 1;
      sum += item.review.rating;
    });

    const avg = (sum / reviewItems.length).toFixed(1);
    const fiveStarPct = Math.round(((dist[5] || 0) / reviewItems.length) * 100);

    return {
      avgRating: avg,
      totalCount: reviewItems.length,
      fiveStarPct,
      distribution: dist,
    };
  }, [reviewItems]);

  if (!isOpen) return null;

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
                Verified rider ratings, service feedback, and customer satisfaction scores.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Top Score Summary Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center bg-white border border-amber-200 rounded-2xl px-5 py-3 shadow-2xs">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {stats.avgRating}
                </span>
                <div className="flex items-center text-amber-500 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.round(parseFloat(stats.avgRating))
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                  Out of 5.0
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Workshop Quality Score</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                  {stats.totalCount > 0
                    ? `${stats.fiveStarPct}% of riders rated their service 5 stars. Keep up the high standard of repair quality!`
                    : 'Customer ratings submitted through the rider dashboard will appear here in real time.'}
                </p>
              </div>
            </div>

            {/* Quick breakdown bars */}
            <div className="space-y-1 text-xs min-w-[140px] border-t sm:border-t-0 sm:border-l border-amber-200/60 pt-3 sm:pt-0 sm:pl-4">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star] || 0;
                const pct = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <span className="w-4 font-bold text-slate-700">{star}★</span>
                    <div className="flex-1 h-2 bg-slate-200/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-5 text-right font-mono text-[10px] text-slate-500">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews Feed List */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Recent Rider Reviews ({reviewItems.length})
            </h3>

            {reviewItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="font-bold text-sm text-slate-800">No Customer Reviews Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When completed repair tickets are handed over, customers are prompted on their portal to leave a star rating and comment.
                </p>
              </div>
            ) : (
              reviewItems.map((item, index) => {
                const dateStr = item.review.reviewed_at
                  ? new Date(item.review.reviewed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : 'Recent Visit';

                return (
                  <div
                    key={index}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5 transition hover:border-amber-300"
                  >
                    {/* Header Row: Customer, Rating & Date */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {item.customerName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                              {item.customerName}
                            </h4>
                            <span className="font-mono text-[11px] text-orange-600 font-bold">
                              #{item.ticketCode}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {item.motorcycleModel} • Plate: {item.plateNumber}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center text-amber-500">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < item.review.rating
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                          <span className="font-bold text-xs text-slate-800 ml-1.5">
                            {item.review.rating}.0
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{dateStr}</span>
                      </div>
                    </div>

                    {/* Customer Written Comment Quote */}
                    {item.review.comment ? (
                      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-xs text-slate-800 italic leading-relaxed">
                        "{item.review.comment}"
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No written comment provided.</p>
                    )}

                    {/* Service & Mechanic Footer */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Service: <strong className="text-slate-700">{item.serviceType}</strong></span>
                      {item.assignedMechanic && (
                        <span>Mechanic: <strong className="text-slate-700">{item.assignedMechanic}</strong></span>
                      )}
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
