#!/bin/sh
set -e

DB_FILE="${DB_PATH:-/app/data/daggerheart.db}"

COUNT=$(node -e "
  try {
    const Database = require('better-sqlite3');
    const db = new Database('${DB_FILE}');
    const row = db.prepare('SELECT COUNT(*) as n FROM cards').get();
    console.log(row ? row.n : 0);
  } catch(e) {
    console.log(0);
  }
" 2>/dev/null || echo "0")

if [ "$COUNT" = "0" ]; then
  echo "==> Banco vazio, executando seeder..."
  npm run seed
  echo "==> Seeder concluído."
fi

exec npm run dev
