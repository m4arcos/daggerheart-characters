export type ClassKey =
  | 'bardo' | 'druida' | 'feiticeiro' | 'guardiao'
  | 'guerreiro' | 'ladino' | 'mago' | 'patrulheiro' | 'serafim';

export type EvoState = Record<string, boolean>;

export interface ExpEntry {
  nome: string;
  val: number;
}

export interface InvEntry {
  nome: string;
  qtd: number;
  desc: string;
}

export interface Character {
  id: string;
  cls: ClassKey;
  nome: string;
  heranca: string;
  genero: string;
  subclasse: string;
  nivel: number;
  prof: number;

  agi: number; for: number; acu: number;
  ins: number; pre: number; con: number;
  agiUp: boolean; forUp: boolean; acuUp: boolean;
  insUp: boolean; preUp: boolean; conUp: boolean;

  evBonus: number;
  pvMax: number;
  pfMax: number;
  armBase: number;
  dm: number;
  dG: number;

  wpNome: string; wpAttr: string; wpDados: string; wpHab: string; wpMaos: 'uma' | 'duas';
  wsNome: string; wsAttr: string; wsDados: string; wsHab: string; wsMaos: 'uma' | 'duas';

  armNome: string; armLim: string; armHab: string;

  gP: number; gB: number; gBau: number;

  wi1Nome: string; wi1Attr: string; wi1Dados: string; wi1Hab: string;
  wi1Tipo: '' | 'primaria' | 'secundaria'; wi1Maos: 'uma' | 'duas';
  wi2Nome: string; wi2Attr: string; wi2Dados: string; wi2Hab: string;
  wi2Tipo: '' | 'primaria' | 'secundaria'; wi2Maos: 'uma' | 'duas';

  notas: string;
  exps: ExpEntry[];
  inv: InvEntry[];

  pvAtual: number;
  pfAtual: number;
  esperanca: number;
  paAtual: number;

  pvTemp: number;
  pfTemp: number;
  paTemp: number;
  hopeTemp: number;

  multiEnabled: boolean;
  multiCls: ClassKey | null;
  multiDom: string | null;

  evo: { p2: EvoState; p3: EvoState; p4: EvoState };
}

export function makeDefaultCharacter(): Omit<Character, 'id'> {
  return {
    cls: '' as ClassKey,
    nome: '',
    heranca: '', genero: '', subclasse: '',
    nivel: 1, prof: 1,
    agi: 0, for: 0, acu: 0, ins: 0, pre: 0, con: 0,
    agiUp: false, forUp: false, acuUp: false, insUp: false, preUp: false, conUp: false,
    evBonus: 0, pvMax: 6, pfMax: 6, armBase: 3,
    dm: 0, dG: 0,
    wpNome: '', wpAttr: '', wpDados: '', wpHab: '', wpMaos: 'uma',
    wsNome: '', wsAttr: '', wsDados: '', wsHab: '', wsMaos: 'uma',
    armNome: '', armLim: '', armHab: '',
    gP: 0, gB: 0, gBau: 0,
    wi1Nome: '', wi1Attr: '', wi1Dados: '', wi1Hab: '', wi1Tipo: '', wi1Maos: 'uma',
    wi2Nome: '', wi2Attr: '', wi2Dados: '', wi2Hab: '', wi2Tipo: '', wi2Maos: 'uma',
    notas: '',
    exps: [{ nome: '', val: 0 }, { nome: '', val: 0 }, { nome: '', val: 0 }, { nome: '', val: 0 }, { nome: '', val: 0 }],
    inv: [],
    pvAtual: 6, pfAtual: 6, esperanca: 6, paAtual: 3,
    pvTemp: 0, pfTemp: 0, paTemp: 0, hopeTemp: 0,
    multiEnabled: false, multiCls: null, multiDom: null,
    evo: { p2: {}, p3: {}, p4: {} },
  };
}

export function tierFromLevel(nivel: number): string {
  if (nivel <= 1) return '1º Patamar';
  if (nivel <= 4) return '2º Patamar';
  if (nivel <= 7) return '3º Patamar';
  return '4º Patamar (máx.)';
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
