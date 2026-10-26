import { useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Copy, Check } from '../../components/icons';
import { PrintPortal } from '../../components/print/PrintTemplate';
import { WalkInTicketDocument } from '../../components/print/MotoCareDocuments';
import { printDocument } from '../../utils/printDocument';
import MotoCareLogo from '../../components/brand/MotoCareLogo';
import { ScrollLock } from '../../hooks/useLockBodyScroll';

export interface WalkInSlipInfo {
  ticketCode: string;
  customerName: string;
  bikeModel: string;
  plateNumber: string;
  serviceType: string;
  createdAt: string; // ISO timestamp the ticket was created
}

interface WalkInClaimSlipModalProps {
  slip: WalkInSlipInfo | null;
  onClose: () => void;
}

/**
 * Ticket slip handed to a walk-in customer (no MotoCare account): ticket number, date it was
 * created, and a QR code that opens the ticket's tracking page directly.
 * Rendered at the end of <body>; the printed copy is WalkInTicketDocument (shared print template).
 */
export default function WalkInClaimSlipModal({ slip, onClose }: WalkInClaimSlipModalProps) {
  const [copied, setCopied] = useState(false);
  if (!slip) return null;

  const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');
  const created = new Date(slip.createdAt);
  // Same calendar day the tracking page checks (Philippine time)
  const createdOn = created.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const createdTime = created.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  });

  // QR target: this ticket's tracking page, with the slip's date so it opens without the date form
  const createdKey = created.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const trackingUrl = `${siteUrl}/track/${slip.ticketCode}?d=${createdKey}`;

  const shareMessage =
    `MotoCare: Your walk-in ticket number is ${slip.ticketCode} (created ${createdOn}). ` +
    `Track your motorcycle here: ${trackingUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <ScrollLock />
      {/* What goes on paper: the half-page walk-in ticket (shared print template) */}
      <PrintPortal>
        <WalkInTicketDocument slip={slip} trackingUrl={trackingUrl} />
      </PrintPortal>

      <div className="bg-white w-full max-w-sm rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-slate-900">Ticket slip</h3>
            <p className="text-xs text-slate-500">Give this to the customer. They need it to track and claim.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* On-screen slip */}
        <div className="overflow-y-auto px-5 pb-5">
          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-5 space-y-4 text-slate-900">
            <div className="flex items-center justify-between gap-2">
              <MotoCareLogo className="h-11 w-auto text-slate-900" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Walk-in ticket slip</span>
            </div>

            <div className="text-center pt-3 border-t border-dashed border-slate-300">
              <span className="text-xs text-slate-500 block">Ticket number</span>
              <div className="font-mono text-3xl font-black tracking-wider mt-1">{slip.ticketCode}</div>
              <span className="text-sm font-semibold text-slate-700 block mt-1">
                {createdOn} · {createdTime}
              </span>
            </div>

            {/* Scan to open this ticket's tracking page directly (no typing needed) */}
            <div className="flex flex-col items-center gap-1.5 pt-1">
              <div className="p-2 bg-white rounded-xl border border-slate-200">
                <QRCodeSVG value={trackingUrl} size={132} level="M" marginSize={0} />
              </div>
              <span className="text-xs text-slate-500">Scan to track your repair</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200/80 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Copy a text message with the ticket number and date, to send by SMS or Messenger"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy for SMS'}</span>
          </button>
          <button
            type="button"
            onClick={printDocument}
            className="px-3 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print slip</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="col-span-2 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-semibold text-sm cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
