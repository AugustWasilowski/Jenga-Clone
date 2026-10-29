import * as THREE from 'three';

// Procedural canvas textures + shared materials. No external assets.

const texCache = new Map();

/** Small deterministic PRNG so textures look the same every load. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTexture(name, w, h, draw, { repeat = [1, 1], srgb = true, anisotropy = 4 } = {}) {
  if (texCache.has(name)) return texCache.get(name);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h, seeded(name.length * 7919 + w));
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  texCache.set(name, tex);
  return tex;
}

function rgb(r, g, b, a = 1) { return `rgba(${r | 0},${g | 0},${b | 0},${a})`; }

/** Horizontal wood grain. base = [r,g,b]. */
export function woodTexture(name, base, { w = 512, h = 256, grain = 0.18, lines = 60 } = {}) {
  return canvasTexture(name, w, h, (ctx, W, H, rnd) => {
    const [r, g, b] = base;
    ctx.fillStyle = rgb(r, g, b);
    ctx.fillRect(0, 0, W, H);
    // soft tonal bands
    for (let i = 0; i < 14; i++) {
      const y = rnd() * H, hh = 20 + rnd() * 60;
      const d = (rnd() - 0.5) * 0.18;
      ctx.fillStyle = rgb(r * (1 + d), g * (1 + d), b * (1 + d), 0.5);
      ctx.fillRect(0, y, W, hh);
    }
    // grain lines
    for (let i = 0; i < lines; i++) {
      const y0 = rnd() * H;
      const dark = rnd() < 0.5;
      const k = dark ? 1 - grain * (0.4 + rnd() * 0.8) : 1 + grain * 0.4 * rnd();
      ctx.strokeStyle = rgb(r * k, g * k, b * k, 0.35 + rnd() * 0.4);
      ctx.lineWidth = 0.6 + rnd() * 1.6;
      ctx.beginPath();
      const amp = 2 + rnd() * 6, freq = 0.004 + rnd() * 0.012, ph = rnd() * 10;
      for (let x = 0; x <= W; x += 8) {
        const y = y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph) * amp * 0.3;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // fine noise
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rnd() - 0.5) * 14;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  });
}

/** Floor planks: wood grain with plank seams. */
export function plankTexture(name, base, { w = 1024, h = 1024, planks = 8 } = {}) {
  return canvasTexture(name, w, h, (ctx, W, H, rnd) => {
    const [r, g, b] = base;
    const ph = H / planks;
    for (let p = 0; p < planks; p++) {
      const d = (rnd() - 0.5) * 0.22;
      const pr = r * (1 + d), pg = g * (1 + d), pb = b * (1 + d);
      ctx.fillStyle = rgb(pr, pg, pb);
      ctx.fillRect(0, p * ph, W, ph);
      for (let i = 0; i < 26; i++) {
        const y0 = p * ph + rnd() * ph;
        const k = 1 - 0.25 * rnd();
        ctx.strokeStyle = rgb(pr * k, pg * k, pb * k, 0.3 + rnd() * 0.35);
        ctx.lineWidth = 0.6 + rnd() * 1.4;
        ctx.beginPath();
        const amp = 1 + rnd() * 3, freq = 0.005 + rnd() * 0.01, phs = rnd() * 10;
        for (let x = 0; x <= W; x += 10) {
          const y = y0 + Math.sin(x * freq + phs) * amp;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // seams + staggered plank ends
      ctx.fillStyle = rgb(r * 0.45, g * 0.45, b * 0.45, 0.9);
      ctx.fillRect(0, p * ph, W, 3);
      const end = ((p * 0.37) % 1) * W;
      ctx.fillRect(end, p * ph, 3, ph);
    }
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rnd() - 0.5) * 12;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  });
}

export function brickTexture(name, { w = 512, h = 512, brick = [150, 68, 52], mortar = [200, 188, 172] } = {}) {
  return canvasTexture(name, w, h, (ctx, W, H, rnd) => {
    ctx.fillStyle = rgb(...mortar);
    ctx.fillRect(0, 0, W, H);
    const bw = W / 4, bh = H / 12, m = 4;
    for (let row = 0; row < 12; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < 5; col++) {
        const d = (rnd() - 0.5) * 0.3;
        ctx.fillStyle = rgb(brick[0] * (1 + d), brick[1] * (1 + d * 0.8), brick[2] * (1 + d * 0.6));
        ctx.fillRect(col * bw + off + m / 2, row * bh + m / 2, bw - m, bh - m);
        // speckle
        for (let s = 0; s < 18; s++) {
          ctx.fillStyle = rgb(0, 0, 0, rnd() * 0.12);
          ctx.fillRect(col * bw + off + m / 2 + rnd() * (bw - m), row * bh + m / 2 + rnd() * (bh - m), 2, 2);
        }
      }
    }
  });
}

export function fabricTexture(name, base, { w = 256, h = 256, contrast = 18 } = {}) {
  return canvasTexture(name, w, h, (ctx, W, H, rnd) => {
    const [r, g, b] = base;
    ctx.fillStyle = rgb(r, g, b);
    ctx.fillRect(0, 0, W, H);
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const weave = ((x + y) % 4 < 2 ? 1 : -1) * contrast * 0.35;
      const n = (rnd() - 0.5) * contrast + weave;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  });
}

export function plasterTexture(name, base, { w = 256, h = 256 } = {}) {
  return canvasTexture(name, w, h, (ctx, W, H, rnd) => {
    const [r, g, b] = base;
    ctx.fillStyle = rgb(r, g, b);
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = rgb(0, 0, 0, rnd() * 0.05);
      ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 1 + rnd() * 3, 0, 6.283); ctx.fill();
      ctx.fillStyle = rgb(255, 255, 255, rnd() * 0.05);
      ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 1 + rnd() * 2, 0, 6.283); ctx.fill();
    }
  });
}

export function rugTexture(name, { w = 512, h = 768, base = [52, 68, 110], accent = [176, 140, 84], accent2 = [142, 60, 58] } = {}) {
  return canvasTexture(name, w, h, (ctx, W, H, rnd) => {
    ctx.fillStyle = rgb(...base);
    ctx.fillRect(0, 0, W, H);
    const border = (col, inset, width) => {
      ctx.strokeStyle = rgb(...col); ctx.lineWidth = width;
      ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
    };
    border(accent, 14, 6); border(accent2, 30, 10); border(accent, 48, 4);
    // diamond motif
    ctx.strokeStyle = rgb(...accent, 0.9); ctx.lineWidth = 3;
    for (let y = 100; y < H - 100; y += 110) for (let x = 90; x < W - 80; x += 110) {
      ctx.beginPath();
      ctx.moveTo(x, y - 34); ctx.lineTo(x + 34, y); ctx.lineTo(x, y + 34); ctx.lineTo(x - 34, y); ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = rgb(...accent2, 0.9);
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.283); ctx.fill();
    }
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rnd() - 0.5) * 22;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  });
}

// ---- shared materials ----

let blockTex = null;
const blockBase = new THREE.Color(0xd9b27c);

export function makeBlockMaterial(id) {
  if (!blockTex) blockTex = woodTexture('block-wood', [222, 184, 128], { w: 512, h: 160, grain: 0.14, lines: 48 });
  const rnd = seeded(1000 + id * 17);
  const c = blockBase.clone();
  c.offsetHSL((rnd() - 0.5) * 0.02, (rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.08);
  return new THREE.MeshStandardMaterial({
    map: blockTex, color: c, roughness: 0.68, metalness: 0.0,
    emissive: 0x000000,
  });
}

export const MAT = {
  get oakFloor() { return this._oak ||= new THREE.MeshStandardMaterial({ map: plankTexture('floor', [146, 98, 58]), roughness: 0.55 }); },
  get darkWood() { return this._dw ||= new THREE.MeshStandardMaterial({ map: woodTexture('dark-wood', [96, 58, 34], { grain: 0.22 }), roughness: 0.5 }); },
  get walnut() { return this._wal ||= new THREE.MeshStandardMaterial({ map: woodTexture('walnut', [118, 76, 46], { grain: 0.2 }), roughness: 0.45 }); },
  get paleWood() { return this._pw ||= new THREE.MeshStandardMaterial({ map: woodTexture('pale-wood', [204, 168, 118], { grain: 0.12 }), roughness: 0.6 }); },
  get plaster() { return this._pl ||= new THREE.MeshStandardMaterial({ map: plasterTexture('plaster', [226, 208, 182]), roughness: 0.95 }); },
  get plasterDining() { return this._pd ||= new THREE.MeshStandardMaterial({ map: plasterTexture('plaster-d', [196, 180, 150]), roughness: 0.95 }); },
  get ceiling() { return this._ce ||= new THREE.MeshStandardMaterial({ color: 0xf2e9dc, roughness: 1 }); },
  get brick() { return this._br ||= new THREE.MeshStandardMaterial({ map: brickTexture('brick'), roughness: 0.9 }); },
  get stone() { return this._st ||= new THREE.MeshStandardMaterial({ map: plasterTexture('stone', [120, 112, 104]), roughness: 0.85 }); },
  get couch() { return this._co ||= new THREE.MeshStandardMaterial({ map: fabricTexture('couch', [58, 92, 72]), roughness: 0.95 }); },
  get chair() { return this._ch ||= new THREE.MeshStandardMaterial({ map: fabricTexture('chair', [184, 136, 54]), roughness: 0.95 }); },
  get cushion() { return this._cu ||= new THREE.MeshStandardMaterial({ map: fabricTexture('cushion', [150, 62, 56]), roughness: 0.95 }); },
  get cushion2() { return this._cu2 ||= new THREE.MeshStandardMaterial({ map: fabricTexture('cushion2', [214, 196, 160]), roughness: 0.95 }); },
  get rug() { return this._rug ||= new THREE.MeshStandardMaterial({ map: rugTexture('rug'), roughness: 1 }); },
  get metal() { return this._me ||= new THREE.MeshStandardMaterial({ color: 0x3a3230, roughness: 0.4, metalness: 0.8 }); },
  get brass() { return this._bs ||= new THREE.MeshStandardMaterial({ color: 0xb8923e, roughness: 0.35, metalness: 0.9 }); },
  get lampShade() { return this._ls ||= new THREE.MeshStandardMaterial({ color: 0xf0d9a8, emissive: 0xffb45a, emissiveIntensity: 0.55, roughness: 1, side: THREE.DoubleSide }); },
  get white() { return this._wh ||= new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.8 }); },
  get leaf() { return this._lf ||= new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.8, side: THREE.DoubleSide }); },
  get pot() { return this._pot ||= new THREE.MeshStandardMaterial({ color: 0x9a5a3c, roughness: 0.9 }); },
  get glass() { return this._gl ||= new THREE.MeshStandardMaterial({ color: 0x0c1830, roughness: 0.1, metalness: 0.2, emissive: 0x0a1226, emissiveIntensity: 0.9 }); },
  get curtain() { return this._cur ||= new THREE.MeshStandardMaterial({ map: fabricTexture('curtain', [122, 54, 48], { contrast: 10 }), roughness: 1, side: THREE.DoubleSide }); },
  get ember() { return this._em ||= new THREE.MeshStandardMaterial({ color: 0x2a1408, emissive: 0xff5a10, emissiveIntensity: 1.6, roughness: 1 }); },
  get soot() { return this._so ||= new THREE.MeshStandardMaterial({ color: 0x15100d, roughness: 1 }); },
};
