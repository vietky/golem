/**
 * Logger utility with configurable log levels
 * Log levels: DEBUG, INFO, WARN, ERROR, NONE
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
}

// Get log level from environment variable, default to INFO
const getLogLevel = () => {
  const envLevel = import.meta.env.VITE_LOG_LEVEL || 'INFO'
  return LOG_LEVELS[envLevel.toUpperCase()] ?? LOG_LEVELS.INFO
}

const currentLogLevel = getLogLevel()

/**
 * Logger class with methods for different log levels
 */
class Logger {
  constructor(context = '') {
    this.context = context
  }

  /**
   * Format log message with context
   */
  _format(...args) {
    return this.context ? [`[${this.context}]`, ...args] : args
  }

  /**
   * Log debug messages (lowest priority)
   */
  debug(...args) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.log(...this._format(...args))
    }
  }

  /**
   * Log info messages
   */
  info(...args) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.log(...this._format(...args))
    }
  }

  /**
   * Log warning messages
   */
  warn(...args) {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      console.warn(...this._format(...args))
    }
  }

  /**
   * Log error messages (highest priority)
   */
  error(...args) {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      console.error(...this._format(...args))
    }
  }

  /**
   * Create a new logger instance with a specific context
   */
  withContext(context) {
    return new Logger(context)
  }
}

// Export singleton logger instance
export const logger = new Logger()

// Export factory function for creating loggers with context
export const createLogger = (context) => new Logger(context)

export default logger
