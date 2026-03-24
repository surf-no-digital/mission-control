#!/bin/bash
# Surf Command Center — start script
cd "$(dirname "$0")/.."
PORT=${PORT:-3366}

echo "🏄 Starting Surf Command Center on port $PORT..."
NODE_ENV=production exec npx next start -H 0.0.0.0 -p "$PORT"
