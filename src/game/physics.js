import RAPIER from '@dimforge/rapier3d-compat';
import { CONFIG } from '../config.js';

// Wraps the Rapier world: init, fixed stepping, static colliders, body<->mesh sync.
export class Physics {
  constructor() {
    this.world = null;
    this.eventQueue = null;
    this.accumulator = 0;
    this.bodies = [];               // { body, mesh } pairs kept in sync
    this.staticHandles = new Map(); // collider handle -> name ('stage','table','floor')
    this.contactListeners = [];
    this.RAPIER = RAPIER;
  }

  async init() {
    await RAPIER.init();
    const p = CONFIG.physics;
    this.world = new RAPIER.World({ x: 0, y: p.gravity, z: 0 });
    this.world.lengthUnit = p.lengthUnit;
    this.applyTuning();
    this.eventQueue = new RAPIER.EventQueue(true);
    return this;
  }

  applyTuning() {
    const p = CONFIG.physics;
    this.world.timestep = p.timestep;
    const ip = this.world.integrationParameters;
    ip.numSolverIterations = p.solverIterations;
    ip.numInternalPgsIterations = p.internalPgsIterations;
    ip.normalizedAllowedLinearError = p.allowedLinearError;
    ip.normalizedPredictionDistance = p.predictionDistance;
    ip.contact_natural_frequency = p.contactFrequency;
  }

  /** Static box collider. sx/sy/sz are full extents. */
  addStaticBox(name, cx, cy, cz, sx, sy, sz, friction = CONFIG.physics.tableFriction, events = true) {
    const desc = RAPIER.ColliderDesc.cuboid(sx / 2, sy / 2, sz / 2)
      .setTranslation(cx, cy, cz)
      .setFriction(friction)
      .setRestitution(0.05);
    if (events) desc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const col = this.world.createCollider(desc);
    this.staticHandles.set(col.handle, name);
    return col;
  }

  track(body, mesh) {
    this.bodies.push({ body, mesh });
  }

  untrack(body) {
    const i = this.bodies.findIndex((b) => b.body === body);
    if (i >= 0) this.bodies.splice(i, 1);
  }

  /** Advance by dt seconds of wall time using a fixed step. onStep runs before each physics step. */
  update(dt, onStep) {
    const p = CONFIG.physics;
    this.accumulator = Math.min(this.accumulator + dt, p.timestep * p.maxStepsPerFrame);
    let steps = 0;
    while (this.accumulator >= p.timestep) {
      onStep?.(p.timestep);
      this.world.step(this.eventQueue);
      this.drainEvents();
      this.accumulator -= p.timestep;
      steps++;
    }
    return steps;
  }

  /** Step N times without rendering (used to settle the tower). */
  stepRaw(n) {
    for (let i = 0; i < n; i++) {
      this.world.step(this.eventQueue);
      this.drainEvents();
    }
  }

  onContact(fn) { this.contactListeners.push(fn); }

  drainEvents() {
    this.eventQueue.drainCollisionEvents((h1, h2, started) => {
      for (const fn of this.contactListeners) fn(h1, h2, started);
    });
  }

  syncMeshes() {
    for (const { body, mesh } of this.bodies) {
      const t = body.translation();
      const r = body.rotation();
      mesh.position.set(t.x, t.y, t.z);
      mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
}
