/**
 * SteelSeries Gauge Card for Home Assistant Lovelace  v2.0.0
 *
 * Neue Optionen gegenüber v1:
 *   - width / height unabhängig
 *   - gauge_type: radial | radial_bargraph | linear | linear_bargraph
 *   - pointer_type: TYPE1 | TYPE2 | TYPE8
 *   - knob_type / knob_style
 *   - foreground_type
 *   - background_color: alle BackgroundColor-Werte
 *   - frame_design: alle FrameDesign-Werte
 *   - lcd_color: alle LcdColor-Werte
 *   - value_color (für Linear/LinearBargraph)
 *   - led_color: alle LedColor-Werte
 *   - title / unit als Gauge-Beschriftung
 *   - min_measured_value_visible / max_measured_value_visible
 *   - digital_font
 *   - threshold_rising
 *   - animation_speed (fullScaleDeflectionTime)
 *   - sections mit useSectionColors
 */

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

class SteelSeriesGaugeCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._gauge = null;
    this._config = {};
    this._initialized = false;
    this._latestValue = null;
    this._minMeasured = null;
    this._maxMeasured = null;
  }

  static getConfigElement() {
    return document.createElement("steelseries-gauge-card-editor");
  }

  static getStubConfig() {
    return { entity: "sensor.temperature", title: "Mein Gauge", min: 0, max: 100, width: 220, height: 220 };
  }

  setConfig(config) {
    if (!config.entity) throw new Error("[SteelSeriesGaugeCard] 'entity' ist erforderlich.");
    const old = JSON.stringify(this._config);
    this._config = {
      // Basis
      entity:                   config.entity,
      attribute:                config.attribute                || null,
      title:                    config.title                    || "",
      gauge_type:               (config.gauge_type             || "radial").toLowerCase(),
      min:                      config.min                      !== undefined ? Number(config.min) : 0,
      max:                      config.max                      !== undefined ? Number(config.max) : 100,
      unit:                     config.unit                     || "",
      // Größe
      width:                    Number(config.width  || config.size) || 220,
      height:                   Number(config.height || config.size) || 220,
      // Schwellwert
      threshold:                config.threshold               != null ? Number(config.threshold) : null,
      threshold_rising:         config.threshold_rising        !== false,
      // Anzeige
      show_lcd:                 config.show_lcd                !== false,
      lcd_decimals:             config.lcd_decimals            !== undefined ? Number(config.lcd_decimals) : 1,
      digital_font:             config.digital_font            === true,
      min_measured_visible:     config.min_measured_visible    === true,
      max_measured_visible:     config.max_measured_visible    === true,
      // Animationsgeschwindigkeit (Sekunden für Vollausschlag)
      animation_speed:          config.animation_speed         !== undefined ? Number(config.animation_speed) : 2.5,
      // Sections
      sections:                 Array.isArray(config.sections) ? config.sections : [],
      // Aussehen
      frame_design:             config.frame_design            || "METAL",
      background_color:         config.background_color        || "DARK_GRAY",
      foreground_type:          config.foreground_type         || "TYPE1",
      pointer_type:             config.pointer_type            || "TYPE1",
      pointer_color:            config.pointer_color           || "RED",
      value_color:              config.value_color             || "RED",
      knob_type:                config.knob_type               || "STANDARD_KNOB",
      knob_style:               config.knob_style              || "SILVER",
      led_color:                config.led_color               || "RED_LED",
      lcd_color:                config.lcd_color               || "STANDARD",
    };
    if (this._initialized && old !== JSON.stringify(this._config)) {
      const oldParsed = JSON.parse(old);
      // Min/Max-Historie nur bei Entitätswechsel zurücksetzen
      if (oldParsed.entity !== this._config.entity || oldParsed.attribute !== this._config.attribute) {
        this._minMeasured = null;
        this._maxMeasured = null;
        this._latestValue = null;
      } else if (this._gauge) {
        // Aktuelle Messwerte aus der Library sichern bevor der Gauge zerstört wird
        try {
          this._minMeasured = this._gauge.getMinMeasuredValue?.() ?? this._minMeasured;
          this._maxMeasured = this._gauge.getMaxMeasuredValue?.() ?? this._maxMeasured;
        } catch (_) {}
      }
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
    this._latestValue = value;
    if (!this._initialized) {
      this._build(value);
    } else if (this._gauge) {
      this._gauge.setValueAnimated(value);
      if (this._minMeasured === null || value < this._minMeasured) this._minMeasured = value;
      if (this._maxMeasured === null || value > this._maxMeasured) this._maxMeasured = value;
    }
  }

  async _build(initialValue) {
    this._initialized = true;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { display:flex; flex-direction:column; align-items:center; padding:4px; }
        .gauge-wrapper { display:flex; flex-direction:column; align-items:center; }
        canvas { display:block; }
        .msg { font-size:13px; padding:20px; color:var(--secondary-text-color); }
        .err { color:var(--error-color,red); }
      </style>
      <ha-card>
        <div class="gauge-wrapper"><span class="msg">⏳ Lade SteelSeries…</span></div>
      </ha-card>`;

    try { await _loadSteelSeries(); }
    catch (e) { this._err(`Bibliothek konnte nicht geladen werden.<br><small>${e.message}</small>`); return; }

    const ss = window.steelseries;
    if (!ss) { this._err("window.steelseries nicht gefunden."); return; }

    const wrapper = this.shadowRoot.querySelector(".gauge-wrapper");
    wrapper.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.width  = this._config.width;
    canvas.height = this._config.height;
    wrapper.appendChild(canvas);

    const sk = (obj, key, fb) => (obj && obj[key] !== undefined ? obj[key] : fb);
    const mkSections = (list) =>
      Array.isArray(list)
        ? list.map(s => ss.Section(s.start, s.stop, s.color || "rgba(0,200,0,0.3)"))
        : [];

    const hasSections = this._config.sections.length > 0;
    const isLinear    = this._config.gauge_type === "linear" || this._config.gauge_type === "linear_bargraph";

    const params = {
      // Skalierung
      minValue:                 this._config.min,
      maxValue:                 this._config.max,
      titleString:              this._config.title,
      unitString:               this._config.unit,
      // LCD
      lcdVisible:               this._config.show_lcd,
      lcdDecimals:              this._config.lcd_decimals,
      lcdColor:                 sk(ss.LcdColor,        this._config.lcd_color,       ss.LcdColor?.STANDARD),
      digitalFont:              this._config.digital_font,
      // Schwellwert
      thresholdVisible:         this._config.threshold !== null,
      threshold:                this._config.threshold !== null ? this._config.threshold : this._config.max,
      thresholdRising:          this._config.threshold_rising,
      // Messwert-Marker
      minMeasuredValueVisible:  this._config.min_measured_visible,
      maxMeasuredValueVisible:  this._config.max_measured_visible,
      // Animation
      fullScaleDeflectionTime:  this._config.animation_speed,
      // Sections
      section:                  mkSections(this._config.sections),
      useSectionColors:         hasSections,
      // Aussehen
      frameDesign:              sk(ss.FrameDesign,      this._config.frame_design,     ss.FrameDesign?.METAL),
      backgroundColor:          sk(ss.BackgroundColor,  this._config.background_color, ss.BackgroundColor?.DARK_GRAY),
      foregroundType:           sk(ss.ForegroundType,   this._config.foreground_type,  ss.ForegroundType?.TYPE1),
      ledColor:                 sk(ss.LedColor,         this._config.led_color,        ss.LedColor?.RED_LED),
    };

    // Zeiger (nur Radial)
    if (!isLinear) {
      params.pointerType  = sk(ss.PointerType, this._config.pointer_type,  ss.PointerType?.TYPE1);
      params.pointerColor = sk(ss.ColorDef,    this._config.pointer_color,  ss.ColorDef?.RED);
      params.knobType     = sk(ss.KnobType,    this._config.knob_type,      ss.KnobType?.STANDARD_KNOB);
      params.knobStyle    = sk(ss.KnobStyle,   this._config.knob_style,     ss.KnobStyle?.SILVER);
    }
    // Balkenfarbe (nur Linear)
    if (isLinear) {
      params.valueColor   = sk(ss.ColorDef,    this._config.value_color,    ss.ColorDef?.RED);
    }

    // undefined entfernen
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

    try {
      switch (this._config.gauge_type) {
        case "linear_bargraph": this._gauge = new ss.LinearBargraph(canvas, params); break;
        case "linear":          this._gauge = new ss.Linear(canvas, params);         break;
        case "radial_bargraph": this._gauge = new ss.RadialBargraph(canvas, params); break;
        default:                this._gauge = new ss.Radial(canvas, params);         break;
      }
    } catch (e) {
      this._err(`Gauge-Init fehlgeschlagen: ${e.message}`);
      console.error("[SteelSeriesGaugeCard]", e);
      return;
    }

    // Neuesten bekannten Wert verwenden (race condition: set hass kam während async load)
    const v = this._latestValue ?? initialValue;
    this._gauge.setValue(v);
    if (this._minMeasured === null || v < this._minMeasured) this._minMeasured = v;
    if (this._maxMeasured === null || v > this._maxMeasured) this._maxMeasured = v;
    // Gesicherte Min/Max-History wiederherstellen
    if (this._config.min_measured_visible && this._minMeasured !== null)
      this._gauge.setMinMeasuredValue?.(this._minMeasured);
    if (this._config.max_measured_visible && this._maxMeasured !== null)
      this._gauge.setMaxMeasuredValue?.(this._maxMeasured);
  }

  _err(msg) {
    const w = this.shadowRoot.querySelector(".gauge-wrapper");
    if (w) w.innerHTML = `<span class="msg err">⚠️ ${msg}</span>`;
  }

  getCardSize() { return Math.ceil((this._config.height || 220) / 50) + 1; }
}

customElements.define("steelseries-gauge-card", SteelSeriesGaugeCard);

// ── Visueller Editor ─────────────────────────────────────────────────────────
class SteelSeriesGaugeCardEditor extends HTMLElement {
  setConfig(config) { this._config = { sections: [], ...config }; this._render(); }
  connectedCallback() { this._render(); }

  _render() {
    if (!this._config) return;
    const c = this._config;
    const sections = Array.isArray(c.sections) ? c.sections : [];
    const isLinear = (c.gauge_type || "radial").startsWith("linear");

    this.innerHTML = `
      <style>
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding:10px; }
        .full { grid-column:1/-1; }
        label { display:block; font-size:11px; color:var(--secondary-text-color); margin-bottom:2px; }
        input,select { width:100%; padding:5px 8px; border-radius:6px; border:1px solid var(--divider-color);
          background:var(--card-background-color); color:var(--primary-text-color); font-size:13px; box-sizing:border-box; }
        h4 { grid-column:1/-1; margin:10px 0 2px; font-size:11px; color:var(--secondary-text-color);
             text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid var(--divider-color); padding-bottom:4px; }
        .section-row { grid-column:1/-1; display:grid; grid-template-columns:1fr 1fr 80px 36px; gap:6px; align-items:end; }
        .section-row label { font-size:10px; }
        .btn-add { grid-column:1/-1; padding:6px; border-radius:6px; border:1px dashed var(--divider-color);
          background:transparent; color:var(--primary-text-color); cursor:pointer; font-size:13px; }
        .btn-add:hover { background:var(--divider-color); }
        .btn-del { padding:5px 8px; border-radius:6px; border:1px solid var(--error-color,red);
          background:transparent; color:var(--error-color,red); cursor:pointer; font-size:14px; line-height:1; }
        .btn-del:hover { background:var(--error-color,red); color:#fff; }
        input[type="color"] { padding:2px 4px; height:34px; cursor:pointer; }
        .hint { grid-column:1/-1; font-size:10px; color:var(--secondary-text-color); margin-top:-6px; }
      </style>
      <div class="grid">

        <div class="full"><label>Entity *</label>
          <input id="entity" value="${c.entity||""}" placeholder="sensor.mein_sensor"/></div>
        <div class="full"><label>Titel (wird als Gauge-Beschriftung angezeigt)</label>
          <input id="title" value="${c.title||""}"/></div>

        <h4>Gauge-Typ</h4>
        <div class="full"><select id="gauge_type">
          <option value="radial"           ${(c.gauge_type||"radial")==="radial"?"selected":""}>Radial</option>
          <option value="radial_bargraph"  ${c.gauge_type==="radial_bargraph"?"selected":""}>Radial Bargraph</option>
          <option value="linear"           ${c.gauge_type==="linear"?"selected":""}>Linear</option>
          <option value="linear_bargraph"  ${c.gauge_type==="linear_bargraph"?"selected":""}>Linear Bargraph</option>
        </select></div>

        <h4>Skala</h4>
        <div><label>Min</label><input id="min" type="number" value="${c.min!==undefined?c.min:0}"/></div>
        <div><label>Max</label><input id="max" type="number" value="${c.max!==undefined?c.max:100}"/></div>
        <div><label>Einheit</label><input id="unit" value="${c.unit||""}"/></div>
        <div><label>Animationsgeschwindigkeit (s)</label>
          <input id="animation_speed" type="number" step="0.5" min="0.5" value="${c.animation_speed||2.5}"/></div>

        <h4>Größe</h4>
        <div><label>Breite (px)</label><input id="width"  type="number" value="${c.width||c.size||220}"/></div>
        <div><label>Höhe (px)</label> <input id="height" type="number" value="${c.height||c.size||220}"/></div>

        <h4>Schwellwert</h4>
        <div><label>Wert</label><input id="threshold" type="number" value="${c.threshold!=null?c.threshold:""}"/></div>
        <div><label>Richtung</label><select id="threshold_rising">
          <option value="true"  ${c.threshold_rising!==false?"selected":""}>Steigend (↑)</option>
          <option value="false" ${c.threshold_rising===false?"selected":""}>Fallend (↓)</option>
        </select></div>

        <h4>LCD / Anzeige</h4>
        <div><label>LCD anzeigen</label><select id="show_lcd">
          <option value="true"  ${c.show_lcd!==false?"selected":""}>Ja</option>
          <option value="false" ${c.show_lcd===false?"selected":""}>Nein</option>
        </select></div>
        <div><label>LCD-Farbe</label><select id="lcd_color">
          ${["STANDARD","STANDARD_GREEN","BLUE_BLACK","BLUE_DARKBLUE","BLUE_GRAY","BLUE_BLUE",
             "RED_DARKRED","DARKBLUE","LILA","BLACKRED","DARKGREEN","AMBER","LIGHTBLUE","BLACK"]
            .map(v=>`<option value="${v}" ${(c.lcd_color||"STANDARD")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>
        <div><label>Nachkommastellen</label><input id="lcd_decimals" type="number" min="0" max="4" value="${c.lcd_decimals!==undefined?c.lcd_decimals:1}"/></div>
        <div><label>Digital-Font</label><select id="digital_font">
          <option value="false" ${!c.digital_font?"selected":""}>Nein</option>
          <option value="true"  ${c.digital_font?"selected":""}>Ja</option>
        </select></div>
        <div><label>Min-Marker anzeigen</label><select id="min_measured_visible">
          <option value="false" ${!c.min_measured_visible?"selected":""}>Nein</option>
          <option value="true"  ${c.min_measured_visible?"selected":""}>Ja</option>
        </select></div>
        <div><label>Max-Marker anzeigen</label><select id="max_measured_visible">
          <option value="false" ${!c.max_measured_visible?"selected":""}>Nein</option>
          <option value="true"  ${c.max_measured_visible?"selected":""}>Ja</option>
        </select></div>

        <h4>Rahmen &amp; Hintergrund</h4>
        <div><label>Rahmen</label><select id="frame_design">
          ${["METAL","CHROME","BLACK_METAL","SHINY_METAL","BRASS","STEEL","GOLD","ANTHRACITE",
             "TILTED_GRAY","TILTED_BLACK","GLOSSY_METAL"]
            .map(v=>`<option value="${v}" ${(c.frame_design||"METAL")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>
        <div><label>Hintergrund</label><select id="background_color">
          ${["DARK_GRAY","SATIN_GRAY","LIGHT_GRAY","WHITE","BLACK","BEIGE","BROWN","RED","GREEN","BLUE",
             "MUD","PUNCHED_SHEET","CARBON","STAINLESS","BRUSHED_METAL","BRUSHED_STAINLESS","TURNED","ANTHRACITE"]
            .map(v=>`<option value="${v}" ${(c.background_color||"DARK_GRAY")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>
        <div><label>Vordergrund-Typ</label><select id="foreground_type">
          ${["TYPE1","TYPE2","TYPE3","TYPE4","TYPE5"]
            .map(v=>`<option value="${v}" ${(c.foreground_type||"TYPE1")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>
        <div><label>LED-Farbe</label><select id="led_color">
          ${["RED_LED","GREEN_LED","BLUE_LED","ORANGE_LED","YELLOW_LED","CYAN_LED","MAGENTA_LED"]
            .map(v=>`<option value="${v}" ${(c.led_color||"RED_LED")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>

        ${!isLinear ? `
        <h4>Zeiger (nur Radial)</h4>
        <div><label>Zeiger-Typ</label><select id="pointer_type">
          ${["TYPE1","TYPE2","TYPE8"]
            .map(v=>`<option value="${v}" ${(c.pointer_type||"TYPE1")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>
        <div><label>Zeiger-Farbe</label><select id="pointer_color">
          ${["RED","GREEN","BLUE","ORANGE","YELLOW","CYAN","MAGENTA","WHITE","GRAY","BLACK"]
            .map(v=>`<option value="${v}" ${(c.pointer_color||"RED")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>
        <div><label>Knopf-Typ</label><select id="knob_type">
          ${["STANDARD_KNOB","METAL_KNOB"]
            .map(v=>`<option value="${v}" ${(c.knob_type||"STANDARD_KNOB")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>
        <div><label>Knopf-Stil</label><select id="knob_style">
          ${["SILVER","BLACK"]
            .map(v=>`<option value="${v}" ${(c.knob_style||"SILVER")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>
        ` : `
        <h4>Balken-Farbe (nur Linear)</h4>
        <div><label>Wert-Farbe</label><select id="value_color">
          ${["RED","GREEN","BLUE","ORANGE","YELLOW","CYAN","MAGENTA","WHITE","GRAY","BLACK"]
            .map(v=>`<option value="${v}" ${(c.value_color||"RED")===v?"selected":""}>${v}</option>`).join("")}
        </select></div>
        <div></div>
        `}

        <h4>Farbbereiche (Sections)</h4>
        <div class="hint">Abschnitte werden farbig auf dem Gauge markiert</div>
        ${sections.map((s, i) => `
          <div class="section-row" data-idx="${i}">
            <div><label>Start</label><input class="sec-start" type="number" value="${s.start}" data-idx="${i}"/></div>
            <div><label>Stop</label> <input class="sec-stop"  type="number" value="${s.stop}"  data-idx="${i}"/></div>
            <div><label>Farbe</label><input class="sec-color" type="color"  value="${this._rgbaToHex(s.color)}" data-idx="${i}"/></div>
            <div><label>&nbsp;</label><button class="btn-del" data-del="${i}">✕</button></div>
          </div>`).join("")}
        <button class="btn-add full" id="add-section">+ Bereich hinzufügen</button>

      </div>`;

    const ids = ["entity","title","gauge_type","unit","min","max","width","height",
                 "threshold","threshold_rising","show_lcd","lcd_color","lcd_decimals",
                 "digital_font","min_measured_visible","max_measured_visible",
                 "animation_speed","frame_design","background_color","foreground_type","led_color"];
    const optionalIds = ["pointer_type","pointer_color","knob_type","knob_style","value_color"];
    [...ids, ...optionalIds].forEach(id => {
      const el = this.querySelector(`#${id}`);
      if (el) el.addEventListener("change", () => this._changed());
    });

    this.querySelectorAll(".sec-start,.sec-stop,.sec-color").forEach(el =>
      el.addEventListener("change", () => this._changed()));

    this.querySelectorAll(".btn-del").forEach(btn =>
      btn.addEventListener("click", () => {
        this._config.sections.splice(parseInt(btn.dataset.del), 1);
        this._render(); this._dispatch();
      }));

    this.querySelector("#add-section").addEventListener("click", () => {
      const min = this._config.min || 0, max = this._config.max || 100;
      const existing = this._config.sections;
      const lastStop = existing.length ? existing[existing.length-1].stop : min;
      this._config.sections.push({ start: lastStop, stop: Math.min(lastStop + Math.round((max-min)/3), max), color: "rgba(0,200,0,0.3)" });
      this._render(); this._dispatch();
    });

    // gauge_type-Wechsel → neu rendern (Linear/Radial-spezifische Felder)
    const gtEl = this.querySelector("#gauge_type");
    if (gtEl) gtEl.addEventListener("change", () => { this._changed(); this._render(); });
  }

  _changed() {
    const g = id => this.querySelector(`#${id}`);
    const v = (id, fallback="") => g(id) ? g(id).value : fallback;
    const thr = v("threshold");

    const sections = [];
    this.querySelectorAll(".section-row").forEach(row => {
      const idx = parseInt(row.dataset.idx);
      sections[idx] = {
        start: parseFloat(row.querySelector(".sec-start").value),
        stop:  parseFloat(row.querySelector(".sec-stop").value),
        color: this._hexToRgba(row.querySelector(".sec-color").value, 0.4),
      };
    });

    this._config = { ...this._config,
      entity:               v("entity"),
      title:                v("title"),
      gauge_type:           v("gauge_type","radial"),
      unit:                 v("unit"),
      min:                  parseFloat(v("min","0"))             || 0,
      max:                  parseFloat(v("max","100"))           || 100,
      width:                parseInt(v("width","220"))           || 220,
      height:               parseInt(v("height","220"))          || 220,
      threshold:            thr !== "" ? parseFloat(thr) : null,
      threshold_rising:     v("threshold_rising","true") === "true",
      show_lcd:             v("show_lcd","true") === "true",
      lcd_color:            v("lcd_color","STANDARD"),
      lcd_decimals:         parseInt(v("lcd_decimals","1"))      || 1,
      digital_font:         v("digital_font","false") === "true",
      min_measured_visible: v("min_measured_visible","false") === "true",
      max_measured_visible: v("max_measured_visible","false") === "true",
      animation_speed:      parseFloat(v("animation_speed","2.5")) || 2.5,
      frame_design:         v("frame_design","METAL"),
      background_color:     v("background_color","DARK_GRAY"),
      foreground_type:      v("foreground_type","TYPE1"),
      led_color:            v("led_color","RED_LED"),
      pointer_type:         v("pointer_type","TYPE1"),
      pointer_color:        v("pointer_color","RED"),
      knob_type:            v("knob_type","STANDARD_KNOB"),
      knob_style:           v("knob_style","SILVER"),
      value_color:          v("value_color","RED"),
      sections,
    };
    this._dispatch();
  }

  _dispatch() {
    this.dispatchEvent(new CustomEvent("config-changed",
      { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _rgbaToHex(rgba) {
    if (!rgba) return "#00cc00";
    const m = rgba.match(/[\d.]+/g);
    if (!m || m.length < 3) return "#00cc00";
    const h = v => parseInt(v).toString(16).padStart(2,"0");
    return `#${h(m[0])}${h(m[1])}${h(m[2])}`;
  }

  _hexToRgba(hex, alpha=0.4) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}

customElements.define("steelseries-gauge-card-editor", SteelSeriesGaugeCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        "steelseries-gauge-card",
  name:        "SteelSeries Gauge Card",
  description: "Animierte SteelSeries-Gauges (Radial, Linear, Bargraph) mit vollem Konfigurations-Editor",
  preview:     false,
  editor:      "steelseries-gauge-card-editor",
});
