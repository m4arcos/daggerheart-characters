export interface ClassAbility { n: string; d: string }

export interface ClassData {
  nome: string;
  sub: string;
  ev: number;
  ha: string;
  habs: ClassAbility[];
}

export const CLS: Record<string, ClassData> = {
  bardo: {
    nome: 'Bardo', sub: 'Graça & Códice', ev: 10,
    ha: 'Fazer uma Cena: gaste 3 Pontos de Esperança para distrair temporariamente um alvo próximo, aplicando uma penalidade de –2 à Dificuldade dele.',
    habs: [{ n: 'Inspiração', d: 'Uma vez por sessão, descreva como você inspira o grupo e forneça a você e seus aliados um Dado de Inspiração. No 1º nível, seu Dado de Inspiração é d6. Um personagem pode rolar o Dado de Inspiração e somar o resultado a um teste, teste de reação ou rolagem de dano, ou para recuperar um número de PF igual ao resultado. No fim de cada sessão, Dados de Inspiração não utilizados são perdidos.\n\nNo 5º nível, seu Dado de Inspiração aumenta para d8.' }],
  },
  druida: {
    nome: 'Druida', sub: 'Sabedoria & Arcano', ev: 10,
    ha: 'Evolução: gaste 3 Pontos de Esperança para usar Forma de Fera sem marcar Pontos de Fadiga. Ao fazer isso, aumente um atributo em +1 até sair da Forma de Fera.',
    habs: [
      { n: 'Forma de Fera', d: 'Marque 1 PF para se transformar magicamente em uma criatura de patamar igual ou menor que o seu na lista de Formas de Fera. Você pode sair dessa forma a qualquer momento. Enquanto estiver transformado, você não pode usar armas ou feitiços das cartas de domínio, mas feitiços conjurados antes da transformação permanecem ativos. Você recebe as habilidades da Forma de Fera escolhida, soma o bônus de Evasão dela à sua Evasão e usa o atributo especificado para atacar.' },
      { n: 'Dádiva da Natureza', d: 'Você pode criar à vontade efeitos sutis e inofensivos envolvendo a natureza, como fazer uma flor crescer rapidamente, invocar uma brisa ou acender uma fogueira.' },
    ],
  },
  feiticeiro: {
    nome: 'Feiticeiro', sub: 'Arcano & Meia-Noite', ev: 10,
    ha: 'Magia Volátil: gaste 3 Pontos de Esperança para rolar novamente uma quantidade qualquer de dados de dano em um ataque que causa dano mágico.',
    habs: [
      { n: 'Sentido Arcano', d: 'Você pode sentir a presença de objetos e pessoas com magia quando estão próximos.' },
      { n: 'Ilusão Menor', d: 'Faça um teste de conjuração (10). Em um sucesso, você cria uma ilusão visual em alcance próximo que parece convincente a qualquer um que esteja próximo ou mais distante.' },
      { n: 'Canalizar Poder Bruto', d: 'Uma vez por descanso longo, você pode colocar uma carta de domínio de sua mão na reserva e escolher entre: Receber Pontos de Esperança igual ao nível da carta; ou Aprimorar um feitiço que cause dano, recebendo um bônus na rolagem de dano igual ao dobro do nível da carta.' },
    ],
  },
  guardiao: {
    nome: 'Guardião', sub: 'Valor & Lâmina', ev: 9,
    ha: 'Linha de Frente: gaste 3 Pontos de Esperança para recuperar 2 Pontos de Armadura.',
    habs: [{ n: 'Determinação', d: 'Uma vez por descanso longo, você pode ficar Determinado, recebendo um Dado de Determinação (d4 no 1º nível, d6 no 5º). Após cada rolagem de dano que tira PV de um alvo, aumente o dado em +1. Enquanto Determinado: reduz a gravidade do dano físico em uma categoria; soma o valor do dado às rolagens de dano; não pode ser Imobilizado ou ficar Vulnerável.' }],
  },
  guerreiro: {
    nome: 'Guerreiro', sub: 'Lâmina e Falange', ev: 11,
    ha: 'Sem Piedade: gaste 3 Pontos de Esperança para receber um bônus de +1 em testes de ataque até seu próximo descanso.',
    habs: [
      { n: 'Ataque de Oportunidade', d: 'Se um adversário corpo a corpo tentar sair desse alcance, faça um teste de reação usando um atributo à sua escolha contra a Dificuldade dele. Em um sucesso, escolha um efeito; em um sucesso crítico, escolha dois: Ele não pode sair de onde está; Você causa dano igual ao dano de sua arma principal; Você se movimenta com ele.' },
      { n: 'Treinamento de Combate', d: 'Você ignora o tipo de empunhadura de armas equipadas. Ao causar dano físico, você recebe um bônus igual ao seu nível na rolagem de dano.' },
    ],
  },
  ladino: {
    nome: 'Ladino', sub: 'Meia-Noite & Graça', ev: 12,
    ha: 'Esquiva de Ladino: gaste 3 Pontos de Esperança para receber um bônus de +2 na Evasão até o próximo ataque que acertar você. Caso contrário, esse bônus dura até seu próximo descanso.',
    habs: [
      { n: 'Oculto', d: 'Sempre que estiver Escondido, em vez disso você fica Oculto. Enquanto Oculto, você permanece sem ser visto mesmo que um adversário se mova para onde normalmente o veria, desde que você fique parado. Ao concluir um movimento na linha de visão de um adversário, ou ao atacar, você deixa de estar Oculto.' },
      { n: 'Ataque Furtivo', d: 'Quando acertar um ataque enquanto estiver Oculto, ou enquanto um aliado estiver corpo a corpo ao seu alvo, some um número de d6 igual ao seu patamar à rolagem de dano.\n1º nível = 1º patamar | 2º–4º nível = 2º patamar | 5º–7º nível = 3º patamar | 8º–10º nível = 4º patamar' },
    ],
  },
  mago: {
    nome: 'Mago', sub: 'Códice & Esplendor', ev: 11,
    ha: 'Não Dessa Vez: gaste 3 Pontos de Esperança para forçar um adversário distante ou mais próximo a refazer um teste de ataque ou uma rolagem de dano.',
    habs: [
      { n: 'Padrões Estranhos', d: 'Escolha um número de 1 a 12. Ao rolar esse número em um Dado do Destino, receba 1 Ponto de Esperança ou recupere 1 Ponto de Fadiga. Você pode mudar o número durante um descanso longo.' },
      { n: 'Prestidigitação', d: 'Você pode executar efeitos mágicos sutis e inofensivos à vontade: mudar a cor de um objeto, criar um cheiro, acender uma vela, fazer um pequeno objeto flutuar, iluminar uma sala ou consertar um objeto pequeno.' },
    ],
  },
  patrulheiro: {
    nome: 'Patrulheiro', sub: 'Falange & Sabedoria', ev: 12,
    ha: 'Segurem Eles: quando acerta um ataque com uma arma, você pode gastar 3 Pontos de Esperança para usar o mesmo teste contra dois adversários adicionais no alcance.',
    habs: [{ n: 'Marca da Presa', d: 'Gaste 1 Ponto de Esperança e ataque um alvo. Se acertar, cause dano normal e Marque o alvo. Enquanto marcado, você: sabe precisamente em que direção ele está; quando causar dano a esse alvo, ele deve marcar 1 PF; quando erra um ataque, você pode encerrar sua Marca da Presa para rolar seus Dados de Dualidade novamente.' }],
  },
  serafim: {
    nome: 'Serafim', sub: 'Esplendor & Valor', ev: 9,
    ha: 'Alicerce da Vida: gaste 3 Pontos de Esperança para recuperar 1 Ponto de Vida de um aliado próximo.',
    habs: [{ n: 'Dados de Oração', d: 'No início de cada sessão, role um número de d4 igual ao atributo de conjuração de sua subclasse — eles são seus Dados de Oração. Você pode gastar qualquer número deles para auxiliar a si mesmo ou um aliado até alcance distante: use o valor para reduzir dano sofrido, somar a uma rolagem, ou receber Esperança igual ao resultado. No fim de cada sessão, Dados de Oração não utilizados são perdidos.' }],
  },
};
