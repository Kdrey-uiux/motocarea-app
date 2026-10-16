/**
 * Utility to reliably parse and sanitize internal ticket notes strings.
 * Prevents regex bleed-through where contact numbers, complaints, and arrival slots
 * accidentally concatenate into one giant unreadable string.
 */

export interface ParsedTicketNotes {
  customerName: string;
  phone: string;
  symptoms: string;
  arrivalWindow: string;
  rawRemaining: string;
}

export function parseTicketNotes(notes?: string | null): ParsedTicketNotes {
  if (!notes || typeof notes !== 'string') {
    return {
      customerName: '',
      phone: '',
      symptoms: '',
      arrivalWindow: '',
      rawRemaining: '',
    };
  }

  // 1. Strip raw system / bracket metadata
  let cleaned = notes
    .replace(/\[BOOKING:[^\]]+\]/gi, '')
    .replace(/\[REVIEW:[\s\S]*?\]/gi, '')
    .trim();

  // 2. Extract Customer Name
  let customerName = '';
  const nameMatch = cleaned.match(/Customer:\s*([^|,\n]+)/i);
  if (nameMatch && nameMatch[1]) {
    customerName = nameMatch[1].trim();
  }

  // 3. Extract Phone (strictly 7 to 15 numeric digits/phone chars)
  let phone = '';
  const phoneMatch = cleaned.match(/Contact:\s*([+0-9\s()-]{7,18})/i);
  if (phoneMatch && phoneMatch[1]) {
    phone = phoneMatch[1].trim().replace(/[^\d+]/g, '');
    if (phone.startsWith('63') && !phone.startsWith('+63')) {
      phone = '0' + phone.slice(2);
    }
  }

  // 4. Extract Arrival Window (e.g. "10:00 AM - 01:00 PM")
  let arrivalWindow = '';
  const windowMatch = cleaned.match(/Arrival Window:\s*([^,\n|]+)/i);
  if (windowMatch && windowMatch[1]) {
    arrivalWindow = windowMatch[1].trim();
  }

  // 5. Extract Symptoms / Complaint
  let symptoms = '';
  const symptomsMatch = cleaned.match(/Reported Symptoms:\s*([^|\n]+?)(?:,?\s*Arrival Window:|$)/i);
  if (symptomsMatch && symptomsMatch[1]) {
    symptoms = symptomsMatch[1].trim();
  } else {
    // If there is no explicit "Reported Symptoms:" label, clean out known key-values
    const remaining = cleaned
      .replace(/Customer:\s*[^|,\n]+/gi, '')
      .replace(/Contact:\s*[+0-9\s()-]{7,18}/gi, '')
      .replace(/Arrival Window:\s*[^,\n|]+/gi, '')
      .replace(/^[|,\s-]+|[|,\s-]+$/g, '')
      .trim();

    if (remaining) {
      symptoms = remaining;
    }
  }

  return {
    customerName,
    phone,
    symptoms,
    arrivalWindow,
    rawRemaining: cleaned,
  };
}

/**
 * Format a phone number into readable Philippine mobile format (e.g. 0995 044 0463)
 */
export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return 'N/A';
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.length === 11 && clean.startsWith('09')) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return phone;
}
