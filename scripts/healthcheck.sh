#!/bin/bash
# Surf Command Center — healthcheck + auto-restart
# Usage: run via cron every minute
# */1 * * * * /home/node/.openclaw/workspace/mission-control/scripts/healthcheck.sh

PORT=${PORT:-3366}
LOG="/tmp/mission-control-health.log"
MC_DIR="/home/node/.openclaw/workspace/mission-control"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$PORT/api/health" 2>/dev/null)

if [ "$HTTP_CODE" != "200" ]; then
  echo "[$(date -u)] UNHEALTHY (HTTP $HTTP_CODE) — restarting..." >> "$LOG"
  pkill -f "next start.*$PORT" 2>/dev/null
  sleep 2
  cd "$MC_DIR"
  NODE_ENV=production PORT=$PORT nohup npx next start -H 0.0.0.0 -p "$PORT" >> /tmp/mission-control.log 2>&1 &
  echo "[$(date -u)] Restarted (PID $!)" >> "$LOG"
else
  MINUTE=$(date +%M)
  if [ $((MINUTE % 10)) -eq 0 ]; then
    echo "[$(date -u)] HEALTHY" >> "$LOG"
  fi
fi
