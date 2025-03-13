// File: frontend/src/utils/logger.js

/**
 * Centralized logging utility for the frontend application.
 * Provides environment-aware logging with configurable log levels.
 * 
 * Features:
 * - Environment detection (development vs production)
 * - Configurable log levels (debug, info, warn, error, silent)
 * - Runtime log level adjustment
 * - Foundation for future backend logging integration
 */

// Named constants for environments and log levels
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production'
};

// Determine environment and set default log level
const ENVIRONMENT = typeof process !== 'undefined' && process.env ? 
  (process.env.NODE_ENV || ENVIRONMENTS.PRODUCTION) : 
  ENVIRONMENTS.PRODUCTION;
const IS_DEVELOPMENT = ENVIRONMENT === ENVIRONMENTS.DEVELOPMENT;
const DEFAULT_LOG_LEVEL = IS_DEVELOPMENT ? 'debug' : 'warn';

// Define log levels with numeric values for comparison
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

// Set current log level based on the environment
let currentLevel = LEVELS[DEFAULT_LOG_LEVEL];

/**
 * Determines if a message with the specified level should be logged
 * based on the current log level setting.
 * 
 * @param {string} level - The log level to check
 * @returns {boolean} - Whether the message should be logged
 */
function shouldLog(level) {
  return LEVELS[level] >= currentLevel;
}

/**
 * Safely access console methods to avoid errors if console is not available
 * @param {string} method - The console method to call (log, info, warn, error)
 * @returns {Function} - A safe wrapper for the console method
 */
function safeConsole(method) {
  return (...args) => {
    if (typeof console !== 'undefined' && console[method]) {
      console[method](...args);
    }
  };
}

/**
 * Creates a logging function for the specified level that:
 * 1. Checks if the message should be logged based on current level
 * 2. Logs to the console with the appropriate method
 * 3. Could send logs to a backend endpoint in the future
 * 
 * @param {string} level - The log level (debug, info, warn, error)
 * @returns {Function} - The logging function for that level
 */
function createLoggerForLevel(level) {
  const consoleMethod = level === 'debug' ? 'log' : level;
  const safeMethod = safeConsole(consoleMethod);
  
  return (...args) => {
    if (shouldLog(level)) {
      try {
        safeMethod(...args);
        // Backend logging integration point:
        // This is where logs could be sent to a backend service
        // for persistence, monitoring, or analytics purposes.
      } catch (e) {
        // Silent catch to prevent logger failures from breaking the app
      }
    }
  };
}

// Centralized logger object
const logger = {
  debug: createLoggerForLevel('debug'),
  info: createLoggerForLevel('info'),
  warn: createLoggerForLevel('warn'),
  error: createLoggerForLevel('error'),
  
  /**
   * Allows runtime adjustment of the log level if needed
   * 
   * @param {string} level - The log level to set (debug, info, warn, error, silent)
   */
  setLevel: (level) => {
    if (LEVELS.hasOwnProperty(level)) {
      currentLevel = LEVELS[level];
    }
  },
};

// Fallback logger for when the main logger fails or isn't available
const fallbackLogger = {
  debug: (...args) => typeof console !== 'undefined' && console.log && console.log('[DEBUG]', ...args),
  info: (...args) => typeof console !== 'undefined' && console.log && console.log('[INFO]', ...args),
  warn: (...args) => typeof console !== 'undefined' && console.warn && console.warn('[WARN]', ...args),
  error: (...args) => typeof console !== 'undefined' && console.error && console.error('[ERROR]', ...args),
  setLevel: () => {}
};

// Create a safe instance that won't throw errors
const safeLogger = logger || fallbackLogger;

// Use only ES Module exports (no CommonJS module.exports)
export { safeLogger as logger };
export default safeLogger; 