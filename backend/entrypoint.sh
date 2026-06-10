#!/bin/sh
set -e

echo "==> Verificando dependências..."
node -e "require('bcryptjs')" 2>/dev/null || npm install bcryptjs jsonwebtoken --save --silent
node -e "require('bcryptjs')" 2>/dev/null && echo "  bcryptjs ok" || echo "  AVISO: bcryptjs não disponível"

echo "==> Executando seeder..."
npm run seed
echo "==> Seeder concluído."

exec npm run dev
