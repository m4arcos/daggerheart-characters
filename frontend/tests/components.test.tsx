import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Character } from '../src/types/character'

// ── Mock do store ──────────────────────────────────────────────────────────────
// mockStore é mutável: beforeEach reassigna suas propriedades para isolar testes

const mockStore = {
  chars: [] as Character[],
  loading: false,
  notif: null as string | null,
  fetchChars: vi.fn(),
  saveChar: vi.fn().mockResolvedValue(undefined),
  deleteChar: vi.fn().mockResolvedValue(undefined),
  patchChar: vi.fn(),
  showNotif: vi.fn(),
}

vi.mock('../src/store/useCharStore', () => ({
  useCharStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}))

vi.mock('../src/api', () => ({
  api: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({ ok: true }),
    cards: {
      getAll: vi.fn().mockResolvedValue([]),
    },
  },
}))

import ListScreen from '../src/screens/ListScreen'
import FormScreen from '../src/screens/FormScreen'
import SessionScreen from '../src/screens/SessionScreen'

// ── Personagem base para os testes ────────────────────────────────────────────
const BASE_CHAR: Character = {
  id: 'test-char-1',
  cls: 'guerreiro',
  nome: 'Thorin',
  heranca: 'Anão',
  genero: 'Masculino',
  subclasse: 'Guardião',
  nivel: 3,
  prof: 2,
  agi: 1, for: 2, acu: 0, ins: -1, pre: 0, con: 1,
  agiUp: false, forUp: true, acuUp: false, insUp: false, preUp: false, conUp: false,
  evBonus: 0,
  pvMax: 6, pfMax: 6, armBase: 3,
  dm: 5, dG: 11,
  wpNome: 'Machado', wpAttr: 'Força CaC', wpDados: 'd8 fís', wpHab: '', wpMaos: 'uma',
  wsNome: '', wsAttr: '', wsDados: '', wsHab: '', wsMaos: 'uma',
  armNome: '', armLim: '', armHab: '',
  gP: 0, gB: 0, gBau: 0,
  wi1Nome: '', wi1Attr: '', wi1Dados: '', wi1Hab: '', wi1Tipo: '', wi1Maos: 'uma',
  wi2Nome: '', wi2Attr: '', wi2Dados: '', wi2Hab: '', wi2Tipo: '', wi2Maos: 'uma',
  comunidade: '',
  cartasDominio: [],
  cartasAtivas: [],
  notas: '',
  exps: [{ nome: 'Combate', val: 2 }, { nome: 'Sobrevivência', val: 1 }],
  inv: [],
  pvAtual: 6, pfAtual: 6, esperanca: 6, paAtual: 3,
  pvTemp: 0, pfTemp: 0, paTemp: 0, hopeTemp: 0,
  multiEnabled: false, multiCls: null, multiDom: null, multiSubclasse: '',
  evo: { p2: {}, p3: {}, p4: {} },
}

beforeEach(() => {
  mockStore.chars = []
  mockStore.fetchChars = vi.fn()
  mockStore.saveChar = vi.fn().mockResolvedValue(undefined)
  mockStore.deleteChar = vi.fn().mockResolvedValue(undefined)
  mockStore.patchChar = vi.fn()
  mockStore.showNotif = vi.fn()
  cleanup()
})

// ── ListScreen ────────────────────────────────────────────────────────────────

describe('ListScreen — estado vazio', () => {
  it('exibe mensagem quando não há personagens', () => {
    render(<ListScreen onNew={vi.fn()} onEdit={vi.fn()} onSession={vi.fn()} />)
    expect(screen.getByText('Nenhum personagem ainda')).toBeInTheDocument()
  })

  it('exibe botão "+ Novo Personagem"', () => {
    render(<ListScreen onNew={vi.fn()} onEdit={vi.fn()} onSession={vi.fn()} />)
    expect(screen.getAllByRole('button', { name: '+ Novo Personagem' }).length).toBeGreaterThanOrEqual(1)
  })

  it('exibe "0 personagens"', () => {
    render(<ListScreen onNew={vi.fn()} onEdit={vi.fn()} onSession={vi.fn()} />)
    expect(document.querySelector('.list-top h2')?.textContent).toMatch(/0 personagens/)
  })
})

describe('ListScreen — com personagens', () => {
  it('exibe card para cada personagem', () => {
    mockStore.chars = [BASE_CHAR]
    render(<ListScreen onNew={vi.fn()} onEdit={vi.fn()} onSession={vi.fn()} />)
    expect(screen.getByText('Thorin')).toBeInTheDocument()
    expect(screen.getByText('Guerreiro — Nível 3')).toBeInTheDocument()
  })

  it('exibe "1 personagem" (singular)', () => {
    mockStore.chars = [BASE_CHAR]
    render(<ListScreen onNew={vi.fn()} onEdit={vi.fn()} onSession={vi.fn()} />)
    expect(screen.getByText('1 personagem')).toBeInTheDocument()
  })

  it('exibe "2 personagens" (plural)', () => {
    mockStore.chars = [BASE_CHAR, { ...BASE_CHAR, id: 'char-2', nome: 'Elara' }]
    render(<ListScreen onNew={vi.fn()} onEdit={vi.fn()} onSession={vi.fn()} />)
    expect(document.querySelector('.list-top h2')?.textContent).toMatch(/2 personagens/)
  })

  it('card exibe PV, PF e Esperança atuais', () => {
    mockStore.chars = [{ ...BASE_CHAR, pvAtual: 5, pfAtual: 3, esperanca: 4 }]
    render(<ListScreen onNew={vi.fn()} onEdit={vi.fn()} onSession={vi.fn()} />)
    const card = document.querySelector('.char-card')!
    expect(card.textContent).toContain('5/6')
    expect(card.textContent).toContain('3/6')
    expect(card.textContent).toContain('4/6')
  })

  it('exibe herança e subclasse no card', () => {
    mockStore.chars = [BASE_CHAR]
    render(<ListScreen onNew={vi.fn()} onEdit={vi.fn()} onSession={vi.fn()} />)
    expect(screen.getByText(/Anão.*Guardião/)).toBeInTheDocument()
  })
})

describe('ListScreen — modal de exclusão', () => {
  it('botão 🗑 abre modal de confirmação', async () => {
    mockStore.chars = [BASE_CHAR]
    const user = userEvent.setup()
    render(<ListScreen onNew={vi.fn()} onEdit={vi.fn()} onSession={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '🗑' }))
    expect(screen.getByText('Excluir personagem?')).toBeInTheDocument()
    expect(screen.getByText(/"Thorin" será removido permanentemente\./)).toBeInTheDocument()
  })

  it('confirmar exclusão chama deleteChar com o id correto', async () => {
    mockStore.chars = [BASE_CHAR]
    const user = userEvent.setup()
    render(<ListScreen onNew={vi.fn()} onEdit={vi.fn()} onSession={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '🗑' }))
    await user.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(mockStore.deleteChar).toHaveBeenCalledWith(BASE_CHAR.id)
  })

  it('cancelar modal não chama deleteChar', async () => {
    mockStore.chars = [BASE_CHAR]
    const user = userEvent.setup()
    render(<ListScreen onNew={vi.fn()} onEdit={vi.fn()} onSession={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '🗑' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(mockStore.deleteChar).not.toHaveBeenCalled()
    expect(screen.queryByText('Excluir personagem?')).not.toBeInTheDocument()
  })
})

// ── FormScreen ────────────────────────────────────────────────────────────────

describe('FormScreen — validação ao salvar', () => {
  it('não salva sem classe selecionada', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    render(<FormScreen editId={null} onDone={onDone} />)
    await user.type(screen.getByPlaceholderText('Nome do personagem'), 'Aragorn')
    await user.click(screen.getByRole('button', { name: /salvar personagem/i }))
    expect(mockStore.showNotif).toHaveBeenCalledWith('Selecione uma classe!')
    expect(onDone).not.toHaveBeenCalled()
  })

  it('não salva sem nome', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    render(<FormScreen editId={null} onDone={onDone} />)
    await user.click(screen.getByText('Guerreiro'))
    await user.click(screen.getByRole('button', { name: /salvar personagem/i }))
    expect(mockStore.showNotif).toHaveBeenCalledWith('Informe o nome do personagem!')
    expect(onDone).not.toHaveBeenCalled()
  })

  it('salva com sucesso quando classe e nome preenchidos', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn()
    render(<FormScreen editId={null} onDone={onDone} />)
    await user.click(screen.getByText('Guerreiro'))
    await user.type(screen.getByPlaceholderText('Nome do personagem'), 'Aragorn')
    await user.click(screen.getByRole('button', { name: /salvar personagem/i }))
    expect(mockStore.saveChar).toHaveBeenCalledTimes(1)
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})

describe('FormScreen — seleção de classe', () => {
  it('selecionar Guerreiro preenche Evasão base 11', () => {
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    fireEvent.click(screen.getByText('Guerreiro'))
    // readOnly input com valor da classe
    expect(screen.getByDisplayValue('11')).toBeInTheDocument()
  })

  it('selecionar Ladino preenche Evasão base 12', () => {
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    fireEvent.click(screen.getByText('Ladino'))
    expect(screen.getByDisplayValue('12')).toBeInTheDocument()
  })

  it('classe selecionada recebe classe "sel"', () => {
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    const bardoOpt = screen.getByText('Bardo').closest('.cls-opt')!
    expect(bardoOpt).not.toHaveClass('sel')
    fireEvent.click(bardoOpt)
    expect(bardoOpt).toHaveClass('sel')
  })
})

describe('FormScreen — seções colapsáveis', () => {
  it('seção Identidade está aberta por padrão', () => {
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    expect(screen.getByPlaceholderText('Nome do personagem')).toBeInTheDocument()
  })

  it('click no header de Identidade colapsa a seção', async () => {
    const user = userEvent.setup()
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    expect(screen.getByPlaceholderText('Nome do personagem')).toBeInTheDocument()
    const header = screen.getByText('Identidade', { selector: '.fsec-hdr' })
    await user.click(header)
    expect(screen.queryByPlaceholderText('Nome do personagem')).not.toBeInTheDocument()
  })

  it('click novamente no header reabre a seção', async () => {
    const user = userEvent.setup()
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    const header = screen.getByText('Identidade', { selector: '.fsec-hdr' })
    await user.click(header)
    await user.click(header)
    expect(screen.getByPlaceholderText('Nome do personagem')).toBeInTheDocument()
  })
})

describe('FormScreen — experiências', () => {
  it('inicia com 5 linhas de experiência', () => {
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    expect(screen.getAllByPlaceholderText('Nome da experiência…')).toHaveLength(5)
  })

  it('+ Experiência adiciona linha extra marcada com ★', async () => {
    const user = userEvent.setup()
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '+ Experiência' }))
    expect(screen.getAllByPlaceholderText('Nome da experiência…')).toHaveLength(6)
    expect(screen.getByText('★')).toBeInTheDocument()
  })

  it('botão + Experiência dentro do header NÃO colapsa a seção', async () => {
    const user = userEvent.setup()
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '+ Experiência' }))
    // Se tivesse colapsado, getAllByPlaceholderText lançaria erro
    expect(screen.getAllByPlaceholderText('Nome da experiência…')).toHaveLength(6)
  })

  it('linha extra tem botão ✕ que a remove', async () => {
    const user = userEvent.setup()
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '+ Experiência' }))
    expect(screen.getAllByPlaceholderText('Nome da experiência…')).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.getAllByPlaceholderText('Nome da experiência…')).toHaveLength(5)
  })

  it('primeiras 5 linhas não têm botão ✕', () => {
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    expect(screen.queryByRole('button', { name: '✕' })).not.toBeInTheDocument()
  })
})

describe('FormScreen — multiclasse', () => {
  it('seção de multiclasse fica oculta por padrão', () => {
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    expect(screen.queryByText(/Escolha a classe adicional/i)).not.toBeInTheDocument()
  })

  it('habilitar multiclasse exibe grade de classes', async () => {
    const user = userEvent.setup()
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    await user.click(screen.getByRole('checkbox', { name: /habilitar multiclasse/i }))
    expect(screen.getByText(/Escolha a classe adicional/i)).toBeInTheDocument()
  })

  it('classe principal fica bloqueada na grade de multiclasse', async () => {
    const user = userEvent.setup()
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    fireEvent.click(screen.getAllByText('Guerreiro')[0].closest('.cls-opt')!)
    await user.click(screen.getByRole('checkbox', { name: /habilitar multiclasse/i }))
    const multiGrid = document.querySelector('.multi-cls-grid')!
    const guerreiroMulti = within(multiGrid as HTMLElement).getByText('Guerreiro')
    expect(guerreiroMulti.closest('.multi-cls-opt')).toHaveClass('disabled')
  })

  it('domínio da classe principal fica bloqueado no multiclasse', async () => {
    // Bardo (domínios: Graça, Códice) + Ladino (domínios: Meia-Noite, Graça)
    // → "Graça" deve ficar bloqueado
    const user = userEvent.setup()
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    fireEvent.click(screen.getAllByText('Bardo')[0].closest('.cls-opt')!)
    await user.click(screen.getByRole('checkbox', { name: /habilitar multiclasse/i }))
    const multiGrid = document.querySelector('.multi-cls-grid')!
    await user.click(within(multiGrid as HTMLElement).getByText('Ladino'))
    const gracaOpts = screen.getAllByText('Graça')
    const blockedOpt = gracaOpts.find(el => el.closest('.dom-opt'))
    expect(blockedOpt!.closest('.dom-opt')).toHaveClass('disabled')
  })
})

describe('FormScreen — evolução', () => {
  it('nível 1 não destaca nenhum tier com "★ Patamar Atual"', () => {
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    expect(screen.queryByText(/★ Patamar Atual/)).not.toBeInTheDocument()
  })

  it('tier do patamar atual recebe destaque "★ Patamar Atual"', () => {
    mockStore.chars = [{ ...BASE_CHAR, nivel: 3 }]
    render(<FormScreen editId={BASE_CHAR.id} onDone={vi.fn()} />)
    expect(screen.getByText(/★ Patamar Atual/)).toBeInTheDocument()
  })

  it('nível 5 destaca 3º Patamar', () => {
    mockStore.chars = [{ ...BASE_CHAR, nivel: 5 }]
    render(<FormScreen editId={BASE_CHAR.id} onDone={vi.fn()} />)
    expect(screen.getByText(/3º Patamar.*★ Patamar Atual/)).toBeInTheDocument()
  })

  it('"atrib" tem 3 checks no bloco de evolução', () => {
    render(<FormScreen editId={null} onDone={vi.fn()} />)
    const atribTexts = screen.getAllByText(/atributos diferentes/i)
    // Primeiro elemento é o do 2º patamar
    const evoOpt = atribTexts[0].closest('.evo-opt')!
    const checks = within(evoOpt as HTMLElement).getAllByText('✓')
    expect(checks).toHaveLength(3)
  })
})

// ── SessionScreen ─────────────────────────────────────────────────────────────

describe('SessionScreen — exibição', () => {
  it('exibe nome do personagem', () => {
    mockStore.chars = [BASE_CHAR]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    expect(screen.getByText('Thorin')).toBeInTheDocument()
  })

  it('exibe classe e nível', () => {
    mockStore.chars = [BASE_CHAR]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    const meta = document.querySelector('.char-hdr-meta')!
    expect(meta.textContent).toContain('Guerreiro')
    expect(meta.textContent).toMatch(/Nível.*3/)
  })

  it('exibe patamar baseado no nível', () => {
    mockStore.chars = [BASE_CHAR]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    expect(screen.getByText(/2º Patamar/)).toBeInTheDocument()
  })

  it('exibe Evasão correta (base + bônus)', () => {
    mockStore.chars = [{ ...BASE_CHAR, evBonus: 2 }]  // 11 + 2 = 13
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    expect(screen.getByTestId('ev-val')).toHaveTextContent('13')
  })

  it('exibe Evasão base da classe sem bônus', () => {
    mockStore.chars = [BASE_CHAR]  // CLS.guerreiro.ev = 11
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    expect(screen.getByTestId('ev-val')).toHaveTextContent('11')
  })

  it('proficiência renderiza 6 caixas com N preenchidas', () => {
    mockStore.chars = [{ ...BASE_CHAR, prof: 3 }]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    const profBoxes = screen.getAllByTitle('Proficiência')
    expect(profBoxes).toHaveLength(6)
    const filled = profBoxes.filter(el => el.classList.contains('on'))
    expect(filled).toHaveLength(3)
  })

  it('exibe habilidade de Esperança da classe', () => {
    mockStore.chars = [BASE_CHAR]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    expect(screen.getByText(/Sem Piedade/)).toBeInTheDocument()
  })

  it('exibe "Personagem não encontrado" para id inválido', () => {
    render(<SessionScreen charId="nao-existe" onEdit={vi.fn()} />)
    expect(screen.getByText(/personagem não encontrado/i)).toBeInTheDocument()
  })
})

describe('SessionScreen — track boxes de PV', () => {
  it('renderiza N caixas de PV', () => {
    mockStore.chars = [{ ...BASE_CHAR, pvMax: 4, pvAtual: 4 }]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    expect(screen.getAllByTestId('pv-box')).toHaveLength(4)
  })

  it('exibe contagem pvAtual/pvMax', () => {
    mockStore.chars = [{ ...BASE_CHAR, pvMax: 6, pvAtual: 4 }]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    expect(screen.getByTestId('pv-count')).toHaveTextContent('4/6')
  })

  it('click em caixa não marcada chama patchChar com pvAtual reduzido', async () => {
    const user = userEvent.setup()
    mockStore.chars = [{ ...BASE_CHAR, pvMax: 4, pvAtual: 4 }]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    const pvBoxes = screen.getAllByTestId('pv-box')
    await user.click(pvBoxes[0])
    expect(mockStore.patchChar).toHaveBeenCalledWith(BASE_CHAR.id, { pvAtual: 3 })
  })

  it('click em caixa marcada chama patchChar com pvAtual aumentado', async () => {
    const user = userEvent.setup()
    // pvAtual=2 → 2 marcadas (max=4, marked=2, boxes 0 e 1 estão "on")
    mockStore.chars = [{ ...BASE_CHAR, pvMax: 4, pvAtual: 2 }]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    const pvBoxes = screen.getAllByTestId('pv-box')
    await user.click(pvBoxes[0])  // box 0 < marked(2) → newMarked=0 → pvAtual=4
    expect(mockStore.patchChar).toHaveBeenCalledWith(BASE_CHAR.id, { pvAtual: 4 })
  })
})

describe('SessionScreen — gems de Esperança', () => {
  it('renderiza 6 gems', () => {
    mockStore.chars = [BASE_CHAR]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    expect(screen.getAllByTestId('hope-gem')).toHaveLength(6)
  })

  it('gems refletem o valor atual de esperança', () => {
    mockStore.chars = [{ ...BASE_CHAR, esperanca: 4 }]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    const gems = screen.getAllByTestId('hope-gem')
    const lit = gems.filter(g => g.classList.contains('on'))
    expect(lit).toHaveLength(4)
  })

  it('click em gem não ativa chama patchChar com esperança aumentada', async () => {
    const user = userEvent.setup()
    mockStore.chars = [{ ...BASE_CHAR, esperanca: 2 }]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    const gems = screen.getAllByTestId('hope-gem')
    await user.click(gems[4])  // gem 4 >= 2 → nova = 5
    expect(mockStore.patchChar).toHaveBeenCalledWith(BASE_CHAR.id, { esperanca: 5 })
  })

  it('click em gem ativa chama patchChar com esperança reduzida', async () => {
    const user = userEvent.setup()
    mockStore.chars = [{ ...BASE_CHAR, esperanca: 5 }]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    const gems = screen.getAllByTestId('hope-gem')
    await user.click(gems[2])  // gem 2 < 5 → nova = 2
    expect(mockStore.patchChar).toHaveBeenCalledWith(BASE_CHAR.id, { esperanca: 2 })
  })
})

describe('SessionScreen — armadura', () => {
  it('exibe caixas de PA quando armBase > 0', () => {
    mockStore.chars = [{ ...BASE_CHAR, armBase: 3, paAtual: 3 }]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    expect(screen.getAllByTestId('pa-box')).toHaveLength(3)
  })

  it('não exibe caixas de PA quando armBase = 0', () => {
    mockStore.chars = [{ ...BASE_CHAR, armBase: 0 }]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    expect(screen.queryAllByTestId('pa-box')).toHaveLength(0)
  })
})

describe('SessionScreen — inventário', () => {
  it('exibe itens com data-testid correto', () => {
    mockStore.chars = [{
      ...BASE_CHAR,
      inv: [
        { nome: 'Poção de Vida', qtd: 2, desc: 'Recupera 1d6 PV' },
        { nome: 'Corda', qtd: 1, desc: '' },
      ],
    }]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    expect(screen.getAllByTestId('inv-item')).toHaveLength(2)
    expect(screen.getByText('Poção de Vida')).toBeInTheDocument()
  })

  it('não exibe itens quando inventário está vazio', () => {
    mockStore.chars = [{ ...BASE_CHAR, inv: [] }]
    render(<SessionScreen charId={BASE_CHAR.id} onEdit={vi.fn()} />)
    expect(screen.queryAllByTestId('inv-item')).toHaveLength(0)
  })
})
