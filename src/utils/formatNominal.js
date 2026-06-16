/**
 * Format a raw number string into a display string with "." thousand separators.
 * e.g. "1500000" → "1.500.000"
 * Only digits are kept; leading zeros are stripped.
 */
export const formatNominalInput = (text) => {
  // Strip everything except digits
  const digits = text.replace(/\D/g, '');
  // Remove leading zeros
  const trimmed = digits.replace(/^0+/, '') || '';
  if (!trimmed) return '';
  // Add dots as thousand separators
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Parse a formatted nominal string back to a plain number.
 * e.g. "1.500.000" → 1500000
 */
export const parseNominalInput = (formatted) => {
  if (!formatted) return 0;
  const raw = formatted.replace(/\./g, '');
  const num = parseInt(raw, 10);
  return isNaN(num) ? 0 : num;
};
