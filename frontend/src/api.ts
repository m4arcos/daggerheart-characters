import { Character } from './types/character';
import { Card, CardsFilter } from './types/cards';
import { AdminUser } from './types/auth';

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

function getToken(): string | null {
  try { return localStorage.getItem('dh_token'); } catch { return null; }
}

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(opts?.headers as Record<string, string> ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(BASE + url, { ...opts, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  auth: {
    login: (email: string, senha: string) =>
      req<{ token: string; user: import('./types/auth').AuthUser }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      }),
    setPassword: (novaSenha: string) =>
      req<{ token: string; user: import('./types/auth').AuthUser }>('/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha }),
      }),
  },

  getAll: () => req<Character[]>('/characters'),
  create: (c: Character) => req<Character>('/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c),
  }),
  update: (id: string, c: Character) => req<Character>(`/characters/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(c),
  }),
  delete: (id: string) => req<{ ok: boolean }>(`/characters/${id}`, { method: 'DELETE' }),

  admin: {
    createUser: (nome: string, email: string, senhaTmp: string) =>
      req<{ id: string; nome: string; email: string }>('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senhaTmp }),
      }),
    listUsers: () => req<AdminUser[]>('/admin/users'),
    updateUser: (id: string, nome: string, email: string, senhaTmp?: string) =>
      req<AdminUser>(`/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, ...(senhaTmp ? { senhaTmp } : {}) }),
      }),
  },

  cards: {
    getAll: (filters: CardsFilter = {}) => {
      const params = new URLSearchParams();
      if (filters.tipo) params.set('tipo', filters.tipo);
      if (filters.dominio_key) params.set('dominio_key', filters.dominio_key);
      if (filters.q) params.set('q', filters.q);
      if (filters.card_tipo) params.set('card_tipo', filters.card_tipo);
      if (filters.classe) params.set('classe', filters.classe);
      const qs = params.toString();
      return req<Card[]>(`/cards${qs ? `?${qs}` : ''}`);
    },
  },
};
