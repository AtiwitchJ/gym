#!/bin/bash
# Script to run Jetts Fitness Tracker locally or for VPN access

PORT=${PORT:-8080}

if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "🐳 Starting with Docker Compose on port $PORT..."
    PORT=$PORT docker compose up -d --build
    echo "✅ Running! Access via http://localhost:$PORT or http://<VPN-IP>:$PORT"
else
    echo "🐍 Docker not running or not found. Starting with Python HTTP server on port $PORT..."
    python3 -m http.server $PORT
fi
