/**
 * Utility functions for reporter
 * @module utils
 */

/**
 * Retry async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Max retry attempts
 * @param {number} delay - Base delay in ms
 */
async function retryAsync(fn, maxRetries = 3, delay = 500) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

/**
 * Debounce function calls
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Wait time in ms
 */
function debounce(fn, wait = 300) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

module.exports = { retryAsync, debounce };
