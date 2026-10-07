#!/usr/bin/env bash
# Run on Netcup with a completed Ariadne backup directory as argument.
set -euo pipefail
umask 077
backup=${1:?Usage: verify-restore.sh /var/backups/management-progetti/TIMESTAMP}
[[ "$backup" == /var/backups/management-progetti/20*T*Z ]] || exit 1
(cd "$backup" && sha256sum --check SHA256SUMS >/dev/null)
work=$(mktemp -d /var/backups/management-progetti/.restore-XXXXXXXX)
container="ariadne-restore-${work##*.restore-}"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf -- "$work"
}
trap cleanup EXIT
image=$(cat "$backup/POSTGRES_IMAGE")
[[ "$image" == supabase/postgres:* ]] || exit 1
tar -xzf "$backup/supabase-cluster.tar.gz" -C "$work"
docker run --rm --network none --user root -v "$work:/backup:ro" --entrypoint pg_verifybackup "$image" /backup
# Only the disposable copy is modified; production is never a restore target.
docker run --rm --network none --user root -v "$work:/restore" --entrypoint sh "$image" -c 'chown -R postgres:postgres /restore; chmod 700 /restore'
printf 'local all all trust\n' > "$work/restore_hba.conf"
chmod 644 "$work/restore_hba.conf"
docker run -d --name "$container" --network none --user postgres \
  -v "$work:/var/lib/postgresql/data" --entrypoint postgres "$image" \
  -D /var/lib/postgresql/data \
  -c config_file=/etc/postgresql/postgresql.conf \
  -c hba_file=/var/lib/postgresql/data/restore_hba.conf \
  -c "listen_addresses=" >/dev/null
ready=false
for attempt in $(seq 1 60); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [ "$ready" != true ]; then
  echo 'Restore did not become ready' >&2
  exit 1
fi
docker exec "$container" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c \
  'select current_database(); select count(*) as users from auth.users; select count(*) as buckets from storage.buckets;'
test "$(docker inspect "$container" --format '{{.HostConfig.NetworkMode}}')" = none
echo 'Isolated restore verified; disposable container and files removed on exit.'
