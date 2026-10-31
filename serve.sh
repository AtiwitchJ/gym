#!/bin/bash
# -------------------------------------------------------------
# Script to run Atiwitch Workout Tracker locally or over Tailscale
# -------------------------------------------------------------

PORT=8080
TAILSCALE_BIN="/Applications/Tailscale.app/Contents/MacOS/Tailscale"

case "$1" in
  docker)
    echo "🐳 Building & starting with Docker Compose (Node.js + SQLite)..."
    docker compose up -d --build
    echo "✅ Running at http://localhost:$PORT"
    ;;
  stop)
    echo "🛑 Stopping Docker container..."
    docker compose down
    ;;
  tailscale)
    echo "🔒 Starting Server & configuring Tailscale VPN..."
    docker compose up -d --build
    if [ -x "$TAILSCALE_BIN" ]; then
      $TAILSCALE_BIN serve --bg $PORT
      echo "✅ Tailscale Serve is active! Status:"
      $TAILSCALE_BIN serve status
    else
      echo "✅ Docker container running on port $PORT."
      echo "Connect directly via your Tailscale IP on port $PORT (e.g., http://<your-tailscale-ip>:$PORT)"
    fi
    ;;
  native)
    echo "🚀 Building frontend and running native server..."
    npm run build
    node server/server.js
    ;;
  dev)
    echo "🛠️ Starting Dev mode (Vite on :5173 + API on :8080)..."
    node server/server.js &
    API_PID=$!
    npm run dev
    kill $API_PID
    ;;
  *)
    echo "Usage: ./serve.sh [docker | stop | tailscale | native | dev]"
    echo ""
    echo "  docker    - Build & run in Docker container (recommended)"
    echo "  tailscale - Run via Docker and activate Tailscale HTTPS serve"
    echo "  native    - Run Node.js + SQLite natively on Mac"
    echo "  dev       - Run Vite hot-reload dev server"
    echo "  stop      - Stop running container"
    ;;
esac
