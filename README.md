# Fantasy World

Interactive 3D fantasy valley built with Three.js + Vite.

```bash
npm install
npm run dev
```

Controls: WASD move · mouse look · Shift run · Space jump · F fly (Space/C up/down).

## Your own assets
Drop `.glb` files in `public/models/` and list them in `public/models/manifest.json`:

```json
[{ "file": "castle.glb", "position": [40, -20], "scale": 1, "rotationY": 0 }]
```

Y snaps to the terrain unless `"y"` is set.
