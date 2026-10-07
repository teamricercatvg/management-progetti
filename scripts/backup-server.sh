#!/usr/bin/env bash
# Da installare sul server: backup locali, con retention di 14 giorni.
set -euo pipefail
umask 077
service_id=d4urni99thsq3vsnxxkckjzh
db="supabase-db-$service_id"
backup_root=/var/backups/management-progetti
mkdir -p "$backup_root"
exec 9>"$backup_root/.lock"
flock -n 9 || exit 0
stamp=$(date -u +%Y%m%dT%H%M%SZ)
work="$backup_root/.incomplete-$stamp"
mkdir "$work"
docker exec "$db" pg_dumpall -U supabase_admin --globals-only > "$work/supabase-globals.sql"
database_list=$(docker exec "$db" psql -U postgres -d postgres -Atc 'SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY datname')
mapfile -t databases <<< "$database_list"
for database in "${databases[@]}"; do
  [[ "$database" =~ ^[a-zA-Z0-9_-]+$ ]] || exit 1
  docker exec "$db" pg_dump -U supabase_admin -Fc "$database" > "$work/$database.dump"
  docker exec -i "$db" pg_restore --list < "$work/$database.dump" > /dev/null
done
# Physical cluster archive preserves Supabase internals, roles and grants exactly.
# Permit password-authenticated replication only over the container's local socket.
docker exec -u root "$db" sh -c 'grep -q "^local replication supabase_admin scram-sha-256$" /etc/postgresql/pg_hba.conf || echo "local replication supabase_admin scram-sha-256" >> /etc/postgresql/pg_hba.conf'
docker exec "$db" psql -U supabase_admin -d postgres -Atc 'SELECT pg_reload_conf()' > /dev/null
docker exec "$db" pg_basebackup -U supabase_admin -D - -Ft -X fetch --checkpoint=fast | gzip > "$work/supabase-cluster.tar.gz"
tar -tzf "$work/supabase-cluster.tar.gz" > /dev/null
# Verify the physical backup before publishing a completed directory.
verify_dir=$(mktemp -d "$backup_root/.verify-XXXXXXXX")
trap 'rm -rf -- "$verify_dir"' EXIT
tar -xzf "$work/supabase-cluster.tar.gz" -C "$verify_dir"
image=$(docker inspect "$db" --format '{{.Config.Image}}')
printf '%s\n' "$image" > "$work/POSTGRES_IMAGE"
docker run --rm --network none --user root -v "$verify_dir:/backup:ro" \
  --entrypoint pg_verifybackup "$image" /backup
rm -rf -- "$verify_dir"
trap - EXIT
docker exec coolify-db pg_dump -U coolify -Fc coolify > "$work/coolify.dump"
tar -czf "$work/configuration.tar.gz" -C / data/coolify/source data/coolify/ssh "data/coolify/services/$service_id" etc/nftables.conf
minio_data=$(docker inspect "supabase-minio-$service_id" --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}')
test -d "$minio_data"
tar -czf "$work/storage.tar.gz" -C "$minio_data" .
tar -tzf "$work/configuration.tar.gz" > /dev/null
tar -tzf "$work/storage.tar.gz" > /dev/null
(cd "$work" && sha256sum *.dump *.sql *.tar.gz POSTGRES_IMAGE > SHA256SUMS)
mv "$work" "$backup_root/$stamp"
find "$backup_root" -mindepth 1 -maxdepth 1 -type d -name '20*T*Z' -mtime +14 -exec rm -rf -- {} +
echo "Backup completed: $backup_root/$stamp"
