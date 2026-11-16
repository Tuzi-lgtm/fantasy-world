// Single source of truth for the palace complex. Terrain flattening, scatter
// exclusion, building placement and collision all read from here.
// Axis runs along Z; the complex faces +Z (south), the player spawns at +Z.
// Main hall: roughly the Hall of Supreme Harmony (~64 x 37 m, ~27 m tall) scaled ~2.5x.

export const G = 3;                       // courtyard paving level (water is at 0)
export const COURT = { x: 200, zMin: -340, zMax: 240 };   // inside the walls
export const APPROACH = { x: 70, zMin: 240, zMax: 450 };  // paved road to the gate
export const SPAWN = { x: 0, z: 420 };

export const WALL = { h: 14, t: 6 };

export const GATE = {
  z: 260, w: 220, d: 40, h: 28,
  tunnels: [{ x: 0, w: 16, h: 18 }, { x: -40, w: 12, h: 14 }, { x: 40, w: 12, h: 14 }],
  hall: { w: 120, d: 28, colH: 14, bays: 9 },
};

export const RIVER = {
  z: 170, w: 16, bed: -2.5, bridgeLen: 26, rise: 3,
  bridges: [{ x: 0, w: 10 }, { x: -26, w: 8 }, { x: 26, w: 8 }, { x: -50, w: 8 }, { x: 50, w: 8 }],
};

export const ARCH = { z: 60, center: 22, side: 14, pillar: 4, h: 30 };

export const TERRACE = { cx: 0, cz: -205, w: 280, d: 190, tiers: 3, tierH: 7, inset: 14 };
export const STAIR = { w: 26, run: 3 };   // run per unit of rise
export const HALL = { cz: -215, w: 160, d: 92, colH: 20, bays: 11 };   // height/width ~0.47, like the original
export const SIDE_HALLS = [-1, 1].flatMap(s => [-20, 110].map(z => ({ x: s * 150, z, w: 64, d: 34, colH: 12, bays: 7 })));

// ---------- derived ----------
export const terraceTop = G + TERRACE.tiers * TERRACE.tierH;
const tFront = TERRACE.cz + TERRACE.d / 2;                       // -110
export const stairTopZ = tFront - (TERRACE.tiers - 1) * TERRACE.inset;
export const stairLowZ = stairTopZ + (terraceTop - G) * STAIR.run;

// Distance outside the paved area (0 inside). Used for terrain flattening + scatter.
export function plazaDistance(x, z) {
  const rect = (hx, z0, z1) => Math.hypot(Math.max(Math.abs(x) - hx, 0), Math.max(z0 - z, z - z1, 0));
  return Math.min(rect(COURT.x + WALL.t + 10, COURT.zMin - WALL.t - 10, COURT.zMax), rect(APPROACH.x + 10, COURT.zMax, APPROACH.zMax));
}

// ---------- colliders ----------
// Axis-aligned boxes. top: walkable height. bottom: ignored while the player is
// below it (tunnel ceilings). ramp: linear height from z0->z1. priority: wins outright.
export const colliders = [];
const box = (x0, x1, z0, z1, top, extra = {}) => colliders.push({ x0, x1, z0, z1, top, ...extra });

// paving
box(-COURT.x, COURT.x, COURT.zMin, COURT.zMax, G);
box(-APPROACH.x, APPROACH.x, COURT.zMax, APPROACH.zMax, G);

// courtyard walls
const wt = WALL.t, wh = G + WALL.h;
box(-COURT.x - wt, -COURT.x, COURT.zMin - wt, GATE.z + 3, wh);
box(COURT.x, COURT.x + wt, COURT.zMin - wt, GATE.z + 3, wh);
box(-COURT.x - wt, COURT.x + wt, COURT.zMin - wt, COURT.zMin, wh);
box(-COURT.x - wt, -GATE.w / 2, GATE.z - 3, GATE.z + 3, wh);
box(GATE.w / 2, COURT.x + wt, GATE.z - 3, GATE.z + 3, wh);

// gate base: solid except tunnels; tunnel ceilings only count from above
{
  const z0 = GATE.z - GATE.d / 2, z1 = GATE.z + GATE.d / 2, top = G + GATE.h;
  const ts = [...GATE.tunnels].sort((a, b) => a.x - b.x);
  let x = -GATE.w / 2;
  for (const t of ts) {
    box(x, t.x - t.w / 2, z0, z1, top);
    box(t.x - t.w / 2, t.x + t.w / 2, z0, z1, top, { bottom: G + t.h });
    x = t.x + t.w / 2;
  }
  box(x, GATE.w / 2, z0, z1, top);
  const hw = GATE.hall.w / 2 + 6, hd = GATE.hall.d / 2 + 6;
  box(-hw, hw, GATE.z - hd, GATE.z + hd, top + 45, { bottom: top, id: 'gateHall' });
}

// river: blocked between bridges (bank balustrades), bridges are arched decks
{
  const z0 = RIVER.z - RIVER.w / 2 - 2, z1 = RIVER.z + RIVER.w / 2 + 2;
  const bs = [...RIVER.bridges].sort((a, b) => a.x - b.x);
  let x = -COURT.x;
  for (const b of bs) { box(x, b.x - b.w / 2, z0, z1, G + 12); x = b.x + b.w / 2; }
  box(x, COURT.x, z0, z1, G + 12);
  const L = RIVER.bridgeLen;
  for (const b of bs) box(b.x - b.w / 2, b.x + b.w / 2, RIVER.z - L / 2, RIVER.z + L / 2, 0,
    { priority: true, arch: { z0: RIVER.z - L / 2, len: L, rise: RIVER.rise } });
}

// paifang pillars
{
  const { center, side, pillar: p } = ARCH;
  for (const s of [-1, 1]) {
    const xi = s * (center / 2 + p / 2), xo = s * (center / 2 + p + side + p / 2);
    box(xi - p, xi + p, ARCH.z - p, ARCH.z + p, G + ARCH.h);
    box(xo - p, xo + p, ARCH.z - p, ARCH.z + p, G + ARCH.h);
  }
}

// terrace tiers + grand stair + hall
for (let k = 0; k < TERRACE.tiers; k++) {
  const hx = TERRACE.w / 2 - k * TERRACE.inset, hz = TERRACE.d / 2 - k * TERRACE.inset;
  box(-hx, hx, TERRACE.cz - hz, TERRACE.cz + hz, G + (k + 1) * TERRACE.tierH);
}
box(-STAIR.w / 2, STAIR.w / 2, stairTopZ, stairLowZ, 0, { ramp: { zHigh: stairTopZ, zLow: stairLowZ, yHigh: terraceTop, yLow: G } });
box(-HALL.w / 2 - 12, HALL.w / 2 + 12, HALL.cz - HALL.d / 2 - 12, HALL.cz + HALL.d / 2 + 12, terraceTop + 80, { id: 'hall' });
SIDE_HALLS.forEach((h, i) => box(h.x - h.w / 2 - 5, h.x + h.w / 2 + 5, h.z - h.d / 2 - 5, h.z + h.d / 2 + 5, G + 40, { id: 'side' + i }));
// Real roof heights are filled in by palace.js once the halls are built.
export const setColliderTop = (id, top) => { const c = colliders.find(c => c.id === id); if (c) c.top = top; };
