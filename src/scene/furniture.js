import * as THREE from 'three';
import { box, boxOnFloor, cylinder } from './prims.js';
import { MAT, seeded } from './materials.js';
import { CONFIG } from '../config.js';

export function buildFurniture({ scene }) {
  const g = new THREE.Group(); g.name = 'furniture';

  // ---- coffee table (top at y=45) + the jenga stage (top at y=47) ----
  const T = { w: 110, d: 60, h: 45 };
  box(g, T.w, 4, T.d, MAT.walnut, 0, T.h - 2, 0, { radius: 1 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) boxOnFloor(g, 5, T.h - 4, 5, MAT.walnut, sx * (T.w / 2 - 6), 0, sz * (T.d / 2 - 6));
  box(g, T.w - 20, 2, T.d - 20, MAT.walnut, 0, 14, 0); // lower shelf
  const S = CONFIG.stageSize;
  box(g, S + 2, 1, S + 2, MAT.darkWood, 0, T.h + 0.5, 0, { cast: false });
  const stageTop = CONFIG.stageTop;
  box(g, S, stageTop - T.h - 1, S, MAT.paleWood, 0, (T.h + 1 + stageTop) / 2, 0, { radius: 0.4 });
  // a couple of books and a mug on the table
  box(g, 22, 3, 15, new THREE.MeshStandardMaterial({ color: 0x7a3b3b, roughness: 0.8 }), 38, T.h + 1.5, -14, { ry: 0.2 });
  box(g, 20, 2.5, 14, new THREE.MeshStandardMaterial({ color: 0x2f4a6d, roughness: 0.8 }), 38, T.h + 4.2, -14, { ry: 0.35 });
  cylinder(g, 4, 3.5, 9, MAT.white, -40, T.h + 4.5, 16);

  // ---- couch (facing the fireplace, i.e. toward -z) ----
  couch(g, 0, 125, 0);

  // ---- two armchairs angled toward the table ----
  armchair(g, -165, 25, Math.PI / 2 - 0.35);
  armchair(g, 165, 25, -Math.PI / 2 + 0.35);

  // ---- side table + table lamp next to the right chair ----
  boxOnFloor(g, 45, 55, 45, MAT.darkWood, 205, 0, -45);
  box(g, 41, 2, 41, MAT.darkWood, 205, 20, -45);
  cylinder(g, 6, 8, 3, MAT.brass, 205, 56.5, -45);
  cylinder(g, 2, 2, 30, MAT.brass, 205, 72, -45);
  cylinder(g, 14, 18, 24, MAT.lampShade, 205, 97, -45, { open: true });

  // ---- floor lamp behind the couch ----
  cylinder(g, 14, 14, 2, MAT.metal, 140, 1, 190);
  cylinder(g, 1.6, 1.6, 150, MAT.metal, 140, 76, 190);
  cylinder(g, 16, 22, 30, MAT.lampShade, 140, 160, 190, { open: true });

  // ---- bookshelf on the back wall, left of the fireplace ----
  bookshelf(g, -175, -200);

  // ---- plant in the far-right corner ----
  plant(g, 215, -195);

  // ---- a throw blanket folded on the couch arm, a basket of logs ----
  box(g, 26, 8, 60, MAT.cushion2, -98, 66, 125, { radius: 2 });
  logBasket(g, 110, -190);

  scene.add(g);
  return g;
}

function couch(parent, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const W = 210, D = 90;
  boxOnFloor(g, W, 10, D, MAT.couch, 0, 0, 0, { radius: 2 });                // base
  boxOnFloor(g, W, 36, 24, MAT.couch, 0, 10, D / 2 - 12, { radius: 4 });    // back... (behind = +z)
  box(g, W - 20, 30, 10, MAT.couch, 0, 55, D / 2 - 6, { radius: 3 });        // back cushion rail
  boxOnFloor(g, 22, 50, D, MAT.couch, -W / 2 + 11, 0, 0, { radius: 4 });    // arms
  boxOnFloor(g, 22, 50, D, MAT.couch, W / 2 - 11, 0, 0, { radius: 4 });
  const seatW = (W - 44) / 3;
  for (let i = 0; i < 3; i++) {
    const cx = -W / 2 + 22 + seatW * (i + 0.5);
    box(g, seatW - 2, 16, D - 30, MAT.couch, cx, 18, -6, { radius: 4 });
    box(g, seatW - 2, 40, 14, MAT.couch, cx, 48, D / 2 - 22, { radius: 4, rx: -0.12 });
  }
  box(g, 34, 34, 10, MAT.cushion, -58, 42, 18, { radius: 3, ry: 0.3, rz: 0.1 });
  box(g, 34, 34, 10, MAT.cushion2, 60, 42, 18, { radius: 3, ry: -0.25 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cylinder(g, 2.5, 2, 6, MAT.darkWood, sx * (W / 2 - 10), 3, sz * (D / 2 - 10));
  g.children.forEach((m) => { m.castShadow = true; });
  parent.add(g);
  return g;
}

function armchair(parent, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const W = 90, D = 85;
  boxOnFloor(g, W, 12, D, MAT.chair, 0, 0, 0, { radius: 2 });
  boxOnFloor(g, W, 70, 20, MAT.chair, 0, 10, D / 2 - 10, { radius: 5, rx: -0.08 });
  boxOnFloor(g, 20, 48, D, MAT.chair, -W / 2 + 10, 0, 0, { radius: 5 });
  boxOnFloor(g, 20, 48, D, MAT.chair, W / 2 - 10, 0, 0, { radius: 5 });
  box(g, W - 42, 16, D - 30, MAT.chair, 0, 20, -4, { radius: 4 });
  box(g, 30, 30, 9, MAT.cushion, 0, 44, 20, { radius: 3, ry: 0.15 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cylinder(g, 2.5, 2, 6, MAT.darkWood, sx * (W / 2 - 8), 3, sz * (D / 2 - 8));
  parent.add(g);
  return g;
}

function bookshelf(parent, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const W = 100, H = 210, D = 30;
  boxOnFloor(g, 3, H, D, MAT.darkWood, -W / 2 + 1.5, 0, 0);
  boxOnFloor(g, 3, H, D, MAT.darkWood, W / 2 - 1.5, 0, 0);
  box(g, W, 2, D, MAT.darkWood, 0, H - 1, 0);
  box(g, W, 2, 2, MAT.darkWood, 0, H / 2, -D / 2 + 1, { cast: false });
  const rnd = seeded(42);
  const colors = [0x8c3b3b, 0x2f4a6d, 0x4a6b3a, 0xb08a3a, 0x6b4a8c, 0x3a3a3a, 0xa0522d, 0xd9c8a8];
  for (let s = 0; s < 5; s++) {
    const y = 3 + s * 40;
    box(g, W - 6, 2, D, MAT.darkWood, 0, y + 1, 0);
    let cx = -W / 2 + 6;
    while (cx < W / 2 - 12) {
      const bw = 3 + rnd() * 4, bh = 20 + rnd() * 14, bd = D - 8 - rnd() * 6;
      const mat = new THREE.MeshStandardMaterial({ color: colors[(rnd() * colors.length) | 0], roughness: 0.85 });
      box(g, bw, bh, bd, mat, cx + bw / 2, y + 2 + bh / 2, -2 + rnd() * 2, { cast: false });
      cx += bw + 0.6;
      if (rnd() < 0.12) cx += 8 + rnd() * 10;
    }
  }
  parent.add(g);
}

function plant(parent, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  cylinder(g, 16, 12, 34, MAT.pot, 0, 17, 0);
  cylinder(g, 15, 15, 2, MAT.soot, 0, 34, 0);
  const rnd = seeded(7);
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2, tilt = 0.35 + rnd() * 0.5, len = 45 + rnd() * 40;
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(10 + rnd() * 6, len), MAT.leaf);
    leaf.position.set(Math.cos(a) * 4, 36 + len / 2 * Math.cos(tilt), Math.sin(a) * 4);
    leaf.rotation.set(0, -a + Math.PI / 2, 0);
    leaf.rotateX(tilt * (rnd() < 0.5 ? 1 : -1));
    leaf.castShadow = true;
    g.add(leaf);
  }
  parent.add(g);
}

function logBasket(parent, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  cylinder(g, 22, 18, 30, MAT.walnut, 0, 15, 0, { open: true, segments: 14 });
  cylinder(g, 18, 18, 1, MAT.walnut, 0, 1, 0, { segments: 14 });
  const rnd = seeded(99);
  for (let i = 0; i < 5; i++) cylinder(g, 5, 5, 36, MAT.darkWood, (rnd() - 0.5) * 18, 24 + i * 2, (rnd() - 0.5) * 18, { rz: 0.2 + rnd() * 0.5, ry: rnd() * 3 });
  parent.add(g);
}
