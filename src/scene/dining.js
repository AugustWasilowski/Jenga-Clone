import * as THREE from 'three';
import { box, boxOnFloor, cylinder, picture } from './prims.js';
import { MAT } from './materials.js';
import { ROOM } from './room.js';

export function buildDining({ scene }) {
  const g = new THREE.Group(); g.name = 'dining';
  const D = ROOM.dining;
  const cx = (D.x0 + D.x1) / 2, cz = (D.z0 + D.z1) / 2 + 10; // ~(-425, -52)

  // table
  const TW = 190, TD = 95, TH = 76;
  box(g, TW, 4, TD, MAT.walnut, cx, TH - 2, cz, { radius: 1 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) boxOnFloor(g, 7, TH - 4, 7, MAT.walnut, cx + sx * (TW / 2 - 10), 0, cz + sz * (TD / 2 - 10));
  // runner + bowl + candlesticks
  box(g, TW - 40, 0.6, 32, MAT.cushion, cx, TH + 0.3, cz, { cast: false });
  cylinder(g, 14, 9, 7, MAT.white, cx, TH + 3.5, cz);
  for (const dx of [-45, 45]) { cylinder(g, 2, 3, 22, MAT.brass, cx + dx, TH + 11, cz); cylinder(g, 1.6, 1.6, 10, MAT.white, cx + dx, TH + 27, cz); }

  // chairs: two each long side
  for (const dx of [-45, 45]) {
    chair(g, cx + dx, cz + TD / 2 + 28, Math.PI);
    chair(g, cx + dx, cz - TD / 2 - 28, 0);
  }

  // pendant lamp over the table
  cylinder(g, 0.6, 0.6, 80, MAT.metal, cx, ROOM.H - 40, cz);
  cylinder(g, 22, 30, 24, MAT.lampShade, cx, ROOM.H - 88, cz, { open: true });
  cylinder(g, 4, 4, 2, MAT.brass, cx, ROOM.H - 1, cz);

  // sideboard against the back wall
  const sx = cx, sz = D.z0 + 25;
  boxOnFloor(g, 160, 82, 46, MAT.darkWood, sx, 0, sz, { radius: 1 });
  box(g, 150, 1, 40, MAT.walnut, sx, 82.5, sz);
  for (const dx of [-55, 0, 55]) box(g, 46, 60, 2, MAT.walnut, sx + dx, 44, sz + 23.2, { cast: false });
  for (const dx of [-55, 0, 55]) cylinder(g, 1.4, 1.4, 1.5, MAT.brass, sx + dx, 44, sz + 24.5, { rx: Math.PI / 2 });
  cylinder(g, 10, 7, 26, new THREE.MeshStandardMaterial({ color: 0x4e6e8a, roughness: 0.3 }), sx + 50, 83 + 13, sz);
  cylinder(g, 7, 7, 12, MAT.white, sx - 50, 83 + 6, sz);

  picture(g, 110, 70, sx, 170, D.z0 + 2, 'n', 0x7b5a3c, MAT.brass);
  picture(g, 50, 70, D.x0 + 2, 165, cz, 'e', 0x4f6b5a, MAT.darkWood);

  scene.add(g);
  return g;
}

function chair(parent, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  box(g, 44, 4, 44, MAT.walnut, 0, 44, 0, { radius: 1 });
  box(g, 40, 4, 40, MAT.cushion2, 0, 48, 0, { radius: 1.5 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) boxOnFloor(g, 4, 42, 4, MAT.walnut, sx * 18, 0, sz * 18);
  for (const sx of [-1, 1]) box(g, 4, 50, 4, MAT.walnut, sx * 18, 71, -19, { rx: 0.06 });
  box(g, 36, 10, 3, MAT.walnut, 0, 90, -19.5, { rx: 0.06 });
  box(g, 36, 10, 3, MAT.walnut, 0, 72, -19, { rx: 0.06 });
  parent.add(g);
}
