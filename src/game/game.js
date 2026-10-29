import * as THREE from 'three';
import { CONFIG } from '../config.js';

const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

/**
 * Game state: rules, extraction → hover → placement, fall detection, score.
 * states: 'playing' | 'placing' | 'fallen'
 */
export class Game {
  constructor({ physics, tower, hud, camera, controls, world }) {
    this.physics = physics;
    this.tower = tower;
    this.hud = hud;
    this.camera = camera;
    this.controls = controls;
    this.world = world;
    this.R = physics.RAPIER;

    this.state = 'playing';
    this.moves = 0;
    this.best = this.loadBest();
    this.grabbed = null;       // block currently held (owned by Interaction)
    this.hoverBlock = null;    // block pulled free, waiting for a slot
    this.ghosts = [];
    this.tweens = [];
    this.shake = 0;
    this.fallTimer = 0;
    this.releaseTimer = 0;
    this.assistActive = false;
    this.fallReason = '';

    this.ghostGeo = new THREE.BoxGeometry(CONFIG.block.length, CONFIG.block.height, CONFIG.block.width);
    this.ghostMat = new THREE.MeshStandardMaterial({ color: 0x7ee08a, transparent: true, opacity: 0.28, emissive: 0x2d8a3a, emissiveIntensity: 0.5, depthWrite: false });
    this.ghostHotMat = this.ghostMat.clone(); this.ghostHotMat.opacity = 0.6;

    physics.onContact((h1, h2, started) => this.onContact(h1, h2, started));
  }

  loadBest() { try { return Number(localStorage.getItem('jenga.best') || 0); } catch { return 0; } }
  saveBest() { try { localStorage.setItem('jenga.best', String(this.best)); } catch { /* private mode */ } }

  newGame() {
    this.clearGhosts();
    this.tweens = [];
    this.grabbed = null; this.hoverBlock = null;
    this.moves = 0; this.shake = 0; this.fallTimer = 0; this.fallReason = '';
    this.tower.build();
    this.tower.settle();
    this.state = 'playing';
    this.hud?.hideBanner();
    this.hud?.update(this);
    this.hud?.hint('Drag a block along its length to pull it out. Drag empty space to orbit, pinch to zoom.');
  }

  // ---------- assists ----------
  setAssist(on) {
    if (on === this.assistActive) return;
    this.assistActive = on;
    const p = CONFIG.physics, a = CONFIG.assist;
    const k = on ? a.towerDamping : 1;
    for (const b of this.tower.blocks) {
      if (b === this.grabbed) continue;
      b.body.setLinearDamping(p.linearDamping * k);
      b.body.setAngularDamping(p.angularDamping * k);
    }
  }

  onGrab(block) {
    this.grabbed = block;
    this.releaseTimer = 0;
    this.setAssist(true);
    if (CONFIG.assist.gravityAssist > 0) {
      for (const b of this.tower.blocks) {
        if (b === block || b.state !== 'tower') continue;
        b.body.resetForces(false);
        b.body.addForce({ x: 0, y: CONFIG.physics.gravity * b.body.mass() * CONFIG.assist.gravityAssist, z: 0 }, false);
      }
    }
  }

  onRelease() {
    this.grabbed = null;
    this.releaseTimer = CONFIG.assist.releaseSettleTime;
    for (const b of this.tower.blocks) b.body.resetForces(false);
  }

  // ---------- extraction / placement ----------
  onExtracted(block, dir) {
    const R = this.R;
    this.grabbed = null;
    this.releaseTimer = CONFIG.assist.releaseSettleTime;
    this.tower.removeFromLayer(block);
    block.state = 'hover';
    this.hoverBlock = block;
    block.body.resetForces(false);
    block.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true);
    block.collider.setSensor(true); // carried by the player's hand: never shoves the tower
    const p0 = new THREE.Vector3().copy(block.body.translation());
    const q0 = new THREE.Quaternion().copy(block.body.rotation());
    const out = dir ? dir.clone() : new THREE.Vector3(1, 0, 0);
    const p1 = p0.clone().addScaledVector(out, 9);                 // clear of the tower face
    const top = this.hoverPoint();
    const p2 = new THREE.Vector3(p1.x, top.y, p1.z);               // up beside the tower
    const p3 = top;                                                // over the centre
    const path = [p0, p1, p2, p3];
    const lens = [p0.distanceTo(p1), p1.distanceTo(p2), p2.distanceTo(p3)];
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    this.state = 'placing';
    this.hud?.hint('Tap a green slot to place the block on top.');
    this.addTween({
      dur: 0.9, ease: easeInOut,
      step: (k) => {
        let d = k * total, i = 0;
        while (i < 2 && d > lens[i]) { d -= lens[i]; i++; }
        const p = path[i].clone().lerp(path[i + 1], lens[i] ? d / lens[i] : 1);
        block.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
        block.body.setNextKinematicRotation(q0);
      },
      done: () => this.showGhosts(),
    });
  }

  hoverPoint() {
    return new THREE.Vector3(0, this.tower.topY + 11, 0);
  }

  showGhosts() {
    this.clearGhosts();
    const { slots, layer, axis } = this.tower.openSlots();
    for (const s of slots) {
      const m = new THREE.Mesh(this.ghostGeo, this.ghostMat);
      m.position.copy(s.pos); m.quaternion.copy(s.quat);
      m.userData.slotInfo = { ...s, layer, axis };
      m.renderOrder = 5;
      this.tower.scene.add(m);
      this.ghosts.push(m);
    }
  }

  clearGhosts() {
    for (const g of this.ghosts) this.tower.scene.remove(g);
    this.ghosts = [];
  }

  setGhostHot(mesh) {
    for (const g of this.ghosts) g.material = g === mesh ? this.ghostHotMat : this.ghostMat;
  }

  pickSlot(ghost) {
    if (this.state !== 'placing' || !this.hoverBlock) return;
    const info = ghost.userData.slotInfo;
    const block = this.hoverBlock;
    this.clearGhosts();
    block.state = 'placing';
    const from = new THREE.Vector3().copy(block.body.translation());
    const fromQ = new THREE.Quaternion().copy(block.body.rotation());
    const to = info.pos.clone(); to.y += 0.15; // drop the last bit under gravity
    const toQ = info.quat.clone();
    this.addTween({
      dur: 0.45, ease: easeInOut,
      step: (k) => {
        const p = from.clone().lerp(to, k);
        const q = fromQ.clone().slerp(toQ, k);
        block.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
        block.body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      },
      done: () => {
        block.collider.setSensor(false);
        block.body.setBodyType(this.R.RigidBodyType.Dynamic, true);
        block.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        block.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        block.body.setGravityScale(1, true);
        block.body.lockRotations(false, true);
        block.body.setEnabledTranslations(true, true, true, true);
        block.rest.pos.copy(info.pos); block.rest.quat.copy(info.quat);
        this.tower.placeInLayer(block, info.layer, info.slot, info.axis);
        block.state = 'tower';
        this.hoverBlock = null;
        this.moves++;
        if (this.moves > this.best) { this.best = this.moves; this.saveBest(); }
        this.state = 'playing';
        this.hud?.update(this);
        this.hud?.hint(this.moves === 1 ? 'Nice. Keep going.' : '', true);
      },
    });
  }

  // ---------- fall detection ----------
  onContact(h1, h2, started) {
    if (!started || this.state === 'fallen') return;
    const names = this.physics.staticHandles;
    const n1 = names.get(h1), n2 = names.get(h2);
    if (!n1 && !n2) return;
    const other = n1 ? h2 : h1;
    const name = n1 || n2;
    const block = this.tower.blocks.find((b) => b.collider.handle === other);
    if (!block || block.state !== 'tower') return;
    if (name === 'floor' || name === 'table') this.topple('A block hit the ' + name);
    else if (name === 'stage' && block.layer > 0) this.topple('A block hit the stage');
  }

  checkFall() {
    const f = CONFIG.fall;
    const cosLimit = Math.cos((f.tiltDeg * Math.PI) / 180);
    for (const b of this.tower.blocks) {
      if (b.state !== 'tower' || b.body.isSleeping()) continue;
      const r = b.body.rotation();
      tmpQ.set(r.x, r.y, r.z, r.w);
      tmpV.copy(UP).applyQuaternion(tmpQ);
      if (tmpV.y < cosLimit) return this.topple('A block tipped over');
      const t = b.body.translation();
      const dx = t.x - b.rest.pos.x, dz = t.z - b.rest.pos.z, dy = t.y - b.rest.pos.y;
      if (dx * dx + dz * dz > f.horizontalDrift * f.horizontalDrift) return this.topple('The tower slid apart');
      if (dy < -f.verticalDrop) return this.topple('The tower collapsed');
    }
  }

  topple(reason) {
    if (this.state === 'fallen') return;
    this.state = 'fallen';
    this.fallReason = reason;
    this.fallTimer = CONFIG.fall.scatterSeconds;
    this.clearGhosts();
    this.tweens = [];
    this.setAssist(false);
    this.onInterruptGrab?.();
    if (this.hoverBlock) {
      const b = this.hoverBlock;
      b.collider.setSensor(false);
      b.body.setBodyType(this.R.RigidBodyType.Dynamic, true);
      b.state = 'loose';
      this.hoverBlock = null;
    }
    for (const b of this.tower.blocks) {
      b.body.resetForces(true);
      b.body.setGravityScale(1, true);
      b.body.lockRotations(false, true);
      b.body.setEnabledTranslations(true, true, true, true);
      b.body.wakeUp();
    }
    this.shake = 1.2;
    this.hud?.hint('', true);
  }

  // ---------- per-frame ----------
  preStep(h) {
    // Nothing per-step yet; forces are applied by Interaction. Kept for gravity assist extensions.
  }

  update(dt) {
    // tweens drive kinematic bodies
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.step(tw.ease ? tw.ease(k) : k);
      if (k >= 1) { this.tweens.splice(i, 1); tw.done?.(); }
    }
    // hover block idles above the tower
    if (this.state === 'placing' && this.hoverBlock && !this.tweens.length) {
      const hp = this.hoverPoint();
      const t = this.hoverBlock.body.translation();
      const bob = Math.sin(performance.now() * 0.003) * 0.6;
      this.hoverBlock.body.setNextKinematicTranslation({ x: t.x + (hp.x - t.x) * 0.1, y: t.y + (hp.y + bob - t.y) * 0.1, z: t.z + (hp.z - t.z) * 0.1 });
    }
    if (this.releaseTimer > 0 && !this.grabbed) {
      this.releaseTimer -= dt;
      if (this.releaseTimer <= 0) this.setAssist(false);
    }
    if (this.state === 'playing' || this.state === 'placing') this.checkFall();
    if (this.state === 'fallen' && this.fallTimer > 0) {
      this.fallTimer -= dt;
      if (this.fallTimer <= 0) {
        const n = this.moves;
        this.hud?.showBanner('Tower fell!', `${this.fallReason}. ${n} ${n === 1 ? 'move' : 'moves'} this round · best ${this.best}.`);
      }
    }
  }

  addTween(tw) { tw.t = 0; this.tweens.push(tw); }

  /** 0..1-ish lean measure for debug: horizontal offset of the top of the tower vs the base. */
  lean() {
    const top = this.tower.topIndex; if (top < 2) return 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(); let na = 0, nb = 0;
    for (const blk of this.tower.blocks) {
      if (blk.state !== 'tower') continue;
      const t = blk.body.translation();
      if (blk.layer <= 1) { a.x += t.x; a.z += t.z; na++; }
      if (blk.layer >= top - 1) { b.x += t.x; b.z += t.z; nb++; }
    }
    if (!na || !nb) return 0;
    a.divideScalar(na); b.divideScalar(nb);
    return Math.hypot(b.x - a.x, b.z - a.z);
  }
}

function easeInOut(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
