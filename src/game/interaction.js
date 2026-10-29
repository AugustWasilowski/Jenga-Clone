import * as THREE from 'three';
import { CONFIG } from '../config.js';

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const HILITE = new THREE.Color(0x4a2e10);
const LOCK_TINT = 0.78;

/**
 * Pointer handling for mouse + touch:
 *  - press on a legal block → grab; drag → the block is pulled along its long axis by a capped velocity servo
 *  - press elsewhere → OrbitControls (one finger orbit, two fingers pinch/pan, wheel zoom)
 *  - while placing: tap a ghost slot to drop the block there
 */
export class Interaction {
  constructor({ renderer, camera, controls, tower, game, scene }) {
    this.renderer = renderer; this.camera = camera; this.controls = controls;
    this.tower = tower; this.game = game; this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.grab = null;
    this.hovered = null;
    this.hotGhost = null;
    this.pointers = new Set();
    this.down = null; // { x, y, ghost }
    this.tintTimer = 0;
    this.pullForce = 0; // debug readout

    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => this.onDown(e), { capture: true });
    el.addEventListener('pointermove', (e) => this.onMove(e), { capture: true });
    el.addEventListener('pointerup', (e) => this.onUp(e), { capture: true });
    el.addEventListener('pointercancel', (e) => this.onUp(e), { capture: true });
    el.addEventListener('lostpointercapture', (e) => { if (this.grab && e.pointerId === this.grab.pointerId) this.endGrab(); });
    game.onInterruptGrab = () => this.endGrab();
  }

  setNDC(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
  }

  pickBlock() {
    const meshes = this.tower.blocks.filter((b) => b.state === 'tower').map((b) => b.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    return hit ? { block: hit.object.userData.block, point: hit.point } : null;
  }

  pickGhost() {
    if (!this.game.ghosts.length) return null;
    const hit = this.raycaster.intersectObjects(this.game.ghosts, false)[0];
    return hit ? hit.object : null;
  }

  // ---------- events ----------
  onDown(e) {
    this.pointers.add(e.pointerId);
    if (this.pointers.size > 1) {
      // second finger: hand everything to the camera
      if (this.grab) this.endGrab();
      this.down = null;
      return;
    }
    this.setNDC(e);
    this.down = { x: e.clientX, y: e.clientY, ghost: null };
    if (this.game.state === 'placing') {
      this.down.ghost = this.pickGhost();
      return; // camera may still orbit; a clean tap on a ghost places on pointerup
    }
    if (this.game.state !== 'playing') return;
    if (e.button !== undefined && e.button !== 0) return;
    const hit = this.pickBlock();
    if (hit && this.tower.isLegal(hit.block)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      try { this.renderer.domElement.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      this.startGrab(hit.block, hit.point, e.pointerId);
    }
  }

  onMove(e) {
    if (this.grab && e.pointerId === this.grab.pointerId) {
      e.stopImmediatePropagation();
      this.setNDC(e);
      const s = this.closestParamOnAxis();
      if (s !== null) this.grab.target = s - this.grab.s0;
      return;
    }
    if (e.pointerType === 'mouse' && this.pointers.size === 0) {
      this.setNDC(e);
      if (this.game.state === 'placing') {
        const g = this.pickGhost();
        if (g !== this.hotGhost) { this.hotGhost = g; this.game.setGhostHot(g); }
        this.setHover(null);
      } else if (this.game.state === 'playing') {
        const hit = this.pickBlock();
        this.setHover(hit && this.tower.isLegal(hit.block) ? hit.block : null);
      }
    }
  }

  onUp(e) {
    this.pointers.delete(e.pointerId);
    if (this.grab && e.pointerId === this.grab.pointerId) {
      e.stopImmediatePropagation();
      this.endGrab();
      return;
    }
    if (this.down && this.game.state === 'placing') {
      const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
      if (moved < 10) {
        this.setNDC(e);
        const g = this.pickGhost() || this.down.ghost;
        if (g) this.game.pickSlot(g);
      }
    }
    this.down = null;
  }

  // ---------- grab ----------
  startGrab(block, point, pointerId) {
    if (this.grab) this.endGrab();
    const body = block.body;
    const r = body.rotation(); tmpQ.set(r.x, r.y, r.z, r.w);
    const axis = tmpV.set(1, 0, 0).applyQuaternion(tmpQ);
    // snap to the nearest world axis so Rapier's per-axis translation locks line up with it
    const dir = Math.abs(axis.x) >= Math.abs(axis.z) ? new THREE.Vector3(Math.sign(axis.x) || 1, 0, 0) : new THREE.Vector3(0, 0, Math.sign(axis.z) || 1);
    const t = body.translation();
    this.grab = {
      block, pointerId, dir,
      start: new THREE.Vector3(t.x, t.y, t.z),
      s0: 0, target: 0,
    };
    const s = this.closestParamOnAxis();
    this.grab.s0 = s ?? 0;
    block.state = 'grabbed';
    body.wakeUp();
    body.setGravityScale(0, true);
    body.lockRotations(true, true);
    body.setEnabledTranslations(dir.x !== 0, false, dir.z !== 0, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.controls.enabled = false;
    this.setHover(null);
    block.mesh.material.emissive.copy(HILITE);
    this.game.onGrab(block);
  }

  endGrab() {
    const g = this.grab; if (!g) return;
    this.grab = null;
    this.controls.enabled = true;
    const b = g.block;
    b.mesh.material.emissive.setHex(0);
    if (b.state === 'grabbed') {
      b.state = 'tower';
      b.body.resetForces(true);
      b.body.setGravityScale(1, true);
      b.body.lockRotations(false, true);
      b.body.setEnabledTranslations(true, true, true, true);
      // the block's new resting spot (possibly sticking out) becomes its reference for drift checks
      this.tower.recordRest(b);
      this.game.onRelease();
    }
    this.pullForce = 0;
  }

  /** Parameter along the grab axis (from grab.start) of the point closest to the pointer ray. */
  closestParamOnAxis() {
    const g = this.grab; if (!g) return null;
    const d = g.dir, ro = this.raycaster.ray.origin, rd = this.raycaster.ray.direction;
    const w0 = tmpV2.copy(g.start).sub(ro);
    const b = d.dot(rd);
    const denom = 1 - b * b;
    if (denom < 0.02) return null; // looking straight down the axis: ignore
    const dd = d.dot(w0), e = rd.dot(w0);
    return (b * e - dd) / denom;
  }

  /** Runs before every physics step: velocity servo along the axis, capped force. */
  preStep(h) {
    const g = this.grab; if (!g) return;
    const P = CONFIG.pull;
    const body = g.block.body;
    const t = body.translation();
    tmpV.set(t.x - g.start.x, t.y - g.start.y, t.z - g.start.z);
    const along = tmpV.dot(g.dir);
    const target = THREE.MathUtils.clamp(g.target, along - P.leadDistance, along + P.leadDistance);
    const vDes = THREE.MathUtils.clamp((target - along) / 0.08, -P.speedCap, P.speedCap);
    const lv = body.linvel();
    const v = lv.x * g.dir.x + lv.y * g.dir.y + lv.z * g.dir.z;
    const m = body.mass();
    const maxF = P.maxForceBlocks * m * Math.abs(CONFIG.physics.gravity) * 0.45;
    const F = THREE.MathUtils.clamp((m * (vDes - v)) / Math.max(h, P.responseTime), -maxF, maxF);
    body.resetForces(true);
    body.addForce({ x: g.dir.x * F, y: 0, z: g.dir.z * F }, true);
    this.pullForce = F / maxF;

    // pulled far enough? the player would now grab the free end, so hand it to placement
    const c = this.tower.center;
    const offset = (t.x - c.x) * g.dir.x + (t.z - c.z) * g.dir.z;
    if (Math.abs(offset) > P.extractOffset) {
      const block = g.block;
      this.grab = null;
      this.controls.enabled = true;
      block.mesh.material.emissive.setHex(0);
      this.pullForce = 0;
      this.game.onExtracted(block, g.dir.clone().multiplyScalar(Math.sign(offset) || 1));
    }
  }

  // ---------- visuals ----------
  setHover(block) {
    if (block === this.hovered) return;
    if (this.hovered && this.hovered.state === 'tower') this.hovered.mesh.material.emissive.setHex(0);
    this.hovered = block;
    if (block) block.mesh.material.emissive.setHex(0x2a1a08);
    this.renderer.domElement.style.cursor = block ? 'grab' : '';
  }

  update(dt) {
    this.tintTimer -= dt;
    if (this.tintTimer <= 0) { this.tintTimer = 0.25; this.refreshTints(); }
  }

  /** Locked layers (top + the one below) are tinted darker so the rule is visible. */
  refreshTints() {
    for (const b of this.tower.blocks) {
      if (!b.baseColor) b.baseColor = b.mesh.material.color.clone();
      const legal = this.game.state === 'fallen' ? true : (b.state !== 'tower' || this.tower.isLegal(b));
      const k = legal ? 1 : LOCK_TINT;
      b.mesh.material.color.copy(b.baseColor).multiplyScalar(k);
    }
  }
}
