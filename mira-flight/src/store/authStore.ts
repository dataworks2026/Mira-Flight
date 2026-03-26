import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {User} from '../types/shared';
import {miraClient, setAuthToken} from '../api/miraClient';

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(set => ({
  token: null,
  user: null,
  loading: true,

  login: async (email: string, password: string) => {
    const response = await miraClient.login(email, password);
    const user: User = {
      id: response.user_id,
      email: response.email,
      full_name: response.full_name || '',
      role: response.role,
      organization_id: response.organization_id,
      organization_name: response.organization_name,
    };
    await AsyncStorage.setItem('auth_token', response.access_token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    set({token: response.access_token, user});
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    setAuthToken(null);
    set({token: null, user: null});
  },

  restoreSession: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userJson = await AsyncStorage.getItem('auth_user');
      if (token && userJson) {
        setAuthToken(token);
        set({token, user: JSON.parse(userJson), loading: false});
      } else {
        set({loading: false});
      }
    } catch {
      set({loading: false});
    }
  },
}));
