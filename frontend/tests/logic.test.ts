import { describe, it, expect } from 'vitest'
import { makeDefaultCharacter, tierFromLevel, uid } from '../src/types/character'
import { CLS } from '../src/constants/cls'

describe('tierFromLevel', () => {
  it('nível 1 → 1º Patamar', () => {
    expect(tierFromLevel(1)).toBe('1º Patamar')
  })
  it('nível 2 → 2º Patamar', () => {
    expect(tierFromLevel(2)).toBe('2º Patamar')
  })
  it('nível 4 (limite) → 2º Patamar', () => {
    expect(tierFromLevel(4)).toBe('2º Patamar')
  })
  it('nível 5 → 3º Patamar', () => {
    expect(tierFromLevel(5)).toBe('3º Patamar')
  })
  it('nível 7 (limite) → 3º Patamar', () => {
    expect(tierFromLevel(7)).toBe('3º Patamar')
  })
  it('nível 8 → 4º Patamar (máx.)', () => {
    expect(tierFromLevel(8)).toBe('4º Patamar (máx.)')
  })
  it('nível 10 → 4º Patamar (máx.)', () => {
    expect(tierFromLevel(10)).toBe('4º Patamar (máx.)')
  })
})

describe('uid', () => {
  it('gera ids únicos', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()))
    expect(ids.size).toBe(100)
  })
  it('não é string vazia', () => {
    expect(uid().length).toBeGreaterThan(0)
  })
  it('uid tem pelo menos 8 caracteres', () => {
    expect(uid().length).toBeGreaterThanOrEqual(8)
  })
})

describe('makeDefaultCharacter', () => {
  it('contém todos os campos de sessão com defaults corretos', () => {
    const c = makeDefaultCharacter()
    expect(c.pvAtual).toBe(6)
    expect(c.pfAtual).toBe(6)
    expect(c.esperanca).toBe(6)
    expect(c.paAtual).toBe(3)
  })
  it('nível inicial é 1', () => {
    expect(makeDefaultCharacter().nivel).toBe(1)
  })
  it('proficiência inicial é 1', () => {
    expect(makeDefaultCharacter().prof).toBe(1)
  })
  it('exps inicia com 5 entradas vazias', () => {
    const c = makeDefaultCharacter()
    expect(c.exps).toHaveLength(5)
    c.exps.forEach(e => {
      expect(e.nome).toBe('')
      expect(e.val).toBe(0)
    })
  })
  it('inventário inicia vazio', () => {
    expect(makeDefaultCharacter().inv).toHaveLength(0)
  })
  it('multiclasse inicia desabilitada', () => {
    const c = makeDefaultCharacter()
    expect(c.multiEnabled).toBe(false)
    expect(c.multiCls).toBeNull()
    expect(c.multiDom).toBeNull()
  })
  it('evo inicia com estados vazios', () => {
    const c = makeDefaultCharacter()
    expect(c.evo.p2).toEqual({})
    expect(c.evo.p3).toEqual({})
    expect(c.evo.p4).toEqual({})
  })
  it('pvMax e pfMax iniciam em 6', () => {
    const c = makeDefaultCharacter()
    expect(c.pvMax).toBe(6)
    expect(c.pfMax).toBe(6)
  })
})

describe('Cálculo de Evasão', () => {
  it('evasão = classe.ev + evBonus', () => {
    expect(CLS.guerreiro.ev + 2).toBe(13)
  })
  it('evasão sem bônus = evasão base da classe', () => {
    expect(CLS.ladino.ev + 0).toBe(12)
  })
  it('todas as classes têm evasão base definida e positiva', () => {
    Object.values(CLS).forEach(cls => {
      expect(typeof cls.ev).toBe('number')
      expect(cls.ev).toBeGreaterThan(0)
    })
  })
  it('guerreiro tem evasão base 11', () => {
    expect(CLS.guerreiro.ev).toBe(11)
  })
  it('guardiao e serafim têm evasão base 9', () => {
    expect(CLS.guardiao.ev).toBe(9)
    expect(CLS.serafim.ev).toBe(9)
  })
})

describe('Algoritmo de toggle de caixas (PV/PF/PA)', () => {
  function toggleBox(max: number, current: number, boxIdx: number): number {
    const marked = max - current
    const newMarked = boxIdx < marked ? boxIdx : boxIdx + 1
    return max - newMarked
  }

  it('clicar em caixa não marcada reduz current em 1', () => {
    // max=6, current=6 (nenhuma marcada), click box 0 → 1 marcada → current=5
    expect(toggleBox(6, 6, 0)).toBe(5)
  })
  it('clicar na última caixa marca todas', () => {
    // max=4, current=4, click box 3 → 4 marcadas → current=0
    expect(toggleBox(4, 4, 3)).toBe(0)
  })
  it('clicar em caixa marcada desmarca até ela (exclusivo)', () => {
    // max=6, current=3 (3 marcadas: 0,1,2), click box 1 → 1 marcada → current=5
    expect(toggleBox(6, 3, 1)).toBe(5)
  })
  it('clicar na primeira caixa marcada desmarca todas', () => {
    // max=6, current=3 (3 marcadas), click box 0 → 0 marcadas → current=6
    expect(toggleBox(6, 3, 0)).toBe(6)
  })
  it('clicar na fronteira entre marcado/não-marcado aumenta em 1', () => {
    // max=6, current=4 (2 marcadas: 0,1), click box 2 → 3 marcadas → current=3
    expect(toggleBox(6, 4, 2)).toBe(3)
  })
  it('clicar na última caixa não marcada com algumas marcadas as marca todas', () => {
    // max=4, current=2 (2 marcadas: 0,1), click box 3 → 4 marcadas → current=0
    expect(toggleBox(4, 2, 3)).toBe(0)
  })
})

describe('Algoritmo de toggle de Esperança (gems)', () => {
  function toggleHope(current: number, gemIdx: number): number {
    return gemIdx < current ? gemIdx : gemIdx + 1
  }

  it('click em gem não ativa aumenta esperança', () => {
    // esperanca=2, click gem 4 (>= 2) → nova=5
    expect(toggleHope(2, 4)).toBe(5)
  })
  it('click em gem ativa reduz esperança até ela', () => {
    // esperanca=5, click gem 2 (< 5) → nova=2
    expect(toggleHope(5, 2)).toBe(2)
  })
  it('click na última gem ativa reduz em 1', () => {
    // esperanca=5, click gem 4 (< 5) → nova=4
    expect(toggleHope(5, 4)).toBe(4)
  })
  it('click na gem 5 quando esperanca=0 define 6 (máximo)', () => {
    expect(toggleHope(0, 5)).toBe(6)
  })
  it('click na gem 0 quando esperanca > 0 define 0', () => {
    expect(toggleHope(4, 0)).toBe(0)
  })
  it('click na gem 0 quando esperanca=0 define 1', () => {
    expect(toggleHope(0, 0)).toBe(1)
  })
})
