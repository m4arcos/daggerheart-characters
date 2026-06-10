export type DomainKey =
  | 'arcano' | 'lamina' | 'falange' | 'codice' | 'graca'
  | 'meia-noite' | 'sabedoria' | 'esplendor' | 'valor'

export type CardTipo = 'subclasse' | 'dominio' | 'ancestralidade' | 'comunidade'
export type NivelSubclasse = 'Fundamental' | 'Especialização' | 'Maestria'
export type TipoCartaDominio = 'Feitiço' | 'Talento' | 'Grimório'

export interface Card {
  id: number
  num: number
  tipo: CardTipo
  nome: string
  descricao: string
  dominio_key: DomainKey | null
  subclasse_nome: string | null
  classe: string | null
  nome_classe: string | null
  nivel_subclasse: NivelSubclasse | null
  atributo_conjuracao: string | null
  nivel_dominio: number | null
  custo: number | null
  card_tipo: TipoCartaDominio | null
}

export const DOMAIN_LABELS: Record<DomainKey, string> = {
  arcano: 'Arcano',
  lamina: 'Lâmina',
  falange: 'Falange',
  codice: 'Códice',
  graca: 'Graça',
  'meia-noite': 'Meia-Noite',
  sabedoria: 'Sabedoria',
  esplendor: 'Esplendor',
  valor: 'Valor',
}

export const DOMAIN_KEYS: DomainKey[] = [
  'arcano', 'lamina', 'falange', 'codice', 'graca',
  'meia-noite', 'sabedoria', 'esplendor', 'valor',
]

export const CLASS_LABELS: Record<string, string> = {
  bardo: 'Bardo',
  druida: 'Druida',
  feiticeiro: 'Feiticeiro',
  guardiao: 'Guardião',
  guerreiro: 'Guerreiro',
  ladino: 'Ladino',
  mago: 'Mago',
  patrulheiro: 'Patrulheiro',
  serafim: 'Serafim',
}

export const CLASS_KEYS = [
  'bardo', 'druida', 'feiticeiro', 'guardiao',
  'guerreiro', 'ladino', 'mago', 'patrulheiro', 'serafim',
]

export const CARD_TIPO_LABELS: TipoCartaDominio[] = ['Feitiço', 'Talento', 'Grimório']

export const DOMAIN_NAME_TO_KEY: Record<string, DomainKey> = Object.fromEntries(
  Object.entries(DOMAIN_LABELS).map(([k, v]) => [v, k as DomainKey])
) as Record<string, DomainKey>;

export interface CardsFilter {
  tipo?: string
  dominio_key?: string
  q?: string
  card_tipo?: string
  classe?: string
}
