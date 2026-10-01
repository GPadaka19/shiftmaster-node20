#!/usr/bin/env bash
#
# Daily Postgres backup on the VPS. Keeps the last 14 dumps.
#
#   ./scripts/backup-db.sh                    # writes to ~/backups/shiftmaster
#   BACKUP_DIR=/srv/backups ./scripts/backup-db.sh
#
# Crontab (every night at 02:00 server time):
#   0 2 * * * $HOME/code/shiftmaster-v2/scripts/backup-db.sh >> $HOME/backups/shiftmaster/backup.log 2>&1
#
# Restore a dump into the running database (overwrites it):
#   gunzip -c shiftmaster-YYYY-MM-DD.sql.gz | sudo docker exec -i shiftmaster-db psql -U shiftmaster -d shiftmaster

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/shiftmaster}"
KEEP="${KEEP:-14}"
FILE="$BACKUP_DIR/shiftmaster-$(date +%F).sql.gz"

mkdir -p "$BACKUP_DIR"
umask 077

# --clean so a restore replaces existing tables instead of failing on them.
sudo docker exec shiftmaster-db pg_dump -U shiftmaster -d shiftmaster --clean --if-exists | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"

ls -1t "$BACKUP_DIR"/shiftmaster-*.sql.gz | tail -n +"$((KEEP + 1))" | xargs -r rm --
echo "$(date '+%F %T') backup ok: $FILE"
