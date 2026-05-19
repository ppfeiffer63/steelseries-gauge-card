# SteelSeries Gauge Card Installer

Home Assistant Addon zum automatischen Installieren der
[SteelSeries Gauge Custom Card](https://github.com/nicolas-van/steelseries).

## Schnellstart

1. Addon-Repository in HA hinzufügen:
   **Einstellungen → Addons → Addon-Store → ⋮ → Repositories**
   ```
   https://git.pfeiffer-privat.de/ppfeiffer/steelseries-gauge-addon
   ```
2. Addon installieren & starten
3. Browser-Cache leeren (Shift+F5)
4. Card in einem Dashboard hinzufügen:
   ```yaml
   type: custom:steelseries-gauge-card
   entity: sensor.temperature
   title: Temperatur
   min: -10
   max: 40
   unit: °C
   ```

Vollständige Dokumentation: [DOCS.md](DOCS.md)
