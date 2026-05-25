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

print_manual_instructions() {
    log_warn "──────────────────────────────────────────────────"
    log_warn " Manuelle Installation erforderlich:"
    log_warn "  Einstellungen → Dashboards → ⋮ → Ressourcen"
    log_warn "  URL:  $CARD_URL"
    log_warn "  Typ:  JavaScript-Modul"
    log_warn "──────────────────────────────────────────────────"
}

# Extrahiert "X.Y.Z" aus dem ersten Vorkommen von "vX.Y.Z" in einer Datei
extract_version() {
    grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' "$1" 2>/dev/null | head -1 | tr -d 'v' || echo "0.0.0"
}

# Gibt zurück ob $1 >= $2 (semantisch)
version_gte() {
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -1)" = "$2" ]
}

# ── Konfiguration lesen ──────────────────────────────────────────────────────
CONFIG_PATH="/data/options.json"

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

# ── 2. Version prüfen und Card-Datei ggf. kopieren ──────────────────────────
SRC_VER="$(extract_version "$CARD_SRC")"
log_info "Addon-Version: v${SRC_VER}"

if [[ -f "$CARD_DST" ]]; then
    DST_VER="$(extract_version "$CARD_DST")"
    log_info "Installierte Version: v${DST_VER}"
    if version_gte "$DST_VER" "$SRC_VER"; then
        log_info "Bereits aktuell (v${DST_VER}) – Datei wird nicht überschrieben."
        COPIED=false
    else
        log_info "Update von v${DST_VER} auf v${SRC_VER} …"
        cp "$CARD_SRC" "$CARD_DST"
        log_info "Datei aktualisiert: $CARD_DST"
        COPIED=true
    fi
else
    log_info "Erstinstallation – kopiere steelseries-gauge-card.js …"
    cp "$CARD_SRC" "$CARD_DST"
    log_info "Datei kopiert: $CARD_DST"
    COPIED=true
fi

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

# ── 6. Update-Check ──────────────────────────────────────────────────────────
REMOTE_CONFIG_URL="https://raw.githubusercontent.com/ppfeiffer63/steelseries-gauge-card/master/config.json"
log_info "Prüfe auf neue Version (GitHub) …"

REMOTE_CONFIG=$(curl -sf --max-time 10 "$REMOTE_CONFIG_URL" 2>/dev/null || true)

if [[ -n "$REMOTE_CONFIG" ]]; then
    REMOTE_VER=$(echo "$REMOTE_CONFIG" | jq -r '.version // empty')
    if [[ -n "$REMOTE_VER" ]] && ! version_gte "$SRC_VER" "$REMOTE_VER"; then
        log_info "Update verfügbar: v${REMOTE_VER} (installiert: v${SRC_VER})"
        curl -sf -X POST \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{\"title\":\"SteelSeries Gauge Card: Update verfügbar\",\"message\":\"Version **v${REMOTE_VER}** ist verfügbar (installiert: v${SRC_VER}).\\nBitte das Addon in den HA Einstellungen → Addons aktualisieren.\",\"notification_id\":\"steelseries_gauge_update\"}" \
            "${HA_URL}/api/services/persistent_notification/create" 2>/dev/null || \
            log_warn "Konnte Update-Benachrichtigung nicht erstellen."
    else
        log_info "Bereits aktuelle Version (v${SRC_VER})."
        # Alte Benachrichtigung entfernen falls vorhanden
        curl -sf -X POST \
            -H "Authorization: Bearer ${TOKEN}" \
            -H "Content-Type: application/json" \
            -d "{\"notification_id\":\"steelseries_gauge_update\"}" \
            "${HA_URL}/api/services/persistent_notification/dismiss" 2>/dev/null || true
    fi
else
    log_warn "Update-Check: GitHub nicht erreichbar – wird übersprungen."
fi

# ── 7. Abschluss ─────────────────────────────────────────────────────────────
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info " Installation abgeschlossen!"
log_info " Card-Datei: $CARD_DST (v${SRC_VER})"
log_info " Ressource:  $CARD_URL ($RESOURCE_TYPE)"
if [[ "$COPIED" == "true" ]]; then
    log_info ""
    log_info " Browser-Cache leeren (Shift+F5) und HA neu laden!"
fi
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0
