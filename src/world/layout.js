// Sky realm layout: a marble causeway over a sea of clouds, framed by two dragon
// pillars, climbing to a palace stacked up a mountain. Axis runs along -Z.
// Every walkable surface and solid is listed as a collider; there is no ground.

export const SPAWN = { x: 0, z: 6, y: 60 };       // high landing the player starts on
export const HERO = { pos: [0, 74, 30], look: [0, 50, -100] };   // title-screen camera (reference framing)
export const DECK = 30;                            // causeway walking height
export const CW = 16;                              // causeway inner width
export const VOID = -60;                           // fall below this -> respawn

export const PAD = { x0: -16, x1: 16, z0: -2, z1: 14, top: SPAWN.y };
export const STAIR1 = { w: CW, zHigh: -2, zLow: -62, yHigh: SPAWN.y, yLow: DECK };
export const CAUSEWAY = { zStart: -62, zEnd: -440 };
export const LANDINGS = [
  { z0: -190, z1: -150, hw: 24, censer: true },
  { z0: -360, z1: -330, hw: 18, lanterns: true },
];

// Dragon pillars: the first slots for hand-made hero assets.
export const PILLARS = [{ x: -85, z: -210 }, { x: 85, z: -210 }].map(p => ({
  ...p, base: -90, top: 78, r: 17, pavilion: { w: 36, floors: 3, colH: 11 },
}));

// Stacked palace levels (rising terraces), each reached by an axial stair.
export const LEVELS = [
  { top: 60, z0: -580, z1: -500, hw: 110, halls: [{ x: -58, z: -548, w: 64, d: 30, colH: 10 }, { x: 58, z: -548, w: 64, d: 30, colH: 10 }] },
  { top: 92, z0: -720, z1: -640, hw: 95, halls: [{ x: -52, z: -688, w: 56, d: 28, colH: 10 }, { x: 52, z: -688, w: 56, d: 28, colH: 10 }] },
  { top: 128, z0: -900, z1: -790, hw: 85, halls: [{ x: 0, z: -850, w: 120, d: 56, colH: 15, bays: 11, main: true }] },
];
export const PALACE_STAIRS = [
  { w: 20, zHigh: LEVELS[0].z1, zLow: CAUSEWAY.zEnd, yHigh: LEVELS[0].top, yLow: DECK },
  { w: 20, zHigh: LEVELS[1].z1, zLow: LEVELS[0].z0, yHigh: LEVELS[1].top, yLow: LEVELS[0].top },
  { w: 20, zHigh: LEVELS[2].z1, zLow: LEVELS[1].z0, yHigh: LEVELS[2].top, yLow: LEVELS[1].top },
];
export const PAGODA_SPIRES = [
  { x: -150, z: -560, top: 70, w: 16, floors: 5 }, { x: 150, z: -560, top: 70, w: 16, floors: 5 },
  { x: -135, z: -720, top: 105, w: 14, floors: 5 }, { x: 135, z: -720, top: 105, w: 14, floors: 5 },
  { x: -110, z: -400, top: 34, w: 12, floors: 4 }, { x: 110, z: -400, top: 34, w: 12, floors: 4 },
];
export const CLIFF = { z: -1000, top: 460 };
export const FALLS = [{ x: -60, w: 46 }, { x: 70, w: 30 }];

// ---------- colliders ----------
// top: walkable height. ramp: linear in z. bottom: ignored while below it.
export const colliders = [];
const box = (x0, x1, z0, z1, top, extra = {}) => colliders.push({ x0, x1, z0, z1, top, ...extra });
const ramp = (s) => box(-s.w / 2, s.w / 2, Math.min(s.zHigh, s.zLow), Math.max(s.zHigh, s.zLow), 0, { ramp: s });
const RAIL = 2.4;   // rail colliders: tall enough that a jump can't clear them
const railBox = (x0, x1, z0, z1, base) => box(x0, x1, z0, z1, base + RAIL + 2);

box(PAD.x0, PAD.x1, PAD.z0, PAD.z1, PAD.top);
ramp(STAIR1);
box(-CW / 2, CW / 2, CAUSEWAY.zEnd, CAUSEWAY.zStart, DECK);
for (const L of LANDINGS) {
  box(-L.hw, L.hw, L.z0, L.z1, DECK);
  if (L.censer) box(-3, 3, (L.z0 + L.z1) / 2 - 3, (L.z0 + L.z1) / 2 + 3, DECK + 8);
}
for (const L of LEVELS) {
  box(-L.hw, L.hw, L.z0, L.z1, L.top);
  for (const h of L.halls) box(h.x - h.w / 2 - 8, h.x + h.w / 2 + 8, h.z - h.d / 2 - 8, h.z + h.d / 2 + 8, L.top + 60, { id: h.main ? 'mainHall' : undefined });
}
PALACE_STAIRS.forEach(ramp);

// Rails along the pad sides/back, stair and causeway edges (gaps at landings).
railBox(PAD.x0 - 1, PAD.x0 + 0.5, PAD.z0, PAD.z1, PAD.top);
railBox(PAD.x1 - 0.5, PAD.x1 + 1, PAD.z0, PAD.z1, PAD.top);
railBox(PAD.x0, PAD.x1, PAD.z1 - 0.5, PAD.z1 + 1, PAD.top);
for (const s of [-1, 1]) {
  const e = s * CW / 2, x0 = Math.min(e, e + s * 1.2), x1 = Math.max(e, e + s * 1.2);
  box(x0, x1, STAIR1.zLow, STAIR1.zHigh, SPAWN.y + RAIL + 2);
  let z = CAUSEWAY.zStart;
  for (const L of LANDINGS) { railBox(x0, x1, L.z1, z, DECK); z = L.z0; }
  railBox(x0, x1, CAUSEWAY.zEnd, z, DECK);
  for (const L of LANDINGS) {
    railBox(s * L.hw - 1, s * L.hw + 1, L.z0, L.z1, DECK);
    for (const zz of [L.z0, L.z1]) railBox(Math.min(s * CW / 2, s * L.hw), Math.max(s * CW / 2, s * L.hw), zz - 1, zz + 1, DECK);
  }
  for (const [i, L] of LEVELS.entries()) {
    railBox(s * L.hw - 1.5, s * L.hw + 1.5, L.z0, L.z1, L.top);
    for (const [zz, open] of [[L.z1, true], [L.z0, i < LEVELS.length - 1]]) {
      const inner = open ? s * 11 : 0;
      railBox(Math.min(inner, s * L.hw), Math.max(inner, s * L.hw), zz - 1.5, zz + 1.5, L.top);
    }
  }
  for (const st of PALACE_STAIRS) box(s * st.w / 2 - 0.6, s * st.w / 2 + 0.6, st.zHigh, st.zLow, st.yHigh + RAIL + 2);
}

export const setColliderTop = (id, top) => { const c = colliders.find(c => c.id === id); if (c) c.top = top; };
