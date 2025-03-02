// File: frontend/src/utils/logger.js

// Determine environment and set default log level
const ENVIRONMENT = process.env.NODE_ENV || 'production';
const IS_DEVELOPMENT = ENVIRONMENT === 'development';
const DEFAULT_LOG_LEVEL = IS_DEVELOPMENT ? 'debug' : 'warn';

// Define log levels with numeric values
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

// Set current log level based on the environment
let currentLevel = LEVELS[DEFAULT_LOG_LEVEL];

// Utility function to determine if a message should be logged
function shouldLog(level) {
  return LEVELS[level] >= currentLevel;
}

// Centralized logger object
const logger = {
  debug: (...args) => {
    if (shouldLog('debug')) {
      console.debug(...args);
      // Optionally, send logs to a backend endpoint here for persistence
    }
  },
  info: (...args) => {
    if (shouldLog('info')) {
      console.info(...args);
      // Optionally, send logs to a backend endpoint here
    }
  },
  warn: (...args) => {
    if (shouldLog('warn')) {
      console.warn(...args);
      // Optionally, send logs to a backend endpoint here
    }
  },
  error: (...args) => {
    if (shouldLog('error')) {
      console.error(...args);
      // Optionally, send logs to a backend endpoint here
    }
  },
  // Allow runtime adjustment of the log level if needed
  setLevel: (level) => {
    if (LEVELS.hasOwnProperty(level)) {
      currentLevel = LEVELS[level];
    }
  },
};

// Use module.exports for better compatibility with Next.js
module.exports = logger; 