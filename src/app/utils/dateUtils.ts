/**
 * Parse a date string (YYYY-MM-DD) as a local date, not UTC
 * This prevents timezone-related date shifting issues
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  // Split the date string and create a date in local timezone
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date string for use in HTML date inputs (YYYY-MM-DD)
 */
export function formatDateForInput(dateString: string): string {
  if (!dateString) return '';
  
  const date = parseLocalDate(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
