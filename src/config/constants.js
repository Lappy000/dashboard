/**
 * Constants for config module
 */

module.exports = {
  DEFAULT_TIMEOUT: 5000,
  DEFAULT_RETRY_COUNT: 3,
  DEFAULT_BATCH_SIZE: 100,
  MAX_CONCURRENT: 50,

  SEVERITY: {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info',
  },

  EVENTS: {
    SCAN_START: 'scan:start',
    SCAN_END: 'scan:end',
    SCAN_PROGRESS: 'scan:progress',
    SCAN_ERROR: 'scan:error',
    RESULT_FOUND: 'result:found',
  },
};
