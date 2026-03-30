/**
 * Shared date formatting utilities.
 * Previously duplicated inside BookingsClient and TransactionsClient.
 */

/**
 * Format a date string as "01 Jan 2025"
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Format a datetime string as "01:30"
 * @param {string} dateStr
 * @returns {string}
 */
export function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
