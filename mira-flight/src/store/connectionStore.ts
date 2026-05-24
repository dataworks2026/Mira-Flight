import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';

const STORAGE_KEY = '@mira_connection_config';

export type AdapterType = 'mock' | 'sitl' | 'dji';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface ConnectionConfig {
  adapterType: AdapterType;
  sitlHost: string;
  sitlPort: number;
  sitlProtocol: 'udp';
}

const DEFAULT_CONFIG: ConnectionConfig = {
  adapterType: 'mock',
  sitlHost: '',
  sitlPort: 14550,
  sitlProtocol: 'udp',
};

interface ConnectionStore {
  config: ConnectionConfig;
  status: ConnectionStatus;
  error: string | null;
  setConfig: (patch: Partial<ConnectionConfig>) => void;
  setStatus: (status: ConnectionStatus, error?: string | null) => void;
  loadConfig: () => Promise<void>;
  persistConfig: () => Promise<void>;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  config: DEFAULT_CONFIG,
  status: 'disconnected',
  error: null,

  setConfig: patch =>
    set(s => ({config: {...s.config, ...patch}})),

  setStatus: (status, error = null) =>
    set({status, error: error ?? null}),

  loadConfig: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<ConnectionConfig>;
        set(s => ({config: {...s.config, ...saved}}));
      }
    } catch {
      // Use default config on parse error
    }
  },

  persistConfig: async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(get().config));
    } catch {
      // Non-fatal — config persists in memory for the session
    }
  },
}));
