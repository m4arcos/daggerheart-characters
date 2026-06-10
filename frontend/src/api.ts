import { Character } from './types/character';
import { Card, CardsFilter } from './types/cards';

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
