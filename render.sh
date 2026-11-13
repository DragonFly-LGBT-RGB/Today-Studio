#!/usr/bin/env bash
# resumable render loop: bash render.sh <episode> [extra args]   (restarts automatically if the browser crashes)
cd "$(dirname "$0")"
[ -d node_modules/puppeteer ] || bash setup.sh
for i in $(seq 1 20); do
  node studio.js render "$@" && exit 0
  echo "render crashed, retry $i"; sleep 3
done
