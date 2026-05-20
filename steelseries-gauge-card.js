/**
 * SteelSeries Gauge Card for Home Assistant Lovelace
 * Installiert durch: SteelSeries Gauge Card Installer Addon
 *
 * ─── YAML-Beispiel ──────────────────────────────────────────────────────────
 * type: custom:steelseries-gauge-card
 * entity: sensor.temperature
 * title: Temperatur
 * gauge_type: radial        # radial | radial_bargraph | linear
 * min: -10
 * max: 40
 * unit: °C
 * size: 220
 * threshold: 35
 * frame_design: METAL
 * pointer_color: RED
 * lcd_color: STANDARD
 * show_lcd: true
 * sections:
 *   - start: -10
 *     stop: 10
 *     color: "rgba(0,0,220,0.3)"
 *   - start: 10
 *     stop: 28
 *     color: "rgba(0,200,0,0.3)"
 *   - start: 28
 *     stop: 40
 *     color: "rgba(220,0,0,0.3)"
 * ────────────────────────────────────────────────────────────────────────────
 */

// steelseries 0.15.0 – dist/steelseries.min.js stellt window.steelseries bereit
const _SS_URL = "https://cdn.jsdelivr.net/npm/steelseries@0.15.0/dist/steelseries.min.js";

let _ssLoadPromise = null;

function _loadSteelSeries() {
  if (window.steelseries) return Promise.resolve();
  if (_ssLoadPromise) return _ssLoadPromise;
  _ssLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = _SS_URL;
    s.onload = () => window.steelseries ? resolve() : reject(new Error("steelseries nicht in window"));
    s.onerror = () => reject(new Error("Konnte " + _SS_URL + " nicht laden"));
    document.head.appendChild(s);
  });
  return _ssLoadPromise;
}

// ── Haupt-Element ────────────────────────────────────────────────────────────
class SteelSeriesGaugeCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._gauge = null;
    this._config = {};
    this._initialized = false;
  }

  static getConfigElement() {
    return document.createElement("steelseries-gauge-card-editor");
  }

  static getStubConfig() {
    return { entity: "sensor.temperature", title: "Mein Gauge", min: 0, max: 100 };
  }

  setConfig(config) {
    if (!config.entity) throw new Error("[SteelSeriesGaugeCard] 'entity' ist erforderlich.");
    const old = JSON.stringify(this._config);
    this._config = {
      entity:           config.entity,
      attribute:        config.attribute        || null,
      title:            config.title            || "",
      gauge_type:       (config.gauge_type      || "radial").toLowerCase(),
      min:              config.min              !== undefined ? Number(config.min)  : 0,
      max:              config.max              !== undefined ? Number(config.max)  : 100,
      unit:             config.unit             || "",
      size:             Number(config.size)     || 220,
      threshold:        config.threshold        != null ? Number(config.threshold) : null,
      show_lcd:         config.show_lcd         !== false,
      sections:         config.sections         || null,
      areas:            config.areas            || null,
      frame_design:     config.frame_design     || "METAL",
      background_color: config.background_color || "DARK_GRAY",
      pointer_color:    config.pointer_color    || "RED",
      led_color:        config.led_color        || "RED_LED",
      lcd_color:        config.lcd_color        || "STANDARD",
    };
    if (this._initialized && old !== JSON.stringify(this._config)) {
      this._initialized = false;
      this._gauge = null;
      if (this._hass) this.hass = this._hass;
    }
  }

  set hass(hass) {
    this._hass = hass;
    const stateObj = hass.states[this._config.entity];
    if (!stateObj) return;
    const raw = this._config.attribute
      ? stateObj.attributes[this._config.attribute]
      : stateObj.state;
    const value = parseFloat(raw);
    if (isNaN(value)) return;
    if (!this._initialized) {
      this._build(value);
    } else if (this._gauge) {
      this._gauge.setValueAnimated(value);
    }
  }

  async _build(initialValue) {
    this._initialized = true;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { display:flex; flex-direction:column; align-items:center; padding:12px 8px 16px; }
        .title { font-size:14px; font-weight:500; color:var(--primary-text-color); margin-bottom:6px; text-align:center; }
        .gauge-wrapper { display:flex; flex-direction:column; align-items:center; }
        canvas { display:block; }
        .msg { font-size:13px; padding:20px; color:var(--secondary-text-color); }
        .err { color:var(--error-color,red); }
      </style>
      <ha-card>
        ${this._config.title ? `<div class="title">${this._config.title}</div>` : ""}
        <div class="gauge-wrapper"><span class="msg">⏳ Lade SteelSeries…</span></div>
      </ha-card>`;

    try {
      await _loadSteelSeries();
    } catch (e) {
      this._err(`Bibliothek konnte nicht geladen werden.<br><small>${e.message}</small>`);
      return;
    }

    const ss = window.steelseries;
    if (!ss) { this._err("window.steelseries nicht gefunden."); return; }

    const wrapper = this.shadowRoot.querySelector(".gauge-wrapper");
    wrapper.innerHTML = "";
    const canvas = document.createElement("canvas");
    const sz = this._config.size;
    canvas.width  = sz;
    canvas.height = this._config.gauge_type === "linear" ? Math.round(sz * 1.6) : sz;
    wrapper.appendChild(canvas);

    const safeKey = (obj, key, fallback) => (obj && obj[key] !== undefined ? obj[key] : fallback);
    const mkSections = (list) =>
      Array.isArray(list)
        ? list.map(s => ss.Section(s.start, s.stop, s.color || "rgba(0,200,0,0.3)"))
        : [];

    const params = {
      minValue:         this._config.min,
      maxValue:         this._config.max,
      lcdVisible:       this._config.show_lcd,
      lcdDecimals:      1,
      unitString:       this._config.unit,
      thresholdVisible: this._config.threshold !== null,
      threshold:        this._config.threshold !== null ? this._config.threshold : this._config.max,
      section:          mkSections(this._config.sections),
      area:             mkSections(this._config.areas),
      frameDesign:      safeKey(ss.FrameDesign,     this._config.frame_design,     ss.FrameDesign?.METAL),
      backgroundColor:  safeKey(ss.BackgroundColor, this._config.background_color, ss.BackgroundColor?.DARK_GRAY),
      pointerColor:     safeKey(ss.ColorDef,        this._config.pointer_color,    ss.ColorDef?.RED),
      ledColor:         safeKey(ss.LedColor,        this._config.led_color,        ss.LedColor?.RED_LED),
      lcdColor:         safeKey(ss.LcdColor,        this._config.lcd_color,        ss.LcdColor?.STANDARD),
    };

    // undefined entfernen
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

    try {
      switch (this._config.gauge_type) {
        case "linear":          this._gauge = new ss.Linear(canvas, params);         break;
        case "radial_bargraph": this._gauge = new ss.RadialBargraph(canvas, params); break;
        default:                this._gauge = new ss.Radial(canvas, params);         break;
      }
    } catch (e) {
      this._err(`Gauge-Init fehlgeschlagen: ${e.message}`);
      console.error("[SteelSeriesGaugeCard]", e);
      return;
    }

    this._gauge.setValue(initialValue);
  }

  _err(msg) {
    const w = this.shadowRoot.querySelector(".gauge-wrapper");
    if (w) w.innerHTML = `<span class="msg err">⚠️ ${msg}</span>`;
  }

  getCardSize() {
    return Math.ceil((this._config.size || 220) / 50) + 1;
  }
}

customElements.define("steelseries-gauge-card", SteelSeriesGaugeCard);

// ── Visueller Editor ─────────────────────────────────────────────────────────
class SteelSeriesGaugeCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }
  connectedCallback() { this._render(); }

  _render() {
    if (!this._config) return;
    const c = this._config;
    this.innerHTML = `
      <style>
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:10px; }
        .full { grid-column:1/-1; }
        label { display:block; font-size:11px; color:var(--secondary-text-color); margin-bottom:2px; }
        input,select { width:100%; padding:5px 8px; border-radius:6px; border:1px solid var(--divider-color);
          background:var(--card-background-color); color:var(--primary-text-color); font-size:14px; box-sizing:border-box; }
        h4 { grid-column:1/-1; margin:8px 0 2px; font-size:11px; color:var(--secondary-text-color);
             text-transform:uppercase; letter-spacing:1px; }
      </style>
      <div class="grid">
        <div class="full"><label>Entity *</label>
          <input id="entity" value="${c.entity||""}" placeholder="sensor.mein_sensor"/></div>
        <div class="full"><label>Titel</label>
          <input id="title" value="${c.title||""}"/></div>
        <h4>Gauge</h4>
        <div><label>Typ</label><select id="gauge_type">
          <option value="radial"          ${(c.gauge_type||"radial")==="radial"?"selected":""}>Radial</option>
          <option value="radial_bargraph" ${c.gauge_type==="radial_bargraph"?"selected":""}>Radial Bargraph</option>
          <option value="linear"          ${c.gauge_type==="linear"?"selected":""}>Linear</option>
        </select></div>
        <div><label>Einheit</label><input id="unit" value="${c.unit||""}"/></div>
        <div><label>Min</label><input id="min" type="number" value="${c.min!==undefined?c.min:0}"/></div>
        <div><label>Max</label><input id="max" type="number" value="${c.max!==undefined?c.max:100}"/></div>
        <div><label>Größe (px)</label><input id="size" type="number" value="${c.size||220}"/></div>
        <div><label>Schwellwert</label><input id="threshold" type="number" value="${c.threshold!=null?c.threshold:""}"/></div>
        <h4>Aussehen</h4>
        <div><label>Rahmen</label><select id="frame_design">
          ${["METAL","CHROME","BLACK_METAL","SHINY_METAL","BRASS","STEEL","GOLD","ANTHRACITE"]
            .map(v=>`<option value="${v}" ${(c.frame_design||"METAL")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>
        <div><label>Zeiger-Farbe</label><select id="pointer_color">
          ${["RED","GREEN","BLUE","ORANGE","YELLOW","WHITE","GRAY"]
            .map(v=>`<option value="${v}" ${(c.pointer_color||"RED")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>
        <div><label>LCD-Farbe</label><select id="lcd_color">
          ${["STANDARD","BLUE","RED","GREEN","STANDARD_GREEN","BEIGE"]
            .map(v=>`<option value="${v}" ${(c.lcd_color||"STANDARD")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>
        <div><label>LCD anzeigen</label><select id="show_lcd">
          <option value="true"  ${c.show_lcd!==false?"selected":""}>Ja</option>
          <option value="false" ${c.show_lcd===false?"selected":""}>Nein</option>
        </select></div>
      </div>`;

    ["entity","title","gauge_type","unit","min","max","size","threshold",
     "frame_design","pointer_color","lcd_color","show_lcd"].forEach(id => {
      const el = this.querySelector(`#${id}`);
      if (el) el.addEventListener("change", () => this._changed());
    });
  }

  _changed() {
    const g = id => this.querySelector(`#${id}`);
    const thr = g("threshold").value;
    const config = { ...this._config,
      entity: g("entity").value, title: g("title").value,
      gauge_type: g("gauge_type").value, unit: g("unit").value,
      min: parseFloat(g("min").value)||0, max: parseFloat(g("max").value)||100,
      size: parseInt(g("size").value)||220,
      threshold: thr !== "" ? parseFloat(thr) : null,
      frame_design: g("frame_design").value, pointer_color: g("pointer_color").value,
      lcd_color: g("lcd_color").value, show_lcd: g("show_lcd").value === "true",
    };
    this.dispatchEvent(new CustomEvent("config-changed",
      { detail: { config }, bubbles: true, composed: true }));
  }
}

customElements.define("steelseries-gauge-card-editor", SteelSeriesGaugeCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        "steelseries-gauge-card",
  name:        "SteelSeries Gauge Card",
  description: "Animierte SteelSeries-Gauges (Radial, Linear, Bargraph)",
  preview:     false,
  editor:      "steelseries-gauge-card-editor",
});
