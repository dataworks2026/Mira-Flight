import {create} from 'zustand';
import RNFS from 'react-native-fs';

const MAX_ENTRIES = 2000;
// Ring-buffer snapshot written on demand (the in-app overlay SAVE button).
const LOG_PATH = `${RNFS.DocumentDirectoryPath}/mira_debug.log`;
// Append-only log that survives crashes/kills and accumulates across sessions.
// Pull on reconnect: adb shell run-as com.miraflight cat files/mira_session.log
const SESSION_LOG_PATH = `${RNFS.DocumentDirectoryPath}/mira_session.log`;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: number;
  level: LogLevel;
  tag: string;
  msg: string;
}

function fmt(e: LogEntry): string {
  return `${new Date(e.ts).toISOString()} [${e.level
    .toUpperCase()
    .padEnd(5)}] ${e.tag}: ${e.msg}`;
}

interface LogStore {
  entries: LogEntry[];
  log: (level: LogLevel, tag: string, msg: string) => void;
  clear: () => void;
  flush: () => Promise<void>;
}

export const useLogStore = create<LogStore>((set, get) => ({
  entries: [],

  log(level, tag, msg) {
    const entry: LogEntry = {ts: Date.now(), level, tag, msg};
    set(s => {
      const next = [...s.entries, entry];
      if (next.length > MAX_ENTRIES) {
        next.splice(0, next.length - MAX_ENTRIES);
      }
      return {entries: next};
    });
    // Persist warnings/errors immediately so they survive a crash or process kill
    // (the field debugging lifeline — recoverable when the tablet returns).
    if (level === 'warn' || level === 'error') {
      RNFS.appendFile(SESSION_LOG_PATH, fmt(entry) + '\n', 'utf8').catch(() => {});
    }
  },

  clear() {
    set({entries: []});
  },

  async flush() {
    const lines = get().entries.map(fmt).join('\n');
    await RNFS.writeFile(LOG_PATH, lines, 'utf8');
  },
}));

// Module-level helper — call from any non-React context without importing the hook.
export function miraLog(level: LogLevel, tag: string, msg: string): void {
  useLogStore.getState().log(level, tag, msg);
}

// Install persistent-log extras once at app start: a session-start marker and
// console.error/console.warn mirroring. (Uncaught JS errors are already captured
// by installGlobalErrorHandler() in ErrorBoundary.tsx, and miraLog now persists
// every warn/error to the session log — so this only adds what that doesn't.)
let crashLoggingInstalled = false;
export function installCrashLogging(): void {
  if (crashLoggingInstalled) {
    return;
  }
  crashLoggingInstalled = true;

  RNFS.appendFile(
    SESSION_LOG_PATH,
    `\n${new Date().toISOString()} [INFO ] SESSION: === app start ===\n`,
    'utf8',
  ).catch(() => {});

  // Mirror console.error / console.warn into the persistent log (RN surfaces many
  // runtime failures here). Intentional logging infrastructure — chains to original.
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      miraLog('error', 'CONSOLE', args.map(a => String(a)).join(' '));
    } catch {
      /* never let logging break the app */
    }
    origError(...args);
  };
  const origWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    try {
      miraLog('warn', 'CONSOLE', args.map(a => String(a)).join(' '));
    } catch {
      /* never let logging break the app */
    }
    origWarn(...args);
  };
}
