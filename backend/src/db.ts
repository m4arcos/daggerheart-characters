import pg from 'pg';

// Parse BIGINT (OID 20) as JavaScript number instead of string
pg.types.setTypeParser(20, (val: string) => parseInt(val, 10));

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/daggerheart';

export const pool = new pg.Pool({ connectionString: DATABASE_URL });

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      user_id TEXT,
      campaign_id TEXT,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cards (
      id SERIAL PRIMARY KEY,
      num INTEGER NOT NULL UNIQUE,
      tipo TEXT NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT NOT NULL,
      dominio_key TEXT,
      subclasse_nome TEXT,
      classe TEXT,
      nome_classe TEXT,
      nivel_subclasse TEXT,
      atributo_conjuracao TEXT,
      nivel_dominio INTEGER,
      custo INTEGER,
      card_tipo TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT,
      senha_temp TEXT NOT NULL,
      temp_ativa BOOLEAN DEFAULT TRUE,
      is_admin BOOLEAN DEFAULT FALSE,
      last_login BIGINT,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      updated_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      codigo TEXT NOT NULL UNIQUE,
      criador_id TEXT NOT NULL,
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaign_members (
      campaign_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      joined_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      PRIMARY KEY (campaign_id, user_id)
    )
  `);
}

export async function clearAll(): Promise<void> {
  await pool.query('DELETE FROM campaign_members');
  await pool.query('DELETE FROM characters');
  await pool.query('DELETE FROM cards');
  await pool.query('DELETE FROM campaigns');
  await pool.query('DELETE FROM users');
}

export default pool;
