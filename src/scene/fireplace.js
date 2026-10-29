import * as THREE from 'three';
import { box, boxOnFloor, cylinder, picture } from './prims.js';
import { MAT } from './materials.js';
import { ROOM } from './room.js';

const flameVert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const flameFrag = /* glsl */`
  uniform float uTime; uniform float uSeed;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a*noise(p); p *= 2.03; a *= 0.5; } return v; }
  void main() {
    vec2 uv = vUv;
    float n = fbm(vec2(uv.x * 3.0 + uSeed, uv.y * 3.5 - uTime * 1.7 + uSeed));
    float n2 = fbm(vec2(uv.x * 6.0 - uSeed, uv.y * 7.0 - uTime * 2.6));
    float y = uv.y + (n - 0.5) * 0.9 + (n2 - 0.5) * 0.25;
    float body = 1.0 - smoothstep(0.05, 1.0, y);
    float edge = 1.0 - pow(abs(uv.x - 0.5) * 2.0, 1.6);
    edge = smoothstep(0.0, 1.0, edge - uv.y * 0.75);
    float a = clamp(body * edge, 0.0, 1.0);
    a = smoothstep(0.08, 0.85, a);
    vec3 col = mix(vec3(1.0, 0.22, 0.02), vec3(1.0, 0.82, 0.35), pow(a, 1.8));
    col = mix(col, vec3(1.0, 0.95, 0.75), pow(a, 6.0) * 0.6);
    gl_FragColor = vec4(col * a * 1.5, a);
  }
`;

export function buildFireplace({ scene, updaters }) {
  const g = new THREE.Group(); g.name = 'fireplace';
  const zWall = ROOM.living.z0;       // -225
  const W = 180, H = 130, D = 45;     // surround
  const fbW = 90, fbH = 70, fbD = 40; // firebox opening

  // brick surround with the firebox cut out (left pillar, right pillar, header)
  const B = MAT.brick; B.map.repeat.set(2, 2);
  const pillarW = (W - fbW) / 2;
  boxOnFloor(g, pillarW, H, D, B, -fbW / 2 - pillarW / 2, 0, zWall + D / 2);
  boxOnFloor(g, pillarW, H, D, B, fbW / 2 + pillarW / 2, 0, zWall + D / 2);
  box(g, fbW, H - fbH, D, B, 0, fbH + (H - fbH) / 2, zWall + D / 2);
  // chimney breast up to the ceiling
  boxOnFloor(g, W, ROOM.H - H, 30, B, 0, H, zWall + 15, { cast: false });
  // firebox interior
  box(g, fbW, fbH, 2, MAT.soot, 0, fbH / 2, zWall + 1, { cast: false });
  box(g, 2, fbH, fbD, MAT.soot, -fbW / 2 + 1, fbH / 2, zWall + fbD / 2, { cast: false });
  box(g, 2, fbH, fbD, MAT.soot, fbW / 2 - 1, fbH / 2, zWall + fbD / 2, { cast: false });
  box(g, fbW, 2, fbD, MAT.soot, 0, fbH - 1, zWall + fbD / 2, { cast: false });
  box(g, fbW, 1.5, fbD, MAT.soot, 0, 0.75, zWall + fbD / 2, { cast: false });
  // hearth stone + mantel
  box(g, W + 30, 4, 70, MAT.stone, 0, 2, zWall + D + 20, { cast: false });
  box(g, W + 20, 8, D + 14, MAT.walnut, 0, H + 4, zWall + (D + 14) / 2, { radius: 1 });
  // grate + logs + embers
  for (let i = -3; i <= 3; i++) box(g, 2, 8, fbD - 10, MAT.metal, i * 11, 5, zWall + fbD / 2);
  const logs = [[-14, 12, 0.35], [10, 12, -0.3], [-2, 20, 0.1]];
  for (const [x, y, ry] of logs) cylinder(g, 5.5, 5.5, 38, MAT.darkWood, x, y, zWall + fbD / 2, { rz: Math.PI / 2, ry });
  box(g, 50, 6, 24, MAT.ember, 0, 11, zWall + fbD / 2, { radius: 2, cast: false });

  // flames: crossed planes with the noise shader
  const flameMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSeed: { value: 0 } },
    vertexShader: flameVert, fragmentShader: flameFrag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const flames = [];
  const layout = [[-16, 0, 0.3, 36], [0, 0, 1.2, 46], [14, 0, 2.1, 40], [-6, 6, 0.7, 42], [8, -5, 1.7, 38], [-12, -6, 2.6, 30], [18, 5, 0.1, 28]];
  for (const [x, dz, ry, h] of layout) {
    const m = flameMat.clone();
    m.uniforms.uSeed.value = Math.random() * 10;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(26, h), m);
    f.position.set(x, 12 + h / 2, zWall + fbD / 2 + dz);
    f.rotation.y = ry;
    f.renderOrder = 10;
    g.add(f); flames.push(f);
  }

  // fire light: warm, flickering
  const light = new THREE.PointLight(0xff7a22, 24000, 700, 2);
  light.position.set(0, 40, zWall + fbD / 2 + 10);
  g.add(light);
  const glow = new THREE.PointLight(0xff5a10, 6000, 160, 2);
  glow.position.set(0, 18, zWall + fbD / 2);
  g.add(glow);

  // mantel dressing: candles, clock, a picture above
  for (const x of [-60, -48, 55]) {
    cylinder(g, 1.8, 1.8, 14, MAT.white, x, H + 8 + 7, zWall + 22);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd080 }));
    flame.position.set(x, H + 8 + 15.5, zWall + 22); g.add(flame);
  }
  cylinder(g, 9, 9, 4, MAT.brass, 8, H + 8 + 9, zWall + 22, { rx: Math.PI / 2 });
  const face = new THREE.Mesh(new THREE.CircleGeometry(7.5, 24), MAT.white); face.position.set(8, H + 17, zWall + 24.2); g.add(face);
  picture(g, 90, 60, 0, H + 70, zWall + 31, 'n', 0x3b4f6b, MAT.brass);

  updaters.push((t) => {
    for (const f of flames) f.material.uniforms.uTime.value = t;
    const n = Math.sin(t * 9.3) * 0.5 + Math.sin(t * 23.7) * 0.3 + Math.sin(t * 3.1) * 0.2;
    light.intensity = 24000 * (0.86 + n * 0.14);
    glow.intensity = 6000 * (0.8 + n * 0.25);
  });

  scene.add(g);
  return g;
}
