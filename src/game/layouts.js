import { CONFIG, currentMode } from '../config.js';

/**
 * Starting arrangement of the tower: layout[layer][slot] = { offset, length }.
 * offset = how far the block is pre-pushed along its own long axis (cm); length = block length (cm).
 * Classic Jenga is all zeros. "56 Leonard" pre-cantilevers blocks to echo the Tribeca tower:
 * a tight shaft with small balconies, cantilevers that grow with height, and a crown of big offset boxes.
 *
 * Stability rules baked in (support span of the perpendicular layer below is ±3.8 cm):
 *  - the middle block of every layer stays home, so it always carries all three blocks above it
 *  - no block's centre is pushed past 3.0 cm (2.2 in the top two layers, which nothing pins down),
 *    so its weight stays over the layer below with margin to spare
 */
export function buildLayout(rng) {
  const n = CONFIG.layers;
  const L = CONFIG.block.length;
  const out = [];
  const home = () => [0, 1, 2].map(() => ({ offset: 0, length: L }));

  if (currentMode().key !== 'leonard') {
    for (let i = 0; i < n; i++) out.push(home());
    return out;
  }

  let lastSide = 1;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const row = home();
    row[1].offset = (rng() - 0.5) * 0.3;
    const edge = rng() < 0.5 ? 0 : 2;
    const other = 2 - edge;
    const side = rng() < 0.7 ? -lastSide : lastSide;
    lastSide = side;

    if (f < 0.5) {
      // shaft: little balconies poking out on alternating sides
      if (rng() < 0.75) row[edge].offset = side * (0.5 + rng() * 0.6);
      if (rng() < 0.3) row[other].offset = -side * (0.3 + rng() * 0.4);
    } else if (f < 0.8) {
      // cantilevers that get bolder with height
      const grow = (f - 0.5) / 0.3;
      row[edge].offset = side * (1.2 + rng() * 0.8 + grow * 1.0);
      if (rng() < 0.6) row[other].offset = -side * (0.7 + rng() * 0.8 * grow);
      if (rng() < 0.4 * grow) row[edge].length = L + 0.6 + rng() * 0.9;
    } else {
      // crown: big boxes hanging well out, some of them longer than a standard block
      const grow = (f - 0.8) / 0.2;
      row[edge].offset = side * (2.2 + rng() * 0.6 + grow * 0.5);
      row[other].offset = -side * (0.8 + rng() * 1.4);
      row[edge].length = L + 1.0 + rng() * 1.2 + grow * 0.6;
      if (rng() < 0.5) row[other].length = L + 0.4 + rng() * 0.9;
      if (rng() < 0.5) row[1].length = L + 0.4 + rng() * 0.6;
    }
    const cap = i >= n - 2 ? 2.2 : 3.0;
    for (const b of row) b.offset = Math.max(-cap, Math.min(cap, b.offset));
    out.push(row);
  }
  return out;
}
