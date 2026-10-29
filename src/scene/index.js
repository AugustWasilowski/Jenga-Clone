import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MAT } from './materials.js';
import { buildRoom } from './room.js';
import { buildFurniture } from './furniture.js';
import { buildFireplace } from './fireplace.js';
import { buildDining } from './dining.js';
import { buildHallway } from './hallway.js';
import { buildLights } from './lights.js';

/**
 * Builds the living room and the static physics colliders the game needs
 * (floor, coffee table top, jenga stage). Returns { update(t, dt) }.
 */
export function buildScene(scene, physics) {
  const updaters = [];
  const ctx = { scene, physics, updaters, MAT };

  buildRoom(ctx);
  buildFurniture(ctx);
  buildFireplace(ctx);
  buildDining(ctx);
  buildHallway(ctx);
  buildLights(ctx);

  // ---- physics statics ----
  const S = CONFIG.stageSize;
  physics.addStaticBox('floor', 0, -5, 0, 2000, 10, 2000, 0.8);
  physics.addStaticBox('stage', 0, CONFIG.stageTop - 1, 0, S, 2, S, CONFIG.physics.tableFriction);
  // coffee table top (the stage sits on it). Dimensions must match furniture.js.
  physics.addStaticBox('table', 0, 45 - 2, 0, 110, 4, 60, 0.6);

  return {
    update(t, dt) { for (const u of updaters) u(t, dt); },
  };
}
