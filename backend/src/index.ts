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

  db.prepare('UPDATE users SET last_login = unixepoch() WHERE id = ?').run(user.id);

  const authUser: AuthUser = {
    userId: user.id,
    nome: user.nome,
    email: user.email,
    isAdmin: user.is_admin === 1,
    requiresPasswordChange,
  };

  res.json({ token: generateToken(authUser), user: authUser });
});

app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const dbUser = db.prepare('SELECT nome, email, temp_ativa, is_admin FROM users WHERE id = ?')
    .get(req.user!.userId) as { nome: string; email: string; temp_ativa: number; is_admin: number } | undefined;
  if (!dbUser) return res.status(401).json({ error: 'Usuário não encontrado' });
  const authUser: AuthUser = {
    userId: req.user!.userId,
    nome: dbUser.nome,
    email: dbUser.email,
    isAdmin: dbUser.is_admin === 1,
    requiresPasswordChange: dbUser.temp_ativa === 1,
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
    'SELECT id, nome, email, temp_ativa, is_admin, created_at, last_login FROM users ORDER BY created_at ASC'
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
      'UPDATE users SET nome = ?, email = ?, senha_hash = NULL, senha_temp = ?, temp_ativa = 1, updated_at = unixepoch() WHERE id = ?'
    ).run(nome, email, hashPassword(senhaTmp), id);
  } else {
    db.prepare(
      'UPDATE users SET nome = ?, email = ?, updated_at = unixepoch() WHERE id = ?'
    ).run(nome, email, id);
  }

  const updated = db.prepare(
    'SELECT id, nome, email, temp_ativa, is_admin, created_at, last_login FROM users WHERE id = ?'
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
  const campaignId = char.campaign_id ?? null;
  db.prepare('INSERT INTO characters (id, data, user_id, campaign_id) VALUES (?, ?, ?, ?)')
    .run(char.id, JSON.stringify(char), req.user!.userId, campaignId);
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

  const campaignId = char.campaign_id ?? null;
  db.prepare('UPDATE characters SET data = ?, campaign_id = ?, updated_at = unixepoch() WHERE id = ?')
    .run(JSON.stringify(char), campaignId, id);

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

// ── Campaigns ────────────────────────────────────────────────────────────────

function generateCampaignCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  let attempts = 0;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    if (++attempts > 100) throw new Error('Falha ao gerar código');
  } while (db.prepare('SELECT id FROM campaigns WHERE codigo = ?').get(code));
  return code;
}

// POST /api/campaigns — criar campanha
app.post('/api/campaigns', requireAuth, (req: Request, res: Response) => {
  const { nome } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'nome é obrigatório' });
  const id = uid();
  const codigo = generateCampaignCode();
  const userId = req.user!.userId;
  db.prepare('INSERT INTO campaigns (id, nome, codigo, criador_id) VALUES (?, ?, ?, ?)').run(id, nome.trim(), codigo, userId);
  db.prepare("INSERT INTO campaign_members (campaign_id, user_id, status) VALUES (?, ?, 'aprovado')").run(id, userId);
  res.status(201).json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id));
});

// GET /api/campaigns — listar minhas campanhas
app.get('/api/campaigns', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const rows = db.prepare(`
    SELECT c.*, cm.status as meu_status,
      (SELECT COUNT(*) FROM campaign_members WHERE campaign_id = c.id AND status = 'aprovado') as total_membros,
      (SELECT COUNT(*) FROM campaign_members WHERE campaign_id = c.id AND status = 'pendente') as total_pendentes,
      u.nome as criador_nome
    FROM campaigns c
    JOIN campaign_members cm ON c.id = cm.campaign_id AND cm.user_id = ?
    JOIN users u ON c.criador_id = u.id
    ORDER BY c.created_at DESC
  `).all(userId);
  res.json(rows);
});

// POST /api/campaigns/join — entrar com código
app.post('/api/campaigns/join', requireAuth, (req: Request, res: Response) => {
  const { codigo } = req.body;
  if (!codigo) return res.status(400).json({ error: 'codigo é obrigatório' });
  const campaign = db.prepare('SELECT * FROM campaigns WHERE codigo = ?').get(codigo) as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  const existing = db.prepare('SELECT status FROM campaign_members WHERE campaign_id = ? AND user_id = ?').get(campaign.id, req.user!.userId);
  if (existing) return res.status(409).json({ error: 'Você já está nesta campanha' });
  db.prepare("INSERT INTO campaign_members (campaign_id, user_id, status) VALUES (?, ?, 'pendente')").run(campaign.id, req.user!.userId);
  res.status(201).json({ campaign_id: campaign.id, campaign_nome: campaign.nome, status: 'pendente' });
});

// GET /api/campaigns/:id — detalhes + membros
app.get('/api/campaigns/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const campaign = db.prepare(`
    SELECT c.*, u.nome as criador_nome,
      (SELECT COUNT(*) FROM campaign_members WHERE campaign_id = c.id AND status = 'aprovado') as total_membros
    FROM campaigns c JOIN users u ON c.criador_id = u.id WHERE c.id = ?
  `).get(id) as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  const isCreator = campaign.criador_id === userId;
  const member = db.prepare('SELECT status FROM campaign_members WHERE campaign_id = ? AND user_id = ?').get(id, userId) as any;
  if (!isCreator && (!member || member.status !== 'aprovado')) return res.status(403).json({ error: 'Acesso negado' });
  const membros = db.prepare(`
    SELECT cm.user_id, cm.status, cm.joined_at, u.nome, u.email
    FROM campaign_members cm JOIN users u ON cm.user_id = u.id
    WHERE cm.campaign_id = ? ORDER BY cm.joined_at ASC
  `).all(id);
  res.json({ ...campaign, membros, isCreator });
});

// DELETE /api/campaigns/:id — deletar campanha (só criador)
app.delete('/api/campaigns/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  if (campaign.criador_id !== req.user!.userId) return res.status(403).json({ error: 'Apenas o criador pode excluir' });
  const chars = db.prepare('SELECT id, data FROM characters WHERE campaign_id = ?').all(id) as any[];
  for (const c of chars) {
    const data = JSON.parse(c.data);
    delete data.campaign_id; delete data.privado;
    db.prepare('UPDATE characters SET data = ?, campaign_id = NULL WHERE id = ?').run(JSON.stringify(data), c.id);
  }
  db.prepare('DELETE FROM campaign_members WHERE campaign_id = ?').run(id);
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
  res.json({ ok: true });
});

// POST /api/campaigns/:id/members/:uid/approve — aprovar membro
app.post('/api/campaigns/:id/members/:uid/approve', requireAuth, (req: Request, res: Response) => {
  const { id, uid: targetUid } = req.params;
  const campaign = db.prepare('SELECT criador_id FROM campaigns WHERE id = ?').get(id) as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  if (campaign.criador_id !== req.user!.userId) return res.status(403).json({ error: 'Apenas o criador pode aprovar' });
  const result = db.prepare(`UPDATE campaign_members SET status = 'aprovado' WHERE campaign_id = ? AND user_id = ?`).run(id, targetUid);
  if (result.changes === 0) return res.status(404).json({ error: 'Membro não encontrado' });
  res.json({ ok: true });
});

// DELETE /api/campaigns/:id/members/:uid — remover membro
app.delete('/api/campaigns/:id/members/:uid', requireAuth, (req: Request, res: Response) => {
  const { id, uid: targetUid } = req.params;
  const userId = req.user!.userId;
  const campaign = db.prepare('SELECT criador_id FROM campaigns WHERE id = ?').get(id) as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  const isCreator = campaign.criador_id === userId;
  const isSelf = userId === targetUid;
  if (!isCreator && !isSelf) return res.status(403).json({ error: 'Acesso negado' });
  if (targetUid === campaign.criador_id) return res.status(400).json({ error: 'O criador não pode ser removido' });
  const chars = db.prepare('SELECT id, data FROM characters WHERE campaign_id = ? AND user_id = ?').all(id, targetUid) as any[];
  for (const c of chars) {
    const data = JSON.parse(c.data);
    delete data.campaign_id;
    db.prepare('UPDATE characters SET data = ?, campaign_id = NULL WHERE id = ?').run(JSON.stringify(data), c.id);
  }
  db.prepare('DELETE FROM campaign_members WHERE campaign_id = ? AND user_id = ?').run(id, targetUid);
  res.json({ ok: true });
});

// GET /api/campaigns/:id/characters — personagens visíveis na campanha
app.get('/api/campaigns/:id/characters', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const campaign = db.prepare('SELECT criador_id FROM campaigns WHERE id = ?').get(id) as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  const member = db.prepare('SELECT status FROM campaign_members WHERE campaign_id = ? AND user_id = ?').get(id, userId) as any;
  if (!member || member.status !== 'aprovado') return res.status(403).json({ error: 'Acesso negado' });
  const isCreator = campaign.criador_id === userId;
  const rows = isCreator
    ? db.prepare(`SELECT c.data, u.id as owner_id, u.nome as owner_nome FROM characters c LEFT JOIN users u ON c.user_id = u.id WHERE c.campaign_id = ?`).all(id) as any[]
    : db.prepare(`SELECT c.data, u.id as owner_id, u.nome as owner_nome FROM characters c LEFT JOIN users u ON c.user_id = u.id WHERE c.campaign_id = ? AND (COALESCE(JSON_EXTRACT(c.data, '$.privado'), 0) = 0 OR c.user_id = ?)`).all(id, userId) as any[];
  res.json(rows.map((r: any) => ({ ...JSON.parse(r.data), _owner: r.owner_id ? { id: r.owner_id, nome: r.owner_nome } : null })));
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
