// Lightweight logger wrapper
// Usage: import { logger } from '@/src/utils/logger'; logger.info('...')

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_STORAGE_KEY = 'norma:log-level';
const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const isBrowser = typeof window !== 'undefined';
const env = process.env.NODE_ENV || 'development';
const defaultLogLevel: LogLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'warn';

function getActiveLogLevel(): LogLevel {
  if (isBrowser) {
    try {
      const stored = window.localStorage.getItem(LOG_LEVEL_STORAGE_KEY) as LogLevel | null;
      if (stored && levelPriority[stored]) {
        return stored;
      }
    } catch {
      // ignore storage access issues
    }
  }
  return defaultLogLevel;
}

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[getActiveLogLevel()];
}

// Use frontend proxy endpoint for diagnostics to avoid CORS issues
// The proxy route at /api/proxy/diagnostics/logs/ingest/ forwards to backend
const DIAGNOSTICS_URL = isBrowser 
  ? `${window.location.origin}/api/proxy/diagnostics/logs/ingest` 
  : '';

// Simple in-memory throttle to avoid hammering the diagnostics endpoint
const lastSent: Record<string, number> = {};
function sendToTerminal(level: LogLevel, ...args: any[]) {
  if (!isBrowser) return;
  if (!DIAGNOSTICS_URL) return; // Not configured

  try {
    const now = Date.now();
    const key = level + '::' + String(args[0] ?? '');
    const last = lastSent[key] || 0;
    if (now - last < 3000) return; // throttle duplicate messages per 3s
    lastSent[key] = now;

    // Mask sensitive-looking values in args
    const mask = (v: any) => {
      if (typeof v === 'string') {
        if (v.match(/sk_[A-Za-z0-9_-]{8,}/) || v.match(/pk_[A-Za-z0-9_-]{8,}/)) {
          return v.slice(0, 6) + '...' + v.slice(-4);
        }
        return v;
      }
      return v;
    };

    // Safe string conversion that handles all types including null/undefined/objects
    const safeStringify = (arg: any): string => {
      if (arg === null) return 'null';
      if (arg === undefined) return 'undefined';
      if (typeof arg === 'string') return arg;
      if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
      if (arg instanceof Error) return arg.message || 'Unknown error';
      try {
        return JSON.stringify(arg);
      } catch {
        return '[Circular/Invalid Object]';
      }
    };

    const payload = {
      level,
      message: safeStringify(args[0]),
      meta: args.slice(1).map(mask),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ts: new Date().toISOString(),
    };

    // Fire-and-forget
    fetch(DIAGNOSTICS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* swallow */
    });
  } catch (e) {
    // Best-effort: don't break app
  }
}

export const logger = {
  debug: (...args: any[]) => {
    if (!shouldLog('debug')) return;
    if (env !== 'production') {
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    if (!shouldLog('info')) return;
    if (env !== 'production') {
      console.info(...args);
    } else {
      sendToTerminal('info', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (!shouldLog('warn')) return;
    console.warn(...args);
    sendToTerminal('warn', ...args);
  },
  error: (...args: any[]) => {
    if (!shouldLog('error')) return;
    console.error(...args);
    sendToTerminal('error', ...args);
  },
};

// Optional: override global console in browser to limit spam in production
export function initGlobalLogger() {
  if (!isBrowser) return;

  if (env === 'production') {
    // Replace noisy console methods with no-ops except warn/error
    // Preserve originals in case needed
    const _debug = console.debug.bind(console);
    const _info = console.info.bind(console);

    console.debug = (..._args: any[]) => {};
    console.info = (..._args: any[]) => {};

    // Keep warn and error but also forward
    const _warn = console.warn.bind(console);
    const _error = console.error.bind(console);

    console.warn = (...args: any[]) => {
      _warn(...args);
      sendToTerminal('warn', ...args);
    };

    console.error = (...args: any[]) => {
      _error(...args);
      sendToTerminal('error', ...args);
    };
  }
}

export function setClientLogLevel(level: LogLevel) {
  if (!levelPriority[level]) return;
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(LOG_LEVEL_STORAGE_KEY, level);
  } catch {
    // ignore storage errors
  }
}

export default logger;
