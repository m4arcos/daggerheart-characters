import express, { Request, Response } from 'express';
import cors from 'cors';
import db from './db';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/characters', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT data FROM characters ORDER BY created_at ASC').all() as { data: string }[];
  res.json(rows.map(r => JSON.parse(r.data)));
});

app.post('/api/characters', (req: Request, res: Response) => {
  const char = req.body;
  if (!char?.id || !char?.nome) {
    return res.status(400).json({ error: 'id e nome são obrigatórios' });
  }
  db.prepare('INSERT INTO characters (id, data) VALUES (?, ?)').run(char.id, JSON.stringify(char));
  res.status(201).json(char);
});

app.put('/api/characters/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const char = req.body;
  const result = db.prepare(
    'UPDATE characters SET data = ?, updated_at = unixepoch() WHERE id = ?'
  ).run(JSON.stringify(char), id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Personagem não encontrado' });
  }
  res.json(char);
});

app.delete('/api/characters/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM characters WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Personagem não encontrado' });
  }
  res.json({ ok: true });
});

app.get('/api/cards', (req: Request, res: Response) => {
  const { tipo, dominio_key, q, card_tipo, classe } = req.query as Record<string, string>;

  let query = 'SELECT * FROM cards WHERE 1=1';
  const params: (string | number)[] = [];

  if (tipo) {
    query += ' AND tipo = ?';
    params.push(tipo);
  }
  if (dominio_key) {
    query += ' AND dominio_key = ?';
    params.push(dominio_key);
  }
  if (card_tipo) {
    query += ' AND card_tipo = ?';
    params.push(card_tipo);
  }
  if (classe) {
    query += ' AND classe = ?';
    params.push(classe);
  }
  if (q) {
    const term = `%${q}%`;
    query += ' AND (nome LIKE ? OR descricao LIKE ? OR subclasse_nome LIKE ?)';
    params.push(term, term, term);
  }

  query += ' ORDER BY num ASC';

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = parseInt(process.env.PORT || '3001');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend rodando na porta ${PORT}`);
  });
}
