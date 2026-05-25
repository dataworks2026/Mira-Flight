import {create} from 'zustand';
import RNFS from 'react-native-fs';

const MAX_ENTRIES = 2000;
const LOG_PATH = `${RNFS.DocumentDirectoryPath}/mira_debug.log`;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: number;
  level: LogLevel;
  tag: string;
  msg: string;
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
    set(s => {
      const next = [...s.entries, {ts: Date.now(), level, tag, msg}];
      if (next.length > MAX_ENTRIES) {
        next.splice(0, next.length - MAX_ENTRIES);
      }
      return {entries: next};
    });
  },

  clear() {
    set({entries: []});
  },

  async flush() {
    const {entries} = get();
    const lines = entries
      .map(
        e =>
          `${new Date(e.ts).toISOString()} [${e.level.toUpperCase().padEnd(5)}] ${e.tag}: ${e.msg}`,
      )
      .join('\n');
    await RNFS.writeFile(LOG_PATH, lines, 'utf8');
  },
}));

// Module-level helper — call from any non-React context without importing the hook
export function miraLog(level: LogLevel, tag: string, msg: string): void {
  useLogStore.getState().log(level, tag, msg);
}
