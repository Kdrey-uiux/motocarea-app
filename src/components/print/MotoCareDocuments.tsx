import { QRCodeSVG } from 'qrcode.react';
import type { InternalTicket } from '../../internal/types/internal';
import type { HardcopyRequest } from '../../lib/hardcopyService';
import { parseTicketNotes } from '../../utils/ticketNotesParser';
import { getTicketDisplayDate } from '../../utils/ticketDates';
import { formatPrintDate } from '../../utils/printDocument';
import {
  PrintDocument,
  PrintSection,
  PrintFields,
  PrintChecklist,
  PrintLines,
  PrintSignatures,
} from './PrintTemplate';

/**
 * Every printable MotoCare document, built on the shared PrintTemplate layout.
 * Prices are never printed: payment is settled in cash at the counter, outside the system.
 */

/** A completed (or past) service, as listed on service records */
export interface PrintServiceRow {
  id: string;
  ticket_code: string;
  service_type: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
  paid_at?: string | null;
  dropoff_date?: string | null;
  assigned_bay?: string | null;
  assigned_mechanic?: string | null;
  motorcycles?: { model?: string | null; plate_number?: string | null } | null;
}

export interface PrintCustomer {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

/** Placeholder values the app stores before a real one is known */
function clean(value?: string | null): string {
  const v = (value || '').trim();
  if (!v || ['N/A', 'Queued for Assignment', 'Rider Customer'].includes(v)) return '';
  return v;
}

function code(ticketCode: string): string {
  return ticketCode.replace(/^#+/, '');
}

function shortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' });
}

function ServiceRowsTable({ rows }: { rows: PrintServiceRow[] }) {
  return (
    <table className="print-doc__table">
      <thead>
        <tr>
          <th style={{ width: '5%' }}>#</th>
          <th style={{ width: '15%' }}>Ticket</th>
          <th style={{ width: '15%' }}>Date</th>
          <th style={{ width: '25%' }}>Motorcycle</th>
          <th>Work done</th>
          <th style={{ width: '17%' }}>Mechanic</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={6} className="print-doc__center">
              No completed services on record.
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr key={row.id}>
              <td>{i + 1}</td>
              <td className="print-doc__mono">{code(row.ticket_code)}</td>
              <td>{shortDate(getTicketDisplayDate(row))}</td>
              <td>
                <strong>{row.motorcycles?.model || 'Motorcycle'}</strong>
                <br />
                <span className="print-doc__mono">{row.motorcycles?.plate_number || '—'}</span>
              </td>
              <td>{row.service_type}</td>
              <td>{clean(row.assigned_mechanic) || '—'}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

/* -------------------------------------------------------------------------
   1. Job Order — printed at intake, stays with the motorcycle on the floor
   ------------------------------------------------------------------------- */
export function JobOrderDocument({ ticket }: { ticket: InternalTicket }) {
  const parsed = parseTicketNotes(ticket.notes);
  // rawRemaining still holds the labelled text, so only fall back to it when no symptoms were parsed
  const concern = parsed.symptoms || parsed.rawRemaining;
  const arrival = ticket.dropoff_window || parsed.arrivalWindow;

  return (
    <PrintDocument
      title="Job Order"
      numberLabel="Job order no."
      number={code(ticket.ticket_code)}
      issuedLabel="Date received"
      issuedAt={new Date(ticket.created_at)}
      footnote={
        <>
          The customer authorizes MotoCare to inspect the motorcycle described above. Any work beyond the
          requested service is done only after the customer approves it. Service prices are estimates; the final
          amount is confirmed before release and paid in cash at the counter. MotoCare is not responsible for
          valuables left in the motorcycle.
        </>
      }
    >
      <PrintSection title="Customer and motorcycle">
        <PrintFields
          fields={[
            { label: 'Customer', value: clean(ticket.customer_name || parsed.customerName) },
            { label: 'Contact no.', value: clean(ticket.customer_phone || parsed.phone) },
            { label: 'Motorcycle', value: ticket.motorcycles?.model },
            { label: 'Plate no.', value: ticket.motorcycles?.plate_number, mono: true },
            { label: 'Odometer (km)', value: clean(ticket.odometer || ticket.motorcycles?.odometer) },
            { label: 'Booking type', value: ticket.is_walk_in ? 'Walk-in' : 'Online booking' },
          ]}
        />
      </PrintSection>

      <PrintSection title="Work requested">
        <PrintFields
          fields={[
            { label: 'Service', value: ticket.service_type, wide: true },
            { label: 'Customer concern', value: concern || 'None reported', wide: true },
            { label: 'Assigned bay', value: clean(ticket.assigned_bay) || 'To be assigned' },
            { label: 'Mechanic', value: clean(ticket.assigned_mechanic) || 'To be assigned' },
            ...(arrival ? [{ label: 'Arrival window', value: arrival, wide: true }] : []),
          ]}
        />
      </PrintSection>

      <PrintSection title="Inspection checklist (mechanic)">
        <PrintChecklist
          items={[
            'Engine oil and filter',
            'CVT / drive chain and sprockets',
            'Brakes (pads, fluid, cables)',
            'Tires and pressure',
            'Battery and electrical / lights',
            'Road test',
          ]}
        />
      </PrintSection>

      <PrintSection title="Mechanic findings / parts needed">
        <PrintLines count={3} />
      </PrintSection>

      <PrintSignatures
        signers={[
          { role: 'Customer (vehicle surrendered)', name: clean(ticket.customer_name) },
          { role: 'Service advisor' },
          { role: 'Mechanic', name: clean(ticket.assigned_mechanic) },
        ]}
      />
    </PrintDocument>
  );
}

/* -------------------------------------------------------------------------
   2. Release Gate Pass — handed over with the motorcycle at release
   ------------------------------------------------------------------------- */
export function GatePassDocument({ ticket }: { ticket: InternalTicket }) {
  const releasedAt = ticket.paid_at ? new Date(ticket.paid_at) : new Date();

  return (
    <PrintDocument
      title="Release Gate Pass"
      numberLabel="Ticket no."
      number={code(ticket.ticket_code)}
      issuedLabel="Released"
      issuedAt={releasedAt}
      footnote={
        <>
          Workmanship warranty: 7 calendar days from the release date for the work listed above. Replaced parts
          carry the manufacturer&apos;s warranty. Present this pass at the gate when leaving with the motorcycle.
        </>
      }
    >
      <PrintSection title="Released to">
        <PrintFields
          fields={[
            { label: 'Customer', value: clean(ticket.customer_name) },
            { label: 'Contact no.', value: clean(ticket.customer_phone) },
            { label: 'Motorcycle', value: ticket.motorcycles?.model },
            { label: 'Plate no.', value: ticket.motorcycles?.plate_number, mono: true },
          ]}
        />
      </PrintSection>

      <PrintSection title="Work completed">
        <PrintFields
          fields={[
            { label: 'Service', value: ticket.service_type, wide: true },
            { label: 'Bay', value: clean(ticket.assigned_bay) },
            { label: 'Mechanic', value: clean(ticket.assigned_mechanic) },
            { label: 'Date received', value: formatPrintDate(new Date(ticket.created_at)) },
            { label: 'Released by', value: clean(ticket.released_by) },
          ]}
        />
      </PrintSection>

      <PrintSection title="Release clearance">
        <div className="print-doc__statement">
          The motorcycle described above passed quality testing and is cleared for release to its owner or an
          authorized representative. Payment was settled at the counter.
        </div>
      </PrintSection>

      <PrintSection title="Handover checklist">
        <PrintChecklist
          columns={['Done']}
          items={['Keys and documents returned', 'Personal items returned', 'Walk-around check with customer']}
        />
      </PrintSection>

      <PrintSignatures
        signers={[
          { role: 'Released by', name: clean(ticket.released_by) },
          { role: 'Received by (customer)', name: clean(ticket.customer_name) },
          { role: 'Gate / security' },
        ]}
      />
    </PrintDocument>
  );
}

/* -------------------------------------------------------------------------
   3. Service Record — one completed service, printed by the customer
   ------------------------------------------------------------------------- */
export function ServiceRecordDocument({ ticket, customer }: { ticket: PrintServiceRow; customer: PrintCustomer }) {
  const doneAt = getTicketDisplayDate(ticket);

  return (
    <PrintDocument
      title="Service Record"
      numberLabel="Ticket no."
      number={code(ticket.ticket_code)}
      issuedLabel="Date completed"
      issuedAt={doneAt}
      footnote="This record was generated from the MotoCare workshop system. Payment for this service was settled in cash at the counter."
    >
      <PrintSection title="Owner and motorcycle">
        <PrintFields
          fields={[
            { label: 'Owner', value: clean(customer.name) },
            { label: 'Contact no.', value: clean(customer.phone) || clean(customer.email) },
            { label: 'Motorcycle', value: ticket.motorcycles?.model },
            { label: 'Plate no.', value: ticket.motorcycles?.plate_number, mono: true },
          ]}
        />
      </PrintSection>

      <PrintSection title="Service performed">
        <PrintFields
          fields={[
            { label: 'Service', value: ticket.service_type, wide: true },
            { label: 'Bay', value: clean(ticket.assigned_bay) },
            { label: 'Mechanic', value: clean(ticket.assigned_mechanic) },
            { label: 'Date received', value: formatPrintDate(new Date(ticket.created_at), false) },
            { label: 'Date completed', value: formatPrintDate(doneAt, false) },
          ]}
        />
      </PrintSection>

      <PrintSignatures signers={[{ role: 'Service advisor' }, { role: 'Customer' , name: clean(customer.name) }]} />
    </PrintDocument>
  );
}

/* -------------------------------------------------------------------------
   4. Service History — all completed services of a customer (or one motorcycle)
   ------------------------------------------------------------------------- */
export function ServiceHistoryDocument({
  rows,
  customer,
  coverage,
  referenceNo,
}: {
  rows: PrintServiceRow[];
  customer: PrintCustomer;
  /** e.g. "Yamaha NMAX 155 (ABC 1234)" or "All motorcycles (2)" */
  coverage: string;
  referenceNo: string;
}) {
  return (
    <PrintDocument
      title="Service History"
      numberLabel="Reference no."
      number={referenceNo}
      footnote="This is a printout of the customer's service records in the MotoCare workshop system. For an official certified copy with the workshop seal, request a hardcopy from the Service Records page."
    >
      <PrintSection title="Customer">
        <PrintFields
          columns={3}
          fields={[
            { label: 'Name', value: clean(customer.name) },
            { label: 'Contact no.', value: clean(customer.phone) },
            { label: 'Email', value: clean(customer.email) },
            { label: 'Coverage', value: coverage, wide: true },
          ]}
        />
      </PrintSection>

      <PrintSection title={`Completed services (${rows.length})`}>
        <ServiceRowsTable rows={rows} />
      </PrintSection>
    </PrintDocument>
  );
}

/* -------------------------------------------------------------------------
   5. Certified Maintenance Record — signed and sealed copy a customer requested
   ------------------------------------------------------------------------- */
export function CertifiedRecordDocument({
  request,
  rows,
  certifiedBy,
}: {
  request: HardcopyRequest;
  rows: PrintServiceRow[];
  certifiedBy: string;
}) {
  return (
    <PrintDocument
      title="Certified Maintenance Record"
      numberLabel="Request no."
      number={request.id}
      footnote="Not valid without the signature of an authorized MotoCare staff member and the workshop seal."
    >
      <PrintSection title="Owner and motorcycle">
        <PrintFields
          fields={[
            { label: 'Owner', value: clean(request.customerName) },
            { label: 'Contact no.', value: clean(request.customerPhone) },
            { label: 'Motorcycle', value: request.bikeModel },
            { label: 'Plate no.', value: request.plateNumber, mono: true },
            { label: 'Purpose', value: request.purpose, wide: true },
          ]}
        />
      </PrintSection>

      <PrintSection title={`Service history at MotoCare (${rows.length})`}>
        <ServiceRowsTable rows={rows} />
      </PrintSection>

      <PrintSection title="Certification">
        <div className="print-doc__statement">
          This certifies that the motorcycle described above was serviced at MotoCare Motorcycle Workshop, and that
          the services listed above are true and correct based on the workshop&apos;s records as of the date issued.
          Issued upon the request of the owner for the purpose stated above.
        </div>
      </PrintSection>

      <div className="print-doc__signatures" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="print-doc__signer">
          <div className="print-doc__signer-name">{certifiedBy}</div>
          <div className="print-doc__signer-role">Certified by (MotoCare staff)</div>
        </div>
        <div className="print-doc__signer">
          <div
            style={{
              height: 70,
              border: '1.5px dashed #94a3b8',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '7.5pt',
            }}
          >
            Workshop dry seal
          </div>
        </div>
      </div>
    </PrintDocument>
  );
}

/* -------------------------------------------------------------------------
   6. Walk-in Ticket — half-page slip for customers without an account
   ------------------------------------------------------------------------- */
export interface WalkInTicketInfo {
  ticketCode: string;
  customerName: string;
  bikeModel: string;
  plateNumber: string;
  serviceType: string;
  createdAt: string;
}

export function WalkInTicketDocument({ slip, trackingUrl }: { slip: WalkInTicketInfo; trackingUrl: string }) {
  const created = new Date(slip.createdAt);

  return (
    <PrintDocument
      compact
      title="Walk-in Ticket"
      numberLabel="Ticket no."
      number={slip.ticketCode}
      issuedLabel="Created"
      issuedAt={created}
      footnote="Keep this slip. You need the ticket number and the date it was created to track your repair online and to claim your motorcycle."
    >
      <PrintSection title="Motorcycle">
        <PrintFields
          fields={[
            { label: 'Customer', value: clean(slip.customerName) },
            { label: 'Plate no.', value: clean(slip.plateNumber), mono: true },
            { label: 'Motorcycle', value: clean(slip.bikeModel), wide: true },
            { label: 'Service', value: slip.serviceType, wide: true },
          ]}
        />
      </PrintSection>

      <PrintSection title="Track your repair">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <QRCodeSVG value={trackingUrl} size={96} level="M" marginSize={0} />
          <p className="print-doc__text">
            Scan the QR code, or open <strong>{trackingUrl.split('?')[0]}</strong> and enter the date on this slip
            ({formatPrintDate(created, false)}).
          </p>
        </div>
      </PrintSection>
    </PrintDocument>
  );
}
