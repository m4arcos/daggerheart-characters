import { create } from 'zustand';
import { AuthUser } from '../types/auth';

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
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (!res.ok) {
      set({ loginError: data.error ?? 'Erro ao fazer login' });
      return;
    }
    get().updateAuth(data.token, data.user);
  },

  setPassword: async (novaSenha) => {
    const { token } = get();
    const res = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ novaSenha }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Erro ao definir senha');
    get().updateAuth(data.token, data.user);
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
