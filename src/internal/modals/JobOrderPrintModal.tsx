import { InternalTicket } from '../types/internal';
import { PrintPreviewModal } from '../../components/print/PrintTemplate';
import { JobOrderDocument } from '../../components/print/MotoCareDocuments';

interface JobOrderPrintModalProps {
  ticket: InternalTicket | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Job order printed at intake; stays with the motorcycle on the floor */
export default function JobOrderPrintModal({ ticket, isOpen, onClose }: JobOrderPrintModalProps) {
  if (!isOpen || !ticket) return null;

  return (
    <PrintPreviewModal
      title="Job order"
      description={`${ticket.ticket_code} · ${ticket.motorcycles?.model || 'Motorcycle'}`}
      printLabel="Print job order"
      onClose={onClose}
    >
      <JobOrderDocument ticket={ticket} />
    </PrintPreviewModal>
  );
}
