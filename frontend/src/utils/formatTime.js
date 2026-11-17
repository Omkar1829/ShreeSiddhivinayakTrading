/**
 * Formats a 24-hour time string (e.g. "08:00", "21:00", "08:00:00") into 12-hour AM/PM format (e.g. "08:00 AM", "09:00 PM")
 */
export function formatStoreTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  
  if (isNaN(hours)) return timeStr;
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // '0' becomes 12
  const strHours = hours < 10 ? `0${hours}` : `${hours}`;
  
  return `${strHours}:${minutes} ${ampm}`;
}
