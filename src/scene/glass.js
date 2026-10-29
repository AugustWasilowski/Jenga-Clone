import * as THREE from 'three';
import { canvasTexture, seeded } from './materials.js';

/**
 * "56 Leonard" blocks: each Jenga block becomes two floors of a glass tower with
 * white floor-slab edges. One atlas texture per block variant, box UVs remapped so
 * the long sides, the ends and the slab faces each get their own region.
 */

const ATLAS_W = 1024, ATLAS_H = 512;
// rects in atlas pixels (x0, y0, x1, y1): long side (l × h), end (w × h), slab (l × w)
const RECT = {
  side: [0, 0, 750, 150],
  end: [760, 0, 1010, 150],
  slab: [0, 170, 750, 420],
};
const VARIANTS = 6;

function rgb(r, g, b, a = 1) { return 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + a + ')'; }

function drawFacade(ctx, [x0, y0, x1, y1], bays, rnd, tint) {
  const w = x1 - x0, h = y1 - y0;
  const floors = 2, fh = h / floors;
  const slabH = Math.round(fh * 0.17);
  const bayW = w / bays;
  for (let f = 0; f < floors; f++) {
    const top = y0 + f * fh;
    // glass
    for (let b = 0; b < bays; b++) {
      const bx = x0 + b * bayW;
      const k = 1 + (rnd() - 0.5) * 0.22;
      const g = ctx.createLinearGradient(0, top + slabH, 0, top + fh);
      g.addColorStop(0, rgb(tint[0] * k * 1.08, tint[1] * k * 1.06, tint[2] * k * 1.03));
      g.addColorStop(1, rgb(tint[0] * k * 0.82, tint[1] * k * 0.86, tint[2] * k * 0.92));
      ctx.fillStyle = g;
      ctx.fillRect(bx, top + slabH, bayW + 1, fh - slabH);
      // a bright reflection streak on some panes
      if (rnd() < 0.35) {
        const sx = bx + rnd() * bayW * 0.5;
        const g2 = ctx.createLinearGradient(sx, 0, sx + bayW * 0.5, 0);
        g2.addColorStop(0, 'rgba(255,255,255,0)');
        g2.addColorStop(0.5, 'rgba(255,255,255,0.28)');
        g2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(sx, top + slabH, bayW * 0.5, fh - slabH);
      }
      // mullion
      ctx.fillStyle = rgb(52, 60, 72);
      ctx.fillRect(Math.round(bx) - 1, top + slabH, 3, fh - slabH);
    }
    // balcony rail: thin dark line with a lighter cap
    const railY = top + slabH + (fh - slabH) * 0.62;
    ctx.fillStyle = 'rgba(40,46,56,0.55)';
    ctx.fillRect(x0, railY, w, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x0, railY - 1, w, 1);
    // slab band on top of the floor: white concrete edge with a shadow line beneath
    const sg = ctx.createLinearGradient(0, top, 0, top + slabH);
    sg.addColorStop(0, rgb(240, 238, 232));
    sg.addColorStop(0.7, rgb(226, 223, 216));
    sg.addColorStop(1, rgb(190, 188, 182));
    ctx.fillStyle = sg;
    ctx.fillRect(x0, top, w, slabH);
    ctx.fillStyle = 'rgba(20,24,32,0.45)';
    ctx.fillRect(x0, top + slabH, w, 2);
  }
  // last mullion on the right edge
  ctx.fillStyle = rgb(52, 60, 72);
  ctx.fillRect(x1 - 2, y0, 2, h);
}

function drawSlab(ctx, [x0, y0, x1, y1], rnd) {
  const w = x1 - x0, h = y1 - y0;
  ctx.fillStyle = rgb(222, 219, 212);
  ctx.fillRect(x0, y0, w, h);
  for (let i = 0; i < 1400; i++) {
    const d = (rnd() - 0.5) * 26;
    ctx.fillStyle = rgb(222 + d, 219 + d, 212 + d, 0.5);
    ctx.fillRect(x0 + rnd() * w, y0 + rnd() * h, 2 + rnd() * 3, 2 + rnd() * 3);
  }
  // parapet line around the edge of the terrace
  ctx.strokeStyle = rgb(176, 172, 164);
  ctx.lineWidth = 3;
  ctx.strokeRect(x0 + 6, y0 + 6, w - 12, h - 12);
}

function atlasTexture(variant) {
  return canvasTexture('glass-atlas-' + variant, ATLAS_W, ATLAS_H, (ctx, W, H) => {
    const rnd = seeded(4242 + variant * 101);
    const tint = [160 + (rnd() - 0.5) * 16, 186 + (rnd() - 0.5) * 12, 210 + (rnd() - 0.5) * 10];
    ctx.fillStyle = rgb(222, 219, 212);
    ctx.fillRect(0, 0, W, H);
    drawFacade(ctx, RECT.side, 6, rnd, tint);
    drawFacade(ctx, RECT.end, 2, rnd, tint);
    drawSlab(ctx, RECT.slab, rnd);
  });
}

/** G = roughness, B = metalness. Glass is smooth and reflective, slabs are matte concrete. */
function rmTexture() {
  return canvasTexture('glass-rm', ATLAS_W / 2, ATLAS_H / 2, (ctx, W, H) => {
    ctx.fillStyle = 'rgb(0,235,0)';   // slab everywhere by default
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgb(0,70,210)';  // glass
    for (const r of [RECT.side, RECT.end]) ctx.fillRect(r[0] / 2, r[1] / 2, (r[2] - r[0]) / 2, (r[3] - r[1]) / 2);
  }, { srgb: false, anisotropy: 1 });
}

let glassGeo = null;
/** Unit box whose faces map to the atlas regions (BoxGeometry face order: +x, -x, +y, -y, +z, -z). */
export function glassBlockGeometry() {
  if (glassGeo) return glassGeo;
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const uv = geo.attributes.uv;
  const faceRect = [RECT.end, RECT.end, RECT.slab, RECT.slab, RECT.side, RECT.side];
  for (let i = 0; i < uv.count; i++) {
    const [x0, y0, x1, y1] = faceRect[Math.floor(i / 4)];
    const u = uv.getX(i), v = uv.getY(i);
    const px = x0 + 2 + u * (x1 - x0 - 4);
    const py = y1 - 2 - v * (y1 - y0 - 4);
    uv.setXY(i, px / ATLAS_W, 1 - py / ATLAS_H);
  }
  uv.needsUpdate = true;
  glassGeo = geo;
  return geo;
}

export function makeGlassBlockMaterial(id, envMap) {
  const rnd = seeded(7000 + id * 13);
  const color = new THREE.Color(0xf4f8fc);
  color.offsetHSL((rnd() - 0.5) * 0.02, 0, (rnd() - 0.5) * 0.05);
  const rm = rmTexture();
  return new THREE.MeshStandardMaterial({
    map: atlasTexture(id % VARIANTS),
    color,
    roughnessMap: rm, metalnessMap: rm,
    roughness: 1, metalness: 1,
    envMap, envMapIntensity: 1.0,
    emissive: 0x000000,
  });
}

/**
 * A small HDR sky for the glass to reflect: blue zenith, pale horizon, a low sun and a few
 * dark neighbouring buildings. Baked once with PMREM; the living room itself stays unlit by it.
 */
export function makeSkyEnv(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  const R = 50;
  const geo = new THREE.SphereGeometry(R, 32, 16);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const zenith = new THREE.Color(0x3f74bf), horizon = new THREE.Color(0xc2d6ea), ground = new THREE.Color(0x5a5650);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / R;
    if (y >= 0) c.copy(horizon).lerp(zenith, Math.pow(y, 0.55)); else c.copy(horizon).lerp(ground, Math.min(1, -y * 3));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));

  const sun = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 6.2, 5) }));
  sun.position.set(22, 14, -38);
  s.add(sun);

  const rnd = seeded(99);
  const bldg = new THREE.MeshBasicMaterial({ color: 0x3a3f48 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.4;
    const h = 4 + rnd() * 9, w = 5 + rnd() * 6;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), bldg);
    m.position.set(Math.cos(a) * 40, h / 2 - 3, Math.sin(a) * 40);
    s.add(m);
  }

  const env = pmrem.fromScene(s, 0.04).texture;
  pmrem.dispose();
  geo.dispose();
  return env;
}
