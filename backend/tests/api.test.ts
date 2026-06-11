import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import pool from '../src/db';
import { hashPassword } from '../src/auth';
import { testToken, adminToken, otherToken, TEST_USER_ID, OTHER_USER_ID } from './setup';

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

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// ──────────────────────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  async function createUser(id: string, email: string, senhaTmp: string, isAdmin = false) {
    await pool.query(
      'INSERT INTO users (id, nome, email, senha_temp, temp_ativa, is_admin) VALUES ($1, $2, $3, $4, TRUE, $5)',
      [id, 'Test', email, hashPassword(senhaTmp), isAdmin]
    );
  }

  it('retorna token com requiresPasswordChange=true ao usar senha temporária', async () => {
    await createUser('u1', 'user@test.com', 'senhaTemp1');
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', senha: 'senhaTemp1' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.requiresPasswordChange).toBe(true);
  });

  it('retorna token com requiresPasswordChange=false após senha definitiva', async () => {
    await createUser('u1', 'user@test.com', 'senhaTemp1');
    await pool.query(
      "UPDATE users SET senha_hash = $1, temp_ativa = FALSE WHERE email = 'user@test.com'",
      [hashPassword('SenhaDefinitiva1!')]
    );
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', senha: 'SenhaDefinitiva1!' });
    expect(res.status).toBe(200);
    expect(res.body.user.requiresPasswordChange).toBe(false);
  });

  it('retorna 401 para senha errada', async () => {
    await createUser('u1', 'user@test.com', 'senhaTemp1');
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', senha: 'errada' });
    expect(res.status).toBe(401);
  });

  it('retorna 401 para email inexistente', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nao@existe.com', senha: 'qualquer' });
    expect(res.status).toBe(401);
  });

  it('retorna 400 quando email está ausente', async () => {
    const res = await request(app).post('/api/auth/login').send({ senha: '123' });
    expect(res.status).toBe(400);
  });

  it('retorna 401 quando senha temporária foi desativada', async () => {
    await createUser('u1', 'user@test.com', 'senhaTemp1');
    await pool.query(
      "UPDATE users SET senha_hash = $1, temp_ativa = FALSE WHERE email = 'user@test.com'",
      [hashPassword('SenhaDefinitiva1!')]
    );
    const res = await request(app).post('/api/auth/login').send({ email: 'user@test.com', senha: 'senhaTemp1' });
    expect(res.status).toBe(401);
  });

  it('grava last_login no login bem-sucedido', async () => {
    await createUser('u1', 'user@test.com', 'senhaTemp1');
    const before = Math.floor(Date.now() / 1000);
    await request(app).post('/api/auth/login').send({ email: 'user@test.com', senha: 'senhaTemp1' });
    const { rows } = await pool.query('SELECT last_login FROM users WHERE email = $1', ['user@test.com']);
    expect(rows[0].last_login).toBeGreaterThanOrEqual(before);
  });

  it('last_login aparece na listagem de admin', async () => {
    await createUser('u1', 'user@test.com', 'senhaTemp1');
    await request(app).post('/api/auth/login').send({ email: 'user@test.com', senha: 'senhaTemp1' });
    const res = await request(app).get('/api/admin/users').set(auth(adminToken));
    const found = res.body.find((u: { email: string }) => u.email === 'user@test.com');
    expect(found.last_login).not.toBeNull();
  });
});

describe('POST /api/auth/set-password', () => {
  it('define senha definitiva e retorna novo token sem requiresPasswordChange', async () => {
    const res = await request(app)
      .post('/api/auth/set-password')
      .set(auth(testToken))
      .send({ novaSenha: 'NovaSenha123!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.requiresPasswordChange).toBe(false);
  });

  it('retorna 400 para senha muito curta', async () => {
    const res = await request(app)
      .post('/api/auth/set-password')
      .set(auth(testToken))
      .send({ novaSenha: '123' });
    expect(res.status).toBe(400);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/auth/set-password').send({ novaSenha: 'NovaSenha123!' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('retorna requiresPasswordChange=false quando temp_ativa=0', async () => {
    await pool.query(
      'UPDATE users SET senha_hash = $1, temp_ativa = FALSE WHERE id = $2',
      [hashPassword('DefPass'), TEST_USER_ID]
    );
    const res = await request(app).get('/api/auth/me').set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.requiresPasswordChange).toBe(false);
  });

  it('reflete temp_ativa=1 mesmo com token antigo de requiresPasswordChange=false', async () => {
    // temp_ativa já é 1 no beforeEach — simula admin que resetou após login
    const res = await request(app).get('/api/auth/me').set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body.user.requiresPasswordChange).toBe(true);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/admin/users', () => {
  it('admin cria usuário com sucesso', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set(auth(adminToken))
      .send({ nome: 'Novo User', email: 'novo@test.com', senhaTmp: 'TempPass1' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('novo@test.com');
  });

  it('retorna 409 para email duplicado', async () => {
    await request(app).post('/api/admin/users').set(auth(adminToken))
      .send({ nome: 'A', email: 'dup@test.com', senhaTmp: 'TempPass1' });
    const res = await request(app).post('/api/admin/users').set(auth(adminToken))
      .send({ nome: 'B', email: 'dup@test.com', senhaTmp: 'TempPass2' });
    expect(res.status).toBe(409);
  });

  it('não-admin recebe 403', async () => {
    const res = await request(app).post('/api/admin/users').set(auth(testToken))
      .send({ nome: 'X', email: 'x@test.com', senhaTmp: 'TempPass1' });
    expect(res.status).toBe(403);
  });

  it('retorna 400 quando campos estão ausentes', async () => {
    const res = await request(app).post('/api/admin/users').set(auth(adminToken))
      .send({ nome: 'Sem email' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/admin/users', () => {
  it('admin lista usuários', async () => {
    await request(app).post('/api/admin/users').set(auth(adminToken))
      .send({ nome: 'User1', email: 'u1@test.com', senhaTmp: 'Tmp1' });
    const res = await request(app).get('/api/admin/users').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((u: { email: string }) => u.email === 'u1@test.com')).toBe(true);
  });

  it('não-admin recebe 403', async () => {
    const res = await request(app).get('/api/admin/users').set(auth(testToken));
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/admin/users/:id', () => {
  async function createAndGetId(email: string) {
    const res = await request(app).post('/api/admin/users').set(auth(adminToken))
      .send({ nome: 'Original', email, senhaTmp: 'TempOrig' });
    return res.body.id as string;
  }

  it('admin edita nome e email', async () => {
    const id = await createAndGetId('edit@test.com');
    const res = await request(app).put(`/api/admin/users/${id}`).set(auth(adminToken))
      .send({ nome: 'Editado', email: 'editado@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Editado');
    expect(res.body.email).toBe('editado@test.com');
  });

  it('admin reset senha temporária', async () => {
    const id = await createAndGetId('reset@test.com');
    const res = await request(app).put(`/api/admin/users/${id}`).set(auth(adminToken))
      .send({ nome: 'Reset', email: 'reset@test.com', senhaTmp: 'NovaSenhaTemp' });
    expect(res.status).toBe(200);
    expect(res.body.temp_ativa).toBe(true);
  });

  it('reset de senha limpa senha_hash para forçar uso da temp', async () => {
    const id = await createAndGetId('hashclear@test.com');
    // simula usuário que já definiu senha definitiva
    await pool.query(
      'UPDATE users SET senha_hash = $1, temp_ativa = FALSE WHERE id = $2',
      [hashPassword('SenhaAntigaDefinitiva'), id]
    );
    // admin reseta a senha
    await request(app).put(`/api/admin/users/${id}`).set(auth(adminToken))
      .send({ nome: 'HashClear', email: 'hashclear@test.com', senhaTmp: 'NovaTemporal' });
    const { rows } = await pool.query(
      'SELECT senha_hash, temp_ativa FROM users WHERE id = $1', [id]
    );
    const user = rows[0] as { senha_hash: string | null; temp_ativa: boolean };
    expect(user.senha_hash).toBeNull();
    expect(user.temp_ativa).toBe(true);
  });

  it('login com senha antiga falha após reset; login com nova temp retorna requiresPasswordChange=true', async () => {
    const id = await createAndGetId('forcechange@test.com');
    await pool.query(
      'UPDATE users SET senha_hash = $1, temp_ativa = FALSE WHERE id = $2',
      [hashPassword('SenhaDefinitiva'), id]
    );
    await request(app).put(`/api/admin/users/${id}`).set(auth(adminToken))
      .send({ nome: 'ForceChange', email: 'forcechange@test.com', senhaTmp: 'NovaTemp123' });
    // login com senha antiga deve falhar
    const old = await request(app).post('/api/auth/login').send({ email: 'forcechange@test.com', senha: 'SenhaDefinitiva' });
    expect(old.status).toBe(401);
    // login com nova temp deve exigir troca
    const novo = await request(app).post('/api/auth/login').send({ email: 'forcechange@test.com', senha: 'NovaTemp123' });
    expect(novo.status).toBe(200);
    expect(novo.body.user.requiresPasswordChange).toBe(true);
  });

  it('retorna 404 para id inexistente', async () => {
    const res = await request(app).put('/api/admin/users/nao-existe').set(auth(adminToken))
      .send({ nome: 'X', email: 'x@test.com' });
    expect(res.status).toBe(404);
  });

  it('retorna 409 para email de outro usuário', async () => {
    await createAndGetId('occupied@test.com');
    const id2 = await createAndGetId('another@test.com');
    const res = await request(app).put(`/api/admin/users/${id2}`).set(auth(adminToken))
      .send({ nome: 'Conflict', email: 'occupied@test.com' });
    expect(res.status).toBe(409);
  });

  it('não-admin recebe 403', async () => {
    const id = await createAndGetId('protected@test.com');
    const res = await request(app).put(`/api/admin/users/${id}`).set(auth(testToken))
      .send({ nome: 'X', email: 'x@test.com' });
    expect(res.status).toBe(403);
  });

  it('retorna 400 quando nome ou email ausentes', async () => {
    const id = await createAndGetId('missing@test.com');
    const res = await request(app).put(`/api/admin/users/${id}`).set(auth(adminToken))
      .send({ nome: 'Sem email' });
    expect(res.status).toBe(400);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/characters
// ──────────────────────────────────────────────────────────────────────────────

describe('GET /api/characters', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/characters');
    expect(res.status).toBe(401);
  });

  it('retorna 200 com array vazio quando não há personagens', async () => {
    const res = await request(app).get('/api/characters').set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retorna personagem criado', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    const res = await request(app).get('/api/characters').set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('char-a');
    expect(res.body[0].nome).toBe('Thorin');
  });

  it('retorna múltiplos personagens em ordem de criação', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_B);
    const res = await request(app).get('/api/characters').set(auth(testToken));
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe('char-a');
    expect(res.body[1].id).toBe('char-b');
  });

  it('preserva todos os campos do personagem', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    const res = await request(app).get('/api/characters').set(auth(testToken));
    const char = res.body[0];
    expect(char.cls).toBe('guerreiro');
    expect(char.nivel).toBe(3);
    expect(char.pvMax).toBe(8);
    expect(char.esperanca).toBe(6);
  });

  it('usuário não vê personagens de outro usuário', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    const other = otherToken;
    const res = await request(app).get('/api/characters').set(auth(other));
    expect(res.body).toHaveLength(0);
  });

  it('admin vê personagens de todos os usuários com _owner', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    const res = await request(app).get('/api/characters').set(auth(adminToken));
    expect(res.body).toHaveLength(1);
    expect(res.body[0]._owner).toBeDefined();
    expect(res.body[0]._owner.id).toBe(TEST_USER_ID);
  });
});


// ──────────────────────────────────────────────────────────────────────────────
// POST /api/characters
// ──────────────────────────────────────────────────────────────────────────────

describe('POST /api/characters', () => {
  it('cria personagem e retorna 201', async () => {
    const res = await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('char-a');
    expect(res.body.nome).toBe('Thorin');
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/characters').send(CHAR_A);
    expect(res.status).toBe(401);
  });

  it('retorna 400 quando id está ausente', async () => {
    const res = await request(app).post('/api/characters').set(auth(testToken)).send({ nome: 'Sem ID' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/id/i);
  });

  it('retorna 400 quando nome está ausente', async () => {
    const res = await request(app).post('/api/characters').set(auth(testToken)).send({ id: 'x1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nome/i);
  });

  it('retorna 400 quando body está vazio', async () => {
    const res = await request(app).post('/api/characters').set(auth(testToken)).send({});
    expect(res.status).toBe(400);
  });

  it('retorna erro ao tentar criar personagem com id duplicado', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    const res = await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('personagem aparece no GET após criação', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    const listRes = await request(app).get('/api/characters').set(auth(testToken));
    expect(listRes.body.some((c: { id: string }) => c.id === 'char-a')).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/characters/:id
// ──────────────────────────────────────────────────────────────────────────────

describe('PUT /api/characters/:id', () => {
  it('atualiza personagem existente e retorna 200', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    const updated = { ...CHAR_A, nome: 'Thorin Oakenshield', pvAtual: 5 };
    const res = await request(app).put('/api/characters/char-a').set(auth(testToken)).send(updated);
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Thorin Oakenshield');
    expect(res.body.pvAtual).toBe(5);
  });

  it('retorna 404 quando personagem não existe', async () => {
    const res = await request(app)
      .put('/api/characters/nao-existe')
      .set(auth(testToken))
      .send({ ...CHAR_A, id: 'nao-existe' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/não encontrado/i);
  });

  it('mudança persiste no GET subsequente', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    await request(app).put('/api/characters/char-a').set(auth(testToken)).send({ ...CHAR_A, esperanca: 2 });
    const listRes = await request(app).get('/api/characters').set(auth(testToken));
    const char = listRes.body.find((c: { id: string }) => c.id === 'char-a');
    expect(char.esperanca).toBe(2);
  });

  it('não afeta outros personagens ao atualizar um', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_B);
    await request(app).put('/api/characters/char-a').set(auth(testToken)).send({ ...CHAR_A, nome: 'Alterado' });
    const listRes = await request(app).get('/api/characters').set(auth(testToken));
    const charB = listRes.body.find((c: { id: string }) => c.id === 'char-b');
    expect(charB.nome).toBe('Gandalf');
  });

  it('estado de sessão é preservado no update parcial', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send({ ...CHAR_A, pvAtual: 3, esperanca: 2 });
    const updated = { ...CHAR_A, pvAtual: 3, esperanca: 2, nome: 'Thorin v2' };
    await request(app).put('/api/characters/char-a').set(auth(testToken)).send(updated);
    const listRes = await request(app).get('/api/characters').set(auth(testToken));
    const char = listRes.body.find((c: { id: string }) => c.id === 'char-a');
    expect(char.pvAtual).toBe(3);
    expect(char.esperanca).toBe(2);
  });

  it('retorna 404 quando outro usuário tenta editar (não revela existência)', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    const res = await request(app).put('/api/characters/char-a').set(auth(otherToken)).send(CHAR_A);
    expect(res.status).toBe(404);
  });

  it('admin pode editar personagem de qualquer usuário', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    const res = await request(app).put('/api/characters/char-a').set(auth(adminToken)).send({ ...CHAR_A, nome: 'Admin Edit' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Admin Edit');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/characters/:id
// ──────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/characters/:id', () => {
  it('exclui personagem existente e retorna 200 com ok:true', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    const res = await request(app).delete('/api/characters/char-a').set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('retorna 404 ao excluir id inexistente', async () => {
    const res = await request(app).delete('/api/characters/fantasma').set(auth(testToken));
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/não encontrado/i);
  });

  it('personagem não aparece no GET após exclusão', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    await request(app).delete('/api/characters/char-a').set(auth(testToken));
    const listRes = await request(app).get('/api/characters').set(auth(testToken));
    expect(listRes.body.find((c: { id: string }) => c.id === 'char-a')).toBeUndefined();
  });

  it('não exclui outros personagens', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_B);
    await request(app).delete('/api/characters/char-a').set(auth(testToken));
    const listRes = await request(app).get('/api/characters').set(auth(testToken));
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe('char-b');
  });

  it('contagem decresce após exclusão', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_B);
    await request(app).delete('/api/characters/char-a').set(auth(testToken));
    const listRes = await request(app).get('/api/characters').set(auth(testToken));
    expect(listRes.body).toHaveLength(1);
  });

  it('retorna 404 quando outro usuário tenta excluir (não revela existência)', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    const res = await request(app).delete('/api/characters/char-a').set(auth(otherToken));
    expect(res.status).toBe(404);
  });

  it('admin pode excluir personagem de qualquer usuário', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    const res = await request(app).delete('/api/characters/char-a').set(auth(adminToken));
    expect(res.status).toBe(200);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/cards
// ──────────────────────────────────────────────────────────────────────────────

type PartialCard = { num: number; tipo: string; nome: string; descricao: string; [k: string]: unknown }

async function insertCard(card: PartialCard) {
  const row = {
    dominio_key: null, subclasse_nome: null, classe: null, nome_classe: null,
    nivel_subclasse: null, atributo_conjuracao: null, nivel_dominio: null,
    custo: null, card_tipo: null,
    ...card,
  };
  await pool.query(`
    INSERT INTO cards (num, tipo, nome, descricao, dominio_key, subclasse_nome, classe, nome_classe,
      nivel_subclasse, atributo_conjuracao, nivel_dominio, custo, card_tipo)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [
    row.num, row.tipo, row.nome, row.descricao, row.dominio_key, row.subclasse_nome,
    row.classe, row.nome_classe, row.nivel_subclasse, row.atributo_conjuracao,
    row.nivel_dominio, row.custo, row.card_tipo,
  ]);
}

describe('GET /api/cards', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/cards');
    expect(res.status).toBe(401);
  });

  it('retorna 200 com array vazio quando não há cartas', async () => {
    const res = await request(app).get('/api/cards').set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retorna cartas em ordem de num', async () => {
    await insertCard({ num: 82, tipo: 'dominio', nome: 'Proteção Rúnica', descricao: 'Desc', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });
    await insertCard({ num: 1, tipo: 'subclasse', nome: 'Trovador', descricao: 'Desc2', dominio_key: 'graca', subclasse_nome: 'Trovador', classe: 'bardo', nome_classe: 'Bardo', nivel_subclasse: 'Fundamental' });

    const res = await request(app).get('/api/cards').set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].num).toBe(1);
    expect(res.body[1].num).toBe(82);
  });

  it('filtra por tipo', async () => {
    await insertCard({ num: 1, tipo: 'subclasse', nome: 'Trovador', descricao: 'D', subclasse_nome: 'Trovador', classe: 'bardo', nome_classe: 'Bardo', nivel_subclasse: 'Fundamental' });
    await insertCard({ num: 82, tipo: 'dominio', nome: 'Proteção', descricao: 'D', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });

    const res = await request(app).get('/api/cards?tipo=dominio').set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe('dominio');
  });

  it('filtra por dominio_key', async () => {
    await insertCard({ num: 82, tipo: 'dominio', nome: 'Carta Arcano', descricao: 'D', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });
    await insertCard({ num: 106, tipo: 'dominio', nome: 'Carta Lamina', descricao: 'D', dominio_key: 'lamina', nivel_dominio: 2, custo: 1, card_tipo: 'Talento' });

    const res = await request(app).get('/api/cards?dominio_key=arcano').set(auth(testToken));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('Carta Arcano');
  });

  it('busca por texto em nome', async () => {
    await insertCard({ num: 82, tipo: 'dominio', nome: 'Proteção Rúnica', descricao: 'Talismã mágico', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });
    await insertCard({ num: 106, tipo: 'dominio', nome: 'Fraternidade', descricao: 'Outra descrição', dominio_key: 'lamina', nivel_dominio: 2, custo: 1, card_tipo: 'Talento' });

    const res = await request(app).get('/api/cards?q=R%C3%BAnica').set(auth(testToken));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('Proteção Rúnica');
  });

  it('busca por texto em descricao', async () => {
    await insertCard({ num: 82, tipo: 'dominio', nome: 'A', descricao: 'Possui talismã único', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });
    await insertCard({ num: 106, tipo: 'dominio', nome: 'B', descricao: 'Descrição comum', dominio_key: 'lamina', nivel_dominio: 2, custo: 1, card_tipo: 'Talento' });

    const res = await request(app).get(`/api/cards?q=${encodeURIComponent('talismã')}`).set(auth(testToken));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].num).toBe(82);
  });

  it('filtra por card_tipo', async () => {
    await insertCard({ num: 82, tipo: 'dominio', nome: 'A', descricao: 'D', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });
    await insertCard({ num: 106, tipo: 'dominio', nome: 'B', descricao: 'D', dominio_key: 'lamina', nivel_dominio: 2, custo: 1, card_tipo: 'Talento' });

    const res = await request(app).get('/api/cards?card_tipo=Talento').set(auth(testToken));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('B');
  });

  it('filtra por classe', async () => {
    await insertCard({ num: 1, tipo: 'subclasse', nome: 'Trovador', descricao: 'D', subclasse_nome: 'Trovador', classe: 'bardo', nome_classe: 'Bardo', nivel_subclasse: 'Fundamental' });
    await insertCard({ num: 13, tipo: 'subclasse', nome: 'Baluarte', descricao: 'D', subclasse_nome: 'Baluarte', classe: 'guardiao', nome_classe: 'Guardião', nivel_subclasse: 'Fundamental' });

    const res = await request(app).get('/api/cards?classe=bardo').set(auth(testToken));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].classe).toBe('bardo');
  });

  it('combina múltiplos filtros', async () => {
    await insertCard({ num: 82, tipo: 'dominio', nome: 'A', descricao: 'D', dominio_key: 'arcano', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });
    await insertCard({ num: 83, tipo: 'dominio', nome: 'B', descricao: 'D', dominio_key: 'arcano', nivel_dominio: 2, custo: 1, card_tipo: 'Talento' });
    await insertCard({ num: 106, tipo: 'dominio', nome: 'C', descricao: 'D', dominio_key: 'lamina', nivel_dominio: 1, custo: 0, card_tipo: 'Feitiço' });

    const res = await request(app).get(`/api/cards?dominio_key=arcano&card_tipo=${encodeURIComponent('Feitiço')}`).set(auth(testToken));
    expect(res.body).toHaveLength(1);
    expect(res.body[0].num).toBe(82);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Campaigns
// ──────────────────────────────────────────────────────────────────────────────

describe('POST /api/campaigns', () => {
  it('cria campanha com sucesso (201) e retorna código único', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set(auth(testToken))
      .send({ nome: 'Campanha Teste' });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Campanha Teste');
    expect(res.body.codigo).toBeDefined();
    expect(res.body.codigo).toHaveLength(6);
    expect(res.body.id).toBeDefined();
  });

  it('retorna 400 sem nome', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set(auth(testToken))
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nome/i);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/campaigns').send({ nome: 'X' });
    expect(res.status).toBe(401);
  });

  it('criador é adicionado como membro aprovado', async () => {
    const res = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp1' });
    const campId = res.body.id;
    const detailRes = await request(app).get(`/api/campaigns/${campId}`).set(auth(testToken));
    expect(detailRes.body.membros[0].user_id).toBe(TEST_USER_ID);
    expect(detailRes.body.membros[0].status).toBe('aprovado');
  });
});

describe('GET /api/campaigns', () => {
  it('lista apenas campanhas do usuário', async () => {
    await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Minha Camp' });
    await request(app).post('/api/campaigns').set(auth(adminToken)).send({ nome: 'Camp Admin' });
    const res = await request(app).get('/api/campaigns').set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('Minha Camp');
  });

  it('retorna array vazio quando não há campanhas', async () => {
    const res = await request(app).get('/api/campaigns').set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/campaigns');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/campaigns/join', () => {
  it('junta com código válido (201, status pendente)', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { codigo, id } = campRes.body;
    const res = await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pendente');
    expect(res.body.campaign_id).toBe(id);
  });

  it('retorna 404 para código inválido', async () => {
    const res = await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo: 'XXXXXX' });
    expect(res.status).toBe(404);
  });

  it('retorna 409 se já é membro', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { codigo } = campRes.body;
    await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    const res = await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    expect(res.status).toBe(409);
  });

  it('retorna 400 sem codigo', async () => {
    const res = await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/campaigns/:id', () => {
  it('retorna detalhes e membros para membro aprovado', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { id } = campRes.body;
    const res = await request(app).get(`/api/campaigns/${id}`).set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Camp');
    expect(Array.isArray(res.body.membros)).toBe(true);
    expect(res.body.isCreator).toBe(true);
  });

  it('retorna 403 para não-membro', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { id } = campRes.body;
    const res = await request(app).get(`/api/campaigns/${id}`).set(auth(otherToken));
    expect(res.status).toBe(403);
  });

  it('retorna 403 para membro pendente', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { codigo, id } = campRes.body;
    await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    const res = await request(app).get(`/api/campaigns/${id}`).set(auth(otherToken));
    expect(res.status).toBe(403);
  });

  it('retorna 404 para campanha inexistente', async () => {
    const res = await request(app).get('/api/campaigns/nao-existe').set(auth(testToken));
    expect(res.status).toBe(404);
  });

  it('membro aprovado acessa detalhes com isCreator=false', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { codigo, id } = campRes.body;
    await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    await request(app).post(`/api/campaigns/${id}/members/${OTHER_USER_ID}/approve`).set(auth(testToken));
    const res = await request(app).get(`/api/campaigns/${id}`).set(auth(otherToken));
    expect(res.status).toBe(200);
    expect(res.body.isCreator).toBe(false);
  });
});

describe('DELETE /api/campaigns/:id', () => {
  it('retorna 403 para não-criador', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { id } = campRes.body;
    const res = await request(app).delete(`/api/campaigns/${id}`).set(auth(otherToken));
    expect(res.status).toBe(403);
  });

  it('criador deleta campanha com sucesso', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { id } = campRes.body;
    const res = await request(app).delete(`/api/campaigns/${id}`).set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('ao deletar campanha, desvincula personagens', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { id } = campRes.body;
    const char = { ...CHAR_A, campaign_id: id };
    await request(app).post('/api/characters').set(auth(testToken)).send(char);
    await request(app).delete(`/api/campaigns/${id}`).set(auth(testToken));
    const listRes = await request(app).get('/api/characters').set(auth(testToken));
    expect(listRes.body[0].campaign_id).toBeFalsy();
  });

  it('retorna 404 para campanha inexistente', async () => {
    const res = await request(app).delete('/api/campaigns/nao-existe').set(auth(testToken));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/campaigns/:id/members/:uid/approve', () => {
  it('aprova membro pendente', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { codigo, id } = campRes.body;
    await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    const res = await request(app).post(`/api/campaigns/${id}/members/${OTHER_USER_ID}/approve`).set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const detail = await request(app).get(`/api/campaigns/${id}`).set(auth(testToken));
    const member = detail.body.membros.find((m: any) => m.user_id === OTHER_USER_ID);
    expect(member.status).toBe('aprovado');
  });

  it('retorna 403 para não-criador', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { codigo, id } = campRes.body;
    await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    const res = await request(app).post(`/api/campaigns/${id}/members/${OTHER_USER_ID}/approve`).set(auth(otherToken));
    expect(res.status).toBe(403);
  });

  it('retorna 404 para membro inexistente', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { id } = campRes.body;
    const res = await request(app).post(`/api/campaigns/${id}/members/nao-existe/approve`).set(auth(testToken));
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/campaigns/:id/members/:uid', () => {
  it('criador remove membro e desvincula personagens', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { codigo, id } = campRes.body;
    await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    await request(app).post(`/api/campaigns/${id}/members/${OTHER_USER_ID}/approve`).set(auth(testToken));
    // Criar personagem vinculado
    const char = { ...CHAR_A, id: 'char-other', campaign_id: id };
    await request(app).post('/api/characters').set(auth(otherToken)).send(char);
    const res = await request(app).delete(`/api/campaigns/${id}/members/${OTHER_USER_ID}`).set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    // Personagem desvinculado
    const listRes = await request(app).get('/api/characters').set(auth(otherToken));
    expect(listRes.body[0].campaign_id).toBeFalsy();
  });

  it('membro pode sair da campanha por conta própria', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { codigo, id } = campRes.body;
    await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    const res = await request(app).delete(`/api/campaigns/${id}/members/${OTHER_USER_ID}`).set(auth(otherToken));
    expect(res.status).toBe(200);
  });

  it('retorna 403 quando terceiro tenta remover outro', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(adminToken)).send({ nome: 'Camp' });
    const { codigo, id } = campRes.body;
    await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    const res = await request(app).delete(`/api/campaigns/${id}/members/${OTHER_USER_ID}`).set(auth(testToken));
    expect(res.status).toBe(403);
  });

  it('retorna 400 ao tentar remover o criador', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { id } = campRes.body;
    const res = await request(app).delete(`/api/campaigns/${id}/members/${TEST_USER_ID}`).set(auth(testToken));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/campaigns/:id/characters', () => {
  it('retorna personagens visíveis para membro aprovado', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { id } = campRes.body;
    const char = { ...CHAR_A, campaign_id: id };
    await request(app).post('/api/characters').set(auth(testToken)).send(char);
    const res = await request(app).get(`/api/campaigns/${id}/characters`).set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('Thorin');
    expect(res.body[0]._owner).toBeDefined();
  });

  it('personagens privados ficam ocultos para não-criador', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { codigo, id } = campRes.body;
    // Membro público
    const char = { ...CHAR_A, campaign_id: id };
    await request(app).post('/api/characters').set(auth(testToken)).send(char);
    // Membro privado
    const charPrivate = { ...CHAR_B, campaign_id: id, privado: true };
    await request(app).post('/api/characters').set(auth(testToken)).send(charPrivate);
    // Other user joins and gets approved
    await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    await request(app).post(`/api/campaigns/${id}/members/${OTHER_USER_ID}/approve`).set(auth(testToken));
    const res = await request(app).get(`/api/campaigns/${id}/characters`).set(auth(otherToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('Thorin');
  });

  it('criador vê todos os personagens incluindo privados', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { id } = campRes.body;
    const char = { ...CHAR_A, campaign_id: id };
    await request(app).post('/api/characters').set(auth(testToken)).send(char);
    const charPrivate = { ...CHAR_B, campaign_id: id, privado: true };
    await request(app).post('/api/characters').set(auth(testToken)).send(charPrivate);
    const res = await request(app).get(`/api/campaigns/${id}/characters`).set(auth(testToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('retorna 403 para não-membro', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { id } = campRes.body;
    const res = await request(app).get(`/api/campaigns/${id}/characters`).set(auth(otherToken));
    expect(res.status).toBe(403);
  });

  it('retorna 403 para membro pendente', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { codigo, id } = campRes.body;
    await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    const res = await request(app).get(`/api/campaigns/${id}/characters`).set(auth(otherToken));
    expect(res.status).toBe(403);
  });

  it('não-criador pode ver próprios personagens privados', async () => {
    const campRes = await request(app).post('/api/campaigns').set(auth(testToken)).send({ nome: 'Camp' });
    const { codigo, id } = campRes.body;
    await request(app).post('/api/campaigns/join').set(auth(otherToken)).send({ codigo });
    await request(app).post(`/api/campaigns/${id}/members/${OTHER_USER_ID}/approve`).set(auth(testToken));
    const charPrivate = { ...CHAR_A, id: 'char-private-own', campaign_id: id, privado: true };
    await request(app).post('/api/characters').set(auth(otherToken)).send(charPrivate);
    const res = await request(app).get(`/api/campaigns/${id}/characters`).set(auth(otherToken));
    expect(res.status).toBe(200);
    expect(res.body.some((c: any) => c.id === 'char-private-own')).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fluxo completo CRUD
// ──────────────────────────────────────────────────────────────────────────────

describe('Fluxo CRUD completo', () => {
  it('criar → listar → atualizar → listar → excluir → listar', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    let list = await request(app).get('/api/characters').set(auth(testToken));
    expect(list.body).toHaveLength(1);

    await request(app).put('/api/characters/char-a').set(auth(testToken)).send({ ...CHAR_A, pvAtual: 4, esperanca: 3 });
    list = await request(app).get('/api/characters').set(auth(testToken));
    expect(list.body[0].pvAtual).toBe(4);
    expect(list.body[0].esperanca).toBe(3);

    await request(app).delete('/api/characters/char-a').set(auth(testToken));
    list = await request(app).get('/api/characters').set(auth(testToken));
    expect(list.body).toHaveLength(0);
  });

  it('múltiplos personagens: criar dois, deletar um, outro permanece intacto', async () => {
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_A);
    await request(app).post('/api/characters').set(auth(testToken)).send(CHAR_B);

    await request(app).delete('/api/characters/char-a').set(auth(testToken));

    const list = await request(app).get('/api/characters').set(auth(testToken));
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe('char-b');
    expect(list.body[0].nome).toBe('Gandalf');
  });
});
