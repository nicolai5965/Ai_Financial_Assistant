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
const ENVIRONMENT = process.env.NODE_ENV || ENVIRONMENTS.PRODUCTION;
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
 * Creates a logging function for the specified level that:
 * 1. Checks if the message should be logged based on current level
 * 2. Logs to the console with the appropriate method
 * 3. Could send logs to a backend endpoint in the future
 * 
 * @param {string} level - The log level (debug, info, warn, error)
 * @returns {Function} - The logging function for that level
 */
function createLoggerForLevel(level) {
  return (...args) => {
    if (shouldLog(level)) {
      console[level](...args);
      // Backend logging integration point:
      // This is where logs could be sent to a backend service
      // for persistence, monitoring, or analytics purposes.
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

// Use module.exports for better compatibility with Next.js
module.exports = logger; 