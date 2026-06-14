import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export interface Player {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  level: number;
  exp: number;
  gold: number;
  gems: number;
  craftMastery: number;
  collectionScore: number;
  leaguePoints: number;
  guildContribution: number;
  workshopLayout: Record<string, any>;
  status: string;
}

interface AuthState {
  token: string | null;
  player: Player | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, nickname?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updatePlayer: (updates: Partial<Player>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      player: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/players/login', { username, password });
          if (res.data.success) {
            localStorage.setItem('token', res.data.data.token);
            set({
              token: res.data.data.token,
              player: res.data.data.player,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }
          return false;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      register: async (username, password, nickname) => {
        set({ isLoading: true });
        try {
          const res = await api.post('/players/register', { username, password, nickname });
          if (res.data.success) {
            localStorage.setItem('token', res.data.data.token);
            set({
              token: res.data.data.token,
              player: res.data.data.player,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }
          return false;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await api.post('/players/logout');
        } catch {}
        localStorage.removeItem('token');
        localStorage.removeItem('player');
        set({ token: null, player: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const res = await api.get('/players/me');
          if (res.data.success) {
            set({ player: res.data.data, isAuthenticated: true });
          }
        } catch (error) {
          console.error('Fetch me error:', error);
        }
      },

      updatePlayer: async (updates) => {
        try {
          const res = await api.put('/players/me', updates);
          if (res.data.success) {
            set({ player: res.data.data });
          }
        } catch (error) {
          console.error('Update player error:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, player: state.player, isAuthenticated: state.isAuthenticated }),
    }
  )
);
