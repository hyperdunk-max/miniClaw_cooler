#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[deploy] project: $ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "[error] docker not found"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[error] docker compose not found"
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "[info] .env created from .env.example"
fi

get_env() {
  local key="$1"
  local value
  value=$(grep -E "^${key}=" .env | tail -n 1 | cut -d'=' -f2- || true)
  echo "$value"
}

APP_ID="$(get_env FEISHU_APP_ID)"
APP_SECRET="$(get_env FEISHU_APP_SECRET)"
LLM_KEY="$(get_env LLM_API_KEY)"
PORT_VALUE="$(get_env PORT)"

if [[ -z "${APP_ID}" || "$APP_ID" == *"xxx"* ]]; then
  echo "[error] FEISHU_APP_ID is missing or placeholder"
  exit 1
fi
if [[ -z "${APP_SECRET}" || "$APP_SECRET" == *"xxx"* ]]; then
  echo "[error] FEISHU_APP_SECRET is missing or placeholder"
  exit 1
fi
if [[ -z "${LLM_KEY}" || "$LLM_KEY" == *"xxx"* ]]; then
  echo "[error] LLM_API_KEY is missing or placeholder"
  exit 1
fi

echo "[deploy] docker compose up -d --build"
docker compose up -d --build

echo "[deploy] done"
docker compose ps

if [[ -z "${PORT_VALUE}" ]]; then
  PORT_VALUE="3000"
fi
echo "[deploy] health check: http://localhost:${PORT_VALUE}/healthz"
