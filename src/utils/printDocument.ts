/**
 * Prints the document currently mounted with <PrintPortal> (components/print/PrintTemplate.tsx).
 * The portal hides the rest of the page while the print dialog is open, so Ctrl+P works the same.
 */
export function printDocument(): void {
  document.body.classList.add('printing-doc');
  window.print();
}

/** "October 19, 2026, 8:23 PM" in Philippine time */
export function formatPrintDate(date: Date, withTime = true): string {
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}
