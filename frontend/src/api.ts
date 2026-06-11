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

export async function uploadImage(file: File): Promise<{ url: string }> {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch((import.meta.env.VITE_API_URL ?? '') + '/api/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
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
    me: () => req<{ token: string; user: import('./types/auth').AuthUser }>('/auth/me'),
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

  campaigns: {
    list: () => req<import('./types/campaign').Campaign[]>('/campaigns'),
    create: (nome: string) => req<import('./types/campaign').Campaign>('/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }) }),
    join: (codigo: string) => req<{ campaign_id: string; campaign_nome: string; status: string }>('/campaigns/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) }),
    get: (id: string) => req<import('./types/campaign').CampaignDetail>(`/campaigns/${id}`),
    delete: (id: string) => req<{ ok: boolean }>(`/campaigns/${id}`, { method: 'DELETE' }),
    approveMember: (id: string, uid: string) => req<{ ok: boolean }>(`/campaigns/${id}/members/${uid}/approve`, { method: 'POST' }),
    removeMember: (id: string, uid: string) => req<{ ok: boolean }>(`/campaigns/${id}/members/${uid}`, { method: 'DELETE' }),
    getCharacters: (id: string) => req<import('./types/character').Character[]>(`/campaigns/${id}/characters`),
    updateCover: (id: string, cover_image: string) =>
      req<import('./types/campaign').Campaign>(`/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_image }),
      }),
    updateStatus: (id: string, status: 'ativa' | 'pausada' | 'arquivada') =>
      req<import('./types/campaign').Campaign>(`/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
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
