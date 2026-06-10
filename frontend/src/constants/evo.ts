export interface EvoOpt {
  id: string;
  label: string;
  checks: number;
}

export interface EvoTier {
  key: 'p2' | 'p3' | 'p4';
  label: string;
  range: string;
  note: string;
  inst: string;
  footer: string;
  opts: EvoOpt[];
}

const BASE_OPTS: EvoOpt[] = [
  { id: 'atrib', label: 'Marcar 2 atributos diferentes +1 (não marcados anteriormente)', checks: 3 },
  { id: 'pv',    label: 'Aumentar PV máximo permanentemente em +1', checks: 2 },
  { id: 'pf',    label: 'Aumentar PF máximo permanentemente em +1', checks: 2 },
  { id: 'exp',   label: 'Aumentar +1 em duas Experiências existentes', checks: 1 },
  { id: 'dom',   label: 'Pegar nova carta de domínio (máx. nível 4)', checks: 1 },
  { id: 'eva',   label: 'Aumentar Evasão permanentemente em +1', checks: 1 },
];

const UPPER_OPTS: EvoOpt[] = [
  { id: 'atrib', label: 'Marcar 2 atributos diferentes +1 (não marcados anteriormente)', checks: 3 },
  { id: 'pv',    label: 'Aumentar PV máximo permanentemente em +1', checks: 2 },
  { id: 'pf',    label: 'Aumentar PF máximo permanentemente em +1', checks: 2 },
  { id: 'exp',   label: 'Aumentar +1 em duas Experiências existentes', checks: 1 },
  { id: 'dom',   label: 'Pegar nova carta de domínio', checks: 1 },
  { id: 'eva',   label: 'Aumentar Evasão permanentemente em +1', checks: 1 },
  { id: 'sub',   label: 'Melhorar carta de subclasse', checks: 1 },
  { id: 'prof',  label: 'Aumentar Proficiência em +1. (Custo: 2 marcações simultâneas)', checks: 2 },
  { id: 'multi', label: 'Multiclasse (escolha classe adicional — exclui "Melhorar subclasse" e outra opção de multiclasse). (Custo: 2 marcações simultâneas)', checks: 2 },
];

const FOOTER = 'Atualize seu nível, ajuste os limiares de dano e pegue uma nova carta de domínio.';

export const EVO_TIERS: EvoTier[] = [
  {
    key: 'p2', label: '2º Patamar', range: 'Níveis 2–4',
    note: 'Ao subir para o nível 2: crie uma nova Experiência +2 e aumente sua Proficiência em +1.',
    inst: 'Escolha 2 opções abaixo (você pode escolher a mesma opção duas vezes):',
    footer: FOOTER,
    opts: BASE_OPTS,
  },
  {
    key: 'p3', label: '3º Patamar', range: 'Níveis 5–7',
    note: 'Ao subir para o nível 5: crie uma nova Experiência +2, remova todas as marcações de atributos e aumente sua Proficiência em +1.',
    inst: 'Escolha 2 opções abaixo (ou qualquer opção de patamares anteriores):',
    footer: FOOTER,
    opts: UPPER_OPTS,
  },
  {
    key: 'p4', label: '4º Patamar', range: 'Níveis 8–10',
    note: 'Ao subir para o nível 8: crie uma nova Experiência +2, remova todas as marcações de atributos e aumente sua Proficiência em +1.',
    inst: 'Escolha 2 opções abaixo (ou qualquer opção de patamares anteriores):',
    footer: FOOTER,
    opts: UPPER_OPTS,
  },
];

export const TIER_RANGES: Record<string, [number, number]> = {
  p2: [2, 4], p3: [5, 7], p4: [8, 10],
};
