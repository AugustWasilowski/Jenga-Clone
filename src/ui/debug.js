import GUI from 'lil-gui';
import { CONFIG } from '../config.js';

export function setupDebug({ physics, tower, game, world, interaction, renderer }) {
  const gui = new GUI({ title: 'Jenga tuning' });
  const rebuild = () => game.newGame();

  const fj = gui.addFolder('Block jitter (rebuilds)');
  fj.add(CONFIG.jitter, 'height', 0, 0.06, 0.001).onFinishChange(rebuild);
  fj.add(CONFIG.jitter, 'width', 0, 0.02, 0.001).onFinishChange(rebuild);
  fj.add(CONFIG.jitter, 'frictionMin', 0.1, 0.9, 0.01).onFinishChange(rebuild);
  fj.add(CONFIG.jitter, 'frictionMax', 0.1, 0.9, 0.01).onFinishChange(rebuild);

  const fp = gui.addFolder('Physics');
  fp.add(CONFIG.physics, 'solverIterations', 1, 20, 1).onChange(() => physics.applyTuning());
  fp.add(CONFIG.physics, 'internalPgsIterations', 1, 8, 1).onChange(() => physics.applyTuning());
  fp.add(CONFIG.physics, 'allowedLinearError', 0.00002, 0.002, 0.00002).onChange(() => physics.applyTuning());
  fp.add(CONFIG.physics, 'predictionDistance', 0.0001, 0.004, 0.0001).onChange(() => physics.applyTuning());
  fp.add(CONFIG.physics, 'contactFrequency', 20, 400, 5).onChange(() => physics.applyTuning());
  fp.add(CONFIG.physics, 'linearDamping', 0, 3, 0.05);
  fp.add(CONFIG.physics, 'angularDamping', 0, 3, 0.05);

  const fpull = gui.addFolder('Pull');
  fpull.add(CONFIG.pull, 'maxForceBlocks', 0.5, 30, 0.5);
  fpull.add(CONFIG.pull, 'leadDistance', 0.5, 6, 0.1);
  fpull.add(CONFIG.pull, 'speedCap', 2, 60, 1);
  fpull.add(CONFIG.pull, 'responseTime', 0.01, 0.3, 0.01);
  fpull.add(CONFIG.pull, 'extractOffset', 2, 5, 0.1);

  const fa = gui.addFolder('Assists');
  fa.add(CONFIG.assist, 'towerDamping', 1, 10, 0.1);
  fa.add(CONFIG.assist, 'releaseSettleTime', 0, 3, 0.1);
  fa.add(CONFIG.assist, 'gravityAssist', 0, 1, 0.05);

  const ff = gui.addFolder('Fall detection');
  ff.add(CONFIG.fall, 'tiltDeg', 5, 60, 1);
  ff.add(CONFIG.fall, 'horizontalDrift', 1, 15, 0.5);
  ff.add(CONFIG.fall, 'verticalDrop', 0.5, 10, 0.5);

  const fr = gui.addFolder('Render');
  fr.add(CONFIG.render, 'exposure', 0.3, 2.5, 0.05).onChange((v) => { renderer.toneMappingExposure = v; });
  fr.add(renderer.shadowMap, 'enabled').name('shadows');

  const stats = { fps: 0, lean: 0, pull: 0, awake: 0, state: '' };
  const fs = gui.addFolder('Live');
  const c1 = fs.add(stats, 'fps').listen().disable();
  const c2 = fs.add(stats, 'lean').listen().disable();
  const c3 = fs.add(stats, 'pull').listen().disable();
  const c4 = fs.add(stats, 'awake').listen().disable();
  const c5 = fs.add(stats, 'state').listen().disable();
  gui.add({ rebuild }, 'rebuild').name('Rebuild tower');
  gui.add({ topple: () => game.topple('Debug topple') }, 'topple').name('Force topple');

  let frames = 0, last = performance.now();
  function tick() {
    frames++;
    const now = performance.now();
    if (now - last > 500) {
      stats.fps = Math.round((frames * 1000) / (now - last));
      frames = 0; last = now;
      stats.lean = +game.lean().toFixed(2);
      stats.pull = +interaction.pullForce.toFixed(2);
      stats.awake = tower.blocks.filter((b) => !b.body.isSleeping()).length;
      stats.state = game.state;
    }
    requestAnimationFrame(tick);
  }
  tick();
  return gui;
}
