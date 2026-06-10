import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import db from '../src/db';

// Personagem base mínimo válido
const CHAR_A = {
  id: 'char-a',
  cls: 'guerreiro',
  nome: 'Thorin',
  nivel: 3,
  pvMax: 8,
  pfMax: 6,
  pvAtual: 8,
  pfAtual: 6,
  esperanca: 6,
};

const CHAR_B = {
  id: 'char-b',
  cls: 'mago',
  nome: 'Gandalf',
  nivel: 7,
  pvMax: 5,
  pfMax: 8,
  pvAtual: 5,
  pfAtual: 8,
  esperanca: 4,
};

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/characters
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /api/characters', () => {
  it('retorna 200 com array vazio quando não há personagens', async () => {
    const res = await request(app).get('/api/characters');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retorna personagem criado', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    const res = await request(app).get('/api/characters');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('char-a');
    expect(res.body[0].nome).toBe('Thorin');
  });

  it('retorna múltiplos personagens em ordem de criação', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    await request(app).post('/api/characters').send(CHAR_B);
    const res = await request(app).get('/api/characters');
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe('char-a');
    expect(res.body[1].id).toBe('char-b');
  });

  it('preserva todos os campos do personagem', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    const res = await request(app).get('/api/characters');
    const char = res.body[0];
    expect(char.cls).toBe('guerreiro');
    expect(char.nivel).toBe(3);
    expect(char.pvMax).toBe(8);
    expect(char.esperanca).toBe(6);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/characters
// ──────────────────────────────────────────────────────────────────────────────

describe('POST /api/characters', () => {
  it('cria personagem e retorna 201', async () => {
    const res = await request(app).post('/api/characters').send(CHAR_A);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('char-a');
    expect(res.body.nome).toBe('Thorin');
  });

  it('retorna 400 quando id está ausente', async () => {
    const res = await request(app)
      .post('/api/characters')
      .send({ nome: 'Sem ID' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/id/i);
  });

  it('retorna 400 quando nome está ausente', async () => {
    const res = await request(app)
      .post('/api/characters')
      .send({ id: 'x1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nome/i);
  });

  it('retorna 400 quando body está vazio', async () => {
    const res = await request(app).post('/api/characters').send({});
    expect(res.status).toBe(400);
  });

  it('retorna erro ao tentar criar personagem com id duplicado', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    const res = await request(app).post('/api/characters').send(CHAR_A);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('personagem aparece no GET após criação', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    const listRes = await request(app).get('/api/characters');
    expect(listRes.body.some((c: { id: string }) => c.id === 'char-a')).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/characters/:id
// ──────────────────────────────────────────────────────────────────────────────

describe('PUT /api/characters/:id', () => {
  it('atualiza personagem existente e retorna 200', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    const updated = { ...CHAR_A, nome: 'Thorin Oakenshield', pvAtual: 5 };
    const res = await request(app).put('/api/characters/char-a').send(updated);
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Thorin Oakenshield');
    expect(res.body.pvAtual).toBe(5);
  });

  it('retorna 404 quando personagem não existe', async () => {
    const res = await request(app)
      .put('/api/characters/nao-existe')
      .send({ ...CHAR_A, id: 'nao-existe' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/não encontrado/i);
  });

  it('mudança persiste no GET subsequente', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    await request(app)
      .put('/api/characters/char-a')
      .send({ ...CHAR_A, esperanca: 2 });
    const listRes = await request(app).get('/api/characters');
    const char = listRes.body.find((c: { id: string }) => c.id === 'char-a');
    expect(char.esperanca).toBe(2);
  });

  it('não afeta outros personagens ao atualizar um', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    await request(app).post('/api/characters').send(CHAR_B);
    await request(app)
      .put('/api/characters/char-a')
      .send({ ...CHAR_A, nome: 'Alterado' });
    const listRes = await request(app).get('/api/characters');
    const charB = listRes.body.find((c: { id: string }) => c.id === 'char-b');
    expect(charB.nome).toBe('Gandalf');
  });

  it('estado de sessão é preservado no update parcial', async () => {
    await request(app).post('/api/characters').send({ ...CHAR_A, pvAtual: 3, esperanca: 2 });
    const updated = { ...CHAR_A, pvAtual: 3, esperanca: 2, nome: 'Thorin v2' };
    await request(app).put('/api/characters/char-a').send(updated);
    const listRes = await request(app).get('/api/characters');
    const char = listRes.body.find((c: { id: string }) => c.id === 'char-a');
    expect(char.pvAtual).toBe(3);
    expect(char.esperanca).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/characters/:id
// ──────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/characters/:id', () => {
  it('exclui personagem existente e retorna 200 com ok:true', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    const res = await request(app).delete('/api/characters/char-a');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('retorna 404 ao excluir id inexistente', async () => {
    const res = await request(app).delete('/api/characters/fantasma');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/não encontrado/i);
  });

  it('personagem não aparece no GET após exclusão', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    await request(app).delete('/api/characters/char-a');
    const listRes = await request(app).get('/api/characters');
    expect(listRes.body.find((c: { id: string }) => c.id === 'char-a')).toBeUndefined();
  });

  it('não exclui outros personagens', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    await request(app).post('/api/characters').send(CHAR_B);
    await request(app).delete('/api/characters/char-a');
    const listRes = await request(app).get('/api/characters');
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe('char-b');
  });

  it('contagem decresce após exclusão', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    await request(app).post('/api/characters').send(CHAR_B);
    await request(app).delete('/api/characters/char-a');
    const listRes = await request(app).get('/api/characters');
    expect(listRes.body).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/cards
// ──────────────────────────────────────────────────────────────────────────────

type PartialCard = { num: number; tipo: string; nome: string; descricao: string; [k: string]: unknown }

function insertCard(card: PartialCard) {
  db.prepare(`
    INSERT INTO cards (num, tipo, nome, descricao, dominio_key, subclasse_nome, classe, nome_classe,
      nivel_subclasse, atributo_conjuracao, nivel_dominio, custo, card_tipo)
    VALUES (@num, @tipo, @nome, @descricao, @dominio_key, @subclasse_nome, @classe, @nome_classe,
      @nivel_subclasse, @atributo_conjuracao, @nivel_dominio, @custo, @card_tipo)
  `).run({
    dominio_key: null, subclasse_nome: null, classe: null, nome_classe: null,
    nivel_subclasse: null, atributo_conjuracao: null, nivel_dominio: null,
    custo: null, card_tipo: null,
    ...card,
  });
}

describe('GET /api/cards', () => {
  it('retorna 200 com array vazio quando não há cartas', async () => {
    const res = await request(app).get('/api/cards');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retorna cartas em ordem de num', async () => {
    insertCard({ num: 82, tipo: 'dominio', nome: 'Proteção Rúnica', descricao: 'Desc', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });
    insertCard({ num: 1, tipo: 'subclasse', nome: 'Trovador', descricao: 'Desc2', dominio_key: 'graca', subclasse_nome: 'Trovador', classe: 'bardo', nome_classe: 'Bardo', nivel_subclasse: 'Fundamental' });

    const res = await request(app).get('/api/cards');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].num).toBe(1);
    expect(res.body[1].num).toBe(82);
  });

  it('filtra por tipo', async () => {
    insertCard({ num: 1, tipo: 'subclasse', nome: 'Trovador', descricao: 'D', subclasse_nome: 'Trovador', classe: 'bardo', nome_classe: 'Bardo', nivel_subclasse: 'Fundamental' });
    insertCard({ num: 82, tipo: 'dominio', nome: 'Proteção', descricao: 'D', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });

    const res = await request(app).get('/api/cards?tipo=dominio');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe('dominio');
  });

  it('filtra por dominio_key', async () => {
    insertCard({ num: 82, tipo: 'dominio', nome: 'Carta Arcano', descricao: 'D', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });
    insertCard({ num: 106, tipo: 'dominio', nome: 'Carta Lamina', descricao: 'D', dominio_key: 'lamina', nivel_dominio: 2, custo: 1, card_tipo: 'Talento' });

    const res = await request(app).get('/api/cards?dominio_key=arcano');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('Carta Arcano');
  });

  it('busca por texto em nome', async () => {
    insertCard({ num: 82, tipo: 'dominio', nome: 'Proteção Rúnica', descricao: 'Talismã mágico', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });
    insertCard({ num: 106, tipo: 'dominio', nome: 'Fraternidade', descricao: 'Outra descrição', dominio_key: 'lamina', nivel_dominio: 2, custo: 1, card_tipo: 'Talento' });

    const res = await request(app).get('/api/cards?q=R%C3%BAnica');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('Proteção Rúnica');
  });

  it('busca por texto em descricao', async () => {
    insertCard({ num: 82, tipo: 'dominio', nome: 'A', descricao: 'Possui talismã único', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });
    insertCard({ num: 106, tipo: 'dominio', nome: 'B', descricao: 'Descrição comum', dominio_key: 'lamina', nivel_dominio: 2, custo: 1, card_tipo: 'Talento' });

    const res = await request(app).get(`/api/cards?q=${encodeURIComponent('talismã')}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].num).toBe(82);
  });

  it('filtra por card_tipo', async () => {
    insertCard({ num: 82, tipo: 'dominio', nome: 'A', descricao: 'D', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });
    insertCard({ num: 106, tipo: 'dominio', nome: 'B', descricao: 'D', dominio_key: 'lamina', nivel_dominio: 2, custo: 1, card_tipo: 'Talento' });

    const res = await request(app).get('/api/cards?card_tipo=Talento');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('B');
  });

  it('filtra por classe', async () => {
    insertCard({ num: 1, tipo: 'subclasse', nome: 'Trovador', descricao: 'D', subclasse_nome: 'Trovador', classe: 'bardo', nome_classe: 'Bardo', nivel_subclasse: 'Fundamental' });
    insertCard({ num: 13, tipo: 'subclasse', nome: 'Baluarte', descricao: 'D', subclasse_nome: 'Baluarte', classe: 'guardiao', nome_classe: 'Guardião', nivel_subclasse: 'Fundamental' });

    const res = await request(app).get('/api/cards?classe=bardo');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].classe).toBe('bardo');
  });

  it('combina múltiplos filtros', async () => {
    insertCard({ num: 82, tipo: 'dominio', nome: 'A', descricao: 'D', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });
    insertCard({ num: 83, tipo: 'dominio', nome: 'B', descricao: 'D', dominio_key: 'arcano', nivel_dominio: 2, custo: 1, card_tipo: 'Talento' });
    insertCard({ num: 106, tipo: 'dominio', nome: 'C', descricao: 'D', dominio_key: 'lamina', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });

    const res = await request(app).get(`/api/cards?dominio_key=arcano&card_tipo=${encodeURIComponent('Feitiço')}`);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].num).toBe(82);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fluxo completo CRUD
// ──────────────────────────────────────────────────────────────────────────────

describe('Fluxo CRUD completo', () => {
  it('criar → listar → atualizar → listar → excluir → listar', async () => {
    // Criar
    await request(app).post('/api/characters').send(CHAR_A);
    let list = await request(app).get('/api/characters');
    expect(list.body).toHaveLength(1);

    // Atualizar estado de sessão (simula jogada)
    await request(app).put('/api/characters/char-a').send({ ...CHAR_A, pvAtual: 4, esperanca: 3 });
    list = await request(app).get('/api/characters');
    expect(list.body[0].pvAtual).toBe(4);
    expect(list.body[0].esperanca).toBe(3);

    // Excluir
    await request(app).delete('/api/characters/char-a');
    list = await request(app).get('/api/characters');
    expect(list.body).toHaveLength(0);
  });

  it('múltiplos personagens: criar dois, deletar um, outro permanece intacto', async () => {
    await request(app).post('/api/characters').send(CHAR_A);
    await request(app).post('/api/characters').send(CHAR_B);

    await request(app).delete('/api/characters/char-a');

    const list = await request(app).get('/api/characters');
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe('char-b');
    expect(list.body[0].nome).toBe('Gandalf');
  });
});
