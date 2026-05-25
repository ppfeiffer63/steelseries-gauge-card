# SteelSeries Gauge Card Installer – Dokumentation

Dieses Addon installiert die **SteelSeries Gauge Custom Card** automatisch
in deiner Home Assistant Instanz.

---

## Was passiert bei der Installation?

1. Die Datei `steelseries-gauge-card.js` wird nach `/config/www/` kopiert
   (nur wenn die installierte Version älter als die Addon-Version ist).
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
in jedem Dashboard zur Verfügung. Der integrierte **visuelle Editor** erlaubt
die vollständige Konfiguration ohne YAML-Schreiben.

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
width: 220
height: 220
threshold: 38
threshold_rising: true
frame_design: METAL
background_color: DARK_GRAY
foreground_type: TYPE1
pointer_type: TYPE1
pointer_color: RED
knob_type: STANDARD_KNOB
knob_style: SILVER
lcd_color: STANDARD
lcd_decimals: 1
show_lcd: true
digital_font: false
animation_speed: 2.5
min_measured_visible: false
max_measured_visible: false
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

### Basis

| Option         | Standard | Beschreibung                                  |
|----------------|----------|-----------------------------------------------|
| `entity`       | –        | **Pflicht.** HA Entity ID                     |
| `attribute`    | –        | Attribut statt State verwenden                |
| `title`        | –        | Beschriftung oberhalb + im Gauge              |
| `gauge_type`   | `radial` | Gauge-Typ (s.u.)                              |
| `min`          | `0`      | Minimalwert                                   |
| `max`          | `100`    | Maximalwert                                   |
| `unit`         | –        | Einheitsstring (z.B. `°C`, `%`, `W`)         |

### Gauge-Typen (`gauge_type`)

| Wert              | Beschreibung                    |
|-------------------|---------------------------------|
| `radial`          | Klassisches Rundinstrument      |
| `radial_bargraph` | Radial als Bargraph             |
| `linear`          | Vertikaler Balken               |
| `linear_bargraph` | Linearer Bargraph               |

### Größe

| Option   | Standard | Beschreibung      |
|----------|----------|-------------------|
| `width`  | `220`    | Breite in Pixel   |
| `height` | `220`    | Höhe in Pixel     |

### Schwellwert

| Option              | Standard | Beschreibung                            |
|---------------------|----------|-----------------------------------------|
| `threshold`         | –        | Schwellwert → rote LED                  |
| `threshold_rising`  | `true`   | `true` = steigend, `false` = fallend    |

### LCD & Anzeige

| Option                  | Standard | Beschreibung                             |
|-------------------------|----------|------------------------------------------|
| `show_lcd`              | `true`   | LCD-Display ein/aus                      |
| `lcd_color`             | `STANDARD` | LCD-Farbe (s.u.)                       |
| `lcd_decimals`          | `1`      | Nachkommastellen (0–4)                   |
| `digital_font`          | `false`  | Digitale LCD-Schrift                     |
| `min_measured_visible`  | `false`  | Blauer Min-Marker anzeigen               |
| `max_measured_visible`  | `false`  | Blauer Max-Marker anzeigen               |
| `animation_speed`       | `2.5`    | Sekunden für Vollausschlag               |

### Aussehen

| Option             | Standard    | Mögliche Werte                                                                                               |
|--------------------|-------------|--------------------------------------------------------------------------------------------------------------|
| `frame_design`     | `METAL`     | `METAL`, `CHROME`, `BLACK_METAL`, `SHINY_METAL`, `BRASS`, `STEEL`, `GOLD`, `ANTHRACITE`, `TILTED_GRAY`, `TILTED_BLACK`, `GLOSSY_METAL` |
| `background_color` | `DARK_GRAY` | `DARK_GRAY`, `SATIN_GRAY`, `LIGHT_GRAY`, `WHITE`, `BLACK`, `BEIGE`, `BROWN`, `RED`, `GREEN`, `BLUE`, `MUD`, `PUNCHED_SHEET`, `CARBON`, `STAINLESS`, `BRUSHED_METAL`, `BRUSHED_STAINLESS`, `TURNED`, `ANTHRACITE` |
| `foreground_type`  | `TYPE1`     | `TYPE1`, `TYPE2`, `TYPE3`, `TYPE4`, `TYPE5`                                                                 |
| `led_color`        | `RED_LED`   | `RED_LED`, `GREEN_LED`, `BLUE_LED`, `ORANGE_LED`, `YELLOW_LED`, `CYAN_LED`, `MAGENTA_LED`                  |
| `lcd_color`        | `STANDARD`  | `STANDARD`, `STANDARD_GREEN`, `BLUE_BLACK`, `BLUE_DARKBLUE`, `BLUE_GRAY`, `BLUE_BLUE`, `RED_DARKRED`, `DARKBLUE`, `LILA`, `BLACKRED`, `DARKGREEN`, `AMBER`, `LIGHTBLUE`, `BLACK` |

### Zeiger (nur `radial` / `radial_bargraph`)

| Option          | Standard         | Mögliche Werte                                                              |
|-----------------|------------------|-----------------------------------------------------------------------------|
| `pointer_type`  | `TYPE1`          | `TYPE1`, `TYPE2`, `TYPE8`                                                   |
| `pointer_color` | `RED`            | `RED`, `GREEN`, `BLUE`, `ORANGE`, `YELLOW`, `CYAN`, `MAGENTA`, `WHITE`, `GRAY`, `BLACK` |
| `knob_type`     | `STANDARD_KNOB`  | `STANDARD_KNOB`, `METAL_KNOB`                                               |
| `knob_style`    | `SILVER`         | `SILVER`, `BLACK`                                                           |

### Balkenfarbe (nur `linear` / `linear_bargraph`)

| Option        | Standard | Mögliche Werte                                                              |
|---------------|----------|-----------------------------------------------------------------------------|
| `value_color` | `RED`    | `RED`, `GREEN`, `BLUE`, `ORANGE`, `YELLOW`, `CYAN`, `MAGENTA`, `WHITE`, `GRAY`, `BLACK` |

### Farbbereiche

| Option     | Beschreibung                                              |
|------------|-----------------------------------------------------------|
| `sections` | Farbige Abschnitte: `{start, stop, color}`               |
| `areas`    | Wie `sections`, aber als Fläche                          |

Farben werden als `rgba(r,g,b,a)`-String angegeben, z.B. `"rgba(0,200,80,0.35)"`.

---

## Updates

### Automatische Update-Erkennung

Das Addon prüft bei jedem Start, ob auf GitHub eine neuere Version verfügbar ist:

- Ist eine neuere Version vorhanden, erscheint eine **HA-Benachrichtigung**
  mit dem Hinweis auf das Update.
- Ist die installierte Version aktuell, wird eine ggf. vorhandene
  Benachrichtigung automatisch entfernt.

Zusätzlich erkennt der **Home Assistant Supervisor** neue Versionen automatisch
über den Addon-Store und zeigt den Update-Button in Einstellungen → Addons.

### Update durchführen

1. In HA: Einstellungen → Addons → SteelSeries Gauge Card Installer → **Aktualisieren**
2. Danach Addon einmal starten – die neue Card-Datei wird automatisch kopiert.
3. Browser-Cache leeren (Shift+F5).

Eine bereits vorhandene Ressource wird nicht doppelt registriert.

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
