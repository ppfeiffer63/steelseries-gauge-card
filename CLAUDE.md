# CLAUDE.md – SteelSeries Gauge Card

Diese Datei enthält den Entwicklungskontext für Claude Code.

---

## Projekt-Übersicht

**Typ:** Home Assistant Lovelace Custom Card  
**Card-Typ:** `custom:steelseries-gauge-card`  
**Version:** 2.0.0  
**Repos:**
- Forgejo (primär): `https://git.pfeiffer-privat.de/ppfeiffer/steelseries-gauge-addon`
- GitHub (Mirror, für HACS): `https://github.com/ppfeiffer63/steelseries-gauge-card`
- Mirror: Forgejo → GitHub automatisch per Push-Mirror (`sync_on_commit: true`)

---

## Dateistruktur

```
steelseries-gauge-addon/
├── dist/
│   └── steelseries-gauge-card.js   ← Haupt-Datei (HACS installiert diese)
├── steelseries-gauge-card.js        ← Identisch mit dist/ (Quelle)
├── hacs.json                        ← HACS-Metadaten (content_in_root: false)
├── config.json                      ← HA Addon-Metadaten (Installer-Addon)
├── Dockerfile                       ← Multi-Arch HA Addon
├── build.yaml                       ← HA Build-System
├── run.sh                           ← Installer-Skript (kopiert Card, registriert Ressource)
├── README.md                        ← Dokumentation (wird in HACS angezeigt)
├── DOCS.md                          ← HA Addon-Dokumentation
└── CLAUDE.md                        ← Diese Datei
```

**Wichtig:** Nach jeder Änderung an `steelseries-gauge-card.js` muss `dist/steelseries-gauge-card.js` synchronisiert werden:
```bash
cp steelseries-gauge-card.js dist/steelseries-gauge-card.js
```

---

## Technische Basis

**Bibliothek:** [SteelSeries Canvas Gauges](https://github.com/nicolas-van/steelseries) v0.15.0  
**CDN-URL:** `https://cdn.jsdelivr.net/npm/steelseries@0.15.0/dist/steelseries.min.js`  
**Wichtig:** Kein Tween.js nötig — steelseries 0.15.x bringt eigene Animation mit.  
**Warum v0.15.0?** v1.x hat keine `dist/`-Datei auf jsDelivr, v2.x hat nur `dist/steelseries.bundled.js` (kein `window.steelseries` Global).

### Bekannte Fallstricke

- **Linear-Gauge Sections:** Braucht zwingend `useSectionColors: true` zusätzlich zu `section: [...]`, sonst werden Sections ignoriert.
- **steelseries v2.x:** Nicht verwenden — kein globales `window.steelseries`.
- **Tween.js:** Nicht einbinden — verursacht Ladefehler, wird nicht benötigt.
- **Section-Farben:** Müssen als `rgba(r,g,b,a)`-String übergeben werden — steelseries parst sie intern über Canvas.

---

## Unterstützte Gauge-Typen

| `gauge_type` | Klasse | Beschreibung |
|---|---|---|
| `radial` | `ss.Radial` | Klassischer Rundinstrument-Gauge |
| `radial_bargraph` | `ss.RadialBargraph` | Radial als Bargraph |
| `linear` | `ss.Linear` | Vertikaler/horizontaler Balken |
| `linear_bargraph` | `ss.LinearBargraph` | Linear als Bargraph |

---

## Alle konfigurierbaren Parameter

### Basis
| Parameter | Typ | Default | Beschreibung |
|---|---|---|---|
| `entity` | string | – | HA Entity ID (Pflicht) |
| `attribute` | string | null | Attribut statt State |
| `title` | string | "" | Titel + Gauge-Beschriftung |
| `gauge_type` | string | `radial` | Gauge-Typ (s.o.) |
| `min` / `max` | number | 0 / 100 | Skalierungsgrenzen |
| `unit` | string | "" | Einheitsstring im LCD |

### Größe
| Parameter | Typ | Default | Beschreibung |
|---|---|---|---|
| `width` | number | 220 | Breite in Pixel |
| `height` | number | 220 | Höhe in Pixel (unabhängig von width) |

### Schwellwert
| Parameter | Typ | Default | Beschreibung |
|---|---|---|---|
| `threshold` | number | null | Schwellwert (rote LED) |
| `threshold_rising` | bool | true | true = steigend, false = fallend |

### LCD & Anzeige
| Parameter | Typ | Default | Beschreibung |
|---|---|---|---|
| `show_lcd` | bool | true | LCD-Display an/aus |
| `lcd_decimals` | number | 1 | Nachkommastellen (0–4) |
| `digital_font` | bool | false | Digitale LCD-Schrift |
| `min_measured_visible` | bool | false | Blauer Min-Marker |
| `max_measured_visible` | bool | false | Blauer Max-Marker |
| `animation_speed` | number | 2.5 | Sekunden für Vollausschlag |

### Aussehen
| Parameter | Typ | Default | Werte |
|---|---|---|---|
| `frame_design` | string | `METAL` | `METAL`, `CHROME`, `BLACK_METAL`, `SHINY_METAL`, `BRASS`, `STEEL`, `GOLD`, `ANTHRACITE`, `TILTED_GRAY`, `TILTED_BLACK`, `GLOSSY_METAL` |
| `background_color` | string | `DARK_GRAY` | `DARK_GRAY`, `SATIN_GRAY`, `LIGHT_GRAY`, `WHITE`, `BLACK`, `BEIGE`, `BROWN`, `RED`, `GREEN`, `BLUE`, `MUD`, `PUNCHED_SHEET`, `CARBON`, `STAINLESS`, `BRUSHED_METAL`, `BRUSHED_STAINLESS`, `TURNED`, `ANTHRACITE` |
| `foreground_type` | string | `TYPE1` | `TYPE1`–`TYPE5` |
| `led_color` | string | `RED_LED` | `RED_LED`, `GREEN_LED`, `BLUE_LED`, `ORANGE_LED`, `YELLOW_LED`, `CYAN_LED`, `MAGENTA_LED` |
| `lcd_color` | string | `STANDARD` | `STANDARD`, `STANDARD_GREEN`, `BLUE_BLACK`, `BLUE_DARKBLUE`, `BLUE_GRAY`, `BLUE_BLUE`, `RED_DARKRED`, `DARKBLUE`, `LILA`, `BLACKRED`, `DARKGREEN`, `AMBER`, `LIGHTBLUE`, `BLACK` |

### Zeiger (nur Radial)
| Parameter | Typ | Default | Werte |
|---|---|---|---|
| `pointer_type` | string | `TYPE1` | `TYPE1`, `TYPE2`, `TYPE8` |
| `pointer_color` | string | `RED` | `RED`, `GREEN`, `BLUE`, `ORANGE`, `YELLOW`, `CYAN`, `MAGENTA`, `WHITE`, `GRAY`, `BLACK` |
| `knob_type` | string | `STANDARD_KNOB` | `STANDARD_KNOB`, `METAL_KNOB` |
| `knob_style` | string | `SILVER` | `SILVER`, `BLACK` |

### Balkenfarbe (nur Linear)
| Parameter | Typ | Default | Werte |
|---|---|---|---|
| `value_color` | string | `RED` | `RED`, `GREEN`, `BLUE`, `ORANGE`, `YELLOW`, `CYAN`, `MAGENTA`, `WHITE`, `GRAY`, `BLACK` |

### Farbbereiche
| Parameter | Typ | Beschreibung |
|---|---|---|
| `sections` | list | Farbige Abschnitte: `{start, stop, color}` |
| `areas` | list | Wie sections, aber als Fläche |

---

## Entwicklungs-Workflow

```bash
# Änderung machen
vim steelseries-gauge-card.js

# dist/ neu bauen (steelseries.min.js + Card gebündelt)
./build.sh

# Committen und pushen (Mirror synchronisiert GitHub automatisch)
git add steelseries-gauge-card.js dist/steelseries-gauge-card.js
git commit -m "feat/fix: beschreibung"
git push https://ppfeiffer:TOKEN@git.pfeiffer-privat.de/ppfeiffer/steelseries-gauge-addon.git master
```

**Wichtig:** `dist/steelseries.min.js` wird NICHT committet (ist zu groß).  
`dist/steelseries-gauge-card.js` = gebündeltes Artefakt (steelseries + Card), wird committet.

---

## Offene Punkte / Ideen

- [x] Weitere Pointer-Typen (TYPE1–TYPE9 alle freigeschaltet)
- [x] `Clock`-Gauge mit Timezone-Offset
- [x] Offline-Modus: steelseries.min.js in dist/ gebündelt via build.sh
- [x] HA Addon Installer: Version-Check + GitHub Update-Notification
- [ ] `RadialVertical` Gauge-Typ hinzufügen
- [ ] `Compass`-Gauge als weiterer Typ
- [ ] `areas`-Parameter implementieren (dokumentiert aber nicht gebaut)
- [ ] `attribute`-Feld im visuellen Editor ergänzen
- [ ] Mehrere Entities auf einem Gauge (Dual-Pointer)

---

## Zusammenhang mit anderen Repos

- **`ppfeiffer/ha-dashboard-plugins`** – Index-Repo, listet dieses Plugin auf
- **`ppfeiffer/chartjs-card`** – Schwester-Plugin (Chart.js basiert)
