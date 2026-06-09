# CLAUDE.md — Especificação do Sistema Daggerheart Fichas

Este documento descreve completamente o sistema de fichas de personagem do jogo de RPG **Daggerheart**, implementado originalmente em `fichas.html`. Serve de referência para uma reescrita em React.

---

## 1. Visão Geral

Aplicação single-page com três telas:

| Tela | Descrição |
|------|-----------|
| **List** | Grade de personagens salvos; ponto de entrada |
| **Form** | Criação/edição de personagem (seções colapsáveis) |
| **Session** | Ficha de jogo em tempo real (tracking de PV, PF, PA, Esperança) |

**Persistência:** `localStorage` com chave `dh_chars` (array JSON de personagens).

---

## 2. Design System

### Paleta (CSS custom properties)

```css
--bg:       #0e0f13   /* fundo da página */
--surface:  #16181f   /* superfície de cards */
--surface2: #1d1f28   /* inputs, campos */
--surface3: #252836   /* hover, botões ghost */
--border:   #2e3045   /* bordas */
--text:     #e8e9f0   /* texto principal */
--text-dim: #6b7080   /* texto secundário / labels */
--accent:   #7c6af7   /* roxo principal (destaques, botões primários) */
--hope:     #f5c842   /* dourado (esperança, gems) */
--danger:   #e05a5a   /* vermelho (dano, perigo, delete) */
--ok:       #4caf85   /* verde (sucesso, notificações) */
--r:        6px       /* border-radius padrão */
```

### Tipografia
- Fonte: `'Inter', system-ui, sans-serif`
- Tamanho base: 14–15px
- Labels de campos: `.62rem`, `letter-spacing: 1px`, `text-transform: uppercase`, cor `var(--text-dim)`

### Componentes base

**Botões:**
- `.btn.btn-primary` — fundo `var(--accent)`, texto branco
- `.btn.btn-ghost` — borda `var(--border)`, fundo transparente
- `.btn.btn-danger` — fundo `var(--danger)`
- `.btn.btn-sm` — versão compacta (padding reduzido, font menor)

**Inputs/Selects:** fundo `var(--surface2)`, borda `var(--border)`, cor `var(--text)`, border-radius `var(--r)`, padding `8px 10px`

**Checkbox estilizado (`.chk-toggle`):**
```html
<label class="chk-toggle" for="campo-id">
  <input type="checkbox" id="campo-id">
  <span id="campo-id-lbl">—</span>  <!-- exibe "Sim" quando marcado, "—" desmarcado -->
</label>
```
Ao mudar o checkbox, atualiza o texto do span: `checked ? 'Sim' : '—'`.

**Seções colapsáveis (`.fsec`):**
```html
<div class="fsec">
  <div class="fsec-hdr" onclick="toggleFsec(this)">
    Título da Seção
    <span class="fsec-hdr-right">  <!-- opcional: botões de ação -->
      <button onclick="event.stopPropagation(); ação()">+ Adicionar</button>
      <span class="fsec-arrow">▼</span>
    </span>
  </div>
  <div class="fsec-body"><!-- conteúdo --></div>
</div>
```
Ao clicar no header, o `.fsec` recebe/remove `.collapsed`, que oculta `.fsec-body` e rotaciona a seta −90°.

---

## 3. Modelo de Dados do Personagem

```typescript
interface Character {
  // Identificação
  id: string               // uid: timestamp36 + random36
  cls: ClassKey            // chave em CLS (ex: 'bardo', 'druida')
  nome: string
  heranca: string          // raça/herança (ex: 'Humano')
  genero: string
  subclasse: string        // ex: 'Baluarte'

  // Progressão
  nivel: number            // 1–10
  prof: number             // proficiência: 1–6

  // Atributos base
  agi: number; for: number; acu: number
  ins: number; pre: number; con: number

  // Flags de upgrade por evolução
  agiUp: boolean; forUp: boolean; acuUp: boolean
  insUp: boolean; preUp: boolean; conUp: boolean

  // Defesa
  evBonus: number          // bônus de evasão adicional (base vem da classe)
  pvMax: number            // Pontos de Vida máximos
  pfMax: number            // Pontos de Fadiga máximos
  armBase: number          // Pontos de Armadura máximos

  // Limiares de dano (valores absolutos finais = base + nível)
  dm: number               // Limiar Menor
  dG: number               // Limiar Grave

  // Arma Principal
  wpNome: string; wpAttr: string; wpDados: string
  wpHab: string; wpMaos: 'uma' | 'duas'

  // Arma Secundária
  wsNome: string; wsAttr: string; wsDados: string
  wsHab: string; wsMaos: 'uma' | 'duas'

  // Armadura Ativa
  armNome: string; armLim: string; armHab: string

  // Ouro
  gP: number               // Punhados
  gB: number               // Bolsas
  gBau: number             // Baú

  // Armas no Inventário (2 slots)
  wi1Nome: string; wi1Attr: string; wi1Dados: string
  wi1Hab: string; wi1Tipo: '' | 'primaria' | 'secundaria'; wi1Maos: 'uma' | 'duas'
  wi2Nome: string; wi2Attr: string; wi2Dados: string
  wi2Hab: string; wi2Tipo: '' | 'primaria' | 'secundaria'; wi2Maos: 'uma' | 'duas'

  // Texto livre
  notas: string            // habilidades extras, cartas de domínio, etc.

  // Experiências (dinâmicas, mínimo 5 linhas)
  exps: Array<{ nome: string; val: number }>

  // Inventário geral
  inv: Array<{ nome: string; qtd: number; desc: string }>

  // Estado de sessão (mutável durante jogo, preservado no save)
  pvAtual: number          // PV atuais (default = pvMax)
  pfAtual: number          // PF atuais (default = pfMax)
  esperanca: number        // 0–6 (default = 6)
  paAtual: number          // PA atuais (default = armBase)

  // Valores temporários (não consomem caixas permanentes)
  pvTemp: number
  pfTemp: number
  paTemp: number
  hopeTemp: number

  // Multiclasse
  multiEnabled: boolean
  multiCls: ClassKey | null
  multiDom: string | null  // domínio escolhido

  // Evolução de personagem
  evo: {
    p2: EvoState
    p3: EvoState
    p4: EvoState
  }
}

// EvoState: chave = opt.id (ou opt.id + '_' + índice para múltiplos checks)
type EvoState = Record<string, boolean>

type ClassKey = 'bardo' | 'druida' | 'feiticeiro' | 'guardiao' |
                'guerreiro' | 'ladino' | 'mago' | 'patrulheiro' | 'serafim'
```

---

## 4. Dados das Classes (CLS)

Cada entrada tem: `nome`, `sub` (domínios), `ev` (evasão base), `ha` (habilidade de Esperança), `habs` (array de `{n, d}`).

| Chave | Nome | Domínios | Evasão base |
|-------|------|----------|-------------|
| `bardo` | Bardo | Graça & Códice | 10 |
| `druida` | Druida | Sabedoria & Arcano | 10 |
| `feiticeiro` | Feiticeiro | Arcano & Meia-Noite | 10 |
| `guardiao` | Guardião | Valor & Lâmina | 9 |
| `guerreiro` | Guerreiro | Lâmina e Falange | 11 |
| `ladino` | Ladino | Meia-Noite & Graça | 12 |
| `mago` | Mago | Códice & Esplendor | 11 |
| `patrulheiro` | Patrulheiro | Falange & Sabedoria | 12 |
| `serafim` | Serafim | Esplendor & Valor | 9 |

### Habilidades de Esperança (custo: 3 Pontos de Esperança)

| Classe | Habilidade |
|--------|-----------|
| Bardo | **Fazer uma Cena** — distrai alvo próximo, aplica –2 à Dificuldade dele |
| Druida | **Evolução** — usa Forma de Fera sem marcar PF; aumenta um atributo +1 até sair |
| Feiticeiro | **Magia Volátil** — rola novamente dados de dano mágico à escolha |
| Guardião | **Linha de Frente** — recupera 2 Pontos de Armadura |
| Guerreiro | **Sem Piedade** — +1 em testes de ataque até próximo descanso |
| Ladino | **Esquiva de Ladino** — +2 na Evasão até o próximo ataque acertar; ou até o próximo descanso |
| Mago | **Não Dessa Vez** — força adversário (distante ou mais próximo) a refazer ataque ou rolagem de dano |
| Patrulheiro | **Segurem Eles** — usa o mesmo teste de ataque contra 2 adversários adicionais no alcance |
| Serafim | **Alicerce da Vida** — recupera 1 PV de aliado próximo |

### Habilidades de Classe (por classe)

**Bardo:**
- *Inspiração* — Uma vez por sessão: todos recebem Dado de Inspiração (d6 → d8 no 5º nível) para somar a teste, reação, dano ou recuperar PF. Perde-se no fim da sessão.

**Druida:**
- *Forma de Fera* — Marque 1 PF: transforma-se em criatura de patamar ≤ o seu. Não usa armas/feitiços de domínio. Recebe habilidades, Evasão e atributo de ataque da forma. Armadura: PA permanecem marcados ao sair. Marcar último PV sai da forma.
- *Dádiva da Natureza* — Efeitos naturais sutis à vontade (crescer flor, invocar brisa, acender fogueira).

**Feiticeiro:**
- *Sentido Arcano* — Sente presença de magia em objetos/pessoas próximos.
- *Ilusão Menor* — Teste de conjuração (10): ilusão visual em alcance próximo, convincente a distância ≥ próximo.
- *Canalizar Poder Bruto* — Uma vez por descanso longo: descarta carta de domínio da mão para ganhar Esperança = nível da carta, ou bônus em dano = 2× nível da carta.

**Guardião:**
- *Determinação* — Uma vez por descanso longo: fica Determinado com dado d4 (→ d6 no 5º nível), começando em 1. Incrementa +1 após cada rolagem de dano que tire PV. Ao encerrar: reduz gravidade do dano físico em 1 categoria; soma valor do dado ao dano; imune a Imobilização e Vulnerabilidade.

**Guerreiro:**
- *Ataque de Oportunidade* — Se adversário corpo a corpo tentar sair: teste de reação vs. Dificuldade dele. Sucesso: 1 efeito. Crítico: 2. Opções: impede saída / causa dano da arma principal / move-se com ele.
- *Treinamento de Combate* — Ignora empunhadura de armas equipadas. Em dano físico, bônus = nível do personagem.

**Ladino:**
- *Oculto* — Enquanto Escondido, fica Oculto. Permanece sem ser visto mesmo que adversário se mova para onde estaria, desde que fique parado. Deixa de estar Oculto ao se mover na linha de visão de adversário, ou ao atacar.
- *Ataque Furtivo* — Quando acerta Oculto ou com aliado corpo a corpo com alvo: soma Nd6 ao dano, onde N = patamar. (1º = 1d6, 2º = 2d6, 3º = 3d6, 4º = 4d6)

**Mago:**
- *Padrões Estranhos* — Escolhe número 1–12. Ao rolar esse número no Dado do Destino: ganha 1 Esperança ou recupera 1 PF. Pode mudar no descanso longo.
- *Prestidigitação* — Efeitos mágicos inofensivos à vontade: mudar cor, cheiro, acender vela, flutuar objeto, iluminar, consertar objeto pequeno.

**Patrulheiro:**
- *Marca da Presa* — Gaste 1 Esperança e ataque. Se acertar, causa dano e Marca o alvo. Enquanto marcado: sabe direção do alvo; ao causar dano, alvo marca 1 PF; ao errar, pode encerrar a Marca para rerolar Dados de Dualidade.

**Serafim:**
- *Dados de Oração* — No início de cada sessão: rola Nd4 (N = atributo de conjuração da subclasse) = Dados de Oração. Gasta qualquer quantidade para aliado até distante: reduz dano sofrido / soma a rolagem / recebe Esperança = resultado. Perdem-se no fim da sessão.

---

## 5. Dados de Multiclasse (MULTI)

Estrutura idêntica à CLS, com `doms` (array de 2 domínios) e `habs` (habilidades de multiclasse). Habilidades são ligeiramente mais detalhadas que as de classe primária.

| Chave | Domínios |
|-------|----------|
| bardo | Graça, Códice |
| druida | Sabedoria, Arcano |
| feiticeiro | Arcano, Meia-Noite |
| guardiao | Valor, Lâmina |
| guerreiro | Lâmina, Falange |
| ladino | Meia-Noite, Graça |
| mago | Códice, Esplendor |
| patrulheiro | Falange, Sabedoria |
| serafim | Esplendor, Valor |

### Regras de Multiclasse
1. Habilitar via checkbox "Habilitar multiclasse para este personagem".
2. Escolher classe adicional (não pode ser a mesma que a classe principal).
3. Escolher domínio da nova classe — **domínios já pertencentes à classe principal ficam bloqueados** (desabilitados com tooltip explicativo).
4. Ao salvar, `multiEnabled`, `multiCls`, `multiDom` são persistidos.
5. Na sessão: exibe bloco "Multiclasse — NomeClasse · Domínio" com as habilidades de multiclasse.

---

## 6. Sistema de Patamares

```
Nível 1       → 1º Patamar
Níveis 2–4    → 2º Patamar
Níveis 5–7    → 3º Patamar
Níveis 8–10   → 4º Patamar (máximo)
```

Calculado na hora: `const n = c.nivel || 1; if (n <= 1) return '1º Patamar'; if (n <= 4) return '2º Patamar'; if (n <= 7) return '3º Patamar'; return '4º Patamar (máx.)';`

Exibido no header da ficha de sessão ao lado do nível, separados por `·`.

---

## 7. Sistema de Evolução de Personagem (EVO_OPTS)

Três blocos de opções, um por patamar (2º, 3º, 4º). O bloco do patamar atual (baseado no `nivel` do personagem) recebe destaque visual ("★ Patamar Atual").

### 2º Patamar (Níveis 2–4)

**Instrução ao entrar:** "Ao subir para o nível 2: crie uma nova Experiência +2 e aumente sua Proficiência em +1."

**Instrução de escolha:** "Escolha 2 opções abaixo (você pode escolher a mesma opção duas vezes):"

| id | Label | Checks |
|----|-------|--------|
| `atrib` | Marcar 2 atributos diferentes +1 (não marcados anteriormente) | 3 |
| `pv` | Aumentar PV máximo permanentemente em +1 | 2 |
| `pf` | Aumentar PF máximo permanentemente em +1 | 2 |
| `exp` | Aumentar +1 em duas Experiências existentes | 1 |
| `dom` | Pegar nova carta de domínio (máx. nível 4) | 1 |
| `eva` | Aumentar Evasão permanentemente em +1 | 1 |

**Rodapé:** "Atualize seu nível, ajuste os limiares de dano e pegue uma nova carta de domínio."

### 3º Patamar (Níveis 5–7)

**Instrução ao entrar:** "Ao subir para o nível 5: crie uma nova Experiência +2, remova todas as marcações de atributos e aumente sua Proficiência em +1."

**Instrução de escolha:** "Escolha 2 opções abaixo (ou qualquer opção de patamares anteriores):"

Todas as opções do 2º Patamar, mais:

| id | Label | Checks |
|----|-------|--------|
| `dom` | Pegar nova carta de domínio *(sem restrição de nível)* | 1 |
| `sub` | Melhorar carta de subclasse | 1 |
| `prof` | Aumentar Proficiência em +1. (Custo: 2 marcações simultâneas) | 2 |
| `multi` | Multiclasse (escolha classe adicional — exclui "Melhorar subclasse" e outra opção de multiclasse). (Custo: 2 marcações simultâneas) | 2 |

### 4º Patamar (Níveis 8–10)

**Instrução ao entrar:** "Ao subir para o nível 8: crie uma nova Experiência +2, remova todas as marcações de atributos e aumente sua Proficiência em +1."

**Instrução de escolha:** "Escolha 2 opções abaixo (ou qualquer opção de patamares anteriores):"

Idêntico ao 3º Patamar (a diferença de `dom` sem restrição de nível já se aplica).

### Armazenamento dos Estados de Evolução

Para opções com `checks = 1`: `evo[tier][opt.id] = boolean`

Para opções com `checks > 1`: `evo[tier][opt.id + '_' + index] = boolean` para cada índice `0..checks-1`

Exemplo para `atrib` (checks=3):
```js
evo.p2.atrib_0 = true
evo.p2.atrib_1 = false
evo.p2.atrib_2 = true
```

---

## 8. Sistema de Dano e Limiares

Dois valores (`dm` = Limiar Menor, `dG` = Limiar Grave) geram três categorias:

```
Dano ≤ dm    → Dano Menor  → Marque 1 PV
dm < Dano ≤ dG → Dano Maior  → Marque 2 PV
Dano > dG    → Dano Grave  → Marque 3 PV
```

Exibido como fluxo linear na sessão: `[Dano Menor] → dm → [Dano Maior] → dG → [Dano Grave]`

**Nota ao usuário:** "Some seu nível atual aos limiares base para obter os valores finais."

---

## 9. Cálculo de Evasão

```js
const ev = CLS[c.cls].ev + (c.evBonus || 0)
```

- Evasão base vem da classe (campo `ev` em CLS)
- Bônus adicional é editável pelo usuário no formulário
- Resultado exibido na sessão como valor estático

---

## 10. Proficiência

- Número inteiro 1–6
- Exibido na sessão como barra de 6 caixinhas (`.pbox`), preenchidas até o valor de `prof`
- Adicionado a rolagens de ataque: na exibição de arma, aparece `| Prof +N`

---

## 11. Atributos

Os 6 atributos (Agilidade, Força, Acuidade, Instinto, Presença, Conhecimento) são valores numéricos relativos (podem ser negativos).

Cada atributo tem uma flag `Up` (booleano) indicando se foi evoluído. Na exibição (`.abox`), o box recebe classe `.upgraded` se `Up = true`.

**Exibição do valor:** Prefixado com `+` se ≥ 0; cor verde se positivo, vermelho se negativo, cinza se zero.

---

## 12. Tela de Lista (List Screen)

- Header com nome do app ("Daggerheart"), subtítulo, contagem de personagens, botão "+ Novo Personagem"
- Grade de cards (`char-card`), cada um exibindo:
  - Linha superior: `NomeClasse — Nível N`
  - Nome do personagem (grande)
  - `Herança · Subclasse`
  - Stats: `PVatual/PVmax PV`, `PFatual/PFmax PF`, `Esperanca/6 ✦`
  - Ações: `▶ Ver Ficha`, `✏ Editar`, `🗑` (delete com modal de confirmação)
- Estado vazio: mensagem encorajando criar o primeiro personagem

---

## 13. Tela de Formulário (Form Screen)

Seções colapsáveis na ordem:

1. **Classe** — grade de seleção (click = seleciona; autofill Evasão base)
2. **Identidade** — Nome, Herança, Gênero, Subclasse, Nível (1–10), Proficiência (1–6)
   - Mudar Nível re-renderiza seção de Evolução preservando estado dos checkboxes
3. **Atributos** — Agi, For, Acu, Ins, Pre, Con (números); + linha de checkboxes "↑ Evoluído" para cada um; + Evasão base (readonly, preenchida pela classe), Evasão bônus, PV Máximo, PF Máximo
4. **Saúde & Limiares de Dano** — Limiar Menor, Limiar Grave
5. **Armas Ativas** — Principal e Secundária: Nome, Atributo & Alcance, Dados & Tipo, Empunhadura (uma/duas mãos), Habilidade (textarea)
6. **Armadura Ativa** — Nome, Limiares Base (texto), Armadura Base (PA máx), Habilidade (textarea)
7. **Experiências** — Lista dinâmica; 5 linhas padrão + botão "+ Experiência" (linhas extras têm botão ✕ e estrela ★); cada linha: Nome + Modificador (número)
8. **Ouro** — Punhados, Bolsas, Baú
9. **Inventário** — Lista dinâmica de items: Nome, Quantidade, Descrição; botão "+ Item"; linhas removíveis
10. **Armas no Inventário** — 2 slots de arma (mesma estrutura das armas ativas + campo Tipo: primária/secundária)
11. **Habilidades de Classe Adicionais / Notas** — textarea livre
12. **Multiclasse** — Toggle enable; grade de classes (exceto classe primária); grade de domínios (exceto os da classe primária); preview das habilidades de multiclasse
13. **Evolução de Personagem** — Renderizado dinamicamente com base no nível atual

**Ações:** Cancelar (volta para lista) | 💾 Salvar Personagem (valida classe + nome; persiste no localStorage)

### Validações no save
- Deve ter classe selecionada
- Nome não pode estar vazio
- Estado de sessão preservado na edição (pvAtual, pfAtual, esperanca, paAtual são mantidos do save anterior)
- Novo personagem: pvAtual = pvMax, pfAtual = pfMax, esperanca = 6, paAtual = armBase

---

## 14. Tela de Sessão (Session Screen)

Layout de duas colunas (esquerda e direita).

### Coluna Esquerda

**Header do personagem:**
- Nome (grande)
- Classe · Subclasse
- Nível N · Xº Patamar
- Herança · Gênero
- Se multiclasse: `✦ Multiclasse: NomeClasse · Domínio`
- Botão `✏ Editar` no canto superior direito

**Card Saúde & Dano:**
- Nota: "Some seu nível atual aos seus limiares de dano."
- Fluxo de dano: `[Dano Menor | Marque 1 PV] → dm → [Dano Maior | Marque 2 PV] → dG → [Dano Grave | Marque 3 PV]`
- Barra de PV: label com `pvAtual/pvMax`, caixas clicáveis (click toggle marca/desmarca)
- Campo PV Temporário (number input, persiste)
- Barra de PF: idem
- Campo PF Temporário

**Card Esperança:**
- 6 gems (✦) clicáveis; gem `i` ativa se `i < esperanca`
- Click em gem `i`: se `i < esperanca` → seta `esperanca = i`; se `i >= esperanca` → seta `esperanca = i + 1`
- Campo Esperança Temporária
- Texto da habilidade de Esperança da classe (`.hope-ab`)

**Card Atributos:**
- 6 boxes com label, valor (+N ou -N) e cor; borda especial se `Up = true`

**Card Experiências** (só exibido se `exps.length > 0`):
- Lista: Nome · Modificador (+N)

**Card Ouro:**
- Punhados, Bolsas, Baú — editáveis inline (onchange persiste)

### Coluna Direita

**Card Evasão & Armadura:**
- Evasão total: `CLS[cls].ev + evBonus`
- Proficiência: 6 caixas visuais, preenchidas até `prof`

**Card Armas Ativas:**
- Principal e Secundária (se tiver nome): Nome, Atributo, Dados, Empunhadura, `| Prof +N`, Habilidade

**Card Armadura Ativa:**
- Nome, Limiares (texto), Habilidade
- Se `armBase > 0`: barra de PA com caixas clicáveis + campo PA Temporário

**Card Inventário:**
- Lista de itens: Nome, Descrição (se houver), campo Quantidade (editável), botão ✕
- Armas do inventário (wi1, wi2) exibidas como cards de arma com tipo
- Formulário inline para adicionar item em sessão: Nome, Quantidade, Descrição, botão "+ Adicionar Item"

**Card Habilidades de Classe:**
- Todas as `habs` da classe: Nome da habilidade (bold) + descrição
- Se `notas` não vazio: separador + notas em pre-wrap
- Se multiclasse habilitado: card extra "Multiclasse — NomeClasse · Domínio" com habilidades de multiclasse

### Interatividade da Sessão

**Toggle de caixas (PV, PF, PA):**
```
boxes renderizadas com 'marked' primeiras marcadas (= max - atual)
click em caixa i:
  se i < marked → newMarked = i      (desmarca até i)
  se i >= marked → newMarked = i + 1 (marca até i inclusive)
atual = max - newMarked
```

**Toggle de Esperança (gems):**
```
click em gem i:
  se i < esperanca → esperanca = i      (reduz)
  se i >= esperanca → esperanca = i + 1 (aumenta)
```

Após qualquer alteração: `save()` + `refreshSession(c)` (atualiza apenas os elementos DOM afetados sem re-renderizar tudo).

---

## 15. Navegação

```
showScreen(name)   → ativa tela, atualiza subtítulo e botão Voltar
goHome()           → showScreen('list') + renderList()
showForm(id?)      → preenche formulário (editar) ou limpa (novo) + showScreen('form')
showSession(id)    → renderSession(c) + showScreen('session')
```

Botão Voltar (`btn-back`) fica visível em todas as telas exceto 'list'.

---

## 16. Modal de Confirmação

```html
<div class="modal-ov" id="modal">  <!-- overlay -->
  <div class="modal">
    <h3 id="modal-title">Confirmar</h3>
    <p id="modal-msg">Tem certeza?</p>
    <div class="modal-acts">
      <button onclick="closeModal()">Cancelar</button>
      <button id="modal-ok" class="btn-danger">Excluir</button>
    </div>
  </div>
</div>
```

Usado exclusivamente para confirmação de exclusão de personagem. `modal-ok.onclick` é setado dinamicamente com a callback de delete.

---

## 17. Notificações

Toast leve criado dinamicamente:
```js
function showNotif(msg) {
  const n = document.createElement('div')
  n.className = 'notif'
  n.textContent = msg
  document.body.appendChild(n)
  setTimeout(() => n.remove(), 2600)
}
```

Posicionado canto inferior central, cor `var(--ok)`.

---

## 18. Utilitários

```js
function uid()  // gera id único: Date.now().toString(36) + Math.random().toString(36).slice(2)
function esc(s) // escapa HTML: &, <, >, "
function v(id)  // atalho: document.getElementById(id)?.value || ''
function save() // persiste chars no localStorage
function getChar(id) // busca personagem por id no array
```

---

## 19. Regras de Negócio Resumidas

1. **Evasão** = `CLS[cls].ev + evBonus` (não inclui atributos)
2. **Patamar** depende apenas do nível: 1→P1, 2-4→P2, 5-7→P3, 8-10→P4
3. **Limiares de dano**: o usuário insere os valores finais (já somados com o nível)
4. **Esperança** máxima: 6 gems; mínima: 0
5. **Multiclasse**: domínios bloqueados se já pertencerem à classe principal
6. **Evolução**: o bloco do patamar atual recebe destaque; opções com `checks > 1` armazenam cada checkbox individualmente (`id_0`, `id_1`, ...)
7. **Experiências**: mínimo 5 linhas; linhas 6+ são marcadas com ★ e removíveis
8. **Inventário da sessão**: itens podem ser adicionados/removidos/atualizados (quantidade) sem ir ao formulário de edição
9. **Estado de sessão** (pvAtual, pfAtual, esperanca, paAtual) é **preservado** ao editar o personagem — nunca sobrescrito pelo formulário de edição, exceto na criação de um novo personagem
10. **Proficiência**: exibida como barra de 6 caixas visuais; valor numérico usado como bônus (`+prof`) nas armas

---

## 20. Estrutura React Sugerida

```
src/
  constants/
    cls.ts         # CLS constant com todas as classes
    multi.ts       # MULTI constant
    evo.ts         # EVO_OPTS constant
  types/
    character.ts   # interface Character + tipos auxiliares
  store/
    useCharStore.ts  # zustand/context com chars[], save(), CRUD
  screens/
    ListScreen.tsx
    FormScreen.tsx
    SessionScreen.tsx
  components/
    # Form
    ClassGrid.tsx
    AttributeSection.tsx
    WeaponFields.tsx
    ExperienceRows.tsx
    InventoryRows.tsx
    MulticlassSection.tsx
    EvoSection.tsx
    CollapsibleSection.tsx
    # Session
    DamageFlow.tsx
    TrackBoxes.tsx       # reutilizável para PV, PF, PA
    HopeGems.tsx
    AttrDisplay.tsx
    WeaponDisplay.tsx
    # Shared
    ChkToggle.tsx
    Modal.tsx
    Notif.tsx
```

---

---

## 21. Workflow de Desenvolvimento (OBRIGATÓRIO)

Estas regras se aplicam a **toda** alteração de código feita neste projeto. Seguir este workflow é mandatório.

### Após qualquer alteração em `frontend/src/` ou `frontend/tests/`

1. **Execute os testes** antes de reportar a tarefa como concluída:
   ```bash
   cd frontend && npm test
   ```
   - Todos os 102 testes devem passar.
   - Se algum teste falhar: corrija o código **ou** atualize o teste para refletir o novo comportamento esperado. Nunca entregue com testes quebrando.
   - Se a mudança adiciona comportamento novo: **crie testes** para cobri-lo antes de concluir.

2. **Atualize o README.md** quando qualquer um dos seguintes mudar:
   - Uma feature nova for adicionada (nova tela, novo campo, novo comportamento)
   - A API REST mudar (endpoints, formato de request/response)
   - A estrutura do projeto mudar (novos diretórios, scripts, configurações)
   - As instruções de uso ou de desenvolvimento mudarem

3. **Atualize o CLAUDE.md** quando qualquer um dos seguintes mudar:
   - Uma regra de negócio do jogo Daggerheart mudar (cálculos, limiares, etc.)
   - A estrutura do modelo de dados (`Character`) mudar
   - Uma classe, habilidade ou mecânica de jogo for adicionada ou alterada
   - O comportamento de uma tela (List, Form, Session) mudar de forma relevante

### Após qualquer alteração em `backend/src/` ou `backend/tests/`

1. **Execute os testes do backend** antes de reportar a tarefa como concluída:
   ```bash
   cd backend && npm test
   ```
   - Todos os 22 testes devem passar.
   - O banco de dados de teste é em memória (`:memory:`) — não afeta dados persistidos.
   - Se adicionar endpoint novo ou alterar comportamento de um existente: **crie ou atualize os testes**.

2. Execute `docker compose up -d` para reiniciar o backend com as mudanças.
3. Atualize o README.md se a API mudou (endpoints, formato, validações).

### Ordem de execução ao implementar uma feature

```
1. Escrever/alterar o código (frontend e/ou backend)
2. Criar ou atualizar os testes correspondentes
3. Rodar: cd frontend && npm test   (todos devem passar)
4. Rodar: cd backend && npm test    (todos devem passar)
5. Atualizar README.md se necessário
6. Atualizar CLAUDE.md se necessário
```

### Hook automático

O arquivo `.claude/settings.json` configura um hook `PostToolUse` que executa `scripts/on-change.sh` automaticamente após cada `Edit` ou `Write`. O script:
- Roda `npm test` no frontend quando arquivos em `frontend/src/` ou `frontend/tests/` são alterados
- Roda `npm test` no backend quando arquivos em `backend/src/` ou `backend/tests/` são alterados
- Exibe um lembrete de documentação quando telas, store, tipos ou rotas são modificados

Se o hook reportar falhas de teste, corrija-as antes de prosseguir.

---

*Documento gerado a partir do código-fonte de `fichas.html` — use como spec completa para a reescrita em React.*
