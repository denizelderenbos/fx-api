#!/bin/sh
# Runs `node ace fx:sync` from cron. Cron starts with an almost empty
# environment, so this loads nvm (when present) to find node, and appends
# all output with a timestamp to tmp/logs/fx_sync.log.
set -u

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$BACKEND_DIR/tmp/logs"
mkdir -p "$LOG_DIR"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use --silent default >/dev/null
fi

cd "$BACKEND_DIR" || exit 1
{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z')"
  node ace fx:sync
  echo "=== exit $?"
} >>"$LOG_DIR/fx_sync.log" 2>&1
