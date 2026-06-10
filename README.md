# Daggerheart — Fichas de Personagem

Sistema web de fichas de personagem para o RPG **Daggerheart**, construído em React com backend Node.js e banco de dados SQLite, executado via Docker.

---

## Características

- **Gestão completa de personagens**: criação, edição e exclusão com persistência em banco de dados
- **Tela de jogo em tempo real**: tracking de PV, PF, PA e Esperança com caixas clicáveis e gems interativas
- **9 classes disponíveis**: Bardo, Druida, Feiticeiro, Guardião, Guerreiro, Ladino, Mago, Patrulheiro e Serafim
- **Sistema de Multiclasse**: seleção de classe secundária com domínios bloqueados automaticamente quando já pertencem à classe primária
- **Evolução de Personagem**: três blocos de patamar (2º, 3º, 4º) com checkboxes individuais, destacando o patamar atual
- **Inventário na sessão**: adição e remoção de itens diretamente na tela de jogo
- **Persistência de estado de sessão**: PV, PF, PA e Esperança são preservados ao editar o personagem
- **API REST**: backend com SQLite via `better-sqlite3`, dados armazenados em volume Docker persistente

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ou Docker Engine + Compose

---

## Como Usar

### Subir o ambiente

```bash
docker compose up -d
```

Aguarde os builds (na primeira vez, ~2–3 minutos). Acesse em seguida:

| Serviço | URL |
|---------|-----|
| **Aplicação** | http://localhost:3002 |
| **API** | http://localhost:3001/api/characters |

### Parar o ambiente

```bash
docker compose down
```

Os dados são persistidos no volume Docker `db-data` e sobrevivem a reinicializações.

### Remover tudo (inclusive dados)

```bash
docker compose down -v
```

---

## Desenvolvimento

Os volumes mapeiam o código-fonte diretamente nos containers, habilitando **hot reload** automático:

- Edições em `frontend/src/` são refletidas imediatamente no browser
- Edições em `backend/src/` reiniciam o servidor automaticamente via `ts-node-dev`

### Rebuild após mudanças em dependências

Se alterar `package.json`, reconstrua a imagem:

```bash
docker compose build frontend
docker compose up -d
```

---

## Testes

### Frontend

Os testes ficam em `frontend/tests/` e usam **Vitest** + **React Testing Library**.

```bash
cd frontend
npm install   # apenas na primeira vez
npm test
npm run test:watch   # modo watch
```

| Arquivo | Descrição |
|---------|-----------|
| `logic.test.ts` | Lógica pura: `tierFromLevel`, `uid`, `makeDefaultCharacter`, algoritmos de toggle (caixas e gems), cálculo de Evasão |
| `store.test.ts` | Padrões de persistência: CRUD de personagens, preservação do estado de sessão, operações compostas |
| `components.test.tsx` | Testes de componentes React: `ListScreen`, `FormScreen` e `SessionScreen` com store mockado |

### Backend

Os testes ficam em `backend/tests/` e usam **Vitest** + **supertest**. Banco de dados em memória (`:memory:`) — não afeta dados persistidos.

```bash
cd backend
npm install   # apenas na primeira vez
npm test
npm run test:watch   # modo watch
```

| Arquivo | Descrição |
|---------|-----------|
| `api.test.ts` | 22 testes de integração cobrindo todos os endpoints: GET, POST (validação), PUT (404/preservação de estado), DELETE (404/isolamento), e fluxo CRUD completo |

---

## Estrutura do Projeto

```
daggerheart-characters/
├── docker-compose.yml
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── db.ts          # Conexão SQLite e criação de tabela
│       └── index.ts       # Express: GET/POST/PUT/DELETE /api/characters
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts     # Proxy /api → backend:3001
    ├── vitest.config.ts
    ├── index.html
    ├── tests/
    │   ├── setup.ts
    │   ├── logic.test.ts
    │   ├── store.test.ts
    │   └── components.test.tsx
    └── src/
        ├── App.tsx
        ├── index.css
        ├── api.ts                  # Fetch client tipado
        ├── store/
        │   └── useCharStore.ts     # Zustand: chars[], fetchChars, saveChar, deleteChar, patchChar
        ├── screens/
        │   ├── ListScreen.tsx      # Grade de personagens
        │   ├── FormScreen.tsx      # Formulário de criação/edição
        │   └── SessionScreen.tsx   # Ficha de jogo em tempo real
        ├── components/
        │   ├── CollapsibleSection.tsx
        │   ├── Modal.tsx
        │   └── Notif.tsx
        ├── constants/
        │   ├── cls.ts              # Dados das 9 classes
        │   ├── multi.ts            # Dados de multiclasse
        │   └── evo.ts              # Opções de evolução por patamar
        └── types/
            └── character.ts        # Interface Character + helpers
```

---

## API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/characters` | Lista todos os personagens |
| `POST` | `/api/characters` | Cria um novo personagem |
| `PUT` | `/api/characters/:id` | Atualiza um personagem existente |
| `DELETE` | `/api/characters/:id` | Remove um personagem |

Os dados de cada personagem são armazenados como JSON serializado na coluna `data` da tabela `characters` no SQLite.

---

## Design System

Paleta escura inspirada no visual original do sistema:

| Variável | Valor | Uso |
|----------|-------|-----|
| `--bg` | `#12111a` | Fundo da página |
| `--surface` | `#1a1826` | Cards e painéis |
| `--accent` | `#c8aa5a` | Dourado — destaques primários |
| `--hope` | `#f5c842` | Amarelo — gems de Esperança |
| `--danger` | `#e05a5a` | Vermelho — dano e exclusão |
| `--ok` | `#4caf85` | Verde — notificações de sucesso |
