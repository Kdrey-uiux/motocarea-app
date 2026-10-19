import { InternalTicket } from '../types/internal';
import { PrintPreviewModal } from '../../components/print/PrintTemplate';
import { GatePassDocument } from '../../components/print/MotoCareDocuments';

interface OfficialReceiptPrintModalProps {
  ticket: InternalTicket | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Release gate pass, printed when a motorcycle is handed back to the customer */
export default function OfficialReceiptPrintModal({ ticket, isOpen, onClose }: OfficialReceiptPrintModalProps) {
  if (!isOpen || !ticket) return null;

  return (
    <PrintPreviewModal
      title="Release gate pass"
      description={`${ticket.ticket_code} · ${ticket.motorcycles?.model || 'Motorcycle'}`}
      printLabel="Print gate pass"
      onClose={onClose}
    >
      <GatePassDocument ticket={ticket} />
    </PrintPreviewModal>
  );
}
