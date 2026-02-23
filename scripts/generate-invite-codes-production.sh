#!/usr/bin/env bash
#
# Generate invite codes against the production Turso database.
#
# Usage:
#   ./scripts/generate-invite-codes-production.sh                    # 1 code, no label
#   ./scripts/generate-invite-codes-production.sh 5                  # 5 codes, no label
#   ./scripts/generate-invite-codes-production.sh 5 "Beta batch 1"  # 5 codes with label
#
# Requires:
#   - TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars set
#     (or sourced from .env.local / .env.production)
#

set -euo pipefail

COUNT="${1:-1}"
LABEL="${2:-}"
APP_URL="${NEXT_PUBLIC_APP_URL:-https://round1.startround1.com}"

# Try to load env vars from .env.local if not already set
if [[ -z "${TURSO_DATABASE_URL:-}" ]]; then
  if [[ -f .env.local ]]; then
    export $(grep -E '^TURSO_(DATABASE_URL|AUTH_TOKEN)=' .env.local | xargs)
  elif [[ -f .env.production ]]; then
    export $(grep -E '^TURSO_(DATABASE_URL|AUTH_TOKEN)=' .env.production | xargs)
  fi
fi

if [[ -z "${TURSO_DATABASE_URL:-}" ]]; then
  echo "Error: TURSO_DATABASE_URL is not set. Set it in your environment or .env.local"
  exit 1
fi

echo "Generating ${COUNT} invite code(s)..."
if [[ -n "$LABEL" ]]; then
  echo "Label: ${LABEL}"
fi
echo ""

TURSO_DATABASE_URL="${TURSO_DATABASE_URL}" \
TURSO_AUTH_TOKEN="${TURSO_AUTH_TOKEN:-}" \
NEXT_PUBLIC_APP_URL="${APP_URL}" \
  npx tsx scripts/generate-invite-codes.ts --count "$COUNT" ${LABEL:+--label "$LABEL"}
