// Every tunable in one place. Units: 1 = 1 cm, seconds, kg-ish (Rapier default density 1).
export const CONFIG = {
  block: { length: 7.5, width: 2.5, height: 1.5 },
  layers: 18,           // overridden by the mode (see MODES below)
  stageTop: 47,          // y of the top of the jenga stage board (table 45 + board 2)
  stageSize: 26,         // the little wooden stage on the coffee table (square)

  jitter: {
    height: 0.035,       // ±3.5% of block height (≈ ±0.5 mm) → one loose block per layer emerges
    width: 0.004,
    sideGap: 0.05,       // cm between side-by-side blocks so neighbours never pinch each other
    frictionMin: 0.35,
    frictionMax: 0.55,
    placeXZ: 0.05,       // tiny random offset when stacking, cm
  },

  physics: {
    gravity: -981,
    timestep: 1 / 120,
    maxStepsPerFrame: 4,
    solverIterations: 8,
    internalPgsIterations: 1,
    lengthUnit: 100,     // units per meter
    allowedLinearError: 0.0001,   // × lengthUnit → 0.01 cm penetration slop (must be < height jitter)
    predictionDistance: 0.0004,   // × lengthUnit → 0.04 cm
    contactFrequency: 300,        // Hz; default 30 lets a 54-block stack compress ~3 cm under cm-scale gravity
    linearDamping: 0.2,
    angularDamping: 0.6,
    settleSeconds: 1.5,
    settleDamping: 6,
    tableFriction: 0.7,
  },

  pull: {
    maxForceBlocks: 6,   // cap on the pull force, in units of (block weight × friction)
    leadDistance: 2.5,   // cm the target may run ahead of the block
    speedCap: 30,        // cm/s max pull speed
    responseTime: 0.0,   // s, velocity servo response (0 = one physics step)
    extractOffset: 4.2,  // cm from tower centre along the axis: beyond this the block counts as pulled free
  },

  assist: {
    towerDamping: 3.0,   // damping multiplier on other blocks while a grab is active
    releaseSettleTime: 0.6,
    gravityAssist: 0,    // extra downward force on blocks as a fraction of weight (0 = off)
  },

  fall: {
    tiltDeg: 25,
    horizontalDrift: 6,
    verticalDrop: 3,
    scatterSeconds: 2.5,
  },

  camera: {
    fov: 42,
    minDist: 22,
    maxDist: 200,
    minPolar: 0.15,
    maxPolar: Math.PI / 2 - 0.06,
    home: { dist: 70, azimuth: 0.6, polar: 1.05 },
  },

  render: {
    maxPixelRatio: 2,
    shadows: true,
    shadowMapSize: 2048,
    exposure: 1.05,
  },
};

export const DEBUG = new URLSearchParams(location.search).has('debug');

// ---- tower modes ----
export const MODES = {
  classic: {
    key: 'classic', label: 'Classic', layers: 18, homeDist: 70,
    hint: 'Drag a block along its length to pull it out. Drag empty space to orbit, pinch to zoom.',
  },
  leonard: {
    key: 'leonard', label: '56 Leonard', layers: 28, homeDist: 100,
    hint: '56 Leonard St. The cantilevered floors are already hanging out; pull the ones not carrying the crown.',
  },
};

function initialMode() {
  const q = new URLSearchParams(location.search).get('mode');
  if (q && MODES[q]) return q;
  try { const s = localStorage.getItem('jenga.mode'); if (s && MODES[s]) return s; } catch { /* private mode */ }
  return 'classic';
}

export function currentMode() { return MODES[CONFIG.mode] || MODES.classic; }

export function setMode(key) {
  if (!MODES[key]) return;
  CONFIG.mode = key;
  CONFIG.layers = MODES[key].layers;
  try { localStorage.setItem('jenga.mode', key); } catch { /* private mode */ }
  // keep the address bar honest so a reload does not snap back to a ?mode= from earlier
  try {
    const url = new URL(location.href);
    if (url.searchParams.has('mode')) { url.searchParams.set('mode', key); history.replaceState(null, '', url); }
  } catch { /* ignore */ }
}

CONFIG.mode = initialMode();
CONFIG.layers = MODES[CONFIG.mode].layers;
