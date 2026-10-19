import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Wrench, Printer, X } from 'lucide-react';
import { SHOP_INFO } from '../../utils/shopInfo';
import { formatPrintDate, printDocument } from '../../utils/printDocument';

/**
 * Shared layout for every printed MotoCare document (job order, gate pass, service records,
 * certified record, walk-in ticket): one letterhead, one field style, one signature style.
 * Print a document with printDocument() from utils/printDocument.ts.
 */

const SHOP_EMAIL = 'support@motocare.ph';

/**
 * Mounts a document at the end of <body>. Hidden on screen; while it is mounted, printing
 * (the Print button or Ctrl+P) puts only this document on paper. Mount one at a time.
 */
export function PrintPortal({ children }: { children: ReactNode }) {
  useEffect(() => {
    const before = () => document.body.classList.add('printing-doc');
    const after = () => document.body.classList.remove('printing-doc');
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
      after();
    };
  }, []);

  return createPortal(<div className="print-doc-root">{children}</div>, document.body);
}

interface PrintDocumentProps {
  title: string;
  /** e.g. "Job Order No." */
  numberLabel: string;
  number: string;
  /** Date shown under the number (defaults to now) */
  issuedAt?: Date;
  issuedLabel?: string;
  children: ReactNode;
  /** Small print above the footer line */
  footnote?: ReactNode;
  /** Compact layout for half-page slips */
  compact?: boolean;
}

export function PrintDocument({
  title,
  numberLabel,
  number,
  issuedAt,
  issuedLabel = 'Date issued',
  children,
  footnote,
  compact = false,
}: PrintDocumentProps) {
  const issued = issuedAt ?? new Date();

  return (
    <div className={`print-doc ${compact ? 'print-doc--compact' : ''}`}>
      {/* Letterhead */}
      <div className="print-doc__letterhead">
        <div className="print-doc__brand">
          <div className="print-doc__logo">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="print-doc__shop">
              Moto<span>Care</span> Motorcycle Workshop
            </div>
            <div className="print-doc__contact">{SHOP_INFO.address}</div>
            <div className="print-doc__contact">
              {SHOP_INFO.phone} · {SHOP_EMAIL}
            </div>
          </div>
        </div>
        <div className="print-doc__meta">
          <div className="print-doc__title">{title}</div>
          <table>
            <tbody>
              <tr>
                <th>{numberLabel}</th>
                <td className="print-doc__mono">{number}</td>
              </tr>
              <tr>
                <th>{issuedLabel}</th>
                <td>{formatPrintDate(issued)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="print-doc__body">{children}</div>

      <div className="print-doc__footer">
        {footnote && <div className="print-doc__footnote">{footnote}</div>}
        <div className="print-doc__footer-line">
          <span>
            {SHOP_INFO.hours}
          </span>
          <span>Printed {formatPrintDate(new Date())} · MotoCare Workshop System</span>
        </div>
      </div>
    </div>
  );
}

export function PrintSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="print-doc__section">
      <h2 className="print-doc__section-title">{title}</h2>
      {children}
    </section>
  );
}

export interface PrintField {
  label: string;
  value: ReactNode;
  /** Spans the full row */
  wide?: boolean;
  mono?: boolean;
}

/** Bordered label/value grid, two columns by default */
export function PrintFields({ fields, columns = 2 }: { fields: PrintField[]; columns?: 2 | 3 }) {
  return (
    <div className={`print-doc__fields print-doc__fields--${columns}`}>
      {fields.map((field) => (
        <div key={field.label} className={`print-doc__field ${field.wide ? 'print-doc__field--wide' : ''}`}>
          <div className="print-doc__label">{field.label}</div>
          <div className={`print-doc__value ${field.mono ? 'print-doc__mono' : ''}`}>{field.value || '—'}</div>
        </div>
      ))}
    </div>
  );
}

/** Checklist with tick boxes to fill in by hand */
export function PrintChecklist({ items, columns = ['OK', 'Needs work'] }: { items: string[]; columns?: string[] }) {
  return (
    <table className="print-doc__table">
      <thead>
        <tr>
          <th>Item</th>
          {columns.map((col) => (
            <th key={col} className="print-doc__center" style={{ width: '13%' }}>
              {col}
            </th>
          ))}
          <th style={{ width: '30%' }}>Remarks</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item}>
            <td>{item}</td>
            {columns.map((col) => (
              <td key={col} className="print-doc__center">
                <span className="print-doc__box" />
              </td>
            ))}
            <td />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Ruled lines for handwritten notes */
export function PrintLines({ count = 3 }: { count?: number }) {
  return (
    <div className="print-doc__lines">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} />
      ))}
    </div>
  );
}

export interface PrintSigner {
  role: string;
  name?: string;
}

export function PrintSignatures({ signers }: { signers: PrintSigner[] }) {
  return (
    <div className="print-doc__signatures" style={{ gridTemplateColumns: `repeat(${signers.length}, 1fr)` }}>
      {signers.map((signer) => (
        <div key={signer.role} className="print-doc__signer">
          <div className="print-doc__signer-name">{signer.name || ' '}</div>
          <div className="print-doc__signer-role">{signer.role}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * Modal that shows a document as a sheet of paper, with Print and Close buttons.
 * What you see is exactly what prints.
 */
export function PrintPreviewModal({
  title,
  description,
  printLabel = 'Print',
  onClose,
  children,
}: {
  title: string;
  description?: string;
  printLabel?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white w-full max-w-4xl rounded-[1.75rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-bold tracking-tight text-slate-900 leading-tight">{title}</h2>
                {description && <p className="text-xs sm:text-sm text-slate-500 truncate">{description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={printDocument}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>{printLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-slate-100 p-2 sm:p-6 overflow-auto flex-1">
              <div className="mx-auto bg-white shadow-md ring-1 ring-slate-200 rounded-sm p-4 sm:p-10 max-w-[820px] min-w-[560px]">
                {children}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      <PrintPortal>{children}</PrintPortal>
    </>
  );
}
