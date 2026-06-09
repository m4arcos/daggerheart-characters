import { Character } from './types/character';

const BASE = '/api';

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
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
};
