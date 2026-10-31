#!/bin/bash
# -------------------------------------------------------------
# Script to run Jetts Fitness Tracker locally or over Tailscale
# -------------------------------------------------------------

PORT=8080
TAILSCALE_BIN="/Applications/Tailscale.app/Contents/MacOS/Tailscale"

case "$1" in
  docker)
    echo "🐳 Starting with Docker Compose..."
    docker compose up -d
    echo "✅ Running at http://localhost:$PORT"
    ;;
  stop)
    echo "🛑 Stopping Docker container..."
    docker compose down
    ;;
  tailscale)
    if [ -x "$TAILSCALE_BIN" ]; then
      echo "🔒 Setting up Tailscale Serve with HTTPS (Recommended for PWA)..."
      # First run a local python or docker server, then tailscale serve
      python3 -m http.server $PORT --directory . > /dev/null 2>&1 &
      SERVER_PID=$!
      echo "Started local server (PID: $SERVER_PID)"
      $TAILSCALE_BIN serve --bg $PORT
      echo "✅ Tailscale Serve is active! Check your Tailscale HTTPS URL with: $TAILSCALE_BIN serve status"
    else
      echo "❌ Tailscale CLI not found at $TAILSCALE_BIN"
    fi
    ;;
  *)
    echo "🚀 Starting simple HTTP server on port $PORT..."
    python3 -m http.server $PORT
    ;;
esac
