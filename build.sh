#!/usr/bin/env bash
# Baut dist/steelseries-gauge-card.js (steelseries.min.js + Card gebündelt)
set -euo pipefail

SS_URL="https://cdn.jsdelivr.net/npm/steelseries@0.15.0/dist/steelseries.min.js"
SS_FILE="dist/steelseries.min.js"
CARD_SRC="steelseries-gauge-card.js"
CARD_DST="dist/steelseries-gauge-card.js"

cd "$(dirname "$0")"

if [[ ! -f "$SS_FILE" ]]; then
    echo "Lade steelseries.min.js herunter …"
    curl -sf -o "$SS_FILE" "$SS_URL"
fi

cat "$SS_FILE" "$CARD_SRC" > "$CARD_DST"
echo "OK: $CARD_DST ($(wc -c < "$CARD_DST") bytes)"
