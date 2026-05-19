# SteelSeries Gauge Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://git.pfeiffer-privat.de/ppfeiffer/steelseries-gauge-addon)

Animierte **SteelSeries Canvas Gauges** als Home Assistant Lovelace Custom Card.

Unterstützte Gauge-Typen:
- **Radial** – klassischer Rundinstrument-Gauge
- **Radial Bargraph** – Bargraph-Variante
- **Linear** – vertikaler/horizontaler Balken-Gauge

---

## Installation via HACS

1. HACS → Frontend → **⋮** → Benutzerdefinierte Repositories
2. URL eintragen:
   ```
   https://git.pfeiffer-privat.de/ppfeiffer/steelseries-gauge-addon
   ```
   Kategorie: **Lovelace**
3. **SteelSeries Gauge Card** installieren
4. Browser-Cache leeren (Shift+F5)

---

## Manuelle Installation

1. `dist/steelseries-gauge-card.js` nach `/config/www/` kopieren
2. Ressource registrieren:  
   **Einstellungen → Dashboards → ⋮ → Ressourcen → Hinzufügen**
   - URL: `/local/steelseries-gauge-card.js`
   - Typ: `JavaScript-Modul`

---

## Verwendung

### Minimal

```yaml
type: custom:steelseries-gauge-card
entity: sensor.temperature
```

### Vollständig

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

---

## Alle Optionen

| Option           | Standard   | Beschreibung                                      |
|------------------|------------|---------------------------------------------------|
| `entity`         | –          | **Pflicht.** HA Entity ID                         |
| `attribute`      | –          | Attribut statt State verwenden                    |
| `title`          | –          | Beschriftung oberhalb des Gauges                  |
| `gauge_type`     | `radial`   | `radial`, `radial_bargraph`, `linear`             |
| `min`            | `0`        | Minimalwert                                       |
| `max`            | `100`      | Maximalwert                                       |
| `unit`           | –          | Einheit (z.B. `°C`, `%`, `W`)                    |
| `size`           | `220`      | Breite in Pixel                                   |
| `threshold`      | –          | Schwellwert → rote LED                            |
| `show_lcd`       | `true`     | LCD-Display ein/aus                               |
| `frame_design`   | `METAL`    | `METAL`, `CHROME`, `BLACK_METAL`, `BRASS`, …     |
| `pointer_color`  | `RED`      | `RED`, `GREEN`, `BLUE`, `ORANGE`, `YELLOW`, …    |
| `lcd_color`      | `STANDARD` | `STANDARD`, `BLUE`, `RED`, `GREEN`, `BEIGE`, …   |
| `sections`       | –          | Farbige Bereiche (`start`, `stop`, `color`)       |
| `areas`          | –          | Wie `sections`, als Fläche                        |

---

## Frame-Designs

`METAL` · `CHROME` · `BLACK_METAL` · `SHINY_METAL` · `BRASS` · `STEEL` · `GOLD` · `ANTHRACITE`

## Zeiger-Farben

`RED` · `GREEN` · `BLUE` · `ORANGE` · `YELLOW` · `WHITE` · `GRAY`

## LCD-Farben

`STANDARD` · `BLUE` · `RED` · `GREEN` · `STANDARD_GREEN` · `BEIGE`

---

## Lizenz

MIT
