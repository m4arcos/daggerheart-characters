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

export function clearAll(): void {
  db.exec('DELETE FROM characters');
  db.exec('DELETE FROM cards');
}

export default db;
