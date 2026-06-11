#!/bin/sh
set -e

echo "==> Aguardando PostgreSQL ficar pronto..."
until node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1').then(() => { pool.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  echo "  PostgreSQL ainda não está pronto, aguardando..."
  sleep 2
done
echo "  PostgreSQL ok."

echo "==> Executando seeder..."
npm run seed
echo "==> Seeder concluído."

exec npm run dev
