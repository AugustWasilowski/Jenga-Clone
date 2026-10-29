import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { makeBlockMaterial } from '../scene/materials.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * Builds and owns the 54 blocks.
 * block = { id, mesh, body, collider, layer, slot, axis ('x'|'z'), rest: {pos, quat}, size: {l,w,h},
 *           friction, state: 'tower'|'grabbed'|'hover'|'placing'|'loose' }
 */
export class Tower {
  constructor(physics, scene) {
    this.physics = physics;
    this.RAPIER = physics.RAPIER;
    this.scene = scene;
    this.blocks = [];
    this.layers = [];           // layers[i] = [block|null, block|null, block|null]
    this.group = new THREE.Group();
    this.group.name = 'tower';
    scene.add(this.group);
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.rng = Math.random;
  }

  get baseY() { return CONFIG.stageTop; }
  get center() { return new THREE.Vector3(0, this.baseY, 0); }

  build() {
    this.clear();
    const { length: L, width: W, height: H } = CONFIG.block;
    const J = CONFIG.jitter;
    let id = 0;
    for (let layer = 0; layer < CONFIG.layers; layer++) {
      const row = [null, null, null];
      const axis = layer % 2 === 0 ? 'x' : 'z';
      for (let slot = 0; slot < 3; slot++) {
        const h = H * (1 + (this.rng() * 2 - 1) * J.height);
        const w = W * (1 + (this.rng() * 2 - 1) * J.width);
        const friction = J.frictionMin + this.rng() * (J.frictionMax - J.frictionMin);
        const lateral = (slot - 1) * (W + J.sideGap) + (this.rng() * 2 - 1) * J.placeXZ;
        const along = (this.rng() * 2 - 1) * J.placeXZ;
        // Start each layer a hair above nominal so nothing begins interpenetrating; settle() closes the gaps.
        const y = this.baseY + layer * (H + 0.02) + H / 2 + 0.02;
        const pos = axis === 'x'
          ? new THREE.Vector3(along, y, lateral)
          : new THREE.Vector3(lateral, y, along);
        const quat = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, axis === 'x' ? 0 : Math.PI / 2);
        const block = this.createBlock(id++, { l: L, w, h }, friction, pos, quat);
        block.layer = layer; block.slot = slot; block.axis = axis;
        row[slot] = block;
        this.blocks.push(block);
      }
      this.layers.push(row);
    }
  }

  createBlock(id, size, friction, pos, quat) {
    const R = this.RAPIER;
    const mesh = new THREE.Mesh(this.geometry, makeBlockMaterial(id));
    mesh.scale.set(size.l, size.h, size.w);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.position.copy(pos); mesh.quaternion.copy(quat);
    this.group.add(mesh);

    const bodyDesc = R.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })
      .setLinearDamping(CONFIG.physics.linearDamping)
      .setAngularDamping(CONFIG.physics.angularDamping)
      .setCanSleep(true);
    const body = this.physics.world.createRigidBody(bodyDesc);
    const colDesc = R.ColliderDesc.cuboid(size.l / 2, size.h / 2, size.w / 2)
      .setFriction(friction)
      .setRestitution(0.02)
      .setDensity(1.0)
      .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
    const collider = this.physics.world.createCollider(colDesc, body);
    this.physics.track(body, mesh);

    const block = {
      id, mesh, body, collider, size, friction,
      layer: -1, slot: -1, axis: 'x',
      state: 'tower',
      rest: { pos: pos.clone(), quat: quat.clone() },
    };
    mesh.userData.block = block;
    return block;
  }

  /** Settle the freshly built tower, then record rest poses and put it to sleep. */
  settle() {
    const p = CONFIG.physics;
    for (const b of this.blocks) {
      b.body.setLinearDamping(p.settleDamping);
      b.body.setAngularDamping(p.settleDamping);
    }
    this.physics.stepRaw(Math.round(p.settleSeconds / p.timestep));
    for (const b of this.blocks) {
      b.body.setLinearDamping(p.linearDamping);
      b.body.setAngularDamping(p.angularDamping);
      b.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
      b.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
      this.recordRest(b);
      b.body.sleep();
    }
    this.physics.syncMeshes();
  }

  recordRest(b) {
    const t = b.body.translation(); const r = b.body.rotation();
    b.rest.pos.set(t.x, t.y, t.z);
    b.rest.quat.set(r.x, r.y, r.z, r.w);
  }

  /** Index of the highest layer containing at least one block. */
  get topIndex() {
    for (let i = this.layers.length - 1; i >= 0; i--) if (this.layers[i].some(Boolean)) return i;
    return -1;
  }

  isLayerComplete(i) { return !!this.layers[i] && this.layers[i].every(Boolean); }

  /** Standard rule: you may only take from below the highest completed layer. */
  isLegal(b) {
    if (b.state !== 'tower') return false;
    const top = this.topIndex;
    const highestComplete = this.isLayerComplete(top) ? top : top - 1;
    return b.layer < highestComplete;
  }

  removeFromLayer(b) {
    if (b.layer >= 0 && this.layers[b.layer]) this.layers[b.layer][b.slot] = null;
  }

  /** Where the next block goes: { layer, axis, slots: [{slot, pos, quat}] } for the open top slots. */
  openSlots() {
    const { height: H, width: W } = CONFIG.block;
    const top = this.topIndex;
    let layer;
    if (top >= 0 && !this.isLayerComplete(top)) layer = top;
    else layer = top + 1;
    const axis = layer % 2 === 0 ? 'x' : 'z';
    while (this.layers.length <= layer) this.layers.push([null, null, null]);
    const row = this.layers[layer];
    const y = this.layerTopY(layer - 1) + H / 2 + 0.03;
    const slots = [];
    for (let slot = 0; slot < 3; slot++) {
      if (row[slot]) continue;
      const lateral = (slot - 1) * (W + CONFIG.jitter.sideGap);
      const pos = axis === 'x' ? new THREE.Vector3(0, y, lateral) : new THREE.Vector3(lateral, y, 0);
      const quat = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, axis === 'x' ? 0 : Math.PI / 2);
      slots.push({ slot, pos, quat });
    }
    return { layer, axis, slots };
  }

  layerTopY(i) {
    if (i < 0) return this.baseY;
    const row = (this.layers[i] || []).filter(Boolean);
    if (!row.length) return this.layerTopY(i - 1);
    let maxY = -Infinity;
    for (const b of row) { const t = b.body.translation(); maxY = Math.max(maxY, t.y + b.size.h / 2); }
    return maxY;
  }

  /** Top of the tower in world y. */
  get topY() { return this.layerTopY(this.topIndex); }

  placeInLayer(b, layer, slot, axis) {
    b.layer = layer; b.slot = slot; b.axis = axis;
    this.layers[layer][slot] = b;
  }

  /** Centroid of all blocks still in the tower (camera target, lean measure). */
  centroid(target = new THREE.Vector3()) {
    let n = 0; target.set(0, 0, 0);
    for (const b of this.blocks) {
      if (b.state !== 'tower') continue;
      const t = b.body.translation(); target.x += t.x; target.y += t.y; target.z += t.z; n++;
    }
    if (n) target.divideScalar(n);
    return target;
  }

  clear() {
    for (const b of this.blocks) {
      this.physics.untrack(b.body);
      this.physics.world.removeRigidBody(b.body);
      this.group.remove(b.mesh);
      b.mesh.material.dispose?.();
    }
    this.blocks = [];
    this.layers = [];
  }
}
