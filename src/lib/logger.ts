import { LOG_LEVEL } from 'astro:env/server';

import { type Logger, LogLevel } from './types';

function parseLogLevel(level: string): LogLevel {
  const levels: Record<string, LogLevel> = {
    DEBUG: LogLevel.DEBUG,
    INFO: LogLevel.INFO,
    WARN: LogLevel.WARN,
    ERROR: LogLevel.ERROR,
  };
  return levels[level] ?? LogLevel.INFO;
}

/**
 * Console implementation of the Logger interface that supports log level filtering.
 *
 * @example
 *   // Show info and above (default behavior)
 *   const logger = consoleLogger();
 *
 *   // Show all logs including debug
 *   const logger = consoleLogger(LogLevel.DEBUG);
 *
 *   // Show only errors
 *   const logger = consoleLogger(LogLevel.ERROR);
 *
 * @param level - The minimum log level to display. Defaults to LogLevel.INFO.
 * @returns A Logger instance that writes to the console.
 */
export function consoleLogger(level: LogLevel = LogLevel.INFO): Logger {
  return {
    debug: (message: string, ...args: unknown[]): void => {
      if (level <= LogLevel.DEBUG) {
        console.debug(message, ...args);
      }
    },
    info: (message: string, ...args: unknown[]): void => {
      if (level <= LogLevel.INFO) {
        console.info(message, ...args);
      }
    },
    warn: (message: string, ...args: unknown[]): void => {
      if (level <= LogLevel.WARN) {
        console.warn(message, ...args);
      }
    },
    error: (message: string, ...args: unknown[]): void => {
      if (level <= LogLevel.ERROR) {
        console.error(message, ...args);
      }
    },
  };
}

export const logger = consoleLogger(parseLogLevel(LOG_LEVEL));
