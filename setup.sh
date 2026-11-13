#!/usr/bin/env bash
# Studio — установка (Linux / macOS / WSL / Git Bash на Windows)
#   bash setup.sh            -> зависимости Node (three, puppeteer + Chrome, ffmpeg, cannon-es)
#   bash setup.sh --whisper  -> плюс python-окружение с faster-whisper (точные тайминги слов в субтитрах, по желанию)
set -e
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Нужен Node.js 18+ (https://nodejs.org)"; exit 1; }
npm i --no-audit --no-fund
# на голом Linux-сервере Chrome может не хватать системных библиотек
if command -v apt-get >/dev/null && [ "$(id -u)" != "0" ] && command -v sudo >/dev/null; then
  sudo apt-get install -y -qq libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 libxdamage1 libgbm1 libxcomposite1 libxrandr2 libpango-1.0-0 libcairo2 >/dev/null 2>&1 || true
  sudo apt-get install -y -qq libasound2t64 >/dev/null 2>&1 || sudo apt-get install -y -qq libasound2 >/dev/null 2>&1 || true
fi
if [ "$1" == "--whisper" ]; then
  python3 -m venv .venv && .venv/bin/pip install -q faster-whisper numpy
fi
mkdir -p work renders
echo "setup ok"
