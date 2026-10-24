// ChromaGrade landing page (/chromagrade/) - the editor UI around the grading engine: the Grade
// panel (same controls and ranges as the app), viewer tools, eyedroppers, undo, your own media and
// the guided tour. Scoped to <main class="cg">: every class and ID it uses starts with cg-.
"use strict";

(() => {
  const CS = ColorScience;
  const ROOT = document.querySelector(".cg");
  if (!ROOT) return;
  // Reduced motion: the system setting, or the site's own "Gentle animations" switch being off.
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => reducedMotionQuery.matches || document.body.classList.contains("no-animation");
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));

  // ---- DOM helpers ---------------------------------------------------------------------------------

  const $ = (id) => document.getElementById(id);
  function el(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "style") for (const [p, val] of Object.entries(v)) e.style.setProperty(p, val);
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : String(v));
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return e;
  }

  const EXTRA_ICONS = { SplitGrip: { s: ["M9 7l-5 5 5 5", "M15 7l5 5-5 5"], f: [] } };
  function icon(name) {
    const def = APP_ICONS[name] || EXTRA_ICONS[name];
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "cg-icon");
    svg.setAttribute("aria-hidden", "true");
    for (const d of def?.f ?? []) {
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", "cg-fill");
      svg.append(p);
    }
    for (const d of def?.s ?? []) {
      const p = document.createElementNS(ns, "path");
      p.setAttribute("d", d);
      svg.append(p);
    }
    return svg;
  }
  ROOT.querySelectorAll("[data-icon]").forEach((n) => n.prepend(icon(n.dataset.icon)));
  ROOT.querySelectorAll("[data-icon-before]").forEach((n) => n.prepend(icon(n.dataset.iconBefore)));
  $("cg-split-grip").append(icon("SplitGrip"));

  /** "+12", "−0.35", "0" with a typographic minus (the app's formatSigned). */
  function signed(value, decimals) {
    const threshold = 0.5 / Math.pow(10, decimals);
    if (Math.abs(value) < threshold) return decimals === 0 ? "0" : "0." + "0".repeat(decimals);
    return (value > 0 ? "+" : "−") + Math.abs(value).toFixed(decimals);
  }
  const fmtPercent = (v) => signed(v * 100, 0);

  // ---- engine ----------------------------------------------------------------------------------------

  const canvas = $("cg-gl");
  let engine;
  try {
    engine = new GradeEngine(canvas);
  } catch (e) {
    console.error(e);
    engine = { ok: false };
  }
  if (engine.ok) {
    for (const lut of PRESET_LUTS) {
      const bytes = Uint8Array.from(atob(lut.data), (c) => c.charCodeAt(0));
      const u16 = new Uint16Array(bytes.buffer);
      const data = new Float32Array(u16.length);
      for (let i = 0; i < u16.length; i++) data[i] = u16[i] / 65535;
      engine.addLut(lut.id, { size: lut.size, data });
    }
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      showLoading("The graphics processor was reset. Reload the page to keep grading.", false);
    });
  }
  const LUT_LIST = PRESET_LUTS.map((l) => ({ id: l.id, name: l.name }));

  // ---- state & undo ------------------------------------------------------------------------------------

  const state = {
    look: CS.neutralLook(),
    target: null,
    tab: "basic",
    compare: 0,
    split: 0.5,
    guides: 0,
    scope: 0,
    picking: null,
    hslBand: 3,
    curveChannel: "master",
    panelOpen: true,
    source: "scene",
  };
  const flags = { split: false, wb: false };
  const NEUTRAL = Object.freeze(CS.neutralGrade());

  let committed = CS.clone(state.look);
  const past = [];
  const future = [];

  function commit() {
    if (JSON.stringify(state.look) === JSON.stringify(committed)) return;
    past.push(committed);
    if (past.length > 100) past.shift();
    future.length = 0;
    committed = CS.clone(state.look);
    updateUndo();
  }
  function undo() {
    commit();
    if (!past.length) return;
    future.push(CS.clone(state.look));
    state.look = past.pop();
    committed = CS.clone(state.look);
    afterLookReplaced();
  }
  function redo() {
    if (!future.length) return;
    past.push(CS.clone(state.look));
    state.look = future.pop();
    committed = CS.clone(state.look);
    afterLookReplaced();
  }
  function afterLookReplaced() {
    updateUndo();
    buildPanel();
    onLook();
  }
  function updateUndo() {
    $("cg-btn-undo").disabled = past.length === 0 && JSON.stringify(state.look) === JSON.stringify(committed);
    $("cg-btn-redo").disabled = future.length === 0;
  }

  function maskFor(target, create) {
    let m = state.look.masks.find((x) => x.target === target);
    if (!m && create) {
      m = CS.newMaskedGrade(target);
      state.look.masks.push(m);
    }
    return m;
  }
  /** The grade the panel edits: the picture's own, or the masked grade of the chosen target. */
  const G = () => (state.target ? maskFor(state.target, false)?.grade ?? NEUTRAL : state.look.grade);
  function setG(mutate) {
    mutate(state.target ? maskFor(state.target, true).grade : state.look.grade);
    onLook();
  }

  let controls = [];
  function onLook() {
    if (engine.ok) engine.setLook(state.look);
    for (const c of controls) c.refresh();
    refreshTargetDots();
    updateUndo();
    tour.check();
    if (state.tab === "luts" && !state.target) scheduleLutThumbs();
  }

  // ---- toast ----------------------------------------------------------------------------------------------

  let toastTimer = 0;
  function toast(text) {
    const t = $("cg-toast");
    t.textContent = text;
    t.classList.add("cg-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("cg-show"), 3200);
  }

  function highlight(node) {
    if (!node) return;
    node.classList.remove("cg-highlight");
    void node.offsetWidth;
    node.classList.add("cg-highlight");
  }

  // ---- tweens -------------------------------------------------------------------------------------------------

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function tween(ms, step) {
    if (reduced()) {
      step(1);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        step(ease(t));
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }
  /** Animates scalar fields of the edited grade (or of `objectOf()`), refreshing the controls each frame. */
  async function animateGrade(to, ms = 700, objectOf = null) {
    const obj = objectOf ? objectOf() : state.target ? maskFor(state.target, true).grade : state.look.grade;
    const from = {};
    for (const k of Object.keys(to)) from[k] = obj[k];
    await tween(ms, (e) => {
      for (const k of Object.keys(to)) obj[k] = from[k] + (to[k] - from[k]) * e;
      onLook();
    });
  }

  // =========================================================================================================
  // Controls (the app's PrecisionSlider, ColorWheel + MasterJog, HSL, PointEditor)
  // =========================================================================================================

  const pos = (fraction) => `calc(7.5px + (100% - 15px) * ${fraction})`;

  function slider({ label, min = -1, max = 1, def = 0, get, set, format = fmtPercent, track = null, accent = null, key = label }) {
    const span = max - min;
    const rail = el("div", { class: "cg-slider-rail" + (track ? " cg-gradient" : ""), style: track ? { background: track } : null });
    const fill = el("div", { class: "cg-slider-fill" });
    const tick = el("div", { class: "cg-slider-tick" });
    const thumb = el("div", { class: "cg-slider-thumb" });
    const trackEl = el("div", { class: "cg-slider-track" }, rail, track ? null : fill, tick, thumb);
    const value = el("span", { class: "cg-slider-value" });
    const row = el("div", {
      class: "cg-slider", role: "slider", tabindex: 0, "aria-label": label, "aria-valuemin": min, "aria-valuemax": max,
      style: accent ? { "--cg-accent": accent } : null,
    }, el("span", { class: "cg-slider-label", text: label }), trackEl, value);

    function refresh() {
      const v = get();
      const f = clamp((v - min) / span, 0, 1);
      const fd = clamp((def - min) / span, 0, 1);
      thumb.style.left = pos(f);
      tick.style.left = pos(fd);
      fill.style.left = pos(Math.min(f, fd));
      fill.style.width = `calc((100% - 15px) * ${Math.abs(f - fd)})`;
      row.classList.toggle("cg-changed", Math.abs(v - def) > span * 0.0005);
      value.textContent = format(v);
      row.setAttribute("aria-valuenow", v.toFixed(3));
      row.setAttribute("aria-valuetext", format(v));
    }

    // Relative drags (the thumb never jumps to the finger); ~72 px off the track = fine mode (x0.2);
    // a detent at the default; double-tap resets. A mouse click on the track glides there.
    let pointer = null;
    let raw = 0;
    let lastX = 0;
    let downX = 0;
    let moved = false;
    let width = 1;
    let lastTap = 0;
    row.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      pointer = e.pointerId;
      row.setPointerCapture(e.pointerId);
      raw = get();
      lastX = downX = e.clientX;
      moved = false;
      width = Math.max(1, trackEl.getBoundingClientRect().width - 15);
      row.classList.add("cg-dragging");
    });
    row.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pointer) return;
      if (!moved && Math.abs(e.clientX - downX) < 3) return;
      moved = true;
      const r = row.getBoundingClientRect();
      const fine = Math.abs(e.clientY - (r.top + r.height / 2)) > 72 ? 0.2 : 1;
      raw = clamp(raw + ((e.clientX - lastX) / width) * span * fine, min, max);
      lastX = e.clientX;
      set(Math.abs(raw - def) < span * 0.012 ? def : raw);
    });
    const end = (e) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      row.classList.remove("cg-dragging");
      if (moved || e.type !== "pointerup") {
        commit();
        return;
      }
      const now = performance.now();
      if (now - lastTap < 320) {
        set(def);
        commit();
        lastTap = 0;
        return;
      }
      lastTap = now;
      if (e.pointerType === "mouse") {
        const tr = trackEl.getBoundingClientRect();
        const thumbX = thumb.getBoundingClientRect();
        if (e.clientX >= thumbX.left - 6 && e.clientX <= thumbX.right + 6) return;
        const target = min + clamp((e.clientX - tr.left - 7.5) / Math.max(1, tr.width - 15), 0, 1) * span;
        const from = get();
        tween(160, (k) => set(from + (target - from) * k)).then(commit);
      }
    };
    row.addEventListener("pointerup", end);
    row.addEventListener("pointercancel", end);
    row.addEventListener("keydown", (e) => {
      const step = span / (e.shiftKey ? 20 : 200);
      let v = get();
      if (e.key === "ArrowRight" || e.key === "ArrowUp") v += step;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") v -= step;
      else if (e.key === "PageUp") v += span / 10;
      else if (e.key === "PageDown") v -= span / 10;
      else if (e.key === "Home") v = min;
      else if (e.key === "End") v = max;
      else if (e.key === "Backspace" || e.key === "Delete") v = def;
      else return;
      e.preventDefault();
      set(clamp(v, min, max));
      commit();
    });
    const control = { el: row, refresh, key };
    controls.push(control);
    refresh();
    return row;
  }

  /** A slider bound to a scalar of the edited grade. */
  const gradeSlider = (label, key, opts = {}) =>
    slider({ label, get: () => G()[key], set: (v) => setG((g) => (g[key] = v)), ...opts });

  const TEMP_TRACK = "linear-gradient(90deg, #3B82F6, #D5DBE5, #F59E0B)";
  const TINT_TRACK = "linear-gradient(90deg, #22C55E, #D5DBE5, #D946EF)";
  const HUE_TRACK = "linear-gradient(90deg, " + [0, 60, 120, 180, 240, 300, 360].map((h) => `hsl(${h} 75% 55%)`).join(", ") + ")";

  function toolButton(iconName, label, { active = false, onClick, id } = {}) {
    return el("button", { class: "cg-tool-btn" + (active ? " cg-active" : ""), type: "button", id, onclick: onClick },
      el("span", {}, icon(iconName)), el("span", { text: label }));
  }

  function toggle(label, get, set) {
    const row = el("div", { class: "cg-toggle-row", role: "switch", tabindex: 0 }, el("span", { text: label }), el("span", { class: "cg-switch" }));
    const refresh = () => row.setAttribute("aria-checked", String(get()));
    const flip = () => {
      set(!get());
      commit();
    };
    row.addEventListener("click", flip);
    row.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flip();
      }
    });
    controls.push({ refresh });
    refresh();
    return row;
  }

  // ---- color wheels --------------------------------------------------------------------------------------

  const DISC = "#12161E";
  const GRID = "rgba(74, 86, 112, 0.2)";
  const rgbCss = (c, a = 1) => `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;
  const targetAngle = (r, g, b) => {
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return Math.atan2((r - y) / 1.5748, (b - y) / 1.8556);
  };
  const SCOPE_TARGETS = [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1], [1, 0, 1]];

  function wheel(label, key, accent) {
    const canvasEl = el("canvas", { tabindex: 0, role: "application", "aria-label": `${label} color wheel. Arrow keys move the color, Backspace resets it.` });
    const dot = el("span", { class: "cg-wheel-label", style: { "--cg-accent": accent } }, el("i"), label);
    const readout = el("span", { class: "cg-wheel-readout" });
    const jogCanvas = el("canvas");
    const jogText = el("span");
    const jog = el("div", { class: "cg-jog", role: "slider", tabindex: 0, "aria-label": `${label} brightness`, "aria-valuemin": -1, "aria-valuemax": 1 }, jogCanvas, jogText);
    const root = el("div", { class: "cg-wheel" }, dot, canvasEl, readout, jog);
    const value = () => G()[key];
    let dragging = false;

    function draw() {
      const w = value();
      const dpr = window.devicePixelRatio || 1;
      const size = Math.max(10, Math.round(canvasEl.clientWidth * dpr));
      if (canvasEl.width !== size) canvasEl.width = canvasEl.height = size;
      const ctx = canvasEl.getContext("2d");
      ctx.clearRect(0, 0, size, size);
      const c = size / 2;
      const outer = size / 2;
      const ring = outer * 0.075;
      const inner = outer * 0.84;
      const conic = (alpha) => {
        const g = ctx.createConicGradient(0, c, c);
        for (let i = 0; i <= 72; i++) g.addColorStop(i / 72, rgbCss(CS.wheelDisplayColor(-(i / 72) * Math.PI * 2, 1), alpha));
        return g;
      };
      ctx.lineWidth = ring;
      ctx.strokeStyle = conic(1);
      ctx.beginPath();
      ctx.arc(c, c, outer - ring / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = DISC;
      ctx.beginPath();
      ctx.arc(c, c, inner, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = conic(0.26);
      ctx.fill();
      const fade = ctx.createRadialGradient(c, c, 0, c, c, inner);
      fade.addColorStop(0, DISC);
      fade.addColorStop(0.9, "rgba(18, 22, 30, 0.15)");
      fade.addColorStop(1, "rgba(18, 22, 30, 0)");
      ctx.fillStyle = fade;
      ctx.fill();
      ctx.strokeStyle = GRID;
      ctx.lineWidth = dpr;
      for (const r of [inner / 3, (inner * 2) / 3]) {
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(c - inner, c);
      ctx.lineTo(c + inner, c);
      ctx.moveTo(c, c - inner);
      ctx.lineTo(c, c + inner);
      ctx.stroke();
      const box = 2.5 * dpr;
      for (const t of SCOPE_TARGETS) {
        const a = targetAngle(...t);
        ctx.strokeStyle = rgbCss(t, 0.9);
        ctx.strokeRect(c + Math.cos(a) * inner * 0.88 - box, c - Math.sin(a) * inner * 0.88 - box, box * 2, box * 2);
      }
      const px = c + w.x * inner;
      const py = c - w.y * inner;
      const sat = Math.min(1, Math.hypot(w.x, w.y));
      if (sat > 0) {
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      const reticle = 9 * dpr * (size / dpr < 90 ? 0.8 : 1);
      if (dragging) {
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(px, py, reticle * 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = sat > 0 ? rgbCss(CS.wheelDisplayColor(Math.atan2(w.y, w.x), sat)) : "#E5DAC6";
      ctx.beginPath();
      ctx.arc(px, py, reticle * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(px, py, reticle, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#8E849E";
      ctx.beginPath();
      ctx.arc(c, c, 1.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      // Jog dial.
      const jw = Math.max(10, Math.round(jog.clientWidth * dpr));
      const jh = Math.max(10, Math.round(jog.clientHeight * dpr));
      if (jogCanvas.width !== jw || jogCanvas.height !== jh) {
        jogCanvas.width = jw;
        jogCanvas.height = jh;
      }
      const j = jogCanvas.getContext("2d");
      j.clearRect(0, 0, jw, jh);
      const spacing = 5 * dpr;
      const phase = (((w.master * jw * 0.9) % spacing) + spacing) % spacing;
      for (let x = phase; x < jw; x += spacing) {
        const t = 1 - Math.abs((x / jw) * 2 - 1);
        j.fillStyle = `rgba(31, 22, 50, ${0.04 + 0.2 * t})`;
        j.fillRect(x, 6 * dpr, dpr, jh - 12 * dpr);
      }
      const center = jw / 2;
      if (w.master !== 0) {
        j.strokeStyle = accent;
        j.lineWidth = 2.5 * dpr;
        j.lineCap = "round";
        j.beginPath();
        j.moveTo(center, jh - 2.5 * dpr);
        j.lineTo(center + w.master * (jw / 2 - 6 * dpr), jh - 2.5 * dpr);
        j.stroke();
      }
      j.fillStyle = "#51466A";
      j.fillRect(center - dpr / 2, 3 * dpr, dpr, jh - 6 * dpr);
      jogText.textContent = signed(w.master, 2);
      jog.classList.toggle("cg-changed", w.master !== 0);
      jog.setAttribute("aria-valuenow", w.master.toFixed(2));
      const neutral = w.x === 0 && w.y === 0 && w.master === 0;
      dot.classList.toggle("cg-changed", !neutral);
      if (sat > 0) {
        const hue = ((Math.atan2(w.y, w.x) * 180) / Math.PI + 360) % 360;
        readout.textContent = `H ${Math.round(hue)}°  S ${Math.round(sat * 100)}%`;
      } else readout.textContent = "neutral";
      readout.classList.toggle("cg-changed", sat > 0);
    }

    // Puck: relative drag (60% of a radius per radius of travel), clamped to the disc, snaps to neutral.
    let pointer = null;
    let rawX = 0;
    let rawY = 0;
    let last = null;
    let tapAt = 0;
    let movedPuck = false;
    canvasEl.addEventListener("pointerdown", (e) => {
      pointer = e.pointerId;
      canvasEl.setPointerCapture(e.pointerId);
      const w = value();
      rawX = w.x;
      rawY = w.y;
      last = [e.clientX, e.clientY];
      movedPuck = false;
      dragging = true;
      draw();
    });
    canvasEl.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pointer) return;
      const radius = (canvasEl.clientWidth / 2) * 0.84;
      const dx = e.clientX - last[0];
      const dy = e.clientY - last[1];
      if (!movedPuck && Math.hypot(e.clientX - last[0], e.clientY - last[1]) < 2) return;
      movedPuck = true;
      last = [e.clientX, e.clientY];
      rawX += (dx / radius) * 0.6;
      rawY -= (dy / radius) * 0.6;
      const d = Math.hypot(rawX, rawY);
      if (d > 1) {
        rawX /= d;
        rawY /= d;
      }
      const snapped = Math.hypot(rawX, rawY) < 0.035;
      setG((g) => (g[key] = { ...g[key], x: snapped ? 0 : rawX, y: snapped ? 0 : rawY }));
    });
    const endPuck = (e) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      dragging = false;
      if (!movedPuck && e.type === "pointerup") {
        const now = performance.now();
        if (now - tapAt < 320) {
          setG((g) => (g[key] = { ...g[key], x: 0, y: 0 }));
          tapAt = 0;
        } else tapAt = now;
      }
      draw();
      commit();
    };
    canvasEl.addEventListener("pointerup", endPuck);
    canvasEl.addEventListener("pointercancel", endPuck);
    canvasEl.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 0.1 : 0.02;
      const w = value();
      let x = w.x;
      let y = w.y;
      if (e.key === "ArrowRight") x += step;
      else if (e.key === "ArrowLeft") x -= step;
      else if (e.key === "ArrowUp") y += step;
      else if (e.key === "ArrowDown") y -= step;
      else if (e.key === "Backspace" || e.key === "Delete") x = y = 0;
      else return;
      e.preventDefault();
      const d = Math.hypot(x, y);
      if (d > 1) {
        x /= d;
        y /= d;
      }
      setG((g) => (g[key] = { ...g[key], x, y }));
      commit();
    });

    // Jog: relative, detent at zero, double-tap resets.
    let jp = null;
    let jraw = 0;
    let jlast = 0;
    let jmoved = false;
    let jtap = 0;
    jog.addEventListener("pointerdown", (e) => {
      jp = e.pointerId;
      jog.setPointerCapture(e.pointerId);
      jraw = value().master;
      jlast = e.clientX;
      jmoved = false;
    });
    jog.addEventListener("pointermove", (e) => {
      if (e.pointerId !== jp) return;
      const dx = e.clientX - jlast;
      if (!jmoved && Math.abs(dx) < 2) return;
      jmoved = true;
      jlast = e.clientX;
      jraw = clamp(jraw + dx / (jog.clientWidth * 1.25), -1, 1);
      setG((g) => (g[key] = { ...g[key], master: Math.abs(jraw) < 0.015 ? 0 : jraw }));
    });
    const endJog = (e) => {
      if (e.pointerId !== jp) return;
      jp = null;
      if (!jmoved && e.type === "pointerup") {
        const now = performance.now();
        if (now - jtap < 320) {
          setG((g) => (g[key] = { ...g[key], master: 0 }));
          jtap = 0;
        } else jtap = now;
      }
      commit();
    };
    jog.addEventListener("pointerup", endJog);
    jog.addEventListener("pointercancel", endJog);
    jog.addEventListener("keydown", (e) => {
      let m = value().master;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") m += e.shiftKey ? 0.1 : 0.01;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") m -= e.shiftKey ? 0.1 : 0.01;
      else if (e.key === "Backspace" || e.key === "Delete") m = 0;
      else return;
      e.preventDefault();
      setG((g) => (g[key] = { ...g[key], master: clamp(m, -1, 1) }));
      commit();
    });

    controls.push({ refresh: draw });
    resizeObserver.observe(root);
    requestAnimationFrame(draw);
    return root;
  }

  // ---- HSL ------------------------------------------------------------------------------------------------

  const BANDS = [["Red", "#F04438"], ["Orange", "#FB923C"], ["Yellow", "#FDE047"], ["Green", "#4ADE80"],
    ["Aqua", "#22D3EE"], ["Blue", "#3B82F6"], ["Purple", "#8B5CF6"], ["Magenta", "#E879F9"]];

  function hslSection() {
    const box = el("div", { class: "cg-pad" });
    const row = el("div", { class: "cg-bands", role: "radiogroup", "aria-label": "Color range" });
    const buttons = BANDS.map(([name, color], i) => {
      const b = el("button", { class: "cg-band", type: "button", role: "radio", "aria-label": name, style: { background: color } });
      b.addEventListener("click", () => {
        state.hslBand = i;
        buildPanel();
      });
      row.append(b);
      return b;
    });
    const bandControl = {
      refresh() {
        const h = G().hsl;
        buttons.forEach((b, i) => {
          b.setAttribute("aria-checked", String(i === state.hslBand));
          b.classList.toggle("cg-changed", h.hue[i] !== 0 || h.saturation[i] !== 0 || h.luminance[i] !== 0);
        });
      },
    };
    controls.push(bandControl);
    bandControl.refresh();
    const i = state.hslBand;
    const [name, color] = BANDS[i];
    const prev = BANDS[(i + 7) % 8][1];
    const next = BANDS[(i + 1) % 8][1];
    const hslSet = (field) => (v) => setG((g) => (g.hsl[field][i] = v));
    box.append(
      row,
      slider({ label: "Hue", get: () => G().hsl.hue[i], set: hslSet("hue"), format: (v) => signed(v * 30, 0) + "°", track: `linear-gradient(90deg, ${prev}, ${color}, ${next})` }),
      slider({ label: "Saturation", get: () => G().hsl.saturation[i], set: hslSet("saturation"), track: `linear-gradient(90deg, #8A8A8A, ${color})` }),
      slider({ label: "Luminance", get: () => G().hsl.luminance[i], set: hslSet("luminance"), track: `linear-gradient(90deg, #000, ${color}, #fff)` }),
      el("div", { class: "cg-text-row" },
        el("button", { type: "button", text: `Reset ${name.toLowerCase()}`, onclick: () => { setG((g) => { g.hsl.hue[i] = g.hsl.saturation[i] = g.hsl.luminance[i] = 0; }); commit(); } }),
        el("button", { type: "button", text: "Reset all", onclick: () => { setG((g) => { g.hsl = CS.neutralGrade().hsl; }); commit(); } }),
      ),
    );
    return box;
  }

  // ---- curves ------------------------------------------------------------------------------------------------

  const CURVE_CHANNELS = [["master", "RGB", "#1F1632"], ["red", "Red", "#F87171"], ["green", "Green", "#4ADE80"], ["blue", "Blue", "#60A5FA"]];

  function curvesSection() {
    const box = el("div", { class: "cg-pad" });
    const chips = el("div", { class: "cg-chips", role: "radiogroup", "aria-label": "Curve" });
    for (const [id, label] of CURVE_CHANNELS) {
      chips.append(el("button", {
        class: "cg-chip", type: "button", role: "radio", "aria-checked": String(id === state.curveChannel), text: label,
        onclick: () => { state.curveChannel = id; buildPanel(); },
      }));
    }
    const color = CURVE_CHANNELS.find((c) => c[0] === state.curveChannel)[2];
    const canvasEl = el("canvas", { "aria-label": "Tone curve editor" });
    const readout = el("span", { class: "cg-curve-readout", hidden: true });
    const curveBox = el("div", { class: "cg-curve-box" }, canvasEl, readout);
    const points = () => G().curves[state.curveChannel].slice().sort((a, b) => a.x - b.x);
    const INSET = 12;
    let active = null;

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(10, Math.round(canvasEl.clientWidth * dpr));
      const h = Math.max(10, Math.round(canvasEl.clientHeight * dpr));
      if (canvasEl.width !== w || canvasEl.height !== h) {
        canvasEl.width = w;
        canvasEl.height = h;
      }
      const ctx = canvasEl.getContext("2d");
      const inset = INSET * dpr;
      const pw = w - 2 * inset;
      const ph = h - 2 * inset;
      ctx.fillStyle = "#EFE7D7";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#E1D5BF";
      ctx.lineWidth = dpr;
      ctx.strokeRect(inset, inset, pw, ph);
      ctx.beginPath();
      for (let k = 1; k <= 3; k++) {
        ctx.moveTo(inset + (pw * k) / 4, inset);
        ctx.lineTo(inset + (pw * k) / 4, inset + ph);
        ctx.moveTo(inset, inset + (ph * k) / 4);
        ctx.lineTo(inset + pw, inset + (ph * k) / 4);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(142, 132, 158, 0.4)";
      ctx.beginPath();
      ctx.moveTo(inset, inset + ph);
      ctx.lineTo(inset + pw, inset);
      ctx.stroke();
      const list = points();
      const f = CS.curveFunction(list);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      for (let k = 0; k <= 96; k++) {
        const x = k / 96;
        const px = inset + x * pw;
        const py = inset + (1 - f(x)) * ph;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      for (const p of list) {
        const selected = active && Math.abs(p.x - active.x) < 1e-4;
        const r = (selected ? 9 : 7) * dpr;
        ctx.fillStyle = selected ? "#C6F24E" : "#FFFBF3";
        ctx.beginPath();
        ctx.arc(inset + p.x * pw, inset + (1 - p.y) * ph, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = selected ? "#1F1632" : color;
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
      }
      readout.hidden = !active;
      if (active) readout.textContent = `IN ${Math.round(active.x * 255)}  ·  OUT ${Math.round(active.y * 255)}`;
    }

    const store = (list) => setG((g) => (g.curves[state.curveChannel] = list.map((p) => ({ x: p.x, y: p.y }))));
    let pointer = null;
    let list = [];
    let index = -1;
    let down = null;
    let dragging = false;
    let px = 0;
    let py = 0;
    let lastTap = 0;
    let lastTapIndex = -1;
    const geometry = () => {
      const r = canvasEl.getBoundingClientRect();
      return { r, w: Math.max(1, r.width - 2 * INSET), h: Math.max(1, r.height - 2 * INSET) };
    };
    function nearest(at, w, h) {
      let best = -1;
      let bestD = 30;
      list.forEach((p, i) => {
        const d = Math.hypot(p.x * w - at.x, (1 - p.y) * h - at.y);
        if (d < bestD) {
          best = i;
          bestD = d;
        }
      });
      return best;
    }
    canvasEl.addEventListener("pointerdown", (e) => {
      pointer = e.pointerId;
      canvasEl.setPointerCapture(e.pointerId);
      const { r, w, h } = geometry();
      down = { x: e.clientX - r.left - INSET, y: e.clientY - r.top - INSET, cx: e.clientX, cy: e.clientY };
      list = points();
      index = nearest(down, w, h);
      dragging = false;
    });
    canvasEl.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pointer) return;
      const { w, h } = geometry();
      if (!dragging) {
        if (Math.hypot(e.clientX - down.cx, e.clientY - down.cy) < 4) return;
        dragging = true;
        if (index < 0) {
          if (list.length >= 8) return;
          const x = clamp(down.x / w, 0.02, 0.98);
          const created = { x, y: CS.curveFunction(list)(x) };
          list = [...list, created].sort((a, b) => a.x - b.x);
          index = list.indexOf(created);
        }
        px = list[index].x * w;
        py = (1 - list[index].y) * h;
        down.cx = e.clientX;
        down.cy = e.clientY;
      }
      px += e.clientX - down.cx;
      py += e.clientY - down.cy;
      down.cx = e.clientX;
      down.cy = e.clientY;
      const lastIdx = list.length - 1;
      const minX = index === 0 ? 0 : list[index - 1].x + 0.02;
      const maxX = index === lastIdx ? 1 : list[index + 1].x - 0.02;
      const moved = { x: clamp(px / w, minX, Math.max(minX, maxX)), y: clamp(1 - py / h, 0, 1) };
      list = list.map((p, i) => (i === index ? moved : p));
      active = moved;
      store(list);
    });
    const end = (e) => {
      if (e.pointerId !== pointer) return;
      pointer = null;
      if (!dragging && e.type === "pointerup") {
        const { w } = geometry();
        const now = performance.now();
        if (index >= 0) {
          if (index === lastTapIndex && now - lastTap < 350 && index > 0 && index < list.length - 1) {
            store(list.filter((_, i) => i !== index));
            lastTapIndex = -1;
          } else {
            lastTap = now;
            lastTapIndex = index;
          }
        } else if (list.length < 8) {
          const x = clamp(down.x / w, 0.02, 0.98);
          store([...list, { x, y: CS.curveFunction(list)(x) }].sort((a, b) => a.x - b.x));
          lastTapIndex = -1;
        }
      }
      active = null;
      draw();
      commit();
    };
    canvasEl.addEventListener("pointerup", end);
    canvasEl.addEventListener("pointercancel", end);

    controls.push({ refresh: draw });
    resizeObserver.observe(curveBox);
    requestAnimationFrame(draw);
    const name = CURVE_CHANNELS.find((c) => c[0] === state.curveChannel)[1];
    box.append(chips, curveBox,
      el("p", { class: "cg-hint", style: { margin: "8px 0 0" }, text: "Drag the curve to bend it (up to 8 points). Double-tap a point to remove it." }),
      el("div", { class: "cg-text-row" },
        el("button", { type: "button", text: `Reset ${name}`, onclick: () => { store(CS.neutralGrade().curves.master); commit(); } }),
        el("button", { type: "button", text: "Reset all", onclick: () => { setG((g) => { g.curves = CS.neutralGrade().curves; }); commit(); } }),
      ));
    return box;
  }

  // ---- LUTs ----------------------------------------------------------------------------------------------------

  const userLuts = [];
  let lutTiles = [];
  let lutThumbTimer = 0;

  function lutsSection() {
    const row = el("div", { class: "cg-luts", role: "radiogroup", "aria-label": "LUTs" });
    lutTiles = [];
    const tile = (id, name) => {
      const thumb = el("span", { class: "cg-thumb" });
      const canvasEl = el("canvas", { width: 192, height: 108 });
      thumb.append(canvasEl);
      const b = el("button", { class: "cg-lut", type: "button", role: "radio" }, thumb, el("span", { text: name }));
      b.addEventListener("click", () => {
        state.look.lutId = id;
        if (id) state.look.grade.lutIntensity = state.look.grade.lutIntensity || 1;
        commit();
        onLook();
        buildPanel();
      });
      lutTiles.push({ id, canvas: canvasEl, button: b });
      row.append(b);
    };
    tile(null, "None");
    for (const l of [...LUT_LIST, ...userLuts]) tile(l.id, l.name);
    const importTile = el("button", { class: "cg-lut cg-import", type: "button" }, el("span", { class: "cg-thumb" }, icon("Import")), el("span", { text: "Import .cube" }));
    importTile.addEventListener("click", () => $("cg-cube-input").click());
    row.append(importTile);
    controls.push({ refresh: () => lutTiles.forEach((t) => t.button.setAttribute("aria-checked", String(t.id === state.look.lutId))) });
    controls[controls.length - 1].refresh();
    const box = el("div", {}, row);
    if (state.look.lutId) {
      box.append(el("div", { class: "cg-pad" }, slider({
        label: "Intensity", min: 0, max: 1, def: 1, get: () => state.look.grade.lutIntensity,
        set: (v) => { state.look.grade.lutIntensity = v; onLook(); }, format: (v) => `${Math.round(v * 100)}%`,
      })));
    }
    box.append(el("p", { class: "cg-hint", text: "The nine looks that ship with the app. Your own .cube files work too." }));
    scheduleLutThumbs(0);
    return box;
  }

  function scheduleLutThumbs(delay = 350) {
    clearTimeout(lutThumbTimer);
    lutThumbTimer = setTimeout(renderLutThumbs, delay);
  }

  function renderLutThumbs() {
    if (!engine.ok || !engine.source || state.tab !== "luts") return;
    const tiles = lutTiles.slice();
    let i = 0;
    const next = () => {
      if (i >= tiles.length || state.tab !== "luts") return;
      const t = tiles[i++];
      const look = CS.clone(state.look);
      look.lutId = t.id;
      look.grade.lutIntensity = 1;
      const img = engine.thumbnail(look, t.canvas.width, t.canvas.height);
      t.canvas.getContext("2d").putImageData(img, 0, 0);
      setTimeout(next, 0);
    };
    next();
  }

  function parseCube(text) {
    let size = 0;
    let title = null;
    let min = [0, 0, 0];
    let max = [1, 1, 1];
    const values = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("TITLE")) title = line.replace(/^TITLE\s*/, "").replace(/^"|"$/g, "");
      else if (line.startsWith("LUT_3D_SIZE")) size = parseInt(line.split(/\s+/)[1], 10);
      else if (line.startsWith("LUT_1D_SIZE")) throw new Error("it is a 1D LUT; ChromaGrade uses 3D LUTs");
      else if (line.startsWith("DOMAIN_MIN")) min = line.split(/\s+/).slice(1, 4).map(Number);
      else if (line.startsWith("DOMAIN_MAX")) max = line.split(/\s+/).slice(1, 4).map(Number);
      else if (/^[-+.\d]/.test(line)) {
        const parts = line.split(/\s+/);
        values.push(+parts[0], +parts[1], +parts[2]);
      }
    }
    if (!(size >= 2 && size <= 65)) throw new Error("it has no LUT_3D_SIZE between 2 and 65");
    if (values.length !== size * size * size * 3) throw new Error(`it should list ${size ** 3} colors but lists ${values.length / 3}`);
    if (values.some((v) => !Number.isFinite(v))) throw new Error("some of its numbers are not valid");
    return { title, size, data: new Float32Array(values), domainMin: min, domainMax: max };
  }

  const cubeInput = el("input", { type: "file", id: "cg-cube-input", accept: ".cube", hidden: true });
  ROOT.append(cubeInput);
  cubeInput.addEventListener("change", async () => {
    const file = cubeInput.files[0];
    cubeInput.value = "";
    if (!file) return;
    try {
      const lut = parseCube(await file.text());
      const id = "user:" + file.name + ":" + Date.now();
      engine.addLut(id, lut);
      userLuts.push({ id, name: lut.title || file.name.replace(/\.cube$/i, "") });
      state.look.lutId = id;
      state.look.grade.lutIntensity = 1;
      commit();
      onLook();
      buildPanel();
      toast(`“${userLuts[userLuts.length - 1].name}” added`);
    } catch (err) {
      toast(`That .cube file couldn't be read: ${err.message}.`);
    }
  });

  // =========================================================================================================
  // The Grade panel
  // =========================================================================================================

  const TABS = [["basic", "Basic"], ["wheels", "Wheels"], ["hsl", "HSL"], ["curves", "Curves"], ["luts", "LUTs"], ["fx", "FX"]];
  const panelBody = $("cg-panel-body");
  const resizeObserver = new ResizeObserver(() => controls.forEach((c) => c.refresh()));
  let targetChips = [];

  function refreshTargetDots() {
    for (const { target, node } of targetChips) {
      const m = target && state.look.masks.find((x) => x.target === target);
      node.querySelector(".cg-tdot")?.toggleAttribute("hidden", !(m && !CS.isNeutralGrade(m.grade)));
    }
  }

  /** Rebuilding replaces every control, so keyboard focus moves to the matching control in the new panel. */
  function buildPanel() {
    const focused = panelBody.contains(document.activeElement) ? controlKey(document.activeElement) : null;
    renderPanel();
    if (!focused) return;
    const match = [...panelBody.querySelectorAll("button, [tabindex]")].find((n) => controlKey(n) === focused);
    (match ?? panelBody.querySelector("[role=tab][aria-selected=true], [role=radio][aria-checked=true]"))?.focus({ preventScroll: true });
  }

  const controlKey = (node) => `${node.getAttribute("role") ?? node.tagName}|${node.getAttribute("aria-label") ?? node.textContent.trim()}`;

  function renderPanel() {
    resizeObserver.disconnect();
    controls = [];
    const scroll = panelBody.scrollTop;
    panelBody.replaceChildren();

    // What the panel edits.
    const targets = el("div", { class: "cg-targets", role: "radiogroup", "aria-label": "Grade" });
    targetChips = [];
    for (const target of [null, "subject", "background", "sky", "color"]) {
      const node = el("button", {
        class: "cg-target-chip", type: "button", role: "radio", "aria-checked": String(state.target === target),
      }, target ? el("span", { class: "cg-tdot", hidden: true }) : null, target ? CS.TARGETS[target].label : "Whole clip");
      node.addEventListener("click", () => {
        commit();
        state.target = target;
        state.picking = null;
        updatePickUi();
        buildPanel();
      });
      targetChips.push({ target, node });
      targets.append(node);
    }
    panelBody.append(targets);
    refreshTargetDots();

    if (state.target && CS.TARGETS[state.target].needsMatte && !engine.hasMatte) {
      panelBody.append(el("div", { class: "cg-note-card" },
        el("p", {}, el("strong", { text: "Subject and background need the app's on-device AI." }),
          "On the phone, ChromaGrade finds the subject in every frame without uploading anything. In this demo, try them on the sample shot."),
        toolButton("Cutout", "Use the sample shot", { onClick: () => useSample() })));
      panelBody.scrollTop = 0;
      return;
    }

    const tabs = state.target ? TABS.filter(([id]) => id !== "luts" && id !== "fx") : TABS;
    if (!tabs.some(([id]) => id === state.tab)) state.tab = "basic";
    const tabRow = el("div", { class: "cg-tabs", role: "tablist" });
    for (const [id, label] of tabs) {
      tabRow.append(el("button", {
        type: "button", role: "tab", "aria-selected": String(state.tab === id), text: label,
        onclick: () => { state.tab = id; panelBody.scrollTop = 0; buildPanel(); },
      }));
    }
    panelBody.append(tabRow);

    const body = el("div", { role: "tabpanel" });
    if (state.tab === "basic") body.append(basicSection());
    else if (state.tab === "wheels") {
      body.append(el("div", { class: "cg-wheels" }, wheel("Lift", "lift", "#6A3DE8"), wheel("Gamma", "gamma", "#6A3DE8"), wheel("Gain", "gain", "#C27500")));
      body.append(el("p", { class: "cg-hint", text: "Drag a wheel's center to tint shadows, midtones or highlights. The dial below each wheel sets its brightness." }));
    } else if (state.tab === "hsl") body.append(hslSection());
    else if (state.tab === "curves") body.append(curvesSection());
    else if (state.tab === "luts") body.append(lutsSection());
    else if (state.tab === "fx") {
      body.append(el("div", { class: "cg-pad" },
        el("div", { class: "cg-section-label", text: "Finishing" }),
        slider({ label: "Vignette", get: () => state.look.effects.vignette, set: (v) => { state.look.effects.vignette = v; onLook(); } }),
        slider({ label: "Film grain", min: 0, max: 1, get: () => state.look.effects.grain, set: (v) => { state.look.effects.grain = v; onLook(); }, format: (v) => `${Math.round(v * 100)}` }),
        slider({ label: "Sharpen", min: 0, max: 1, get: () => state.look.effects.sharpen, set: (v) => { state.look.effects.sharpen = v; onLook(); }, format: (v) => `${Math.round(v * 100)}` }),
      ));
    }
    panelBody.append(body);

    const resetLabel = state.target ? `Reset ${CS.TARGETS[state.target].label.toLowerCase()}` : "Reset look";
    const hold = el("button", { type: "button", class: "cg-hold", text: "Hold to see original" });
    holdable(hold);
    panelBody.append(el("div", { class: "cg-panel-foot" }, el("button", { type: "button", text: resetLabel, onclick: resetGrade }), hold));
    panelBody.scrollTop = scroll;
  }

  function basicSection() {
    const box = el("div", { class: "cg-pad" });
    if (state.target === "color") {
      const m = () => maskFor("color", false) ?? CS.newMaskedGrade("color");
      const setM = (mutate) => {
        mutate(maskFor("color", true));
        onLook();
      };
      const dot = el("span", { class: "cg-hue-dot" });
      const dotControl = { refresh: () => dot.style.setProperty("background", `hsl(${m().hue} 75% 55%)`) };
      controls.push(dotControl);
      dotControl.refresh();
      box.append(
        el("div", { class: "cg-section-label", text: "Colors to grade" }),
        el("div", { class: "cg-swatch-row" }, dot, toolButton("Eyedropper", "Pick a color", {
          active: state.picking === "color", id: "cg-pick-color", onClick: () => startPicking("color"),
        })),
        slider({ label: "Hue", min: 0, max: 360, def: 120, track: HUE_TRACK, get: () => m().hue, set: (v) => setM((x) => (x.hue = v)), format: (v) => `${Math.round(v)}°` }),
        slider({ label: "Range", min: 5, max: 90, def: 30, get: () => m().range, set: (v) => setM((x) => (x.range = v)), format: (v) => `±${Math.round(v)}°` }),
        slider({ label: "Softness", min: 2, max: 60, def: 20, get: () => m().softness, set: (v) => setM((x) => (x.softness = v)), format: (v) => `${Math.round(v)}°` }),
        toggle("Everything except this color", () => m().invert, (v) => setM((x) => (x.invert = v))),
      );
    }
    box.append(
      el("div", { class: "cg-section-label", text: "Light" }),
      gradeSlider("Exposure", "exposure", { min: -4, max: 4, format: (v) => signed(v, 2) + " EV" }),
      gradeSlider("Contrast", "contrast"),
      gradeSlider("Highlights", "highlights"),
      gradeSlider("Shadows", "shadows"),
      gradeSlider("Whites", "whites"),
      gradeSlider("Blacks", "blacks"),
      el("div", { class: "cg-section-label", text: "Color" }),
      el("div", { class: "cg-tool-row" },
        toolButton("Eyedropper", state.picking === "wb" ? "Tap the viewer" : "Pick white", { active: state.picking === "wb", id: "cg-pick-white", onClick: () => startPicking("wb") }),
        state.target ? null : toolButton("Auto", "Auto", { id: "cg-auto-wb", onClick: autoWhiteBalance })),
      gradeSlider("Temperature", "temperature", { track: TEMP_TRACK, accent: "#C27500" }),
      gradeSlider("Tint", "tint", { track: TINT_TRACK, accent: "#B4269E" }),
      gradeSlider("Vibrance", "vibrance"),
      gradeSlider("Saturation", "saturation"),
      el("div", { class: "cg-section-label", text: "Detail" }),
      gradeSlider("Texture", "texture"),
      gradeSlider("Clarity", "clarity"),
      gradeSlider("Dehaze", "dehaze"),
    );
    return box;
  }

  function resetGrade() {
    if (state.target) state.look.masks = state.look.masks.filter((m) => m.target !== state.target);
    else state.look = CS.neutralLook();
    commit();
    buildPanel();
    onLook();
  }

  /** Scrolls the panel so a control (by its label) is in view, and flashes it. */
  function reveal(key) {
    const c = controls.find((x) => x.key === key);
    const node = c?.el ?? document.getElementById(key);
    if (!node) return;
    const top = node.getBoundingClientRect().top - panelBody.getBoundingClientRect().top + panelBody.scrollTop;
    panelBody.scrollTo({ top: Math.max(0, top - panelBody.clientHeight / 3), behavior: reduced() ? "auto" : "smooth" });
    highlight(node);
  }

  // =========================================================================================================
  // Viewer
  // =========================================================================================================

  const viewer = $("cg-viewer");
  const guidesCanvas = $("cg-guides");
  const scopeCanvas = $("cg-scope");
  const GUIDES = ["Guides", "Thirds", "Safe zone"];
  const SCOPES = ["Scope", "Luma", "Parade"];
  const COMPARES = ["Graded", "Before", "Split"];   // engine: 0 graded, 1 original, 2 split

  function setCompare(mode) {
    state.compare = mode;
    if (engine.ok) engine.setView({ compare: state.holding ? 1 : mode, split: state.split });
    const chip = $("cg-chip-compare");
    chip.querySelector(".cg-chip-label").textContent = COMPARES[mode];
    chip.classList.toggle("cg-active", mode !== 0);
    $("cg-split").hidden = mode !== 2;
    layoutOverlays();
  }

  function setSplit(v) {
    state.split = clamp(v, 0.02, 0.98);
    flags.split = true;
    if (engine.ok) engine.setView({ split: state.split });
    $("cg-split-line").style.left = `${state.split * 100}%`;
    $("cg-split-grip").setAttribute("aria-valuenow", String(Math.round(state.split * 100)));
    tour.check();
  }

  $("cg-chip-guides").addEventListener("click", () => {
    state.guides = (state.guides + 1) % 3;
    $("cg-chip-guides").querySelector(".cg-chip-label").textContent = GUIDES[state.guides];
    $("cg-chip-guides").classList.toggle("cg-active", state.guides !== 0);
    drawGuides();
  });
  $("cg-chip-scope").addEventListener("click", () => {
    state.scope = (state.scope + 1) % 3;
    $("cg-chip-scope").querySelector(".cg-chip-label").textContent = SCOPES[state.scope];
    $("cg-chip-scope").classList.toggle("cg-active", state.scope !== 0);
    scopeCanvas.hidden = state.scope === 0;
    drawScope();
  });
  $("cg-chip-compare").addEventListener("click", () => {
    const next = state.compare === 0 ? 2 : state.compare === 2 ? 1 : 0;
    setCompare(next);
    if (next === 2) flags.split = true;
    tour.check();
  });

  function pictureRect() {
    if (!engine.ok) return [0, 0, viewer.clientWidth, viewer.clientHeight];
    return engine.pictureRectCss();
  }

  function layoutOverlays() {
    const [x, y, w, h] = pictureRect();
    const split = $("cg-split");
    Object.assign(split.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    $("cg-split-line").style.left = `${state.split * 100}%`;
    drawGuides();
  }

  function drawGuides() {
    const dpr = window.devicePixelRatio || 1;
    const cw = Math.round(viewer.clientWidth * dpr);
    const ch = Math.round(viewer.clientHeight * dpr);
    if (guidesCanvas.width !== cw || guidesCanvas.height !== ch) {
      guidesCanvas.width = cw;
      guidesCanvas.height = ch;
    }
    const ctx = guidesCanvas.getContext("2d");
    ctx.clearRect(0, 0, cw, ch);
    if (state.guides === 0) return;
    const [x, y, w, h] = pictureRect().map((v) => v * dpr);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = dpr;
    if (state.guides === 1) {
      ctx.beginPath();
      for (const k of [1, 2]) {
        ctx.moveTo(x + (w * k) / 3, y);
        ctx.lineTo(x + (w * k) / 3, y + h);
        ctx.moveTo(x, y + (h * k) / 3);
        ctx.lineTo(x + w, y + (h * k) / 3);
      }
      ctx.stroke();
      return;
    }
    // Classic action-safe (90%) and title-safe (80%) frames.
    ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.font = `${10 * dpr}px Roboto, system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    for (const [f, label] of [[0.9, "Action safe"], [0.8, "Title safe"]]) {
      const rw = w * f;
      const rh = h * f;
      const rx = x + (w - rw) / 2;
      const ry = y + (h - rh) / 2;
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillText(label, rx + 6 * dpr, ry + rh - 6 * dpr);
    }
    ctx.setLineDash([]);
  }

  let scopeTimer = 0;
  function drawScope() {
    if (state.scope === 0 || !engine.ok) return;
    clearTimeout(scopeTimer);
    scopeTimer = setTimeout(() => {
      const data = engine.finalPixels(180);
      if (!data) return;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(scopeCanvas.clientWidth * dpr);
      const h = Math.round(scopeCanvas.clientHeight * dpr);
      scopeCanvas.width = w;
      scopeCanvas.height = h;
      const ctx = scopeCanvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      const pad = 6 * dpr;
      const ph = h - 2 * pad;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = dpr;
      ctx.beginPath();
      for (let k = 0; k <= 4; k++) {
        const yy = pad + (ph * k) / 4;
        ctx.moveTo(pad, yy);
        ctx.lineTo(w - pad, yy);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      const { pixels, width, height } = data;
      const parade = state.scope === 2;
      const sections = parade ? [[0, "rgba(255, 80, 80, 0.09)"], [1, "rgba(90, 255, 120, 0.09)"], [2, "rgba(90, 150, 255, 0.11)"]] : [[-1, "rgba(198, 242, 78, 0.06)"]];
      const pw = (w - 2 * pad) / sections.length;
      sections.forEach(([channel, color], s) => {
        ctx.fillStyle = color;
        for (let yy = 0; yy < height; yy++) {
          for (let xx = 0; xx < width; xx++) {
            const i = (yy * width + xx) * 4;
            const v = channel < 0 ? (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255 : pixels[i + channel] / 255;
            ctx.fillRect(pad + s * pw + (xx / width) * pw, pad + (1 - v) * ph, 1.2 * dpr, 1.2 * dpr);
          }
        }
      });
      ctx.globalCompositeOperation = "source-over";
    }, 90);
  }

  if (engine.ok) {
    engine.onRendered = () => drawScope();
    new ResizeObserver(() => {
      engine.resize();
      layoutOverlays();
    }).observe(viewer);
  }

  // Split divider.
  {
    const grip = $("cg-split-grip");
    let pointer = null;
    grip.addEventListener("pointerdown", (e) => {
      pointer = e.pointerId;
      grip.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    grip.addEventListener("pointermove", (e) => {
      if (e.pointerId !== pointer) return;
      const r = $("cg-split").getBoundingClientRect();
      setSplit((e.clientX - r.left) / r.width);
    });
    const end = (e) => {
      if (e.pointerId === pointer) pointer = null;
    };
    grip.addEventListener("pointerup", end);
    grip.addEventListener("pointercancel", end);
    grip.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") setSplit(state.split - 0.02);
      else if (e.key === "ArrowRight") setSplit(state.split + 0.02);
      else return;
      e.preventDefault();
    });
  }

  // Press and hold anywhere on the picture (or the panel's button, or "\") to see the original.
  function setHolding(on) {
    if (state.holding === on) return;
    state.holding = on;
    $("cg-badge-original").hidden = !on;
    if (engine.ok) engine.setView({ compare: on ? 1 : state.compare });
  }
  function holdable(node) {
    node.addEventListener("pointerdown", (e) => {
      node.setPointerCapture(e.pointerId);
      setHolding(true);
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) node.addEventListener(type, () => setHolding(false));
    node.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setHolding(true);
      }
    });
    node.addEventListener("keyup", () => setHolding(false));
  }
  {
    let timer = 0;
    let down = null;
    viewer.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      down = { x: e.clientX, y: e.clientY, id: e.pointerId };
      if (state.picking) return;
      timer = setTimeout(() => setHolding(true), 220);
    });
    viewer.addEventListener("pointermove", (e) => {
      if (down && e.pointerId === down.id && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) clearTimeout(timer);
    });
    viewer.addEventListener("pointerup", (e) => {
      clearTimeout(timer);
      setHolding(false);
      if (!down || e.pointerId !== down.id) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8;
      down = null;
      if (state.picking && !moved && !e.target.closest("button")) {
        const r = canvas.getBoundingClientRect();
        const [px, py, pw, ph] = pictureRect();
        const u = (e.clientX - r.left - px) / pw;
        const v = (e.clientY - r.top - py) / ph;
        if (u >= 0 && u <= 1 && v >= 0 && v <= 1) pickAt(u, v);
      }
    });
    viewer.addEventListener("pointercancel", () => {
      clearTimeout(timer);
      setHolding(false);
      down = null;
    });
    viewer.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  window.addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea")) return;
    if (e.key === "\\") setHolding(true);
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
    } else if (e.key === "Escape" && state.picking) {
      state.picking = null;
      updatePickUi();
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "\\") setHolding(false);
  });

  // ---- eyedroppers & auto white balance ------------------------------------------------------------------------------

  function updatePickUi() {
    const picking = state.picking;
    $("cg-pick-banner").hidden = !picking;
    $("cg-pick-text").textContent = picking === "color" ? "Tap the color you want to grade" : "Tap something that should be white or grey";
    viewer.classList.toggle("cg-picking", !!picking);
    const white = $("cg-pick-white");
    if (white) {
      white.classList.toggle("cg-active", picking === "wb");
      white.lastChild.textContent = picking === "wb" ? "Tap the viewer" : "Pick white";
    }
    const color = $("cg-pick-color");
    if (color) {
      color.classList.toggle("cg-active", picking === "color");
      color.lastChild.textContent = picking === "color" ? "Tap the viewer" : "Pick a color";
    }
  }
  function startPicking(mode) {
    state.picking = state.picking === mode ? null : mode;
    if (state.picking && state.video && !state.video.paused) state.video.pause();
    updatePickUi();
  }
  $("cg-pick-cancel").addEventListener("click", () => {
    state.picking = null;
    updatePickUi();
  });

  function showMarker(u, v) {
    const [x, y, w, h] = pictureRect();
    const m = $("cg-pick-marker");
    m.hidden = true;
    void m.offsetWidth;
    Object.assign(m.style, { left: `${x + u * w}px`, top: `${y + v * h}px` });
    m.hidden = false;
  }

  async function pickAt(u, v) {
    const mode = state.picking;
    state.picking = null;
    updatePickUi();
    if (!mode || !engine.ok) return;
    showMarker(u, v);
    // The color the edited grade starts from: ungraded for the picture's own grade, after it for a masked one.
    const c = state.target ? engine.samplePrimary(u, v, state.look) : engine.sampleSource(u, v);
    if (Math.max(...c) < 0.02) {
      toast("Tap on the picture itself.");
      return;
    }
    if (mode === "wb") {
      const [t, g] = CS.solveWhiteBalance(c.map(CS.toLinear));
      await animateGrade({ temperature: t, tint: g }, 600);
      flags.wb = true;
      commit();
      tour.check();
    } else {
      const hue = CS.hueDegrees(c[0], c[1], c[2]);
      if (hue == null) {
        toast("That spot is grey. Tap a colored area.");
        return;
      }
      const m = maskFor("color", true);
      const from = m.hue;
      const to = Math.abs(hue - from) > 180 ? (hue > from ? hue - 360 : hue + 360) : hue;
      await tween(500, (k) => {
        m.hue = (((from + (to - from) * k) % 360) + 360) % 360;
        onLook();
      });
      commit();
    }
  }

  async function autoWhiteBalance() {
    if (!engine.ok) return;
    const light = CS.illuminant(engine.sourcePixels(256));
    if (!light) {
      toast("Not enough detail in this frame to balance it.");
      return;
    }
    const [t, g] = CS.solveWhiteBalance(light);
    await animateGrade({ temperature: t * 0.85, tint: g * 0.85 }, 600, () => state.look.grade);
    flags.wb = true;
    commit();
    toast("White balance set. Fine-tune it with Temperature and Tint.");
    tour.check();
  }

  // =========================================================================================================
  // Chrome: top bar, panel / timeline, export sheet, loading
  // =========================================================================================================

  $("cg-btn-undo").addEventListener("click", undo);
  $("cg-btn-redo").addEventListener("click", redo);
  $("cg-btn-back").addEventListener("click", () => toast("In the app, this goes back to your projects."));
  const sheet = $("cg-sheet");
  const openSheet = (open) => {
    const hadFocus = sheet.contains(document.activeElement);
    sheet.hidden = !open;
    $("cg-sheet-scrim").hidden = !open;
    if (open) $("cg-sheet-close").focus();
    else if (hadFocus) $("cg-btn-export").focus();
  };
  $("cg-btn-export").addEventListener("click", () => openSheet(true));
  $("cg-sheet-close").addEventListener("click", () => openSheet(false));
  $("cg-sheet-scrim").addEventListener("click", () => openSheet(false));
  sheet.addEventListener("keydown", (e) => {
    if (e.key === "Escape") openSheet(false);
    else if (e.key === "Tab") {
      // Close is the sheet's only control: keep focus in the dialog.
      e.preventDefault();
      $("cg-sheet-close").focus();
    }
  });

  const TOOLS = [["Grade", "Grade"], ["Split", "Split"], ["Speed", "Speed"], ["Volume", "Volume"], ["Transform", "Transform"], ["Crop", "Crop"],
    ["Mask", "Mask"], ["Cutout", "Remove BG"], ["Reverse", "Reverse"], ["Stabilize", "Stabilize"], ["Freeze", "Freeze"]];
  for (const [name, label] of TOOLS) {
    const b = el("button", { type: "button", class: name === "Grade" ? "cg-active" : null }, el("span", {}, icon(name)), el("span", { text: label }));
    b.addEventListener("click", () => (name === "Grade" ? setPanelOpen(true) : toast(`${label} is part of the app. This demo covers color.`)));
    $("cg-toolrow").append(b);
  }
  function setPanelOpen(open) {
    state.panelOpen = open;
    $("cg-panel").hidden = !open;
    $("cg-timeline").hidden = open;
    $("cg-toolrow").hidden = open;
    if (!open) drawTimeline();
  }
  $("cg-btn-panel-done").addEventListener("click", () => {
    commit();
    setPanelOpen(false);
  });

  function drawTimeline() {
    const ruler = $("cg-timeline-ruler");
    ruler.replaceChildren(...[0, 2, 4, 6, 8].map((s, i) => el("span", { style: { left: `${40 + i * 75}px` }, text: `0:0${s}` })));
    const strip = $("cg-filmstrip");
    const dpr = window.devicePixelRatio || 1;
    strip.width = Math.round(strip.clientWidth * dpr);
    strip.height = Math.round(strip.clientHeight * dpr);
    const ctx = strip.getContext("2d");
    if (engine.ok && engine.source) {
      const frames = 4;
      const fw = strip.width / frames;
      const { w, h } = engine.sourceSize;
      const cropW = Math.min(1, ((fw / strip.height) * h) / w);
      for (let i = 0; i < frames; i++) {
        const x0 = (1 - cropW) * (i / (frames - 1));
        const img = engine.sourceCrop([x0, 0, cropW, 1], Math.round(fw), strip.height);
        ctx.putImageData(img, Math.round(i * fw), 0);
      }
    }
    const wave = $("cg-waveform");
    wave.width = Math.round(wave.clientWidth * dpr);
    wave.height = Math.round(wave.clientHeight * dpr);
    const wc = wave.getContext("2d");
    wc.fillStyle = "rgba(75, 34, 184, 0.55)";
    const bars = Math.floor(wave.width / (3 * dpr));
    for (let i = 0; i < bars; i++) {
      const t = i / bars;
      const a = 0.25 + 0.55 * Math.abs(Math.sin(t * 31) * Math.sin(t * 7.3 + 1)) + 0.2 * Math.abs(Math.sin(t * 97));
      const bh = a * wave.height * 0.62;
      wc.fillRect(i * 3 * dpr, wave.height - bh - 3 * dpr, 2 * dpr, bh);
    }
  }

  function showLoading(text, spinner = true) {
    $("cg-loading").hidden = false;
    $("cg-loading").querySelector(".cg-loading-ring").hidden = !spinner;
    $("cg-loading-text").textContent = text;
  }

  function aspectLabel(w, h) {
    const r = w / h;
    const known = [[16 / 9, "16:9"], [9 / 16, "9:16"], [4 / 3, "4:3"], [3 / 4, "3:4"], [1, "1:1"], [3 / 2, "3:2"], [2 / 3, "2:3"], [21 / 9, "21:9"]];
    const best = known.reduce((a, b) => (Math.abs(b[0] - r) < Math.abs(a[0] - r) ? b : a));
    return Math.abs(best[0] - r) < 0.02 ? best[1] : r.toFixed(2) + ":1";
  }
  function updateHud() {
    const { w, h } = engine.ok ? engine.sourceSize : { w: 1600, h: 900 };
    $("cg-hud").textContent = `${aspectLabel(w, h)} · ${w}×${h}`;
  }

  // =========================================================================================================
  // Sources: the sample shot, your photo, your video
  // =========================================================================================================

  async function useSample() {
    stopVideo();
    if (!engine.ok) return;
    if (state.source !== "scene") {
      showLoading("Opening the sample shot…");
      await engine.loadSample(SAMPLE_SHOT, SAMPLE_MATTE);
      $("cg-loading").hidden = true;
    }
    state.source = "scene";
    $("cg-project-name").textContent = "Lakeside dusk";
    $("cg-project-status").textContent = "Sample shot · nothing uploaded";
    $("cg-transport-text").textContent = "Sample shot · still";
    $("cg-transport-time").textContent = "";
    $("cg-btn-play").hidden = true;
    $("cg-btn-sample").hidden = true;
    afterSourceChanged();
  }

  function stopVideo() {
    if (state.video) {
      state.video.pause();
      URL.revokeObjectURL(state.video.src);
      state.video.remove();
      state.video = null;
    }
  }

  function afterSourceChanged() {
    updateHud();
    engine.resize();
    layoutOverlays();
    buildPanel();
    onLook();
    if (!state.panelOpen) drawTimeline();
  }

  async function useFile(file) {
    if (!file || !engine.ok) return;
    const name = file.name.replace(/\.[^.]+$/, "") || "Your clip";
    try {
      if (file.type.startsWith("video/")) {
        stopVideo();
        // In the page (invisibly): browsers stop presenting frames of a video that isn't.
        const video = el("video", { muted: true, loop: true, playsinline: true, class: "cg-source-video", "aria-hidden": "true" });
        video.muted = true;
        video.src = URL.createObjectURL(file);
        viewer.append(video);
        showLoading("Opening your video…");
        await new Promise((resolve, reject) => {
          video.addEventListener("loadeddata", resolve, { once: true });
          video.addEventListener("error", () => reject(new Error("unsupported")), { once: true });
        });
        state.video = video;
        engine.setVideo(video);
        state.source = "video";
        $("cg-btn-play").hidden = false;
        $("cg-transport-text").textContent = file.name;
        startVideoLoop(video);
        video.play().catch(() => {});
      } else if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|avif|gif|heic)$/i.test(file.name)) {
        stopVideo();
        showLoading("Opening your photo…");
        await engine.loadImage(file);
        state.source = "image";
        $("cg-btn-play").hidden = true;
        $("cg-transport-text").textContent = `${file.name} · still`;
        $("cg-transport-time").textContent = "";
      } else {
        toast("Choose a photo or a video.");
        return;
      }
    } catch (err) {
      console.error(err);
      $("cg-loading").hidden = true;
      toast("This browser can't open that file. Try a JPEG, PNG or MP4.");
      return;
    }
    $("cg-loading").hidden = true;
    $("cg-project-name").textContent = name;
    $("cg-project-status").textContent = state.source === "video" ? "Your video · stays in this tab" : "Your photo · stays in this tab";
    $("cg-btn-sample").hidden = false;
    afterSourceChanged();
    if (window.matchMedia("(max-width: 900px)").matches) $("cg-phone").scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
  }

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  function startVideoLoop(video) {
    // Every display frame: upload and grade the video's frame when its time moved.
    let shown = -1;
    const onFrame = () => {
      if (state.video !== video) return;
      if (video.currentTime !== shown && engine.updateVideoFrame()) {
        shown = video.currentTime;
        engine.requestRender();
        const total = Number.isFinite(video.duration) ? video.duration : 0;
        $("cg-transport-time").textContent = `${fmtTime(video.currentTime)} / ${fmtTime(total)}`;
      }
      requestAnimationFrame(onFrame);
    };
    requestAnimationFrame(onFrame);
    const sync = () => {
      const play = $("cg-btn-play");
      play.replaceChildren(icon(video.paused ? "Play" : "Pause"));
      play.setAttribute("aria-label", video.paused ? "Play" : "Pause");
    };
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    sync();
  }
  $("cg-btn-play").addEventListener("click", () => {
    const v = state.video;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  });

  const fileInput = $("cg-file-input");
  fileInput.addEventListener("change", () => {
    useFile(fileInput.files[0]);
    fileInput.value = "";
  });
  $("cg-btn-sample").addEventListener("click", () => useSample());
  for (const zone of [$("cg-drop"), $("cg-phone")]) {
    zone.addEventListener("dragover", (e) => {
      if (![...(e.dataTransfer?.types ?? [])].includes("Files")) return;
      e.preventDefault();
      $("cg-drop").classList.add("cg-over");
    });
    zone.addEventListener("dragleave", () => $("cg-drop").classList.remove("cg-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      $("cg-drop").classList.remove("cg-over");
      useFile(e.dataTransfer.files[0]);
    });
  }

  // =========================================================================================================
  // The guided tour
  // =========================================================================================================

  // Where things are in the sample shot (picture uv, rows top to bottom).
  const SAIL = [0.366, 0.585];
  const GRASS = [0.09, 0.905];

  const tour = (() => {
    const done = new Set();
    let running = false;
    const maskActive = (t) => state.look.masks.some((m) => m.target === t && !CS.isNeutralGrade(m.grade));
    const steps = [
      {
        title: "Compare before and after",
        text: "Tap Compare until it says Split, then drag the line across the shot.",
        done: () => flags.split,
        async show() {
          setCompare(2);
          setSplit(0.12);
          await sleep(250);
          const from = state.split;
          await tween(900, (k) => setSplit(from + (0.82 - from) * k));
          await tween(700, (k) => setSplit(0.82 + (0.5 - 0.82) * k));
        },
      },
      {
        title: "Fix the color cast",
        text: "The phone made this shot too cool. Tap Pick white, then the boat's sail. Or try Auto.",
        done: () => flags.wb,
        async show() {
          goTo(null, "basic");
          reveal("cg-pick-white");
          await sleep(500);
          startPicking("wb");
          await sleep(900);
          await pickAt(...SAIL);
          reveal("Temperature");
        },
      },
      {
        title: "Clear the haze",
        text: "Raise Dehaze and Clarity to bring back the mountains.",
        done: () => state.look.grade.dehaze > 0.05 || state.look.grade.clarity > 0.05,
        async show() {
          goTo(null, "basic");
          reveal("Dehaze");
          await sleep(450);
          await animateGrade({ dehaze: 0.55 }, 900);
          reveal("Clarity");
          await animateGrade({ clarity: 0.3 }, 700);
          commit();
        },
      },
      {
        title: "Grade only the boat",
        text: "Choose Subject, then lift its Exposure. The water and sky stay as they are.",
        done: () => maskActive("subject"),
        async show() {
          goTo("subject", "basic");
          reveal("Exposure");
          await sleep(450);
          await animateGrade({ exposure: 0.45 }, 800);
          reveal("Saturation");
          await animateGrade({ saturation: 0.25 }, 600);
          commit();
        },
      },
      {
        title: "Make the greens richer",
        text: "Choose Color range, pick the grass, then raise Saturation.",
        done: () => maskActive("color") || state.look.grade.hsl.saturation[3] !== 0,
        async show() {
          goTo("color", "basic");
          reveal("cg-pick-color");
          await sleep(500);
          startPicking("color");
          await sleep(900);
          await pickAt(...GRASS);
          reveal("Saturation");
          await animateGrade({ saturation: 0.45, exposure: 0.12 }, 800);
          commit();
        },
      },
      {
        title: "Finish with a look",
        text: "Open LUTs and try Golden Hour, at about 60%.",
        done: () => !!state.look.lutId,
        async show() {
          goTo(null, "luts");
          await sleep(350);
          state.look.lutId = "preset:05_golden_hour.cube";
          state.look.grade.lutIntensity = 0;
          buildPanel();
          await tween(900, (k) => {
            state.look.grade.lutIntensity = 0.6 * k;
            onLook();
          });
          commit();
        },
      },
    ];

    const list = $("cg-tour-list");
    const items = steps.map((step, i) => {
      const mark = el("span", { class: "cg-step-mark", text: String(i + 1) });
      const button = el("button", { class: "cg-show-me", type: "button", text: "Show me", "aria-label": `Show me: ${step.title}` });
      button.addEventListener("click", () => run(step));
      const li = el("li", { class: "cg-step" }, mark, el("div", {}, el("p", { class: "cg-step-title", text: step.title }), el("p", { class: "cg-step-text", text: step.text })), button);
      list.append(li);
      return { li, mark, button };
    });

    async function run(step) {
      if (running || !engine.ok) return;
      running = true;
      items.forEach((it) => (it.button.disabled = true));
      try {
        if (state.source !== "scene") await useSample();
        if (!state.panelOpen) setPanelOpen(true);
        if (window.matchMedia("(max-width: 900px)").matches) {
          $("cg-phone").scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
          await sleep(400);
        }
        await step.show();
        done.add(step);
      } finally {
        running = false;
        items.forEach((it) => (it.button.disabled = false));
        check();
      }
    }

    function check() {
      steps.forEach((s, i) => {
        if (!done.has(s) && s.done()) done.add(s);
        const ok = done.has(s);
        items[i].li.classList.toggle("cg-done", ok);
        items[i].mark.replaceChildren(ok ? icon("Check") : String(i + 1));
      });
      $("cg-tour-progress").textContent = `${done.size} of ${steps.length} tried`;
    }

    function reset() {
      done.clear();
      flags.split = flags.wb = false;
      check();
    }
    return { check, reset };
  })();

  function goTo(target, tab) {
    if (state.target !== target || state.tab !== tab) {
      commit();
      state.target = target;
      state.tab = tab;
      buildPanel();
    }
  }

  $("cg-tour-reset").addEventListener("click", async () => {
    state.look = CS.neutralLook();
    commit();
    state.target = null;
    state.tab = "basic";
    setCompare(0);
    tour.reset();
    if (state.source !== "scene") await useSample();
    buildPanel();
    onLook();
    toast("Back to the original shot.");
  });

  // =========================================================================================================
  // Start
  // =========================================================================================================

  buildPanel();
  setCompare(0);
  updateUndo();
  tour.check();
  if (!engine.ok) {
    showLoading("This demo needs WebGL 2, which this browser doesn't offer. Try a recent Chrome, Edge, Firefox or Safari.", false);
  } else {
    engine.resize();
    engine.setLook(state.look);
    engine.loadSample(SAMPLE_SHOT, SAMPLE_MATTE)
      .then(() => {
        $("cg-loading").hidden = true;
        updateHud();
        layoutOverlays();
        engine.requestRender();
      })
      .catch((err) => {
        console.error(err);
        showLoading("The sample shot couldn't be opened in this browser. You can still open your own photo below.", false);
      });
  }
})();
