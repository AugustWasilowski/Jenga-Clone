# Jenga

A touch-first Jenga clone for iPad: Three.js for the cozy living room, Rapier (WASM) for the physics.
Everything is procedural, so the whole site is one HTML page plus a JS bundle. No assets to host.

## Play

- **Pull a block**: press on a block and drag along its length. Loose blocks slide out; load-bearing ones resist and drag the tower with them.
- **Place it**: once a block is pulled past the halfway point it lifts to the top. Tap one of the green ghost slots to drop it there.
- **Camera**: one finger / left-drag orbits, two fingers pinch to zoom and pan, mouse wheel zooms, right-drag pans.
- Darker blocks are the top layer and the one below it: off limits, per the standard rules.
- **Tower: 56 Leonard** button (or `?mode=leonard`) swaps the wooden tower for a 28-layer glass model of
  56 Leonard Street, the "Jenga building" in Tribeca. The choice is remembered on the device.
- Add `?debug` to the URL for a live tuning panel (jitter, friction, pull force, damping, fall thresholds).

## Develop

```bash
npm install
npm run dev        # http://localhost:5173, also served on the LAN for iPad testing
npm run build      # static site in dist/
npm run preview    # serve dist/ locally
```

Windows note: this machine's global npm config has `os=linux`, which makes npm install the Linux native
bindings for Vite. Install here with `npm run install:win` (it passes `--os=win32 --cpu=x64`).

## Deploy (Docker)

The image builds the site in a Node stage and serves `dist/` with nginx.

```bash
docker compose up -d --build
```

The site is then on port 8090 of the host (see `docker-compose.yml`). Point the Cloudflare tunnel at it.
`index.html` is served with `no-cache`; hashed files under `/assets/` are cached for a year.

## Layout of the code

```
src/main.js            renderer, camera, OrbitControls, boot, frame loop
src/config.js          every tunable in one object
src/game/physics.js    Rapier world, fixed step, static colliders, mesh sync
src/game/tower.js      jittered blocks, layers/slots, rest poses, open-slot bookkeeping
src/game/layouts.js    starting arrangement per mode (classic = all home; 56 Leonard = pre-cantilevered)
src/scene/glass.js     glass floor-slab block textures, UV atlas geometry, baked sky reflection map
src/game/interaction.js  pointer handling: grab, axis-constrained pull, orbit arbitration, ghost taps
src/game/game.js       rules, extraction → carry → placement, fall detection, score
src/scene/*.js         room shell, furniture, fireplace, dining room, hallway + stairs, lights, materials
src/config.js          also holds MODES (layer count, camera distance, hint per mode)
src/ui/hud.js          overlay; src/ui/debug.js the ?debug panel
```

## How the "will it topple" feel works

Real Jenga blocks are not identical, which is why some are loose and some are tight. Here every block gets a
tiny random height (±3.5%, about half a millimetre) and friction. In each layer of three the layer above rests
on the tallest block and tilts onto the second tallest, so one block per layer usually carries no load and
slides out easily, while the other two carry everything above them. The pull is a velocity servo along the
block's axis with a capped force (`pull.maxForceBlocks`), so a tight block barely moves and the tower leans
instead. While a block is held, the other blocks get extra damping (`assist.towerDamping`) so wobbles settle
rather than amplify. Contacts are stiffened (`physics.contactFrequency`) so a 54-block stack does not
compress under its own weight and swallow the jitter.

## 56 Leonard mode

The real building is 57 storeys of floor plates that shift and cantilever, so each Jenga block stands in
for two floors and no mesh is needed. `layouts.js` pre-pushes blocks along their own axis in a pattern
that follows the photo: small balconies through the lower half, cantilevers that grow with height, and a
crown of longer blocks hanging well out. Two rules keep it standing with the same physics as classic
mode: the middle block of every layer stays home so it always carries the layer above, and no block's
centre is pushed past 3 cm (2.2 cm in the top two layers), which keeps its weight over the ±3.8 cm support
of the layer below. Twelve rebuilds in a row settled with every block asleep and nothing tilted more than
4°. Blocks are rendered with an atlas texture (glass with mullions on the sides, white slab bands, matte
concrete terraces on top) and a small baked sky environment map so the glass reflects blue instead of the
living room. A pre-cantilevered block counts as pulled free only once it is a further 2 cm out from where
it started, so the game is not won by nudging the crown.
