import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pool, { initDb } from './db';
import {
  requireAuth, requireAdmin,
  hashPassword, verifyPassword, generateToken,
  AuthUser,
} from './auth';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const app = express();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0] as {
    id: string; nome: string; email: string;
    senha_hash: string | null; senha_temp: string;
    temp_ativa: boolean; is_admin: boolean;
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

  await pool.query(
    'UPDATE users SET last_login = EXTRACT(EPOCH FROM NOW())::BIGINT WHERE id = $1',
    [user.id]
  );

  const authUser: AuthUser = {
    userId: user.id,
    nome: user.nome,
    email: user.email,
    isAdmin: user.is_admin === true,
    requiresPasswordChange,
  };

  res.json({ token: generateToken(authUser), user: authUser });
});

app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    'SELECT nome, email, temp_ativa, is_admin FROM users WHERE id = $1',
    [req.user!.userId]
  );
  const dbUser = rows[0] as { nome: string; email: string; temp_ativa: boolean; is_admin: boolean } | undefined;
  if (!dbUser) return res.status(401).json({ error: 'Usuário não encontrado' });
  const authUser: AuthUser = {
    userId: req.user!.userId,
    nome: dbUser.nome,
    email: dbUser.email,
    isAdmin: dbUser.is_admin === true,
    requiresPasswordChange: dbUser.temp_ativa === true,
  };
  res.json({ token: generateToken(authUser), user: authUser });
});

app.post('/api/auth/set-password', requireAuth, async (req: Request, res: Response) => {
  const { novaSenha } = req.body;
  if (!novaSenha || novaSenha.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
  }

  await pool.query(
    'UPDATE users SET senha_hash = $1, temp_ativa = FALSE, updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT WHERE id = $2',
    [hashPassword(novaSenha), req.user!.userId]
  );

  const authUser: AuthUser = {
    userId: req.user!.userId,
    nome: req.user!.nome,
    email: req.user!.email,
    isAdmin: req.user!.isAdmin,
    requiresPasswordChange: false,
  };

  res.json({ token: generateToken(authUser), user: authUser });
});

// POST /api/upload — upload de imagem
app.post('/api/upload', requireAuth, upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ── Admin ────────────────────────────────────────────────────────────────────

app.post('/api/admin/users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { nome, email, senhaTmp } = req.body;
  if (!nome || !email || !senhaTmp) {
    return res.status(400).json({ error: 'nome, email e senhaTmp são obrigatórios' });
  }

  const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Email já cadastrado' });
  }

  const id = uid();
  await pool.query(
    'INSERT INTO users (id, nome, email, senha_temp, temp_ativa) VALUES ($1, $2, $3, $4, TRUE)',
    [id, nome, email, hashPassword(senhaTmp)]
  );

  res.status(201).json({ id, nome, email });
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    'SELECT id, nome, email, temp_ativa, is_admin, created_at, last_login FROM users ORDER BY created_at ASC'
  );
  res.json(rows);
});

app.put('/api/admin/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome, email, senhaTmp } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ error: 'nome e email são obrigatórios' });
  }

  const { rows: existing } = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
  if (existing.length === 0) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const { rows: conflict } = await pool.query(
    'SELECT id FROM users WHERE email = $1 AND id != $2',
    [email, id]
  );
  if (conflict.length > 0) {
    return res.status(409).json({ error: 'Email já está em uso por outro usuário' });
  }

  if (senhaTmp) {
    await pool.query(
      'UPDATE users SET nome = $1, email = $2, senha_hash = NULL, senha_temp = $3, temp_ativa = TRUE, updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT WHERE id = $4',
      [nome, email, hashPassword(senhaTmp), id]
    );
  } else {
    await pool.query(
      'UPDATE users SET nome = $1, email = $2, updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT WHERE id = $3',
      [nome, email, id]
    );
  }

  const { rows } = await pool.query(
    'SELECT id, nome, email, temp_ativa, is_admin, created_at, last_login FROM users WHERE id = $1',
    [id]
  );
  res.json(rows[0]);
});

// ── Characters ───────────────────────────────────────────────────────────────

app.get('/api/characters', requireAuth, async (req: Request, res: Response) => {
  if (req.user!.isAdmin) {
    const { rows } = await pool.query(`
      SELECT c.data, u.id as owner_id, u.nome as owner_nome, u.email as owner_email
      FROM characters c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at ASC
    `) as { rows: { data: string; owner_id: string; owner_nome: string; owner_email: string }[] };

    return res.json(rows.map(r => ({
      ...JSON.parse(r.data),
      _owner: r.owner_id ? { id: r.owner_id, nome: r.owner_nome, email: r.owner_email } : null,
    })));
  }

  const { rows } = await pool.query(
    'SELECT data FROM characters WHERE user_id = $1 ORDER BY created_at ASC',
    [req.user!.userId]
  ) as { rows: { data: string }[] };

  res.json(rows.map(r => JSON.parse(r.data)));
});

app.post('/api/characters', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _owner, ...char } = req.body;
  if (!char?.id || !char?.nome) {
    return res.status(400).json({ error: 'id e nome são obrigatórios' });
  }
  const campaignId = char.campaign_id ?? null;
  try {
    await pool.query(
      'INSERT INTO characters (id, data, user_id, campaign_id) VALUES ($1, $2, $3, $4)',
      [char.id, JSON.stringify(char), req.user!.userId, campaignId]
    );
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Personagem com este id já existe' });
    }
    return next(err);
  }
  res.status(201).json(char);
});

app.put('/api/characters/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _owner, ...char } = req.body;
  const { isAdmin, userId } = req.user!;

  const query = isAdmin
    ? 'SELECT user_id FROM characters WHERE id = $1'
    : 'SELECT user_id FROM characters WHERE id = $1 AND user_id = $2';
  const params = isAdmin ? [id] : [id, userId];

  const { rows } = await pool.query(query, params);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Personagem não encontrado' });
  }

  const campaignId = char.campaign_id ?? null;
  await pool.query(
    'UPDATE characters SET data = $1, campaign_id = $2, updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT WHERE id = $3',
    [JSON.stringify(char), campaignId, id]
  );

  res.json(char);
});

app.delete('/api/characters/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isAdmin, userId } = req.user!;

  const query = isAdmin
    ? 'SELECT user_id FROM characters WHERE id = $1'
    : 'SELECT user_id FROM characters WHERE id = $1 AND user_id = $2';
  const params = isAdmin ? [id] : [id, userId];

  const { rows } = await pool.query(query, params);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Personagem não encontrado' });
  }

  await pool.query('DELETE FROM characters WHERE id = $1', [id]);
  res.json({ ok: true });
});

// ── Campaigns ────────────────────────────────────────────────────────────────

async function generateCampaignCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 100; i++) {
    const code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const { rows } = await pool.query('SELECT id FROM campaigns WHERE codigo = $1', [code]);
    if (rows.length === 0) return code;
  }
  throw new Error('Falha ao gerar código único');
}

// POST /api/campaigns — criar campanha
app.post('/api/campaigns', requireAuth, async (req: Request, res: Response) => {
  const { nome } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'nome é obrigatório' });
  const id = uid();
  const codigo = await generateCampaignCode();
  const userId = req.user!.userId;
  await pool.query(
    'INSERT INTO campaigns (id, nome, codigo, criador_id) VALUES ($1, $2, $3, $4)',
    [id, nome.trim(), codigo, userId]
  );
  await pool.query(
    "INSERT INTO campaign_members (campaign_id, user_id, status) VALUES ($1, $2, 'aprovado')",
    [id, userId]
  );
  const { rows } = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
  res.status(201).json(rows[0]);
});

// GET /api/campaigns — listar minhas campanhas
app.get('/api/campaigns', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { rows } = await pool.query(`
    SELECT c.*, cm.status as meu_status,
      (SELECT COUNT(*)::INTEGER FROM campaign_members WHERE campaign_id = c.id AND status = 'aprovado') as total_membros,
      (SELECT COUNT(*)::INTEGER FROM campaign_members WHERE campaign_id = c.id AND status = 'pendente') as total_pendentes,
      u.nome as criador_nome
    FROM campaigns c
    JOIN campaign_members cm ON c.id = cm.campaign_id AND cm.user_id = $1
    JOIN users u ON c.criador_id = u.id
    ORDER BY c.created_at DESC
  `, [userId]);
  res.json(rows);
});

// POST /api/campaigns/join — entrar com código
app.post('/api/campaigns/join', requireAuth, async (req: Request, res: Response) => {
  const { codigo } = req.body;
  if (!codigo) return res.status(400).json({ error: 'codigo é obrigatório' });
  const { rows: campRows } = await pool.query('SELECT * FROM campaigns WHERE codigo = $1', [codigo]);
  const campaign = campRows[0] as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  const { rows: memberRows } = await pool.query(
    'SELECT status FROM campaign_members WHERE campaign_id = $1 AND user_id = $2',
    [campaign.id, req.user!.userId]
  );
  if (memberRows.length > 0) return res.status(409).json({ error: 'Você já está nesta campanha' });
  await pool.query(
    "INSERT INTO campaign_members (campaign_id, user_id, status) VALUES ($1, $2, 'pendente')",
    [campaign.id, req.user!.userId]
  );
  res.status(201).json({ campaign_id: campaign.id, campaign_nome: campaign.nome, status: 'pendente' });
});

// GET /api/campaigns/:id — detalhes + membros
app.get('/api/campaigns/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const { rows: campRows } = await pool.query(`
    SELECT c.*, u.nome as criador_nome,
      (SELECT COUNT(*)::INTEGER FROM campaign_members WHERE campaign_id = c.id AND status = 'aprovado') as total_membros
    FROM campaigns c JOIN users u ON c.criador_id = u.id WHERE c.id = $1
  `, [id]);
  const campaign = campRows[0] as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  const isCreator = campaign.criador_id === userId;
  const { rows: memberRows } = await pool.query(
    'SELECT status FROM campaign_members WHERE campaign_id = $1 AND user_id = $2',
    [id, userId]
  );
  const member = memberRows[0] as any;
  if (!isCreator && (!member || member.status !== 'aprovado')) return res.status(403).json({ error: 'Acesso negado' });
  const { rows: membros } = await pool.query(`
    SELECT cm.user_id, cm.status, cm.joined_at, u.nome, u.email
    FROM campaign_members cm JOIN users u ON cm.user_id = u.id
    WHERE cm.campaign_id = $1 ORDER BY cm.joined_at ASC
  `, [id]);
  res.json({ ...campaign, membros, isCreator });
});

// PATCH /api/campaigns/:id — atualizar campanha (nome, cover_image)
app.patch('/api/campaigns/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows: campRows } = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
  const campaign = campRows[0] as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  if (campaign.criador_id !== req.user!.userId) return res.status(403).json({ error: 'Apenas o criador pode editar' });
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (req.body.nome !== undefined) { fields.push(`nome = $${idx++}`); values.push(req.body.nome.trim()); }
  if (req.body.cover_image !== undefined) { fields.push(`cover_image = $${idx++}`); values.push(req.body.cover_image); }
  if (req.body.status !== undefined) {
    const validStatus = ['ativa', 'pausada', 'arquivada'];
    if (!validStatus.includes(req.body.status)) return res.status(400).json({ error: 'Status inválido' });
    fields.push(`status = $${idx++}`); values.push(req.body.status);
  }
  if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  values.push(id);
  await pool.query(`UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${idx}`, values);
  const { rows } = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
  res.json(rows[0]);
});

// DELETE /api/campaigns/:id — deletar campanha (só criador)
app.delete('/api/campaigns/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rows: campRows } = await pool.query('SELECT * FROM campaigns WHERE id = $1', [id]);
  const campaign = campRows[0] as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  if (campaign.criador_id !== req.user!.userId) return res.status(403).json({ error: 'Apenas o criador pode excluir' });
  const { rows: chars } = await pool.query(
    'SELECT id, data FROM characters WHERE campaign_id = $1',
    [id]
  ) as { rows: { id: string; data: string }[] };
  for (const c of chars) {
    const data = JSON.parse(c.data);
    delete data.campaign_id; delete data.privado;
    await pool.query(
      'UPDATE characters SET data = $1, campaign_id = NULL WHERE id = $2',
      [JSON.stringify(data), c.id]
    );
  }
  await pool.query('DELETE FROM campaign_members WHERE campaign_id = $1', [id]);
  await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
  res.json({ ok: true });
});

// POST /api/campaigns/:id/members/:uid/approve — aprovar membro
app.post('/api/campaigns/:id/members/:uid/approve', requireAuth, async (req: Request, res: Response) => {
  const { id, uid: targetUid } = req.params;
  const { rows: campRows } = await pool.query('SELECT criador_id FROM campaigns WHERE id = $1', [id]);
  const campaign = campRows[0] as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  if (campaign.criador_id !== req.user!.userId) return res.status(403).json({ error: 'Apenas o criador pode aprovar' });
  const result = await pool.query(
    "UPDATE campaign_members SET status = 'aprovado' WHERE campaign_id = $1 AND user_id = $2",
    [id, targetUid]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Membro não encontrado' });
  res.json({ ok: true });
});

// DELETE /api/campaigns/:id/members/:uid — remover membro
app.delete('/api/campaigns/:id/members/:uid', requireAuth, async (req: Request, res: Response) => {
  const { id, uid: targetUid } = req.params;
  const userId = req.user!.userId;
  const { rows: campRows } = await pool.query('SELECT criador_id FROM campaigns WHERE id = $1', [id]);
  const campaign = campRows[0] as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  const isCreator = campaign.criador_id === userId;
  const isSelf = userId === targetUid;
  if (!isCreator && !isSelf) return res.status(403).json({ error: 'Acesso negado' });
  if (targetUid === campaign.criador_id) return res.status(400).json({ error: 'O criador não pode ser removido' });
  const { rows: chars } = await pool.query(
    'SELECT id, data FROM characters WHERE campaign_id = $1 AND user_id = $2',
    [id, targetUid]
  ) as { rows: { id: string; data: string }[] };
  for (const c of chars) {
    const data = JSON.parse(c.data);
    delete data.campaign_id;
    await pool.query(
      'UPDATE characters SET data = $1, campaign_id = NULL WHERE id = $2',
      [JSON.stringify(data), c.id]
    );
  }
  await pool.query(
    'DELETE FROM campaign_members WHERE campaign_id = $1 AND user_id = $2',
    [id, targetUid]
  );
  res.json({ ok: true });
});

// GET /api/campaigns/:id/characters — personagens visíveis na campanha
app.get('/api/campaigns/:id/characters', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const { rows: campRows } = await pool.query('SELECT criador_id FROM campaigns WHERE id = $1', [id]);
  const campaign = campRows[0] as any;
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  const { rows: memberRows } = await pool.query(
    'SELECT status FROM campaign_members WHERE campaign_id = $1 AND user_id = $2',
    [id, userId]
  );
  const member = memberRows[0] as any;
  if (!member || member.status !== 'aprovado') return res.status(403).json({ error: 'Acesso negado' });
  const isCreator = campaign.criador_id === userId;
  const charQuery = isCreator
    ? `SELECT c.data, u.id as owner_id, u.nome as owner_nome
       FROM characters c LEFT JOIN users u ON c.user_id = u.id
       WHERE c.campaign_id = $1`
    : `SELECT c.data, u.id as owner_id, u.nome as owner_nome
       FROM characters c LEFT JOIN users u ON c.user_id = u.id
       WHERE c.campaign_id = $1 AND (COALESCE((c.data::jsonb->>'privado')::boolean, FALSE) = FALSE OR c.user_id = $2)`;
  const charParams = isCreator ? [id] : [id, userId];
  const { rows } = await pool.query(charQuery, charParams) as { rows: { data: string; owner_id: string; owner_nome: string }[] };
  res.json(rows.map(r => ({ ...JSON.parse(r.data), _owner: r.owner_id ? { id: r.owner_id, nome: r.owner_nome } : null })));
});

// ── Cards (público) ───────────────────────────────────────────────────────────

app.get('/api/cards', requireAuth, async (req: Request, res: Response) => {
  const { tipo, dominio_key, q, card_tipo, classe } = req.query as Record<string, string>;

  let query = 'SELECT * FROM cards WHERE 1=1';
  const params: (string | number)[] = [];
  let paramIdx = 1;

  if (tipo) { query += ` AND tipo = $${paramIdx++}`; params.push(tipo); }
  if (dominio_key) { query += ` AND dominio_key = $${paramIdx++}`; params.push(dominio_key); }
  if (card_tipo) { query += ` AND card_tipo = $${paramIdx++}`; params.push(card_tipo); }
  if (classe) { query += ` AND classe = $${paramIdx++}`; params.push(classe); }
  if (q) {
    const term = `%${q}%`;
    query += ` AND (nome ILIKE $${paramIdx} OR descricao ILIKE $${paramIdx + 1} OR subclasse_nome ILIKE $${paramIdx + 2} OR CAST(num AS TEXT) ILIKE $${paramIdx + 3})`;
    params.push(term, term, term, term);
    paramIdx += 4;
  }

  query += ' ORDER BY num ASC';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = parseInt(process.env.PORT || '3001');
  initDb().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend rodando na porta ${PORT}`);
    });
  });
}
