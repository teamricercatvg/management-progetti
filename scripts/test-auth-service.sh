#!/usr/bin/env bash
# Real GoTrue in disposable containers: no external network, SMTP or production DB.
set -euo pipefail
cd "$(dirname "$0")/.."
COPYFILE_DISABLE=1 tar --no-xattrs -czf - supabase/migrations scripts/test-auth-service-server.py |
 bash scripts/server.sh 'set -eu; work=$(mktemp -d /tmp/ariadne-auth-XXXXXXXX); trap '\''rm -rf -- "$work"'\'' EXIT; tar -xzf - -C "$work"; python3 "$work/scripts/test-auth-service-server.py" "$work"'
