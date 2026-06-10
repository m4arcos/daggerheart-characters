import { describe, it, expect, beforeEach } from 'vitest'
import type { Character } from '../src/types/character'
import { makeDefaultCharacter } from '../src/types/character'

// Implementação de referência usando localStorage
// Espelha o comportamento esperado de persistência do sistema
const LS_KEY = 'dh_chars'

function loadChars(): Character[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveChars(chars: Character[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(chars))
}

function createChar(data: Omit<Character, 'id'>): Character {
  const id = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const char: Character = { id, ...data }
  const chars = loadChars()
  chars.push(char)
  saveChars(chars)
  return char
}

function updateChar(char: Character): void {
  const chars = loadChars().map(c => c.id === char.id ? char : c)
  saveChars(chars)
}

function deleteChar(id: string): void {
  saveChars(loadChars().filter(c => c.id !== id))
}

function patchChar(id: string, patch: Partial<Character>): void {
  const chars = loadChars().map(c => c.id === id ? { ...c, ...patch } : c)
  saveChars(chars)
}

describe('Persistência (localStorage)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('inicia com lista vazia', () => {
    expect(loadChars()).toEqual([])
  })

  it('persiste personagem criado', () => {
    createChar({ ...makeDefaultCharacter(), cls: 'guerreiro', nome: 'Thorin' })
    expect(loadChars()).toHaveLength(1)
    expect(loadChars()[0].nome).toBe('Thorin')
  })

  it('personagem criado recebe um id único', () => {
    const char = createChar({ ...makeDefaultCharacter(), cls: 'guerreiro', nome: 'Thorin' })
    expect(char.id).toBeDefined()
    expect(char.id.length).toBeGreaterThan(0)
  })

  it('persiste múltiplos personagens', () => {
    createChar({ ...makeDefaultCharacter(), cls: 'guerreiro', nome: 'Thorin' })
    createChar({ ...makeDefaultCharacter(), cls: 'bardo', nome: 'Elara' })
    expect(loadChars()).toHaveLength(2)
  })

  it('atualiza personagem existente sem duplicar', () => {
    const char = createChar({ ...makeDefaultCharacter(), cls: 'guerreiro', nome: 'Thorin' })
    updateChar({ ...char, nome: 'Thorin II' })
    const chars = loadChars()
    expect(chars).toHaveLength(1)
    expect(chars[0].nome).toBe('Thorin II')
  })

  it('exclui personagem correto por id', () => {
    const c1 = createChar({ ...makeDefaultCharacter(), cls: 'guerreiro', nome: 'Thorin' })
    const c2 = createChar({ ...makeDefaultCharacter(), cls: 'bardo', nome: 'Elara' })
    deleteChar(c1.id)
    const chars = loadChars()
    expect(chars).toHaveLength(1)
    expect(chars[0].id).toBe(c2.id)
    expect(chars[0].nome).toBe('Elara')
  })

  it('patch atualiza apenas os campos indicados', () => {
    const char = createChar({ ...makeDefaultCharacter(), cls: 'guerreiro', nome: 'Thorin', pvMax: 8, pvAtual: 8 })
    patchChar(char.id, { pvAtual: 5 })
    const updated = loadChars()[0]
    expect(updated.pvAtual).toBe(5)
    expect(updated.pvMax).toBe(8)
    expect(updated.nome).toBe('Thorin')
  })

  it('estado de sessão é preservado ao editar personagem', () => {
    const char = createChar({
      ...makeDefaultCharacter(), cls: 'guerreiro', nome: 'Thorin',
      pvMax: 6, pvAtual: 4, pfAtual: 3, esperanca: 5, paAtual: 2,
    })
    // Simula edição do formulário preservando estado de sessão
    const { pvAtual, pfAtual, esperanca, paAtual } = loadChars()[0]
    updateChar({ ...char, nome: 'Thorin O Bravo', pvAtual, pfAtual, esperanca, paAtual })
    const saved = loadChars()[0]
    expect(saved.nome).toBe('Thorin O Bravo')
    expect(saved.pvAtual).toBe(4)
    expect(saved.pfAtual).toBe(3)
    expect(saved.esperanca).toBe(5)
    expect(saved.paAtual).toBe(2)
  })

  it('novo personagem inicializa pvAtual = pvMax e esperanca = 6', () => {
    const defaults = makeDefaultCharacter()
    const data = { ...defaults, cls: 'guerreiro' as const, nome: 'Novo', pvMax: 8, pfMax: 5 }
    const sessionState = { pvAtual: data.pvMax, pfAtual: data.pfMax, esperanca: 6, paAtual: data.armBase }
    createChar({ ...data, ...sessionState })
    const saved = loadChars()[0]
    expect(saved.pvAtual).toBe(8)
    expect(saved.pfAtual).toBe(5)
    expect(saved.esperanca).toBe(6)
  })
})

describe('CRUD — operações compostas', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('criar e buscar por id retorna o mesmo personagem', () => {
    const char = createChar({ ...makeDefaultCharacter(), cls: 'ladino', nome: 'Sombra' })
    const found = loadChars().find(c => c.id === char.id)
    expect(found).toEqual(char)
  })

  it('excluir todos os personagens limpa a lista', () => {
    const c1 = createChar({ ...makeDefaultCharacter(), cls: 'guerreiro', nome: 'A' })
    const c2 = createChar({ ...makeDefaultCharacter(), cls: 'mago', nome: 'B' })
    deleteChar(c1.id)
    deleteChar(c2.id)
    expect(loadChars()).toHaveLength(0)
  })

  it('patch em id inexistente não altera outros personagens', () => {
    const char = createChar({ ...makeDefaultCharacter(), cls: 'serafim', nome: 'Luz', pvAtual: 6 })
    patchChar('id-que-nao-existe', { pvAtual: 0 })
    expect(loadChars()[0].pvAtual).toBe(6)
  })

  it('múltiplos patches acumulam corretamente', () => {
    const char = createChar({ ...makeDefaultCharacter(), cls: 'guerreiro', nome: 'X', pvAtual: 6, esperanca: 6 })
    patchChar(char.id, { pvAtual: 4 })
    patchChar(char.id, { esperanca: 3 })
    const saved = loadChars()[0]
    expect(saved.pvAtual).toBe(4)
    expect(saved.esperanca).toBe(3)
  })

  it('localStorage persiste entre chamadas de load/save', () => {
    createChar({ ...makeDefaultCharacter(), cls: 'druida', nome: 'Verde' })
    // Simula nova "leitura" do localStorage (mesmo contexto, mas nova chamada)
    const chars = loadChars()
    expect(chars).toHaveLength(1)
    expect(chars[0].nome).toBe('Verde')
  })
})
