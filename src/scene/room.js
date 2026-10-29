import * as THREE from 'three';
import { box, plane, wall, picture } from './prims.js';
import { MAT } from './materials.js';

/**
 * Room shell. Layout (cm, y up):
 *   living room  x ∈ [-250, 250], z ∈ [-225, 225]; fireplace on the back wall (z = -225)
 *   dining room  x ∈ [-600, -250], z ∈ [-225, 100], through an archway in the x = -250 wall
 *   hallway      x ∈ [250, 400],  z ∈ [-225, 225], through an opening in the x = 250 wall;
 *                front door on the x = 400 wall, stairs rising toward -z
 */
export const ROOM = {
  H: 280,
  living: { x0: -250, x1: 250, z0: -225, z1: 225 },
  dining: { x0: -600, x1: -250, z0: -225, z1: 100 },
  hall: { x0: 250, x1: 400, z0: -225, z1: 225 },
  arch: { from: -130, to: 30, top: 225 },      // archway in the x=-250 wall (z range)
  hallOpen: { from: -110, to: 70, top: 215 },  // opening in the x=250 wall (z range)
  window: { from: 60, to: 200, bottom: 90, top: 220 }, // on the front wall z=225 (x range)
};

export function buildRoom({ scene }) {
  const H = ROOM.H;
  const L = ROOM.living, D = ROOM.dining, Hw = ROOM.hall;
  const g = new THREE.Group(); g.name = 'room';

  // ---- floors ----
  const oak = MAT.oakFloor;
  oak.map.repeat.set(5, 4.5);
  plane(g, L.x1 - L.x0, L.z1 - L.z0, oak, 0, 0, 0, { rx: -Math.PI / 2 });
  const oakD = oak.clone(); oakD.map = oak.map.clone(); oakD.map.repeat.set(3.5, 3.25); oakD.map.needsUpdate = true;
  plane(g, D.x1 - D.x0, D.z1 - D.z0, oakD, (D.x0 + D.x1) / 2, 0, (D.z0 + D.z1) / 2, { rx: -Math.PI / 2 });
  const oakH = oak.clone(); oakH.map = oak.map.clone(); oakH.map.repeat.set(1.5, 4.5); oakH.map.needsUpdate = true;
  plane(g, Hw.x1 - Hw.x0, Hw.z1 - Hw.z0, oakH, (Hw.x0 + Hw.x1) / 2, 0, 0, { rx: -Math.PI / 2 });

  // rug under the coffee table
  const rug = plane(g, 300, 200, MAT.rug, 0, 0.6, 25, { rx: -Math.PI / 2 });
  rug.receiveShadow = true;

  // ---- ceilings ----
  plane(g, L.x1 - L.x0, L.z1 - L.z0, MAT.ceiling, 0, H, 0, { rx: Math.PI / 2 });
  plane(g, D.x1 - D.x0, D.z1 - D.z0, MAT.ceiling, (D.x0 + D.x1) / 2, H, (D.z0 + D.z1) / 2, { rx: Math.PI / 2 });
  plane(g, Hw.x1 - Hw.x0, Hw.z1 - Hw.z0, MAT.ceiling, (Hw.x0 + Hw.x1) / 2, H, 0, { rx: Math.PI / 2 });

  // ---- walls ----
  const P = MAT.plaster; P.map.repeat.set(6, 3);
  const PD = MAT.plasterDining; PD.map.repeat.set(6, 3);
  // back wall (z = -225) across all three rooms; the fireplace sits in front of it
  wall(g, PD, { axis: 'x', at: D.z0 - 6, a: D.x0, b: D.x1, height: H });
  wall(g, P, { axis: 'x', at: L.z0 - 6, a: L.x0, b: Hw.x1 + 6, height: H });
  // front wall (z = +225) for living + hall, with the window
  wall(g, P, { axis: 'x', at: L.z1 + 6, a: L.x0, b: Hw.x1 + 6, height: H, openings: [ROOM.window] });
  // dining room's front wall (z = 100) and far wall (x = -600)
  wall(g, PD, { axis: 'x', at: D.z1 + 6, a: D.x0 - 6, b: D.x1, height: H });
  wall(g, PD, { axis: 'z', at: D.x0 - 6, a: D.z0, b: D.z1 + 6, height: H });
  // living/dining partition (x = -250) with the archway; stub wall south of the dining room
  wall(g, P, { axis: 'z', at: L.x0, a: L.z0, b: L.z1, height: H, openings: [ROOM.arch] });
  // living/hall partition (x = 250) with the opening
  wall(g, P, { axis: 'z', at: L.x1, a: L.z0, b: L.z1, height: H, openings: [ROOM.hallOpen] });
  // hall far wall (x = 400): front door + sidelight are modelled in hallway.js; leave the opening
  wall(g, P, { axis: 'z', at: Hw.x1 + 6, a: Hw.z0, b: Hw.z1, height: H, openings: [{ from: 95, to: 215, top: 215 }] });

  // ---- baseboards (living room) ----
  const bb = MAT.white;
  box(g, L.x1 - L.x0, 10, 2, bb, 0, 5, L.z1 - 1, { cast: false });
  box(g, 2, 10, L.z1 - L.z0, bb, L.x0 + 7, 5, 0, { cast: false });
  box(g, 2, 10, L.z1 - L.z0, bb, L.x1 - 7, 5, 0, { cast: false });
  // archway and opening trim
  const trim = MAT.white;
  box(g, 14, ROOM.arch.top + 8, 10, trim, L.x0, (ROOM.arch.top + 8) / 2, ROOM.arch.from - 5, { cast: false });
  box(g, 14, ROOM.arch.top + 8, 10, trim, L.x0, (ROOM.arch.top + 8) / 2, ROOM.arch.to + 5, { cast: false });
  box(g, 14, 10, ROOM.arch.to - ROOM.arch.from + 20, trim, L.x0, ROOM.arch.top + 3, (ROOM.arch.from + ROOM.arch.to) / 2, { cast: false });
  box(g, 14, ROOM.hallOpen.top + 8, 10, trim, L.x1, (ROOM.hallOpen.top + 8) / 2, ROOM.hallOpen.from - 5, { cast: false });
  box(g, 14, ROOM.hallOpen.top + 8, 10, trim, L.x1, (ROOM.hallOpen.top + 8) / 2, ROOM.hallOpen.to + 5, { cast: false });
  box(g, 14, 10, ROOM.hallOpen.to - ROOM.hallOpen.from + 20, trim, L.x1, ROOM.hallOpen.top + 3, (ROOM.hallOpen.from + ROOM.hallOpen.to) / 2, { cast: false });

  // ---- window on the front wall: night sky, frame, curtains ----
  const W = ROOM.window;
  const wx = (W.from + W.to) / 2, wy = (W.bottom + W.top) / 2, ww = W.to - W.from, wh = W.top - W.bottom;
  plane(g, ww + 40, wh + 40, MAT.glass, wx, wy, L.z1 + 11, { ry: Math.PI, receive: false }); // dark outside
  box(g, ww + 12, 6, 14, MAT.white, wx, W.top + 3, L.z1, { cast: false });
  box(g, ww + 12, 6, 14, MAT.white, wx, W.bottom - 3, L.z1, { cast: false });
  box(g, 6, wh, 14, MAT.white, W.from - 3, wy, L.z1, { cast: false });
  box(g, 6, wh, 14, MAT.white, W.to + 3, wy, L.z1, { cast: false });
  box(g, 4, wh, 4, MAT.white, wx, wy, L.z1 - 2, { cast: false });   // mullion
  box(g, ww, 4, 4, MAT.white, wx, wy, L.z1 - 2, { cast: false });   // transom
  box(g, ww + 30, 4, 12, MAT.walnut, wx, W.bottom - 8, L.z1 - 8, { cast: false }); // sill
  // curtains
  const C = MAT.curtain; C.map.repeat.set(2, 4);
  box(g, 34, W.top + 20, 10, C, W.from - 12, (W.top + 20) / 2 + 4, L.z1 - 14, { radius: 3, cast: false });
  box(g, 34, W.top + 20, 10, C, W.to + 12, (W.top + 20) / 2 + 4, L.z1 - 14, { radius: 3, cast: false });
  box(g, ww + 70, 3, 3, MAT.brass, wx, W.top + 24, L.z1 - 14, { cast: false });

  // ---- pictures ----
  picture(g, 70, 50, -60, 180, L.z1 - 8, 's', 0x6d7f9c, MAT.walnut);
  picture(g, 60, 80, L.x0 + 8, 165, 130, 'e', 0x9c6b54, MAT.darkWood);
  picture(g, 50, 40, L.x1 - 8, 170, -170, 'w', 0x5f8a63, MAT.darkWood);

  scene.add(g);
  return g;
}
