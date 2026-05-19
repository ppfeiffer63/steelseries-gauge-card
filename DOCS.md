# SteelSeries Gauge Card Installer – Dokumentation

Dieses Addon installiert die **SteelSeries Gauge Custom Card** automatisch
in deiner Home Assistant Instanz.

---

## Was passiert bei der Installation?

1. Die Datei `steelseries-gauge-card.js` wird nach `/config/www/` kopiert.
2. Die Ressource `/local/steelseries-gauge-card.js` wird automatisch
   in Lovelace registriert (via HA REST API).
3. Das Addon beendet sich (Startup-Modus: `once`).

---

## Konfiguration

### Automatisch (empfohlen)

Wenn du **Home Assistant OS** oder **Supervised** nutzt, funktioniert alles
ohne weitere Konfiguration – der Supervisor-Token wird automatisch verwendet.

### Manueller Token (falls nötig)

Falls die automatische API-Registrierung fehlschlägt (z.B. wegen aktiviertem
Lovelace-YAML-Modus), kannst du einen Long-Lived Access Token angeben:

1. HA → Profil → Sicherheit → **Langlebige Zugriffstoken** → Token erstellen
2. Token in der Addon-Konfiguration unter `token` eintragen:

```yaml
token: "dein_token_hier"
ha_url: "http://supervisor/core"
```

---

## Lovelace im YAML-Modus

Falls du Lovelace manuell via `ui-lovelace.yaml` verwaltest, musst du die
Ressource selbst eintragen:

```yaml
resources:
  - url: /local/steelseries-gauge-card.js
    type: module
```

---

## Verwendung der Card

Nach der Installation steht der neue Card-Typ `custom:steelseries-gauge-card`
in jedem Dashboard zur Verfügung.

### Minimales Beispiel

```yaml
type: custom:steelseries-gauge-card
entity: sensor.temperature
```

### Vollständiges Beispiel

```yaml
type: custom:steelseries-gauge-card
entity: sensor.outside_temperature
title: Außentemperatur
gauge_type: radial
min: -20
max: 50
unit: °C
size: 220
threshold: 38
frame_design: METAL
pointer_color: RED
lcd_color: STANDARD
show_lcd: true
sections:
  - start: -20
    stop: 0
    color: "rgba(0,100,255,0.35)"
  - start: 0
    stop: 25
    color: "rgba(0,200,80,0.35)"
  - start: 25
    stop: 50
    color: "rgba(220,50,0,0.35)"
```

### Alle Optionen

| Option           | Standard      | Beschreibung                                        |
|------------------|---------------|-----------------------------------------------------|
| `entity`         | –             | **Pflicht.** HA Entity ID                           |
| `attribute`      | –             | Attribut statt State verwenden                      |
| `title`          | –             | Beschriftung oberhalb des Gauges                    |
| `gauge_type`     | `radial`      | `radial`, `radial_bargraph`, `linear`               |
| `min`            | `0`           | Minimalwert                                         |
| `max`            | `100`         | Maximalwert                                         |
| `unit`           | –             | Einheitsstring (z.B. `°C`, `%`, `W`)               |
| `size`           | `220`         | Breite in Pixel (Höhe automatisch)                  |
| `threshold`      | –             | Schwellwert → rote LED                              |
| `show_lcd`       | `true`        | LCD-Display ein/aus                                 |
| `frame_design`   | `METAL`       | `METAL`, `CHROME`, `BLACK_METAL`, `BRASS`, ...      |
| `pointer_color`  | `RED`         | `RED`, `GREEN`, `BLUE`, `ORANGE`, `YELLOW`, ...     |
| `lcd_color`      | `STANDARD`    | `STANDARD`, `BLUE`, `RED`, `GREEN`, `BEIGE`, ...   |
| `sections`       | –             | Farbige Bereiche (`start`, `stop`, `color`)         |
| `areas`          | –             | Wie `sections`, aber als Fläche                     |

---

## Erneut installieren / Update

Einfach das Addon erneut starten. Eine bereits vorhandene Ressource wird
nicht doppelt registriert.

---

## Fehlerbehebung

**Card wird nicht angezeigt:**
- Browser-Cache leeren (Shift+F5 / Strg+Shift+R)
- HA neu laden

**"Custom element doesn't exist":**
- Ressource prüfen: Einstellungen → Dashboards → ⋮ → Ressourcen
- Datei prüfen: `/config/www/steelseries-gauge-card.js` vorhanden?

**API-Fehler im Addon-Log:**
- Lovelace-YAML-Modus aktiv? → Ressource manuell eintragen (siehe oben)
- Addon-Log zeigt die genaue Fehlermeldung
