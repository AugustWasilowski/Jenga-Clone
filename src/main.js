import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CONFIG, DEBUG, currentMode, setMode, nextMode } from './config.js';
import { Physics } from './game/physics.js';
import { Tower } from './game/tower.js';
import { Game } from './game/game.js';
import { Interaction } from './game/interaction.js';
import { buildScene } from './scene/index.js';
import { makeSkyEnv } from './scene/glass.js';
import { HUD } from './ui/hud.js';

const app = document.getElementById('app');

// ---- renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.render.maxPixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = CONFIG.render.shadows;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = CONFIG.render.exposure;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

// Safari: stop the page from pinch-zooming or showing callouts over the canvas.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
}
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (e.target === renderer.domElement) e.preventDefault(); }, { passive: false });

// ---- scene + camera ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a120c);
const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, 1, 2500);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.8;
controls.panSpeed = 0.6;
controls.screenSpacePanning = true;
controls.minDistance = CONFIG.camera.minDist;
controls.maxDistance = CONFIG.camera.maxDist;
controls.minPolarAngle = CONFIG.camera.minPolar;
controls.maxPolarAngle = CONFIG.camera.maxPolar;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

function homeCamera() {
  const h = CONFIG.camera.home;
  const dist = currentMode().homeDist || h.dist;
  const target = new THREE.Vector3(0, CONFIG.stageTop + CONFIG.layers * CONFIG.block.height * 0.45, 0);
  controls.target.copy(target);
  camera.position.set(
    target.x + dist * Math.sin(h.polar) * Math.sin(h.azimuth),
    target.y + dist * Math.cos(h.polar),
    target.z + dist * Math.sin(h.polar) * Math.cos(h.azimuth),
  );
  controls.update();
}
homeCamera();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- boot ----
async function boot() {
  const physics = await new Physics().init();
  const world = buildScene(scene, physics);
  const tower = new Tower(physics, scene, { env: makeSkyEnv(renderer) });
  const hud = new HUD();
  const game = new Game({ physics, tower, hud, camera, controls, world });
  const interaction = new Interaction({ renderer, camera, controls, tower, game, scene });
  game.newGame();
  hud.bind(game, {
    switchMode: () => {
      setMode(nextMode());
      game.newGame();
      homeCamera();
      hud.setModeLabel(currentMode().label);
    },
  });
  hud.setModeLabel(currentMode().label);
  if (DEBUG) {
    const { setupDebug } = await import('./ui/debug.js');
    setupDebug({ physics, tower, game, world, interaction, renderer });
  }

  document.getElementById('loading').classList.add('hidden');
  window.__jenga = { physics, tower, game, interaction, camera, controls, world, CONFIG };

  const timer = new THREE.Timer();
  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.1);
    const t = timer.getElapsed();
    physics.update(dt, (h) => {
      interaction.preStep(h);
      game.preStep(h);
    });
    physics.syncMeshes();
    game.update(dt);
    interaction.update(dt);
    world.update(t, dt);
    controls.update();
    if (game.shake > 0) {
      const s = game.shake;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
      game.shake = Math.max(0, s - dt * 4);
    }
    renderer.render(scene, camera);
  });
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById('loading');
  el.textContent = 'Failed to start: ' + (err?.message || err);
});

export { homeCamera };
