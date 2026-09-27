/**
 * Valid model years generation (1980 - present)
 */
export const MODEL_YEARS = Array.from({ length: 47 }, (_, i) => (2026 - i).toString());

/**
 * Philippine LTO Plate & MV File Validation
 * Supports:
 * - Modern 2 Letters + 4/5 digits (e.g. ND 45821)
 * - Old 3 Letters + 3/4 digits (e.g. ABC 1234)
 * - MV File Number (e.g. 1301-00000123456)
 */
export const isValidLTOPlate = (plate: string): boolean => {
  const cleaned = plate.trim().toUpperCase();
  const modern = /^[A-Z]{2}\s?\d{4,5}$/;
  const old = /^[A-Z]{3}\s?\d{3,4}$/;
  const mvFile = /^\d{4}[-\s]?\d{6,12}$/;

  return modern.test(cleaned) || old.test(cleaned) || mvFile.test(cleaned);
};
