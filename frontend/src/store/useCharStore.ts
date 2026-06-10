import { create } from 'zustand';
import { Character } from '../types/character';
import { api } from '../api';

export interface CharOwner {
  id: string;
  nome: string;
  email: string;
}

interface CharStore {
  chars: Character[];
  charOwners: Record<string, CharOwner | null>;
  loading: boolean;
  notif: string | null;
  fetchChars: () => Promise<void>;
  saveChar: (char: Character) => Promise<void>;
  deleteChar: (id: string) => Promise<void>;
  patchChar: (id: string, patch: Partial<Character>) => Promise<void>;
  showNotif: (msg: string) => void;
}

export const useCharStore = create<CharStore>((set, get) => ({
  chars: [],
  charOwners: {},
  loading: false,
  notif: null,

  fetchChars: async () => {
    set({ loading: true });
    try {
      const data = await api.getAll() as (Character & { _owner?: CharOwner | null })[];
      const owners: Record<string, CharOwner | null> = {};
      const chars = data.map(c => {
        const { _owner, ...char } = c;
        if (_owner !== undefined) owners[char.id] = _owner;
        return char as Character;
      });
      set({ chars, charOwners: owners });
    } finally {
      set({ loading: false });
    }
  },

  saveChar: async (char) => {
    const exists = get().chars.some(c => c.id === char.id);
    if (exists) {
      await api.update(char.id, char);
      set({ chars: get().chars.map(c => c.id === char.id ? char : c) });
    } else {
      await api.create(char);
      set({ chars: [...get().chars, char] });
    }
    get().showNotif('Personagem salvo!');
  },

  deleteChar: async (id) => {
    await api.delete(id);
    const owners = { ...get().charOwners };
    delete owners[id];
    set({ chars: get().chars.filter(c => c.id !== id), charOwners: owners });
  },

  patchChar: async (id, patch) => {
    const char = get().chars.find(c => c.id === id);
    if (!char) return;
    const updated = { ...char, ...patch };
    await api.update(id, updated);
    set({ chars: get().chars.map(c => c.id === id ? updated : c) });
  },

  showNotif: (msg) => {
    set({ notif: msg });
    setTimeout(() => set({ notif: null }), 2600);
  },
}));
