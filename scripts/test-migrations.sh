#!/usr/bin/env bash
# Isolated PG15 test on the verified host. No production mounts, data or network.
set -euo pipefail
cd "$(dirname "$0")/.."
# Only this archive crosses SSH; no .env, credentials or application backups.
COPYFILE_DISABLE=1 tar --no-xattrs -czf - supabase/migrations supabase/tests scripts/test-migrations-server.sh |
  bash scripts/server.sh 'set -eu; work=$(mktemp -d /tmp/ariadne-m3-XXXXXXXX); trap '\''rm -rf -- "$work"'\'' EXIT; tar -xzf - -C "$work"; bash "$work/scripts/test-migrations-server.sh" "$work"'
