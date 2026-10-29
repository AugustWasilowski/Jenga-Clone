import * as THREE from 'three';
import { box, boxOnFloor, cylinder, picture } from './prims.js';
import { MAT } from './materials.js';
import { ROOM } from './room.js';

export function buildHallway({ scene }) {
  const g = new THREE.Group(); g.name = 'hallway';
  const Hw = ROOM.hall;
  const xWall = Hw.x1; // 400: the far wall holds the front door

  // ---- front door (in the x=400 wall, z ∈ [95, 215] opening: door 100 + sidelight 20) ----
  const doorZ = 160, doorW = 96, doorH = 210;
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5b2f1e, roughness: 0.55 });
  box(g, 6, doorH, doorW, doorMat, xWall + 3, doorH / 2, doorZ, { cast: false });
  // door panels (raised rectangles)
  for (const [y, h] of [[55, 70], [145, 90]]) box(g, 2, h, doorW - 28, MAT.darkWood, xWall - 0.5, y, doorZ, { cast: false });
  cylinder(g, 2.2, 2.2, 4, MAT.brass, xWall - 2, 100, doorZ + 36, { rz: Math.PI / 2 });
  // frame
  box(g, 10, doorH + 8, 8, MAT.white, xWall + 3, (doorH + 8) / 2, doorZ - doorW / 2 - 4, { cast: false });
  box(g, 10, doorH + 8, 8, MAT.white, xWall + 3, (doorH + 8) / 2, doorZ + doorW / 2 + 4, { cast: false });
  box(g, 10, 8, doorW + 16, MAT.white, xWall + 3, doorH + 4, doorZ, { cast: false });
  // sidelight window (narrow, between door and corner)
  const slZ = 206, slW = 16;
  box(g, 4, doorH, slW, MAT.glass, xWall + 4, doorH / 2, slZ, { cast: false, receive: false });
  box(g, 8, doorH + 8, 6, MAT.white, xWall + 3, (doorH + 8) / 2, slZ + slW / 2 + 3, { cast: false });
  box(g, 8, 8, slW + 8, MAT.white, xWall + 3, doorH + 4, slZ, { cast: false });
  // fill the rest of the wall opening (z 95..215) that the door and sidelight don't cover
  box(g, 12, ROOM.H, 12, MAT.plaster, xWall + 6, ROOM.H / 2, 101, { cast: false });
  box(g, 12, ROOM.H - doorH - 8, 120, MAT.plaster, xWall + 6, doorH + 8 + (ROOM.H - doorH - 8) / 2, 155, { cast: false });

  // doormat
  box(g, 50, 1.2, 70, new THREE.MeshStandardMaterial({ color: 0x5c4a36, roughness: 1 }), xWall - 40, 0.6, doorZ, { cast: false });

  // ---- bench + coat hooks on the near wall (x=250 side, south of the opening) ----
  boxOnFloor(g, 36, 44, 110, MAT.darkWood, Hw.x0 + 24, 0, 150, { radius: 1 });
  box(g, 30, 6, 100, MAT.cushion2, Hw.x0 + 24, 47, 150, { radius: 2 });
  box(g, 3, 10, 110, MAT.darkWood, Hw.x0 + 8, 150, 150, { cast: false });
  for (const z of [110, 135, 160, 185]) cylinder(g, 1.2, 1.2, 8, MAT.brass, Hw.x0 + 12, 147, z, { rz: Math.PI / 2 });
  // a coat and a scarf hanging
  box(g, 10, 80, 40, new THREE.MeshStandardMaterial({ color: 0x3a3f52, roughness: 1 }), Hw.x0 + 18, 105, 135, { radius: 4 });
  box(g, 6, 60, 10, MAT.cushion, Hw.x0 + 18, 115, 185, { radius: 2 });

  // ---- staircase rising toward -z along the far wall ----
  const steps = 12, rise = 19, run = 26, width = 96;
  const sx = xWall - width / 2 - 2.5;   // stairs hug the x=400 wall, with a hair of clearance so the tread lips never z-fight it
  const z0 = 60;                   // first step front edge
  const stairGroup = new THREE.Group();
  for (let i = 0; i < steps; i++) {
    const z = z0 - i * run - run / 2;
    const y = i * rise;
    box(stairGroup, width, rise, run, MAT.walnut, sx, y + rise / 2, z, { cast: false });
    box(stairGroup, width + 2, 3, run + 3, MAT.paleWood, sx, y + rise + 1.5, z - 1.5, { cast: false }); // tread lip
  }
  // closed stringer / wall side: a wedge drawn as stacked boxes under the stairs
  const totalRun = steps * run, totalRise = steps * rise;
  const under = new THREE.Mesh(new THREE.BoxGeometry(width, 1, 1), MAT.plaster);
  under.visible = false; stairGroup.add(under);
  // riser wall under the open side (x toward the hall): sits just outside the step faces, never coplanar with them
  for (let i = 0; i < steps; i++) {
    const z = z0 - i * run - run / 2;
    box(stairGroup, 2, i * rise + rise - 0.5, run + 0.4, MAT.white, sx - width / 2 - 1, (i * rise + rise - 0.5) / 2, z, { cast: false });
  }
  // newel post, balusters, handrail on the open side
  const railX = sx - width / 2 + 4;
  boxOnFloor(stairGroup, 10, 105, 10, MAT.darkWood, railX, 0, z0 + 6);
  box(stairGroup, 12, 4, 12, MAT.darkWood, railX, 107, z0 + 6);
  for (let i = 0; i < steps; i++) {
    const z = z0 - i * run - run / 2;
    const y = i * rise + rise;
    cylinder(stairGroup, 1.4, 1.4, 86, MAT.white, railX, y + 43, z, { segments: 8, cast: false });
  }
  const railLen = Math.hypot(totalRun, totalRise);
  const rail = box(stairGroup, 6, 6, railLen, MAT.darkWood, railX, totalRise / 2 + 92, z0 - totalRun / 2, { cast: false });
  rail.rotation.x = Math.atan2(totalRise, totalRun);
  // landing at the top + upstairs darkness
  box(stairGroup, width, 4, 40, MAT.walnut, sx, totalRise + 2, z0 - totalRun - 20, { cast: false });
  box(stairGroup, width + 20, ROOM.H - totalRise - 10, 2, MAT.soot, sx, totalRise + (ROOM.H - totalRise - 10) / 2, z0 - totalRun - 40, { cast: false });
  g.add(stairGroup);

  // ceiling light for the hall (small flush dome)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(12, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.lampShade);
  dome.position.set(325, ROOM.H - 1, 0); dome.rotation.x = Math.PI; g.add(dome);

  picture(g, 40, 55, Hw.x0 + 8, 165, 20, 'e', 0x6f5a7a, MAT.darkWood);
  // small console table with a bowl for keys
  boxOnFloor(g, 30, 80, 70, MAT.darkWood, Hw.x0 + 22, 0, -170);
  cylinder(g, 7, 5, 3, MAT.brass, Hw.x0 + 22, 81.5, -170);

  scene.add(g);
  return g;
}
