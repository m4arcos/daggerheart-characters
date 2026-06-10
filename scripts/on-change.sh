#!/bin/bash
# Hook disparado pelo Claude Code após cada Edit/Write.
# Lê o input do tool use (JSON) via stdin, extrai o file_path e decide o que fazer.

set -euo pipefail

REPO_ROOT="/home/m4arcos/workspace/daggerheart-characters"
FRONTEND="$REPO_ROOT/frontend"
BACKEND="$REPO_ROOT/backend"

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('file_path', ''))
except Exception:
    print('')
" 2>/dev/null || echo "")

# ── Testes frontend ──────────────────────────────────────────────────────────

NEEDS_FRONTEND_TEST=false

[[ "$FILE_PATH" == *"/frontend/src/"* ]]   && NEEDS_FRONTEND_TEST=true
[[ "$FILE_PATH" == *"/frontend/tests/"* ]] && NEEDS_FRONTEND_TEST=true

if $NEEDS_FRONTEND_TEST; then
    echo ""
    echo "▶ Alteração detectada em: $(basename "$FILE_PATH")"
    echo "▶ Executando testes do frontend..."
    echo "──────────────────────────────────────────"
    cd "$FRONTEND"
    npm test 2>&1
    echo "──────────────────────────────────────────"
fi

# ── Testes backend ───────────────────────────────────────────────────────────

NEEDS_BACKEND_TEST=false

[[ "$FILE_PATH" == *"/backend/src/"* ]]   && NEEDS_BACKEND_TEST=true
[[ "$FILE_PATH" == *"/backend/tests/"* ]] && NEEDS_BACKEND_TEST=true

if $NEEDS_BACKEND_TEST; then
    echo ""
    echo "▶ Alteração detectada em: $(basename "$FILE_PATH")"
    echo "▶ Executando testes do backend..."
    echo "──────────────────────────────────────────"
    cd "$BACKEND"
    npm test 2>&1
    echo "──────────────────────────────────────────"
fi

# ── Lembrete de documentação ─────────────────────────────────────────────────

NEEDS_DOCS=false

[[ "$FILE_PATH" == *"/frontend/src/screens/"*  ]] && NEEDS_DOCS=true
[[ "$FILE_PATH" == *"/frontend/src/store/"*    ]] && NEEDS_DOCS=true
[[ "$FILE_PATH" == *"/frontend/src/types/"*    ]] && NEEDS_DOCS=true
[[ "$FILE_PATH" == *"/backend/src/"*           ]] && NEEDS_DOCS=true

if $NEEDS_DOCS; then
    echo ""
    echo "📝 Verificar documentação:"
    echo "   • README.md — atualizar se a feature ou a API mudou"
    echo "   • CLAUDE.md — atualizar se a regra de negócio ou spec mudou"
fi

exit 0
