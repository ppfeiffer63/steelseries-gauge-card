#!/usr/bin/env bash
# =============================================================================
# SteelSeries Gauge Card Installer – run.sh
# =============================================================================
set -euo pipefail

# ── Farben für Logs ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Konfiguration lesen ──────────────────────────────────────────────────────
CONFIG_PATH="/data/options.json"

# Supervisor stellt HASSIO_TOKEN automatisch bereit
# Falls der Nutzer einen eigenen Token angegeben hat, wird dieser bevorzugt
USER_TOKEN="$(jq -r '.token // ""' "$CONFIG_PATH")"
HA_URL="$(jq -r '.ha_url // "http://supervisor/core"' "$CONFIG_PATH")"

if [[ -n "$USER_TOKEN" ]]; then
    TOKEN="$USER_TOKEN"
    log_info "Verwende benutzerdefinierten Long-Lived Access Token."
else
    TOKEN="${SUPERVISOR_TOKEN:-}"
    log_info "Verwende Supervisor-Token."
fi

if [[ -z "$TOKEN" ]]; then
    log_error "Kein API-Token gefunden!"
    log_error "Bitte einen Long-Lived Access Token in der Addon-Konfiguration eintragen"
    log_error "oder sicherstellen, dass der Supervisor-Token verfügbar ist."
    exit 1
fi

CARD_SRC="/usr/share/steelseries-gauge-card.js"
CARD_DST="/config/www/steelseries-gauge-card.js"
CARD_URL="/local/steelseries-gauge-card.js"
RESOURCE_TYPE="module"

# ── 1. www-Verzeichnis anlegen ───────────────────────────────────────────────
log_info "Prüfe /config/www/ …"
if [[ ! -d /config/www ]]; then
    log_info "/config/www existiert nicht – wird angelegt."
    mkdir -p /config/www
fi

# ── 2. Card-Datei kopieren ───────────────────────────────────────────────────
log_info "Kopiere steelseries-gauge-card.js nach /config/www/ …"
cp "$CARD_SRC" "$CARD_DST"
log_info "Datei erfolgreich kopiert: $CARD_DST"

# ── 3. Bestehende Ressourcen abrufen ─────────────────────────────────────────
log_info "Prüfe vorhandene Lovelace-Ressourcen via HA API …"

RESOURCES_RESPONSE=$(curl -sf \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    "${HA_URL}/api/lovelace/resources" 2>&1) || {
    log_warn "Konnte Ressourcen nicht abrufen (HTTP-Fehler). Möglicherweise YAML-Mode aktiv?"
    log_warn "Antwort: $RESOURCES_RESPONSE"
    log_warn "Bitte Ressource manuell registrieren (siehe DOCS.md)."
    print_manual_instructions
    exit 0
}

# ── 4. Prüfen ob Ressource bereits registriert ────────────────────────────────
ALREADY_EXISTS=$(echo "$RESOURCES_RESPONSE" | \
    jq -r --arg url "$CARD_URL" '.[] | select(.url == $url) | .id // empty')

if [[ -n "$ALREADY_EXISTS" ]]; then
    log_info "Ressource bereits registriert (id: $ALREADY_EXISTS). Überspringe."
else
    # ── 5. Ressource registrieren ─────────────────────────────────────────────
    log_info "Registriere Ressource in Lovelace …"

    REGISTER_RESPONSE=$(curl -sf \
        -X POST \
        -H "Authorization: Bearer ${TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"${CARD_URL}\", \"res_type\": \"${RESOURCE_TYPE}\"}" \
        "${HA_URL}/api/lovelace/resources" 2>&1) || {
        log_warn "Ressourcen-Registrierung fehlgeschlagen."
        log_warn "Antwort: $REGISTER_RESPONSE"
        print_manual_instructions
        exit 0
    }

    RESOURCE_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.id // empty')

    if [[ -n "$RESOURCE_ID" ]]; then
        log_info "Ressource erfolgreich registriert! (id: $RESOURCE_ID)"
    else
        log_warn "Unerwartete API-Antwort: $REGISTER_RESPONSE"
        print_manual_instructions
    fi
fi

# ── 6. Abschluss ─────────────────────────────────────────────────────────────
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info " Installation abgeschlossen!"
log_info " Card-Datei: $CARD_DST"
log_info " Ressource:  $CARD_URL ($RESOURCE_TYPE)"
log_info ""
log_info " Bitte den Browser-Cache leeren (Shift+F5) und"
log_info " Home Assistant neu laden."
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0

# ── Hilfsfunktion: manuelle Anleitung ────────────────────────────────────────
print_manual_instructions() {
    log_warn "──────────────────────────────────────────────────"
    log_warn " Manuelle Installation erforderlich:"
    log_warn "  Einstellungen → Dashboards → ⋮ → Ressourcen"
    log_warn "  URL:  $CARD_URL"
    log_warn "  Typ:  JavaScript-Modul"
    log_warn "──────────────────────────────────────────────────"
}
