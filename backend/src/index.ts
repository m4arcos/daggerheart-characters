import express, { Request, Response } from 'express';
import cors from 'cors';
import db from './db';
import {
  requireAuth, requireAdmin,
  hashPassword, verifyPassword, generateToken,
  AuthUser,
} from './auth';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as {
    id: string; nome: string; email: string;
    senha_hash: string | null; senha_temp: string;
    temp_ativa: number; is_admin: number;
  } | undefined;

  if (!user) {
    return res.status(401).json({ error: 'Email ou senha inválidos' });
  }

  let requiresPasswordChange = false;

  if (user.senha_hash && verifyPassword(senha, user.senha_hash)) {
    requiresPasswordChange = false;
  } else if (user.temp_ativa && verifyPassword(senha, user.senha_temp)) {
    requiresPasswordChange = true;
  } else {
    return res.status(401).json({ error: 'Email ou senha inválidos' });
  }

  const authUser: AuthUser = {
    userId: user.id,
    nome: user.nome,
    email: user.email,
    isAdmin: user.is_admin === 1,
    requiresPasswordChange,
  };

  res.json({ token: generateToken(authUser), user: authUser });
});

app.post('/api/auth/set-password', requireAuth, (req: Request, res: Response) => {
  const { novaSenha } = req.body;
  if (!novaSenha || novaSenha.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
  }

  db.prepare(
    'UPDATE users SET senha_hash = ?, temp_ativa = 0, updated_at = unixepoch() WHERE id = ?'
  ).run(hashPassword(novaSenha), req.user!.userId);

  const authUser: AuthUser = {
    userId: req.user!.userId,
    nome: req.user!.nome,
    email: req.user!.email,
    isAdmin: req.user!.isAdmin,
    requiresPasswordChange: false,
  };

  res.json({ token: generateToken(authUser), user: authUser });
});

app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// ── Admin ────────────────────────────────────────────────────────────────────

app.post('/api/admin/users', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const { nome, email, senhaTmp } = req.body;
  if (!nome || !email || !senhaTmp) {
    return res.status(400).json({ error: 'nome, email e senhaTmp são obrigatórios' });
  }

  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Email já cadastrado' });
  }

  const id = uid();
  db.prepare(
    'INSERT INTO users (id, nome, email, senha_temp, temp_ativa) VALUES (?, ?, ?, ?, 1)'
  ).run(id, nome, email, hashPassword(senhaTmp));

  res.status(201).json({ id, nome, email });
});

app.get('/api/admin/users', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  const users = db.prepare(
    'SELECT id, nome, email, temp_ativa, is_admin, created_at FROM users ORDER BY created_at ASC'
  ).all();
  res.json(users);
});

app.put('/api/admin/users/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome, email, senhaTmp } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ error: 'nome e email são obrigatórios' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const conflict = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
  if (conflict) {
    return res.status(409).json({ error: 'Email já está em uso por outro usuário' });
  }

  if (senhaTmp) {
    db.prepare(
      'UPDATE users SET nome = ?, email = ?, senha_temp = ?, temp_ativa = 1, updated_at = unixepoch() WHERE id = ?'
    ).run(nome, email, hashPassword(senhaTmp), id);
  } else {
    db.prepare(
      'UPDATE users SET nome = ?, email = ?, updated_at = unixepoch() WHERE id = ?'
    ).run(nome, email, id);
  }

  const updated = db.prepare(
    'SELECT id, nome, email, temp_ativa, is_admin, created_at FROM users WHERE id = ?'
  ).get(id);
  res.json(updated);
});

// ── Characters ───────────────────────────────────────────────────────────────

app.get('/api/characters', requireAuth, (req: Request, res: Response) => {
  if (req.user!.isAdmin) {
    const rows = db.prepare(`
      SELECT c.data, u.id as owner_id, u.nome as owner_nome, u.email as owner_email
      FROM characters c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at ASC
    `).all() as { data: string; owner_id: string; owner_nome: string; owner_email: string }[];

    return res.json(rows.map(r => ({
      ...JSON.parse(r.data),
      _owner: r.owner_id ? { id: r.owner_id, nome: r.owner_nome, email: r.owner_email } : null,
    })));
  }

  const rows = db.prepare(
    'SELECT data FROM characters WHERE user_id = ? ORDER BY created_at ASC'
  ).all(req.user!.userId) as { data: string }[];

  res.json(rows.map(r => JSON.parse(r.data)));
});

app.post('/api/characters', requireAuth, (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _owner, ...char } = req.body;
  if (!char?.id || !char?.nome) {
    return res.status(400).json({ error: 'id e nome são obrigatórios' });
  }
  db.prepare('INSERT INTO characters (id, data, user_id) VALUES (?, ?, ?)')
    .run(char.id, JSON.stringify(char), req.user!.userId);
  res.status(201).json(char);
});

app.put('/api/characters/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _owner, ...char } = req.body;
  const { isAdmin, userId } = req.user!;

  // Admin enxerga qualquer personagem; usuário comum só enxerga o próprio
  const query = isAdmin
    ? 'SELECT user_id FROM characters WHERE id = ?'
    : 'SELECT user_id FROM characters WHERE id = ? AND user_id = ?';
  const params = isAdmin ? [id] : [id, userId];

  const row = db.prepare(query).get(...params) as { user_id: string } | undefined;
  if (!row) {
    return res.status(404).json({ error: 'Personagem não encontrado' });
  }

  db.prepare('UPDATE characters SET data = ?, updated_at = unixepoch() WHERE id = ?')
    .run(JSON.stringify(char), id);

  res.json(char);
});

app.delete('/api/characters/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { isAdmin, userId } = req.user!;

  const query = isAdmin
    ? 'SELECT user_id FROM characters WHERE id = ?'
    : 'SELECT user_id FROM characters WHERE id = ? AND user_id = ?';
  const params = isAdmin ? [id] : [id, userId];

  const row = db.prepare(query).get(...params) as { user_id: string } | undefined;
  if (!row) {
    return res.status(404).json({ error: 'Personagem não encontrado' });
  }

  db.prepare('DELETE FROM characters WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ── Cards (público) ───────────────────────────────────────────────────────────

app.get('/api/cards', requireAuth, (req: Request, res: Response) => {
  const { tipo, dominio_key, q, card_tipo, classe } = req.query as Record<string, string>;

  let query = 'SELECT * FROM cards WHERE 1=1';
  const params: (string | number)[] = [];

  if (tipo) { query += ' AND tipo = ?'; params.push(tipo); }
  if (dominio_key) { query += ' AND dominio_key = ?'; params.push(dominio_key); }
  if (card_tipo) { query += ' AND card_tipo = ?'; params.push(card_tipo); }
  if (classe) { query += ' AND classe = ?'; params.push(classe); }
  if (q) {
    const term = `%${q}%`;
    query += ' AND (nome LIKE ? OR descricao LIKE ? OR subclasse_nome LIKE ?)';
    params.push(term, term, term);
  }

  query += ' ORDER BY num ASC';
  res.json(db.prepare(query).all(...params));
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = parseInt(process.env.PORT || '3001');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend rodando na porta ${PORT}`);
  });
}
