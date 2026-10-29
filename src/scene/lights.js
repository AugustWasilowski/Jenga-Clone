import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { ROOM } from './room.js';

export function buildLights({ scene, updaters }) {
  // soft fill: warm from the ceiling, dark from the floor
  const hemi = new THREE.HemisphereLight(0xffe2c4, 0x2a1c12, 0.55);
  scene.add(hemi);

  // key light over the coffee table (the only shadow caster): a warm ceiling spot
  const key = new THREE.SpotLight(0xffd9b0, 38000, 500, 0.55, 0.55, 2);
  key.position.set(35, ROOM.H - 10, 70);
  key.target.position.set(0, CONFIG.stageTop, 0);
  key.castShadow = CONFIG.render.shadows;
  key.shadow.mapSize.set(CONFIG.render.shadowMapSize, CONFIG.render.shadowMapSize);
  key.shadow.camera.near = 120;
  key.shadow.camera.far = 420;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.6;
  key.shadow.radius = 3;
  scene.add(key, key.target);

  // lamps
  const tableLamp = new THREE.PointLight(0xffc27a, 9000, 350, 2);
  tableLamp.position.set(205, 95, -45);
  scene.add(tableLamp);

  const floorLamp = new THREE.PointLight(0xffc98a, 14000, 450, 2);
  floorLamp.position.set(140, 158, 190);
  scene.add(floorLamp);

  const pendant = new THREE.PointLight(0xffd3a0, 16000, 500, 2);
  pendant.position.set(-425, ROOM.H - 100, -52);
  scene.add(pendant);

  const hall = new THREE.PointLight(0xffe0bb, 9000, 400, 2);
  hall.position.set(325, ROOM.H - 16, 0);
  scene.add(hall);

  // cool moonlight through the window, very faint
  const moon = new THREE.DirectionalLight(0x8fa6d6, 0.25);
  moon.position.set(130, 220, 300);
  moon.target.position.set(0, 0, 0);
  scene.add(moon, moon.target);

  scene.fog = new THREE.Fog(0x1a120c, 420, 1500);

  updaters.push((t) => {
    // gentle breathing on the lamps so the room feels alive
    tableLamp.intensity = 9000 * (1 + Math.sin(t * 1.3) * 0.02);
  });

  return { key, hemi };
}
