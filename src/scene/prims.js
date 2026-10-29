import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Tiny helpers so the room builders read like a parts list.

const boxGeoCache = new Map();
function boxGeo(w, h, d, radius) {
  const key = `${w}|${h}|${d}|${radius || 0}`;
  let g = boxGeoCache.get(key);
  if (!g) {
    g = radius ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d);
    boxGeoCache.set(key, g);
  }
  return g;
}

/** Box with its centre at (x,y,z). opts: { ry, rx, rz, radius, cast, receive, name } */
export function box(parent, w, h, d, mat, x, y, z, opts = {}) {
  const m = new THREE.Mesh(boxGeo(w, h, d, opts.radius), mat);
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  if (opts.name) m.name = opts.name;
  parent.add(m);
  return m;
}

/** Box whose bottom sits at y (handy for furniture). */
export function boxOnFloor(parent, w, h, d, mat, x, y, z, opts = {}) {
  return box(parent, w, h, d, mat, x, y + h / 2, z, opts);
}

export function cylinder(parent, rTop, rBot, h, mat, x, y, z, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, opts.segments ?? 20, 1, opts.open ?? false), mat);
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  parent.add(m);
  return m;
}

export function plane(parent, w, h, mat, x, y, z, opts = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  if (opts.rx !== undefined) m.rotation.x = opts.rx;
  if (opts.ry !== undefined) m.rotation.y = opts.ry;
  if (opts.rz !== undefined) m.rotation.z = opts.rz;
  m.castShadow = opts.cast ?? false;
  m.receiveShadow = opts.receive ?? true;
  parent.add(m);
  return m;
}

/**
 * A wall segment running along X (axis='x') or Z (axis='z'), from a to b, with optional openings.
 * openings: [{ from, to, bottom = 0, top }] in the same axis coordinate.
 * `at` is the fixed coordinate of the wall plane, `thick` the thickness, `height` the room height.
 */
export function wall(parent, mat, { axis, at, a, b, height, thick = 12, openings = [], y0 = 0 }) {
  const segs = [];
  let cursor = a;
  const sorted = [...openings].sort((p, q) => p.from - q.from);
  for (const o of sorted) {
    if (o.from > cursor) segs.push({ from: cursor, to: o.from, bottom: y0, top: height });
    // header above the opening and sill below if any
    if (o.top < height) segs.push({ from: o.from, to: o.to, bottom: o.top, top: height });
    if ((o.bottom ?? 0) > y0) segs.push({ from: o.from, to: o.to, bottom: y0, top: o.bottom });
    cursor = o.to;
  }
  if (cursor < b) segs.push({ from: cursor, to: b, bottom: y0, top: height });
  const meshes = [];
  for (const s of segs) {
    const len = s.to - s.from, h = s.top - s.bottom;
    if (len <= 0 || h <= 0) continue;
    const mid = (s.from + s.to) / 2, ymid = (s.bottom + s.top) / 2;
    const m = axis === 'x'
      ? box(parent, len, h, thick, mat, mid, ymid, at, { cast: false })
      : box(parent, thick, h, len, mat, at, ymid, mid, { cast: false });
    meshes.push(m);
  }
  return meshes;
}

/** Simple framed picture: frame box + inner coloured canvas. facing: 'n'|'s'|'e'|'w' (wall normal). */
export function picture(parent, w, h, x, y, z, facing, color, frameMat) {
  const ry = { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[facing];
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.y = ry;
  box(g, w, h, 3, frameMat, 0, 0, 0, { cast: false });
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(w - 8, h - 8), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  inner.position.z = 1.6;
  g.add(inner);
  parent.add(g);
  return g;
}
