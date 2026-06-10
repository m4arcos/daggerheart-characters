import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/daggerheart.db');

if (dbPath !== ':memory:') {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    user_id TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT,
    senha_temp TEXT NOT NULL,
    temp_ativa INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  )
`);

// Migration: add user_id to characters if it doesn't exist yet
try {
  db.exec('ALTER TABLE characters ADD COLUMN user_id TEXT');
} catch (_) { /* column already exists */ }

// Migration: add last_login to users if it doesn't exist yet
try {
  db.exec('ALTER TABLE users ADD COLUMN last_login INTEGER');
} catch (_) { /* column already exists */ }

export function clearAll(): void {
  db.exec('DELETE FROM characters');
  db.exec('DELETE FROM cards');
  db.exec('DELETE FROM users');
}

export default db;
