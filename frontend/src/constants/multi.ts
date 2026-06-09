export interface MultiData {
  nome: string;
  doms: string[];
  habs: { n: string; d: string }[];
}

export const MULTI: Record<string, MultiData> = {
  bardo: {
    nome: 'Bardo', doms: ['Graça', 'Códice'],
    habs: [{ n: 'Inspiração', d: 'Uma vez por sessão, descreva como você inspira o grupo e forneça a você e seus aliados um Dado de Inspiração. No 1º nível, seu Dado de Inspiração é d6. Um personagem pode rolar o Dado de Inspiração e somar o resultado a um teste, teste de reação ou rolagem de dano, ou para recuperar um número de PF igual ao resultado. No fim de cada sessão, Dados de Inspiração não utilizados são perdidos.\n\nNo 5º nível, seu Dado de Inspiração aumenta para d8.' }],
  },
  druida: {
    nome: 'Druida', doms: ['Sabedoria', 'Arcano'],
    habs: [
      { n: 'Forma de Fera', d: 'Marque 1 PF para se transformar magicamente em uma criatura de patamar igual ou menor que o seu na lista de Formas de Fera. Você pode sair dessa forma a qualquer momento. Enquanto estiver transformado, você não pode usar armas ou feitiços das cartas de domínio, mas feitiços conjurados antes da transformação permanecem ativos, com sua duração normal, e você ainda pode falar e usar outras habilidades. Você recebe as habilidades da Forma de Fera escolhida, soma o bônus de Evasão dela à sua Evasão e usa o atributo especificado para atacar. Enquanto na Forma de Fera, sua armadura se torna parte de seu corpo e você marca PA normalmente; quando sai, esses PA permanecem marcados. Marcar seu último PV faz com que você saia da Forma de Fera.' },
      { n: 'Dádiva da Natureza', d: 'Você pode criar à vontade efeitos sutis e inofensivos envolvendo a natureza, como fazer uma flor crescer rapidamente, invocar uma brisa ou acender uma fogueira.' },
    ],
  },
  feiticeiro: {
    nome: 'Feiticeiro', doms: ['Arcano', 'Meia-Noite'],
    habs: [
      { n: 'Sentido Arcano', d: 'Você pode sentir a presença de objetos e pessoas com magia quando estão próximos.' },
      { n: 'Ilusão Menor', d: 'Faça um teste de conjuração (10). Em um sucesso, você cria uma ilusão visual em alcance próximo. Ela não pode ultrapassar seu tamanho. Essa ilusão parece convincente a qualquer um que esteja próximo ou mais distante.' },
      { n: 'Canalizar Poder Bruto', d: 'Uma vez por descanso longo, você pode colocar uma carta de domínio de sua mão na reserva e escolher entre: Receber Pontos de Esperança igual ao nível da carta; ou Aprimorar um feitiço que cause dano, recebendo um bônus na rolagem de dano igual ao dobro do nível da carta.' },
    ],
  },
  guardiao: {
    nome: 'Guardião', doms: ['Valor', 'Lâmina'],
    habs: [{ n: 'Determinação', d: 'Uma vez por descanso longo, você pode ficar Determinado, recebendo um Dado de Determinação. No 1º nível, seu Dado de Determinação é d4; no 5º nível aumenta para d6. Coloque-o com o número 1 voltado para cima. Após cada rolagem de dano que tira 1 ou mais PV de um alvo, aumente o valor do dado em +1. Quando o dado for ultrapassar seu valor máximo, ou quando a cena acabar, encerre sua Determinação. Enquanto Determinado: você reduz a gravidade do dano físico em uma categoria; soma o valor atual do dado às rolagens de dano; não pode ser Imobilizado ou ficar Vulnerável.' }],
  },
  guerreiro: {
    nome: 'Guerreiro', doms: ['Lâmina', 'Falange'],
    habs: [
      { n: 'Ataque de Oportunidade', d: 'Se um adversário corpo a corpo tentar sair desse alcance, faça um teste de reação usando um atributo à sua escolha contra a Dificuldade dele. Em um sucesso, escolha um efeito; em um sucesso crítico, escolha dois: Ele não pode sair de onde está; Você causa dano a ele igual ao dano de sua arma principal; Você se movimenta com ele.' },
      { n: 'Treinamento de Combate', d: 'Você ignora o tipo de empunhadura de armas equipadas. Ao causar dano físico, você recebe um bônus igual ao seu nível na rolagem de dano.' },
    ],
  },
  ladino: {
    nome: 'Ladino', doms: ['Meia-Noite', 'Graça'],
    habs: [
      { n: 'Oculto', d: 'Sempre que estiver Escondido, em vez disso você fica Oculto. Além dos benefícios da condição Escondido, enquanto Oculto você permanece sem ser visto mesmo que um adversário se mova para onde normalmente o veria, desde que você fique parado. Ao concluir um movimento dentro da linha de visão de um adversário, ou ao atacar, você deixa de estar Oculto.' },
      { n: 'Ataque Furtivo', d: 'Quando acertar um ataque enquanto estiver Oculto, ou enquanto um aliado estiver corpo a corpo ao seu alvo, some um número de d6 igual ao seu patamar à rolagem de dano.\n1º nível = 1º patamar | 2º–4º nível = 2º patamar | 5º–7º nível = 3º patamar | 8º–10º nível = 4º patamar' },
    ],
  },
  mago: {
    nome: 'Mago', doms: ['Códice', 'Esplendor'],
    habs: [
      { n: 'Padrões Estranhos', d: 'Escolha um número de 1 a 12. Ao rolar esse número em um Dado do Destino, receba 1 Ponto de Esperança ou recupere 1 Ponto de Fadiga. Você pode mudar o número escolhido durante um descanso longo.' },
      { n: 'Prestidigitação', d: 'Você pode executar efeitos mágicos sutis e inofensivos à vontade. Por exemplo, você pode mudar a cor de um objeto, criar um cheiro, acender uma vela, fazer um pequeno objeto flutuar, iluminar uma sala ou consertar um objeto pequeno.' },
    ],
  },
  patrulheiro: {
    nome: 'Patrulheiro', doms: ['Falange', 'Sabedoria'],
    habs: [{ n: 'Marca da Presa', d: 'Gaste 1 Ponto de Esperança e ataque um alvo. Se acertar, cause o dano normal e Marque o alvo. Até o efeito desta habilidade acabar ou você Marcar outra criatura, receba os seguintes benefícios: você sabe precisamente em que direção ele está; quando causar dano a esse alvo, ele deve marcar 1 PF; quando erra um ataque contra ele, você pode encerrar sua Marca da Presa para rolar seus Dados de Dualidade novamente.' }],
  },
  serafim: {
    nome: 'Serafim', doms: ['Esplendor', 'Valor'],
    habs: [{ n: 'Dados de Oração', d: 'No início de cada sessão, role um número de d4 igual ao atributo de conjuração de sua subclasse — eles são seus Dados de Oração. Você pode gastar qualquer número deles para auxiliar a si mesmo ou um aliado até alcance distante: use o valor para reduzir dano sofrido, somar a uma rolagem após ela ser feita, ou receber Esperança igual ao resultado. No fim de cada sessão, Dados de Oração não utilizados são perdidos.' }],
  },
};
