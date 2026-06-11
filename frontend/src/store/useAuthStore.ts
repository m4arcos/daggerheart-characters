import { create } from 'zustand';
import { AuthUser } from '../types/auth';
import { api } from '../api';

const TOKEN_KEY = 'dh_token';
const USER_KEY = 'dh_user';

function loadPersistedAuth(): { token: string | null; user: AuthUser | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    if (token && userStr) {
      return { token, user: JSON.parse(userStr) as AuthUser };
    }
  } catch { /* ignore */ }
  return { token: null, user: null };
}

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  loginError: string | null;

  login: (email: string, senha: string) => Promise<void>;
  setPassword: (novaSenha: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateAuth: (token: string, user: AuthUser) => void;
}

const persisted = loadPersistedAuth();

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: persisted.user,
  token: persisted.token,
  loginError: null,

  login: async (email, senha) => {
    set({ loginError: null });
    try {
      const data = await api.auth.login(email, senha);
      get().updateAuth(data.token, data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login';
      try {
        set({ loginError: JSON.parse(msg).error ?? msg });
      } catch {
        set({ loginError: msg });
      }
    }
  },

  setPassword: async (novaSenha) => {
    const data = await api.auth.setPassword(novaSenha);
    get().updateAuth(data.token, data.user);
  },

  refreshUser: async () => {
    try {
      const data = await api.auth.me();
      get().updateAuth(data.token, data.user);
    } catch {
      get().logout();
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ user: null, token: null, loginError: null });
  },

  clearError: () => set({ loginError: null }),

  updateAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user, loginError: null });
  },
}));
