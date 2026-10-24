// ChromaGrade landing page - the grading engine: a port of the Android app's ColorScience.cpp and
// ColorGradeShader.glsl running on WebGL 2 (color science, GLSL programs, render passes).
// ChromaGrade demo - color science.
// A line-by-line port of app/src/main/cpp/grading/ColorScience.cpp and the Kotlin GradeState, so
// the browser computes exactly the uniforms the Android engine computes for the same settings.
"use strict";

const ColorScience = (() => {
  // Linear Rec.709 (sRGB primaries, D65 white) <-> CIE 1931 XYZ, IEC 61966-2-1.
  const RGB_TO_XYZ = [[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]];
  const XYZ_TO_RGB = [[3.2404542, -1.5371385, -0.4985314], [-0.9692660, 1.8760108, 0.0415560], [0.0556434, -0.2040259, 1.0572252]];
  // Bradford cone-response matrix (Lam 1985) and its inverse.
  const BRADFORD = [[0.8951, 0.2664, -0.1614], [-0.7502, 1.7135, 0.0367], [0.0389, -0.0685, 1.0296]];
  const BRADFORD_INV = [[0.9869929, -0.1470543, 0.1599627], [0.4323053, 0.5183603, 0.0492912], [-0.0085287, 0.0400428, 0.9684867]];

  const D65_X = 0.31271;
  const D65_Y = 0.32902;
  const D65_CCT = 6504.0;
  const MIRED_RANGE = 85.0;     // temperature slider +-1 => +-85 mired
  const TINT_DUV_RANGE = 0.025; // tint slider +-1 => +-0.025 Duv
  const CURVE_POINTS_MAX = 8;

  const finiteOr = (v, fallback) => (Number.isFinite(v) ? v : fallback);
  const clampUnit = (v) => Math.min(1, Math.max(-1, finiteOr(v, 0)));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // Planckian locus in CIE 1960 UCS (Krystek 1985).
  function planckianUv(kelvin) {
    const t = kelvin;
    const t2 = t * t;
    return {
      u: (0.860117757 + 1.54118254e-4 * t + 1.28641212e-7 * t2) / (1.0 + 8.42420235e-4 * t + 7.08145163e-7 * t2),
      v: (0.317398726 + 4.22806245e-5 * t + 4.20481691e-8 * t2) / (1.0 - 2.89741816e-5 * t + 1.61456053e-7 * t2),
    };
  }

  function xyToUv(x, y) {
    const d = -2.0 * x + 12.0 * y + 3.0;
    return { u: (4.0 * x) / d, v: (6.0 * y) / d };
  }

  function uvToXyz(c) {
    const d = 2.0 * c.u - 8.0 * c.v + 4.0;
    const x = (3.0 * c.u) / d;
    const y = (2.0 * c.v) / d;
    return [x / y, 1.0, (1.0 - x - y) / y];
  }

  const mulVec = (a, v) => [0, 1, 2].map((i) => a[i][0] * v[0] + a[i][1] * v[1] + a[i][2] * v[2]);
  const mulMat = (a, b) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j]));
  const IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  /** Chromatic adaptation (linear Rec.709 -> linear Rec.709) for temperature / tint in -1..1. */
  function whiteBalanceMatrix(temperature, tint) {
    const t = clampUnit(temperature);
    const g = clampUnit(tint);
    if (Math.abs(t) < 1e-5 && Math.abs(g) < 1e-5) return IDENTITY.map((r) => r.slice());

    const miredD65 = 1e6 / D65_CCT;
    const kelvin = clamp(1e6 / (miredD65 - t * MIRED_RANGE), 1700.0, 15000.0);
    const locusRef = planckianUv(D65_CCT);
    const locusT = planckianUv(kelvin);
    const before = planckianUv(kelvin - 25.0);
    const after = planckianUv(kelvin + 25.0);
    let nu = -(after.v - before.v);
    let nv = after.u - before.u;
    const len = Math.hypot(nu, nv);
    nu /= len;
    nv /= len;
    if (nv < 0.0) {
      nu = -nu;
      nv = -nv;
    }
    const d65 = xyToUv(D65_X, D65_Y);
    const source = {
      u: d65.u + (locusT.u - locusRef.u) + g * TINT_DUV_RANGE * nu,
      v: d65.v + (locusT.v - locusRef.v) + g * TINT_DUV_RANGE * nv,
    };
    const srcLms = mulVec(BRADFORD, uvToXyz(source));
    const dstLms = mulVec(BRADFORD, uvToXyz(d65));
    const scale = [[dstLms[0] / srcLms[0], 0, 0], [0, dstLms[1] / srcLms[1], 0], [0, 0, dstLms[2] / srcLms[2]]];
    const cat = mulMat(BRADFORD_INV, mulMat(scale, BRADFORD));
    const rgb = mulMat(XYZ_TO_RGB, mulMat(cat, RGB_TO_XYZ));
    // White balance must not act as exposure: neutral white keeps its luminance.
    const w = mulVec(rgb, [1, 1, 1]);
    const y = 0.2126 * w[0] + 0.7152 * w[1] + 0.0722 * w[2];
    return rgb.map((row) => row.map((v) => v / y));
  }

  /** Wheel puck (unit disc in the Cb/Cr plane) -> zero-luma RGB offset (inverse Rec.709 Y'CbCr). */
  function wheelChromaToRgb(x, y) {
    const cb = 0.5 * finiteOr(x, 0);
    const cr = 0.5 * finiteOr(y, 0);
    return [1.5748 * cr, -0.187324 * cb - 0.468124 * cr, 1.8556 * cb];
  }

  /** Monotone cubic (Fritsch-Carlson) through up to 8 points, sampled at 256 positions. */
  function bakeCurve(points, out, offset, stride) {
    const xs = [];
    const ys = [];
    for (const p of points.slice(0, CURVE_POINTS_MAX)) {
      const x = clamp(finiteOr(p.x, 0), 0, 1);
      const y = clamp(finiteOr(p.y, 0), 0, 1);
      let at = xs.length;
      while (at > 0 && xs[at - 1] > x) at--;
      if (at > 0 && Math.abs(xs[at - 1] - x) < 1e-4) {
        ys[at - 1] = y;
        continue;
      }
      xs.splice(at, 0, x);
      ys.splice(at, 0, y);
    }
    const n = xs.length;
    if (n < 2) {
      for (let i = 0; i < 256; i++) out[offset + i * stride] = i / 255;
      return;
    }
    const d = [];
    const m = [];
    for (let k = 0; k < n - 1; k++) d[k] = (ys[k + 1] - ys[k]) / Math.max(1e-6, xs[k + 1] - xs[k]);
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let k = 1; k < n - 1; k++) m[k] = d[k - 1] * d[k] <= 0 ? 0 : (d[k - 1] + d[k]) * 0.5;
    for (let k = 0; k < n - 1; k++) {
      if (Math.abs(d[k]) < 1e-9) {
        m[k] = m[k + 1] = 0;
        continue;
      }
      const alpha = m[k] / d[k];
      const beta = m[k + 1] / d[k];
      const r = alpha * alpha + beta * beta;
      if (r > 9) {
        const tau = 3 / Math.sqrt(r);
        m[k] = tau * alpha * d[k];
        m[k + 1] = tau * beta * d[k];
      }
    }
    let k = 0;
    for (let i = 0; i < 256; i++) {
      const x = i / 255;
      let y;
      if (x <= xs[0]) y = ys[0];
      else if (x >= xs[n - 1]) y = ys[n - 1];
      else {
        while (k < n - 2 && x > xs[k + 1]) k++;
        const h = xs[k + 1] - xs[k];
        const t = (x - xs[k]) / h;
        const t2 = t * t;
        const t3 = t2 * t;
        y = (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1];
      }
      out[offset + i * stride] = clamp(y, 0, 1);
    }
  }

  /** The curve as a function, for drawing it in the editor (same interpolation as the engine). */
  function curveFunction(points) {
    const table = new Float32Array(256);
    bakeCurve(points, table, 0, 1);
    return (x) => {
      const f = clamp(x, 0, 1) * 255;
      const i = Math.min(254, Math.floor(f));
      return table[i] + (table[i + 1] - table[i]) * (f - i);
    };
  }

  // ---- the grade model (mirrors the Kotlin GradeState / MaskedGrade / Look) ------------------------

  const IDENTITY_CURVE = () => [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  const zero8 = () => new Array(8).fill(0);

  function neutralGrade() {
    return {
      exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
      temperature: 0, tint: 0, vibrance: 0, saturation: 0,
      texture: 0, clarity: 0, dehaze: 0,
      lift: { x: 0, y: 0, master: 0 }, gamma: { x: 0, y: 0, master: 0 }, gain: { x: 0, y: 0, master: 0 },
      lutIntensity: 1,
      hsl: { hue: zero8(), saturation: zero8(), luminance: zero8() },
      curves: { master: IDENTITY_CURVE(), red: IDENTITY_CURVE(), green: IDENTITY_CURVE(), blue: IDENTITY_CURVE() },
    };
  }

  const isIdentityCurve = (pts) => pts.every((p) => Math.abs(p.x - p.y) < 1e-4);
  const wheelNeutral = (w) => w.x === 0 && w.y === 0 && w.master === 0;

  function isNeutralGrade(g) {
    const scalars = ["exposure", "contrast", "highlights", "shadows", "whites", "blacks", "temperature", "tint",
      "vibrance", "saturation", "texture", "clarity", "dehaze"];
    return scalars.every((k) => g[k] === 0) && wheelNeutral(g.lift) && wheelNeutral(g.gamma) && wheelNeutral(g.gain) &&
      g.hsl.hue.every((v) => v === 0) && g.hsl.saturation.every((v) => v === 0) && g.hsl.luminance.every((v) => v === 0) &&
      ["master", "red", "green", "blue"].every((c) => isIdentityCurve(g.curves[c]));
  }

  function neutralLook() {
    return { grade: neutralGrade(), lutId: null, effects: { vignette: 0, grain: 0, sharpen: 0 }, masks: [] };
  }

  /** Where masked grades apply; the numbers are the engine's (RenderPlan.hpp MaskedGrade::target). */
  const TARGETS = {
    subject: { label: "Subject", native: 1, needsMatte: true },
    background: { label: "Background", native: 2, needsMatte: true },
    sky: { label: "Sky", native: 3, needsMatte: false },
    color: { label: "Color range", native: 4, needsMatte: false },
  };

  function newMaskedGrade(target) {
    return { target, grade: neutralGrade(), hue: 120, range: 30, softness: 20, invert: false };
  }

  /** Masked grades that reach the renderer, in order (neutral ones draw nothing). */
  const plannedMasks = (look) => look.masks.filter((m) => !isNeutralGrade(m.grade)).slice(0, 4);

  const clone = (v) => JSON.parse(JSON.stringify(v));

  // ---- GradeParams -> shader uniforms (computeGradeUniforms) -------------------------------------------

  function computeUniforms(g) {
    const u = {};
    const ev = clamp(finiteOr(g.exposure, 0), -6, 6);
    const scale = Math.pow(2, ev);
    u.inputMatrix = whiteBalanceMatrix(g.temperature, g.tint).map((row) => row.map((v) => v * scale));
    u.shadowsStops = clampUnit(g.shadows) * 1.5;
    u.highlightsStops = clampUnit(g.highlights) * 1.5;
    u.contrast = Math.pow(2, clampUnit(g.contrast) * 0.75);

    const liftChroma = wheelChromaToRgb(g.lift.x, g.lift.y);
    const liftMaster = clampUnit(g.lift.master) * 0.25;
    u.lift = liftChroma.map((c) => liftMaster + 0.2 * c);
    const gammaChroma = wheelChromaToRgb(g.gamma.x, g.gamma.y);
    const gammaMaster = clampUnit(g.gamma.master) * 0.9;
    u.gammaExponent = gammaChroma.map((c) => Math.pow(2, -(gammaMaster + 0.6 * c)));
    const gainChroma = wheelChromaToRgb(g.gain.x, g.gain.y);
    const gainMaster = clampUnit(g.gain.master);
    u.gain = gainChroma.map((c) => Math.pow(2, gainMaster + 0.5 * c));

    u.saturation = Math.max(0, 1 + clampUnit(g.saturation));
    u.vibrance = clampUnit(g.vibrance);
    u.lutMix = clamp(finiteOr(g.lutIntensity, 1), 0, 1);

    u.hsl = new Float32Array(24);
    u.hslActive = false;
    for (let band = 0; band < 8; band++) {
      const hue = clampUnit(g.hsl.hue[band]);
      const sat = clampUnit(g.hsl.saturation[band]);
      const lum = clampUnit(g.hsl.luminance[band]);
      u.hsl[band * 3] = hue * (30 / 360);
      u.hsl[band * 3 + 1] = sat;
      u.hsl[band * 3 + 2] = lum;
      if (hue !== 0 || sat !== 0 || lum !== 0) u.hslActive = true;
    }

    u.curveLut = new Float32Array(256 * 4);
    u.curvesActive = false;
    ["master", "red", "green", "blue"].forEach((channel, c) => {
      const pts = g.curves[channel].slice(0, CURVE_POINTS_MAX);
      bakeCurve(pts, u.curveLut, c, 4);
      if (!u.curvesActive && pts.some((p) => Math.abs(p.x - p.y) > 1e-4)) u.curvesActive = true;
    });

    u.whites = clampUnit(g.whites) * 0.12;
    u.blacks = clampUnit(g.blacks) * 0.12;
    u.texture = clampUnit(g.texture);
    u.clarity = clampUnit(g.clarity);
    u.dehaze = clampUnit(g.dehaze);
    u.needsDetailBase = u.clarity !== 0 || u.dehaze !== 0;
    return u;
  }

  /** Temperature / tint that neutralize a linear Rec.709 color (the eyedropper). */
  function solveWhiteBalance(rgb) {
    const c = rgb.map((v) => Math.max(1e-5, finiteOr(v, 1)));
    const error = (t, g) => {
      const o = mulVec(whiteBalanceMatrix(t, g), c);
      const green = Math.max(1e-6, o[1]);
      const lr = Math.log(Math.max(1e-6, o[0]) / green);
      const lb = Math.log(Math.max(1e-6, o[2]) / green);
      return lr * lr + lb * lb;
    };
    let bestT = 0;
    let bestG = 0;
    let best = error(0, 0);
    let step = 0.125;
    for (let level = 0; level < 4; level++) {
      const ct = bestT;
      const cg = bestG;
      for (let i = -8; i <= 8; i++) {
        for (let j = -8; j <= 8; j++) {
          const t = clamp(ct + i * step, -1, 1);
          const g = clamp(cg + j * step, -1, 1);
          const e = error(t, g);
          if (e < best) {
            best = e;
            bestT = t;
            bestG = g;
          }
        }
      }
      step *= 0.25;
    }
    return [bestT, bestG];
  }

  // ---- pixel statistics (model/ColorSampling.kt) ---------------------------------------------------------

  const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

  /** Shades of Gray (p = 6) illuminant of RGBA8 pixels, skipping clipped and near-black ones. */
  function illuminant(rgba) {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < rgba.length; i += 4) {
      const er = rgba[i] / 255;
      const eg = rgba[i + 1] / 255;
      const eb = rgba[i + 2] / 255;
      if (Math.max(er, eg, eb) > 0.97) continue;
      const lr = toLinear(er);
      const lg = toLinear(eg);
      const lb = toLinear(eb);
      if (0.2126 * lr + 0.7152 * lg + 0.0722 * lb < 0.004) continue;
      r += lr ** 6;
      g += lg ** 6;
      b += lb ** 6;
      n++;
    }
    if (n < 64) return null;
    return [r, g, b].map((s) => Math.pow(s / n, 1 / 6));
  }

  /** Hue in degrees of an encoded color, or null when it is too grey to have one. */
  function hueDegrees(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d < 0.04) return null;
    let h;
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return h * 60;
  }

  /** Display color for a wheel angle (WheelMath.displayColor): sRGB-ish 0..1 triple. */
  function wheelDisplayColor(angle, chroma = 1, luma = 0.55) {
    const c = wheelChromaToRgb(Math.cos(angle) * chroma, Math.sin(angle) * chroma);
    let rgb = c.map((v) => luma + v);
    const hi = Math.max(...rgb);
    const lo = Math.min(...rgb);
    if (hi > 1 || lo < 0) {
      const k = Math.min(hi > 1 ? (1 - luma) / (hi - luma) : 1, lo < 0 ? luma / (luma - lo) : 1);
      rgb = rgb.map((v) => luma + (v - luma) * k);
    }
    return rgb;
  }

  return {
    whiteBalanceMatrix, wheelChromaToRgb, bakeCurve, curveFunction, computeUniforms, solveWhiteBalance,
    neutralGrade, neutralLook, isNeutralGrade, newMaskedGrade, plannedMasks, TARGETS, clone,
    toLinear, illuminant, hueDegrees, wheelDisplayColor, isIdentityCurve,
  };
})();

if (typeof module !== "undefined") module.exports = ColorScience;

// ChromaGrade demo - GLSL ES 3.00 programs.
// GRADE_FS is a port of app/src/main/cpp/shaders/ColorGradeShader.glsl (grade path, detail, masked
// grades): same functions, same constants, same order.
"use strict";

const Shaders = (() => {
  const FULLSCREEN_VS = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  // ---- the grade (pass 0: the picture's own grade, pass 2: a masked grade over it) ------------------
  const GRADE_FS = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler3D;

uniform sampler2D uSource;      // straight, sRGB-encoded picture (image rows top to bottom)
uniform sampler2D uInput;       // pass 2: the picture graded so far
uniform sampler2D uDetailBase;  // blurred source (rgb) + blurred darkest channel (a)
uniform sampler2D uCurves;      // 256 x 1: master, red, green, blue
uniform sampler2D uMatte;       // subject probability
uniform sampler3D uLut;
uniform int uPass;
uniform vec2 uTexelSize;

uniform mat3 uInputMatrix;
uniform vec2 uToneRegions;
uniform float uContrast;
uniform vec3 uLift;
uniform vec3 uGammaExponent;
uniform vec3 uGain;
uniform float uSaturation;
uniform float uVibrance;
uniform bool uHslEnabled;
uniform vec3 uHsl[8];
uniform bool uCurvesEnabled;
uniform vec2 uWhitesBlacks;
uniform vec3 uDetail;
uniform bool uDetailBaseEnabled;
uniform float uLutSize;
uniform vec3 uLutDomainMin;
uniform vec3 uLutDomainScale;
uniform float uLutMix;
uniform float uVignette;
uniform float uGrain;
uniform float uSharpen;
uniform float uFrameSeed;
uniform bool uMatteEnabled;
uniform vec4 uGradeMask;
uniform bool uGradeMaskInvert;

in vec2 vUv;
out vec4 fragColor;

const vec3 kLuma709 = vec3(0.2126, 0.7152, 0.0722);
const float kMidGrey = 0.18;

vec3 decodeToLinear(vec3 v) {
  vec3 lo = v / 12.92;
  vec3 hi = pow((max(v, 0.0) + 0.055) / 1.055, vec3(2.4));
  return mix(hi, lo, vec3(lessThanEqual(v, vec3(0.04045))));
}

vec3 encodeFromLinear(vec3 l) {
  l = max(l, 0.0);
  vec3 lo = l * 12.92;
  vec3 hi = 1.055 * pow(l, vec3(1.0 / 2.4)) - 0.055;
  return mix(hi, lo, vec3(lessThanEqual(l, vec3(0.0031308))));
}

float encodeScalar(float l) {
  l = max(l, 0.0);
  return l <= 0.0031308 ? l * 12.92 : 1.055 * pow(l, 1.0 / 2.4) - 0.055;
}

vec3 applyDehaze(vec3 c, float blurredDark) {
  float amount = uDetail.z;
  if (amount > 0.0) {
    float dark = min(blurredDark, min(c.r, min(c.g, c.b)));
    float t = max(1.0 - 0.8 * amount * dark, 0.2);
    return max((c - 1.0) / t + 1.0, 0.0);
  }
  float t = 1.0 + 0.45 * amount;
  return c * t + vec3(0.92) * (1.0 - t);
}

vec3 applyToneRegions(vec3 lin) {
  float p = encodeScalar(dot(lin, kLuma709));
  float shadowWeight = 1.0 - smoothstep(0.0, 0.6, p);
  float highlightWeight = smoothstep(0.35, 1.0, p);
  float stops = uToneRegions.x * shadowWeight * shadowWeight + uToneRegions.y * highlightWeight * highlightWeight;
  return lin * exp2(stops);
}

vec3 applyContrast(vec3 lin) {
  return kMidGrey * pow(max(lin, 1e-6) / kMidGrey, vec3(uContrast));
}

vec3 applyWhitesBlacks(vec3 v) {
  vec3 w = clamp((v - 0.6) / 0.4, 0.0, 1.0);
  vec3 b = clamp(1.0 - v / 0.4, 0.0, 1.0);
  return v + uWhitesBlacks.x * w * w + uWhitesBlacks.y * b * b;
}

vec3 applyLiftGammaGain(vec3 v) {
  vec3 lifted = v + uLift * (1.0 - v);
  vec3 gained = uGain * lifted;
  return pow(max(gained, 0.0), uGammaExponent);
}

vec3 applySaturation(vec3 v) {
  float luma = dot(v, kLuma709);
  vec3 chroma = v - luma;
  float saturation = max(v.r, max(v.g, v.b)) - min(v.r, min(v.g, v.b));
  float vibranceGain = 1.0 + uVibrance * (1.0 - smoothstep(0.0, 0.75, saturation));
  return luma + chroma * (vibranceGain * uSaturation);
}

vec3 applyLocalDetail(vec3 v, float fine, float local) {
  float l = clamp(dot(v, kLuma709), 0.0, 1.0);
  float midtones = 1.0 - (2.0 * l - 1.0) * (2.0 * l - 1.0);
  float clarityShift = uDetail.y > 0.0 ? uDetail.y * 1.6 * local / (1.0 + 6.0 * abs(local)) : uDetail.y * 0.9 * local;
  float textureShift = uDetail.x > 0.0 ? uDetail.x * 1.5 * fine : uDetail.x * 0.9 * fine;
  return v + clarityShift * midtones + textureShift * mix(1.0, midtones, 0.5);
}

vec3 rgbToHsl(vec3 c) {
  float maxC = max(c.r, max(c.g, c.b));
  float minC = min(c.r, min(c.g, c.b));
  float l = (maxC + minC) * 0.5;
  float d = maxC - minC;
  if (d < 1e-5) return vec3(0.0, 0.0, l);
  float s = d / (1.0 - abs(2.0 * l - 1.0) + 1e-6);
  float h;
  if (maxC == c.r) h = mod((c.g - c.b) / d, 6.0);
  else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
  else h = (c.r - c.g) / d + 4.0;
  return vec3(h / 6.0, clamp(s, 0.0, 1.0), l);
}

vec3 hslToRgb(vec3 hsl) {
  vec3 k = mod(vec3(0.0, 8.0, 4.0) + hsl.x * 12.0, 12.0);
  float a = hsl.y * min(hsl.z, 1.0 - hsl.z);
  return hsl.z - a * clamp(min(k - 3.0, 9.0 - k), -1.0, 1.0);
}

vec3 applyHsl(vec3 c) {
  const float bands[9] = float[9](0.0, 30.0, 60.0, 120.0, 180.0, 235.0, 275.0, 320.0, 360.0);
  vec3 hsl = rgbToHsl(c);
  float hue = hsl.x * 360.0;
  int i = 7;
  for (int k = 0; k < 8; ++k) {
    if (hue >= bands[k] && hue < bands[k + 1]) i = k;
  }
  float t = smoothstep(0.0, 1.0, (hue - bands[i]) / (bands[i + 1] - bands[i]));
  vec3 adjust = mix(uHsl[i], uHsl[(i + 1) % 8], t);
  float weight = smoothstep(0.02, 0.2, hsl.y);
  hsl.x = fract(hsl.x + adjust.x * weight + 1.0);
  hsl.y = clamp(hsl.y * (1.0 + adjust.y * weight), 0.0, 1.0);
  float room = adjust.z > 0.0 ? 1.0 - hsl.z : hsl.z;
  hsl.z = clamp(hsl.z + adjust.z * weight * room * 0.6, 0.0, 1.0);
  return hslToRgb(hsl);
}

float skyWeight(vec3 c) {
  float chroma = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  float hue = rgbToHsl(c).x * 360.0;
  float l = dot(c, kLuma709);
  float blue = smoothstep(165.0, 195.0, hue) * (1.0 - smoothstep(245.0, 275.0, hue)) *
               smoothstep(0.04, 0.12, chroma) * smoothstep(0.15, 0.35, l);
  float overcast = smoothstep(0.6, 0.85, l) * (1.0 - smoothstep(0.08, 0.2, chroma));
  return max(blue, overcast) * (1.0 - smoothstep(0.4, 0.8, vUv.y));
}

float gradeMaskWeight(vec3 c) {
  int target = int(uGradeMask.x + 0.5);
  float w = 1.0;
  if (target == 1 || target == 2) {
    float m = uMatteEnabled ? texture(uMatte, vUv).r : 0.0;
    w = target == 1 ? m : 1.0 - m;
  } else if (target == 3) {
    w = skyWeight(c);
  } else if (target == 4) {
    float d = abs(fract(rgbToHsl(c).x - uGradeMask.y + 0.5) - 0.5);
    float chroma = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    w = (1.0 - smoothstep(uGradeMask.z, uGradeMask.z + uGradeMask.w, d)) * smoothstep(0.03, 0.10, chroma);
  }
  return uGradeMaskInvert ? 1.0 - w : w;
}

float curve(float x, int channel) {
  vec4 entry = texture(uCurves, vec2(clamp(x, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, 0.5));
  return channel == 0 ? entry.r : channel == 1 ? entry.g : channel == 2 ? entry.b : entry.a;
}

vec3 applyCurves(vec3 v) {
  vec3 m = vec3(curve(v.r, 0), curve(v.g, 0), curve(v.b, 0));
  return vec3(curve(m.r, 1), curve(m.g, 2), curve(m.b, 3));
}

vec3 sampleLutTrilinear(vec3 color) {
  float maxIndex = uLutSize - 1.0;
  vec3 x = clamp((color - uLutDomainMin) * uLutDomainScale, 0.0, 1.0) * maxIndex;
  vec3 base = min(floor(x), vec3(maxIndex - 1.0));
  vec3 f = x - base;
  ivec3 i0 = ivec3(base);
  ivec3 i1 = i0 + 1;
  vec3 c000 = texelFetch(uLut, ivec3(i0.x, i0.y, i0.z), 0).rgb;
  vec3 c100 = texelFetch(uLut, ivec3(i1.x, i0.y, i0.z), 0).rgb;
  vec3 c010 = texelFetch(uLut, ivec3(i0.x, i1.y, i0.z), 0).rgb;
  vec3 c110 = texelFetch(uLut, ivec3(i1.x, i1.y, i0.z), 0).rgb;
  vec3 c001 = texelFetch(uLut, ivec3(i0.x, i0.y, i1.z), 0).rgb;
  vec3 c101 = texelFetch(uLut, ivec3(i1.x, i0.y, i1.z), 0).rgb;
  vec3 c011 = texelFetch(uLut, ivec3(i0.x, i1.y, i1.z), 0).rgb;
  vec3 c111 = texelFetch(uLut, ivec3(i1.x, i1.y, i1.z), 0).rgb;
  vec3 c00 = mix(c000, c100, f.r);
  vec3 c10 = mix(c010, c110, f.r);
  vec3 c01 = mix(c001, c101, f.r);
  vec3 c11 = mix(c011, c111, f.r);
  return mix(mix(c00, c10, f.g), mix(c01, c11, f.g), f.b);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float fineDetail(float centerLuma) {
  vec2 d = uTexelSize * max(1.0, 0.0016 / max(uTexelSize.x, uTexelSize.y));
  vec2 e = d * 0.7071;
  float ring = dot(texture(uSource, vUv + vec2(d.x, 0.0)).rgb, kLuma709)
             + dot(texture(uSource, vUv - vec2(d.x, 0.0)).rgb, kLuma709)
             + dot(texture(uSource, vUv + vec2(0.0, d.y)).rgb, kLuma709)
             + dot(texture(uSource, vUv - vec2(0.0, d.y)).rgb, kLuma709)
             + dot(texture(uSource, vUv + e).rgb, kLuma709)
             + dot(texture(uSource, vUv - e).rgb, kLuma709)
             + dot(texture(uSource, vUv + vec2(e.x, -e.y)).rgb, kLuma709)
             + dot(texture(uSource, vUv + vec2(-e.x, e.y)).rgb, kLuma709);
  return centerLuma - ring * 0.125;
}

void main() {
  vec4 source = texture(uSource, vUv);
  if (uSharpen > 0.0 && uPass == 0) {
    vec3 neighbours = texture(uSource, vUv + vec2(uTexelSize.x, 0.0)).rgb
                    + texture(uSource, vUv - vec2(uTexelSize.x, 0.0)).rgb
                    + texture(uSource, vUv + vec2(0.0, uTexelSize.y)).rgb
                    + texture(uSource, vUv - vec2(0.0, uTexelSize.y)).rgb;
    source.rgb += uSharpen * 1.5 * (source.rgb - neighbours * 0.25);
  }
  vec3 color = source.rgb;
  float rawLuma = dot(color, kLuma709);
  float sourceLuma = rawLuma;

  vec3 below = vec3(0.0);
  float maskWeight = 1.0;
  if (uPass == 2) {
    below = texture(uInput, vUv).rgb;
    color = below;
    maskWeight = gradeMaskWeight(color);
    if (maskWeight <= 0.0) {
      fragColor = vec4(below, 1.0);
      return;
    }
  }

  float fine = 0.0;
  float local = 0.0;
  if (uDetailBaseEnabled) {
    vec4 base = texture(uDetailBase, vUv);
    local = sourceLuma - dot(base.rgb, kLuma709);
    if (uDetail.z != 0.0) color = applyDehaze(color, base.a);
  }
  if (uDetail.x != 0.0) fine = fineDetail(rawLuma);
  vec3 lin = decodeToLinear(color);
  lin = uInputMatrix * lin;
  lin = applyToneRegions(lin);
  lin = applyContrast(lin);
  vec3 v = encodeFromLinear(lin);
  v = applyWhitesBlacks(v);
  v = applyLiftGammaGain(v);
  v = applySaturation(v);
  if (fine != 0.0 || local != 0.0) v = applyLocalDetail(v, fine, local);
  v = clamp(v, 0.0, 1.0);
  if (uHslEnabled) v = applyHsl(v);
  if (uCurvesEnabled) v = applyCurves(v);
  if (uLutMix > 0.0) v = mix(v, sampleLutTrilinear(v), uLutMix);
  color = v;

  if (uPass == 0) {
    if (uVignette != 0.0) {
      float r = length(vUv - 0.5) * 1.41421;
      color *= 1.0 - uVignette * smoothstep(0.35, 1.05, r);
    }
    if (uGrain > 0.0) {
      float n = hash12(gl_FragCoord.xy + vec2(uFrameSeed * 37.0, uFrameSeed * 11.0)) - 0.5;
      float l = dot(color, kLuma709);
      color += n * uGrain * 0.18 * (1.0 - 0.6 * abs(l * 2.0 - 1.0));
    }
    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  } else {
    fragColor = vec4(mix(below, clamp(color, 0.0, 1.0), clamp(maskWeight, 0.0, 1.0)), 1.0);
  }
}`;

  // ---- detail base: Poisson-prefiltered source + darkest channel (the engine's pass 1) ----------------
  const DETAIL_BASE_FS = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uDetailRadius;
in vec2 vUv;
out vec4 fragColor;
const vec2 kPoisson[12] = vec2[12](vec2(-0.326, -0.406), vec2(-0.840, -0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621),
                                   vec2(0.962, -0.195), vec2(0.473, -0.480), vec2(0.519, 0.767), vec2(0.185, -0.893),
                                   vec2(0.507, 0.064), vec2(0.896, 0.412), vec2(-0.322, -0.933), vec2(-0.792, -0.598));
void main() {
  vec3 sum = texture(uSource, vUv).rgb;
  float dark = min(sum.r, min(sum.g, sum.b));
  for (int i = 0; i < 12; ++i) {
    vec3 c = texture(uSource, vUv + kPoisson[i] * uDetailRadius).rgb;
    sum += c;
    dark += min(c.r, min(c.g, c.b));
  }
  fragColor = vec4(clamp(sum / 13.0, 0.0, 1.0), clamp(dark / 13.0, 0.0, 1.0));
}`;

  // ---- separable 9-tap Gaussian (Blur.frag) ------------------------------------------------------------
  const BLUR_FS = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec2 offset1 = uStep * 1.3846153846;
  vec2 offset2 = uStep * 3.2307692308;
  vec4 sum = texture(uSource, vUv) * 0.2270270270;
  sum += texture(uSource, vUv + offset1) * 0.3162162162;
  sum += texture(uSource, vUv - offset1) * 0.3162162162;
  sum += texture(uSource, vUv + offset2) * 0.0702702703;
  sum += texture(uSource, vUv - offset2) * 0.0702702703;
  fragColor = sum;
}`;

  // ---- copy (downscaled readbacks: scopes, thumbnails, auto white balance) ---------------------------------
  const COPY_FS = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec4 uCrop;  // source uv rect: x, y, w, h
in vec2 vUv;
out vec4 fragColor;
void main() { fragColor = vec4(texture(uSource, uCrop.xy + vUv * uCrop.zw).rgb, 1.0); }`;

  // ---- presentation into the viewer canvas: fit, before / after, dither ------------------------------------
  const PRESENT_FS = `#version 300 es
precision highp float;
uniform sampler2D uGraded;
uniform sampler2D uOriginal;
uniform vec4 uRect;       // picture rect in canvas pixels (x, y from the top-left, w, h)
uniform vec2 uCanvas;
uniform int uCompare;     // 0 graded, 1 original, 2 split
uniform float uSplit;     // 0..1 across the picture
uniform vec3 uSurround;
in vec2 vUv;
out vec4 fragColor;
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y);
  vec2 uv = (p - uRect.xy) / uRect.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
    fragColor = vec4(uSurround, 1.0);
    return;
  }
  bool original = uCompare == 1 || (uCompare == 2 && uv.x < uSplit);
  vec3 c = original ? texture(uOriginal, uv).rgb : texture(uGraded, uv).rgb;
  c += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;
  fragColor = vec4(c, 1.0);
}`;

  return { FULLSCREEN_VS, GRADE_FS, DETAIL_BASE_FS, BLUR_FS, COPY_FS, PRESENT_FS };
})();

if (typeof module !== "undefined") module.exports = Shaders;

// ChromaGrade demo - WebGL2 grading engine.
// Same passes as the Android compositor (gl/Compositor.cpp + render/FrameComposer.cpp):
//   detail base (only when clarity / dehaze need it) -> the picture's grade -> each masked grade
//   over the result -> presentation with before / after. Everything stays on this device.
"use strict";

class GradeEngine {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "high-performance" });
    this.gl = gl;
    this.ok = !!gl;
    if (!gl) return;
    this.halfFloat = !!gl.getExtension("EXT_color_buffer_float") || !!gl.getExtension("EXT_color_buffer_half_float");
    this.programs = {};
    for (const [name, fs] of Object.entries({
      grade: Shaders.GRADE_FS, base: Shaders.DETAIL_BASE_FS, blur: Shaders.BLUR_FS,
      copy: Shaders.COPY_FS, present: Shaders.PRESENT_FS,
    })) {
      this.programs[name] = this.#program(Shaders.FULLSCREEN_VS, fs, name);
    }
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    this.curves = this.#texture(256, 1, gl.RGBA16F, gl.RGBA, gl.FLOAT, { filter: gl.LINEAR });
    this.blackMatte = this.#texture(1, 1, gl.R8, gl.RED, gl.UNSIGNED_BYTE, { data: new Uint8Array([0]) });
    this.luts = new Map();
    this.identityLut = this.#lutTexture(2, new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1]));

    this.source = null;        // { tex, fbo, w, h }
    this.matte = null;         // { tex, fbo } subject matte of the sample shot
    this.sourceVersion = 0;
    this.targets = null;       // ping-pong grade outputs at the source size
    this.detail = null;        // { size, tex[2], fbo[2] }
    this.detailVersion = -1;
    this.final = null;
    this.gradedKey = null;
    this.view = { compare: 0, split: 0.5 };
    this.frameSeed = 0;
    this.look = null;
    this.surround = [0x1c / 255, 0x1b / 255, 0x20 / 255];
    this.onRendered = null;
    this.#scheduled = false;
  }

  #scheduled;

  // ---- GL helpers --------------------------------------------------------------------------------------

  #program(vs, fs, name) {
    const gl = this.gl;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(name + ": " + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(name + ": " + gl.getProgramInfoLog(p));
    const locations = new Map();
    return {
      id: p,
      loc(n) {
        if (!locations.has(n)) locations.set(n, gl.getUniformLocation(p, n));
        return locations.get(n);
      },
    };
  }

  #texture(w, h, internal, format, type, { filter, mip = false, data = null } = {}) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, data);
    const f = filter ?? gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  #target(w, h, { mip = false, half = false, r8 = false } = {}) {
    const gl = this.gl;
    let tex;
    if (r8) tex = this.#texture(w, h, gl.R8, gl.RED, gl.UNSIGNED_BYTE);
    else if (half && this.halfFloat) tex = this.#texture(w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
    else tex = this.#texture(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, { mip });
    // Allocate the whole mip chain now: a mipmapped texture sampled before its levels exist is
    // "incomplete" and reads as black (a masked pass reading the other ping-pong target).
    if (mip) gl.generateMipmap(gl.TEXTURE_2D);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo, w, h };
  }

  #free(t) {
    if (!t) return;
    this.gl.deleteTexture(t.tex);
    this.gl.deleteFramebuffer(t.fbo);
  }

  #lutTexture(size, rgb) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, tex);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGB32F, size, size, size, 0, gl.RGB, gl.FLOAT, rgb);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, w, gl.CLAMP_TO_EDGE);
    return { tex, size, domainMin: [0, 0, 0], domainScale: [1, 1, 1] };
  }

  #draw(program, fbo, w, h) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, w, h);
    gl.useProgram(program.id);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  #bind(unit, target, tex) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(target, tex);
  }

  // ---- sources -----------------------------------------------------------------------------------------

  #setSourceSize(w, h) {
    if (this.source && this.source.w === w && this.source.h === h) return;
    this.#free(this.source);
    this.source = this.#target(w, h, { mip: true });
    if (this.targets) this.targets.forEach((t) => this.#free(t));
    this.targets = [this.#target(w, h, { mip: true }), this.#target(w, h, { mip: true })];
  }

  #sourceChanged() {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.source.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.sourceVersion++;
    this.gradedKey = null;
  }

  /** The sample shot and its subject matte (baked images, see demo/bake). */
  async loadSample(shotSrc, matteSrc) {
    const load = async (src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
      await img.decode();
      return img;
    };
    const [shot, matte] = await Promise.all([load(shotSrc), load(matteSrc)]);
    const gl = this.gl;
    this.#upload(shot, shot.naturalWidth, shot.naturalHeight);
    this.#free(this.matte);
    this.matte = this.#target(shot.naturalWidth, shot.naturalHeight, { r8: true });
    gl.bindTexture(gl.TEXTURE_2D, this.matte.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, matte);
    this.hasMatte = true;
    this.isVideo = false;
    this.video = null;
  }

  /** A photo the viewer picked (decoded here, never uploaded), at most 2048 px on the long side. */
  async loadImage(blob) {
    let bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    const long = Math.max(bitmap.width, bitmap.height);
    if (long > 2048) {
      const s = 2048 / long;
      const resized = await createImageBitmap(bitmap, {
        resizeWidth: Math.round(bitmap.width * s), resizeHeight: Math.round(bitmap.height * s), resizeQuality: "high",
      });
      bitmap.close();
      bitmap = resized;
    }
    this.#upload(bitmap, bitmap.width, bitmap.height);
    bitmap.close();
    this.hasMatte = false;
    this.isVideo = false;
    this.video = null;
  }

  /** A video the viewer picked: every new frame is graded live. */
  setVideo(video) {
    this.video = video;
    this.isVideo = true;
    this.hasMatte = false;
    this.updateVideoFrame();
  }

  updateVideoFrame() {
    const v = this.video;
    if (!v || v.readyState < 2 || !v.videoWidth) return false;
    this.#upload(v, v.videoWidth, v.videoHeight);
    this.frameSeed = (this.frameSeed + 1) % 997;
    return true;
  }

  #upload(image, w, h) {
    const gl = this.gl;
    this.#setSourceSize(w, h);
    gl.bindTexture(gl.TEXTURE_2D, this.source.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
    this.#sourceChanged();
  }

  get sourceSize() {
    return this.source ? { w: this.source.w, h: this.source.h } : { w: 16, h: 9 };
  }

  // ---- LUTs --------------------------------------------------------------------------------------------

  addLut(id, lut) {
    const t = this.#lutTexture(lut.size, lut.data);
    t.domainMin = lut.domainMin ?? [0, 0, 0];
    const max = lut.domainMax ?? [1, 1, 1];
    t.domainScale = t.domainMin.map((m, i) => 1 / Math.max(1e-6, max[i] - m));
    const old = this.luts.get(id);
    if (old) this.gl.deleteTexture(old.tex);
    this.luts.set(id, t);
  }

  // ---- rendering ---------------------------------------------------------------------------------------

  setLook(look) {
    this.look = look;
    this.requestRender();
  }

  setView(view) {
    Object.assign(this.view, view);
    this.requestRender();
  }

  requestRender() {
    if (this.#scheduled || !this.ok) return;
    this.#scheduled = true;
    requestAnimationFrame(() => {
      this.#scheduled = false;
      this.render();
    });
  }

  #ensureDetail() {
    const { w, h } = this.source;
    const long = Math.min(256, Math.max(16, Math.max(w, h) * 0.5));
    const dw = Math.max(8, Math.round(w >= h ? long : (long * w) / h));
    const dh = Math.max(8, Math.round(h > w ? long : (long * h) / w));
    if (!this.detail || this.detail.w !== dw || this.detail.h !== dh) {
      if (this.detail) this.detail.t.forEach((t) => this.#free(t));
      this.detail = { w: dw, h: dh, t: [this.#target(dw, dh, { half: true }), this.#target(dw, dh, { half: true })] };
      this.detailVersion = -1;
    }
    if (this.detailVersion === this.sourceVersion) return;
    const gl = this.gl;
    const [a, b] = this.detail.t;
    const base = this.programs.base;
    gl.useProgram(base.id);
    this.#bind(0, gl.TEXTURE_2D, this.source.tex);
    gl.uniform1i(base.loc("uSource"), 0);
    gl.uniform2f(base.loc("uDetailRadius"), 0.5 / dw, 0.5 / dh);
    this.#draw(base, a.fbo, dw, dh);
    const blur = this.programs.blur;
    gl.useProgram(blur.id);
    gl.uniform1i(blur.loc("uSource"), 0);
    for (let i = 0; i < 2; i++) {
      this.#bind(0, gl.TEXTURE_2D, a.tex);
      gl.uniform2f(blur.loc("uStep"), 1.5 / dw, 0);
      this.#draw(blur, b.fbo, dw, dh);
      this.#bind(0, gl.TEXTURE_2D, b.tex);
      gl.uniform2f(blur.loc("uStep"), 0, 1.5 / dh);
      this.#draw(blur, a.fbo, dw, dh);
    }
    this.detailVersion = this.sourceVersion;
  }

  #setGradeUniforms(p, u, lut) {
    const gl = this.gl;
    const m = u.inputMatrix;
    // Row-major on the CPU, column-major in GLSL.
    gl.uniformMatrix3fv(p.loc("uInputMatrix"), false, [m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]]);
    gl.uniform2f(p.loc("uToneRegions"), u.shadowsStops, u.highlightsStops);
    gl.uniform1f(p.loc("uContrast"), u.contrast);
    gl.uniform3fv(p.loc("uLift"), u.lift);
    gl.uniform3fv(p.loc("uGammaExponent"), u.gammaExponent);
    gl.uniform3fv(p.loc("uGain"), u.gain);
    gl.uniform1f(p.loc("uSaturation"), u.saturation);
    gl.uniform1f(p.loc("uVibrance"), u.vibrance);
    gl.uniform1i(p.loc("uHslEnabled"), u.hslActive ? 1 : 0);
    if (u.hslActive) gl.uniform3fv(p.loc("uHsl[0]"), u.hsl);
    gl.uniform1i(p.loc("uCurvesEnabled"), u.curvesActive ? 1 : 0);
    if (u.curvesActive) {
      this.#bind(2, gl.TEXTURE_2D, this.curves);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RGBA, gl.FLOAT, u.curveLut);
    }
    gl.uniform2f(p.loc("uWhitesBlacks"), u.whites, u.blacks);
    gl.uniform3f(p.loc("uDetail"), u.texture, u.clarity, u.dehaze);
    const base = u.needsDetailBase && this.detail;
    gl.uniform1i(p.loc("uDetailBaseEnabled"), base ? 1 : 0);
    if (base) this.#bind(5, gl.TEXTURE_2D, this.detail.t[0].tex);
    const l = lut ?? this.identityLut;
    this.#bind(1, gl.TEXTURE_3D, l.tex);
    gl.uniform1f(p.loc("uLutSize"), l.size);
    gl.uniform3fv(p.loc("uLutDomainMin"), l.domainMin);
    gl.uniform3fv(p.loc("uLutDomainScale"), l.domainScale);
    gl.uniform1f(p.loc("uLutMix"), lut ? u.lutMix : 0);
  }

  /** Grades the current source with `look` into one of the ping-pong targets; returns it. */
  #grade(look, { masks = true } = {}) {
    const gl = this.gl;
    const p = this.programs.grade;
    const primary = ColorScience.computeUniforms(look.grade);
    const planned = masks ? ColorScience.plannedMasks(look).map((m) => ({ m, u: ColorScience.computeUniforms(m.grade) })) : [];
    if (primary.needsDetailBase || planned.some((x) => x.u.needsDetailBase)) this.#ensureDetail();
    const { w, h } = this.source;
    gl.useProgram(p.id);
    gl.uniform1i(p.loc("uSource"), 0);
    gl.uniform1i(p.loc("uLut"), 1);
    gl.uniform1i(p.loc("uCurves"), 2);
    gl.uniform1i(p.loc("uMatte"), 3);
    gl.uniform1i(p.loc("uInput"), 4);
    gl.uniform1i(p.loc("uDetailBase"), 5);
    gl.uniform2f(p.loc("uTexelSize"), 1 / w, 1 / h);
    gl.uniform1f(p.loc("uFrameSeed"), this.frameSeed);
    this.#bind(0, gl.TEXTURE_2D, this.source.tex);
    this.#bind(3, gl.TEXTURE_2D, this.hasMatte && this.matte ? this.matte.tex : this.blackMatte);
    gl.uniform1i(p.loc("uMatteEnabled"), this.hasMatte ? 1 : 0);

    // Pass 0: the picture's own grade, LUT and finishing. Unit 4 (the masked passes' input) may
    // still hold this pass's target from the last frame: WebGL refuses that feedback loop.
    this.#bind(4, gl.TEXTURE_2D, this.blackMatte);
    gl.uniform1i(p.loc("uPass"), 0);
    this.#setGradeUniforms(p, primary, look.lutId ? this.luts.get(look.lutId) : null);
    gl.uniform1f(p.loc("uVignette"), look.effects.vignette);
    gl.uniform1f(p.loc("uGrain"), look.effects.grain);
    gl.uniform1f(p.loc("uSharpen"), look.effects.sharpen);
    let out = 0;
    this.#draw(p, this.targets[out].fbo, w, h);

    // Pass 2: each masked grade over what is graded so far.
    for (const { m, u } of planned) {
      if (ColorScience.TARGETS[m.target].needsMatte && !this.hasMatte) continue;
      gl.useProgram(p.id);
      gl.uniform1i(p.loc("uPass"), 2);
      this.#setGradeUniforms(p, u, null);
      gl.uniform4f(p.loc("uGradeMask"), ColorScience.TARGETS[m.target].native, m.hue / 360, Math.min(180, Math.max(1, m.range)) / 360,
        Math.min(120, Math.max(1, m.softness)) / 360);
      gl.uniform1i(p.loc("uGradeMaskInvert"), m.invert ? 1 : 0);
      this.#bind(4, gl.TEXTURE_2D, this.targets[out].tex);
      this.#draw(p, this.targets[1 - out].fbo, w, h);
      out = 1 - out;
    }
    const result = this.targets[out];
    gl.bindTexture(gl.TEXTURE_2D, result.tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    return result;
  }

  #pictureRect() {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const { w, h } = this.sourceSize;
    const s = Math.min(cw / w, ch / h);
    const rw = w * s;
    const rh = h * s;
    return [(cw - rw) / 2, (ch - rh) / 2, rw, rh];
  }

  /** Picture rect in CSS pixels inside the canvas element (for overlays and taps). */
  pictureRectCss() {
    const dpr = this.canvas.width / Math.max(1, this.canvas.clientWidth);
    return this.#pictureRect().map((v) => v / dpr);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.max(2, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(2, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.requestRender();
  }

  render() {
    if (!this.ok || !this.source || !this.look) return;
    const gl = this.gl;
    const key = this.sourceVersion + "|" + JSON.stringify(this.look);
    if (key !== this.gradedKey) {
      this.final = this.#grade(this.look);
      this.gradedKey = key;
    }
    const p = this.programs.present;
    gl.useProgram(p.id);
    this.#bind(0, gl.TEXTURE_2D, this.final.tex);
    this.#bind(1, gl.TEXTURE_2D, this.source.tex);
    gl.uniform1i(p.loc("uGraded"), 0);
    gl.uniform1i(p.loc("uOriginal"), 1);
    // view.rect (canvas pixels) overrides the fitted picture rect: pans, zooms and covers.
    gl.uniform4fv(p.loc("uRect"), this.view.rect ?? this.#pictureRect());
    gl.uniform2f(p.loc("uCanvas"), this.canvas.width, this.canvas.height);
    gl.uniform1i(p.loc("uCompare"), this.view.compare);
    gl.uniform1f(p.loc("uSplit"), this.view.split);
    gl.uniform3fv(p.loc("uSurround"), this.surround);
    this.#draw(p, null, this.canvas.width, this.canvas.height);
    this.onRendered?.();
  }

  // ---- readbacks ---------------------------------------------------------------------------------------

  #readCopy(tex, w, h, crop = [0, 0, 1, 1]) {
    const gl = this.gl;
    const t = this.#target(w, h);
    const p = this.programs.copy;
    gl.useProgram(p.id);
    this.#bind(0, gl.TEXTURE_2D, tex);
    gl.uniform1i(p.loc("uSource"), 0);
    gl.uniform4fv(p.loc("uCrop"), crop);
    this.#draw(p, t.fbo, w, h);
    const pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.#free(t);
    return pixels;   // rows top to bottom, like the picture
  }

  #average(fbo, x, y, radius, w, h) {
    const gl = this.gl;
    const x0 = Math.max(0, x - radius);
    const y0 = Math.max(0, y - radius);
    const x1 = Math.min(w - 1, x + radius);
    const y1 = Math.min(h - 1, y + radius);
    const rw = x1 - x0 + 1;
    const rh = y1 - y0 + 1;
    const px = new Uint8Array(rw * rh * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.readPixels(x0, y0, rw, rh, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const sum = [0, 0, 0];
    for (let i = 0; i < px.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += px[i + c];
    const n = px.length / 4;
    return sum.map((s) => s / n / 255);
  }

  /** Average encoded color around (u, v) of the ungraded picture. */
  sampleSource(u, v) {
    const { w, h } = this.source;
    return this.#average(this.source.fbo, Math.round(u * (w - 1)), Math.round(v * (h - 1)), Math.max(1, Math.round(w / 300)), w, h);
  }

  /** Average encoded color around (u, v) after the picture's own grade (what masked grades start from). */
  samplePrimary(u, v, look) {
    const noMasks = Object.assign({}, look, { masks: [] });
    const t = this.#grade(noMasks, { masks: false });
    this.gradedKey = null;
    const { w, h } = this.source;
    return this.#average(t.fbo, Math.round(u * (w - 1)), Math.round(v * (h - 1)), Math.max(1, Math.round(w / 300)), w, h);
  }

  /** Downscaled ungraded pixels (Auto white balance). */
  sourcePixels(maxSide = 256) {
    const { w, h } = this.source;
    const s = maxSide / Math.max(w, h);
    return this.#readCopy(this.source.tex, Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
  }

  /** The graded picture at a small size: scopes. */
  finalPixels(width) {
    if (!this.final) return null;
    const { w, h } = this.source;
    const height = Math.max(1, Math.round((width * h) / w));
    return { pixels: this.#readCopy(this.final.tex, width, height), width, height };
  }

  /** `look` rendered at a small size (LUT tiles); restores the live picture afterwards. */
  thumbnail(look, width, height) {
    const t = this.#grade(look);
    this.gradedKey = null;
    const { w, h } = this.source;
    // Center crop to the tile aspect.
    const ta = width / height;
    const sa = w / h;
    const crop = sa > ta ? [(1 - ta / sa) / 2, 0, ta / sa, 1] : [0, (1 - sa / ta) / 2, 1, sa / ta];
    const pixels = this.#readCopy(t.tex, width, height, crop);
    this.requestRender();
    return new ImageData(new Uint8ClampedArray(pixels.buffer), width, height);
  }

  /** A crop of the ungraded picture (timeline filmstrip). */
  sourceCrop(crop, width, height) {
    const pixels = this.#readCopy(this.source.tex, width, height, crop);
    return new ImageData(new Uint8ClampedArray(pixels.buffer), width, height);
  }
}
