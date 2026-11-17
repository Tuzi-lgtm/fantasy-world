// Sky realm layout: a marble causeway over a sea of clouds, framed by two dragon
// pillars, running to a palace stacked up a mountain. Axis runs along -Z.
// Every walkable surface and solid is listed as a collider; there is no ground.
//
// Positions and sizes are solved from the reference frame: each landmark's pixel
// position was unprojected through the HERO camera (45 deg lens, pitched 9.3 deg down).
// The concept's scale is not self-consistent, so the frame wins: a human-scale lookout
// and balustrades in the foreground, mega-scale causeway, pillars and palace beyond.
export const DECK = 60;                            // causeway walking height
export const PAD_TOP = 108;                        // lookout terrace
export const SPAWN = { x: 0, z: 10, y: PAD_TOP };
export const HERO = { pos: [0, 120, 29], look: [0, 103.62, -71] };   // title-screen camera (reference framing)
export const VOID = -30;                           // fall below this -> respawn

// Lookout: splayed plan, [z, half-width], narrowing to the neck at the stair top.
export const PAD = { top: PAD_TOP, plan: [[30, 7.2], [16, 7.2], [9.6, 6.15], [7.3, 5.5], [0, 2.75]] };
// Grand stair: fans out as it drops to the causeway.
export const STAIR1 = { zHigh: 0, zLow: -146, yHigh: PAD_TOP, yLow: DECK, hwHigh: 2.75, hwLow: 13.75 };
export const PLATFORM = { z0: -181, z1: -146, hw: 29.5, lowerHw: 34.5, lowerDrop: 7 };   // censer terrace
export const CW3 = 15.5, LANE = 10.5;              // half-widths: three-lane causeway, single lane
export const LANDING2 = { z0: -402, z1: -377, hw: 21 };
export const TERRACE_B = { z0: -600, hw: 27, drop: 6 };   // low side terraces past the second landing
export const CAUSEWAY = { zEnd: -1280 };

// Dragon pillars: the first slots for hand-made hero assets.
export const PILLARS = [{ x: -183, z: -441 }, { x: 186, z: -441 }].map(p => ({
  ...p, base: -160, top: 150, r: 37, pavilion: { w: 78, floors: 3, colH: 31 },
}));

// Palace depth layers, numbered as in the annotated reference (1 nearest):
// 1 pedestal pagodas flanking the causeway   2 low gate hall + outer pavilions
// 3 tower pairs on spires                    4 wide front hall + a side hall each side
// 5 very wide four-storey block + corner towers   6 top hall, highest and furthest back
export const LEVELS = [
  { layer: 2, top: DECK, z0: -1322, z1: -1280, hw: 112 },
  { layer: 4, top: 78, z0: -1480, z1: -1352, hw: 245 },
  { layer: 5, top: 111, z0: -1665, z1: -1524, hw: 262 },
  { layer: 6, top: 195, z0: -1890, z1: -1775, hw: 256 },
];
// kind: hall (grandHall) | block (tieredBlock). Sizes are body sizes; eaves add `over`.
export const HALLS = [
  { level: 0, kind: 'hall', x: 0, z: -1300, w: 200, d: 18, colH: 10, bays: 11, over: 5, roofH: 6, plinth: 0.6, apron: 2, passage: 21, plaque: false },
  { level: 1, kind: 'hall', x: 0, z: -1420, w: 190, d: 70, colH: 35, bays: 9, over: 12, roofH: 25, R: 58, plinth: 3, band: 10, passage: 21.1 },
  ...[-1, 1].map(s => ({ level: 1, kind: 'hall', x: s * 168, z: -1440, w: 96, d: 44, colH: 30, bays: 5, over: 11, roofH: 14, plinth: 3, band: 9 })),
  { level: 2, kind: 'block', x: 0, z: -1597, w: 424, d: 90, floors: 4, pitch: 23.7, over: 12, topH: 14 },
  { level: 3, kind: 'hall', x: 0, z: -1830, w: 437, d: 84, colH: 32, bays: 13, over: 14, plinth: 4, band: 9.6, lift: 19, main: true,
    skirt: { R: 69, t1: 0.45, H: 54 }, upper: { wall: 16, over: 11, R: 70, H: 50, lift: 12 } },
];
export const PALACE_STAIRS = LEVELS.slice(1).map((L, i) => ({
  w: 30, zHigh: L.z1, zLow: LEVELS[i].z0, yHigh: L.top, yLow: LEVELS[i].top,
}));
// Layer 1: three-tier pagodas on tall white pedestals, beside the causeway (top = pedestal cap).
export const PEDESTAL_TOWERS = [
  { x: -104, z: -621, top: 62, apex: 94.3, w: 22, ped: 17 }, { x: 106, z: -621, top: 60, apex: 92.3, w: 22, ped: 17 },
];
// Layers 2-5: pavilions and pagodas on rock spires (top = rock height, apex = roof top).
export const FLANK_TOWERS = [
  { layer: 2, x: -295, z: -1221, top: 53, apex: 111, w: 40, floors: 3 },
  { layer: 2, x: 329, z: -1221, top: 44, apex: 105, w: 62, floors: 3 },
  { layer: 3, x: -286, z: -1371, top: 78, apex: 127, w: 44, floors: 3 },
  { layer: 3, x: 310, z: -1371, top: 95, apex: 127, w: 47, floors: 2 },
  { layer: 3, x: -225, z: -1318, top: 86, apex: 119, w: 26, floors: 2 },
  { layer: 5, x: -190, z: -1553, top: 111, apex: 187, w: 40, floors: 3, onLevel: true },
  { layer: 5, x: 190, z: -1553, top: 111, apex: 187, w: 40, floors: 3, onLevel: true },
];
export const PAGODA_SPIRES = [
  { layer: 5, x: -277, z: -1471, top: 109, apex: 170.5, w: 17, floors: 5 },
  { layer: 5, x: 275, z: -1471, top: 102, apex: 170.5, w: 17, floors: 5 },
];
// Narrow karst massif behind the palace with a broad veil of falls; flank crags.
export const CLIFF = { z: -2110, x0: -250, x1: 280, top: 860 };
export const FALLS = [{ x: -140, w: 95 }, { x: -42, w: 28 }, { x: 110, w: 185 }].map(f => ({ ...f, z: -1990, y0: 120, y1: 780 }));
export const CRAGS = [
  { x: 330, z: -1990, top: 660, r: 52 }, { x: 420, z: -2040, top: 590, r: 46 }, { x: -320, z: -1880, top: 410, r: 46 },
  { x: -283, z: -972, top: 193, r: 26 }, { x: 395, z: -1390, top: 186, r: 30 },
];

// ---------- colliders ----------
// top: walkable height. ramp: linear in z. bottom: ignored while below it.
// taper: half-width linear in z (splayed lookout, fan stair); `rail` adds a rail band outside it.
export const colliders = [];
const box = (x0, x1, z0, z1, top, extra = {}) => colliders.push({ x0, x1, z0, z1, top, ...extra });
const RAIL = 2.4;   // rail colliders: tall enough that a jump can't clear them
const railBox = (x0, x1, z0, z1, base) => box(Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1), base + RAIL + 2);
const taper = (zA, hwA, zB, hwB, top, extra = {}) => {
  const m = Math.max(hwA, hwB) + 1.4;
  box(-m, m, zB, zA, top, { taper: { z0: zB, hw0: hwB, z1: zA, hw1: hwA }, ...extra });
};
// Rails round a rectangle, leaving an opening of half-width `gap` on the +z / -z edge.
const railRect = (hw, z0, z1, top, { front = 0, back = 0 } = {}) => {
  for (const s of [-1, 1]) {
    railBox(s * hw - 0.6, s * hw + 0.6, z0, z1, top);
    if (front < hw) railBox(s * front, s * hw, z1 - 0.6, z1 + 0.6, top);
    if (back < hw) railBox(s * back, s * hw, z0 - 0.6, z0 + 0.6, top);
  }
};

for (let i = 0; i + 1 < PAD.plan.length; i++) taper(PAD.plan[i][0], PAD.plan[i][1], PAD.plan[i + 1][0], PAD.plan[i + 1][1], PAD.top);
railBox(-PAD.plan[0][1], PAD.plan[0][1], PAD.plan[0][0] - 0.5, PAD.plan[0][0] + 1, PAD.top);
taper(STAIR1.zHigh, STAIR1.hwHigh, STAIR1.zLow, STAIR1.hwLow, 0, { ramp: STAIR1 });
box(-PLATFORM.hw, PLATFORM.hw, PLATFORM.z0, PLATFORM.z1, DECK);
railRect(PLATFORM.hw, PLATFORM.z0, PLATFORM.z1, DECK, { front: STAIR1.hwLow, back: CW3 });
box(-3, 3, (PLATFORM.z0 + PLATFORM.z1) / 2 - 3, (PLATFORM.z0 + PLATFORM.z1) / 2 + 3, DECK + 8);   // censer
box(-CW3, CW3, LANDING2.z1, PLATFORM.z0, DECK);
for (const s of [-1, 1]) railBox(s * CW3, s * (CW3 + 1.2), LANDING2.z1, PLATFORM.z0, DECK);
box(-LANDING2.hw, LANDING2.hw, LANDING2.z0, LANDING2.z1, DECK);
railRect(LANDING2.hw, LANDING2.z0, LANDING2.z1, DECK, { front: CW3, back: LANE });
box(-2.5, 2.5, (LANDING2.z0 + LANDING2.z1) / 2 - 2.5, (LANDING2.z0 + LANDING2.z1) / 2 + 2.5, DECK + 6);
box(-LANE, LANE, CAUSEWAY.zEnd, LANDING2.z0, DECK);
for (const s of [-1, 1]) railBox(s * LANE, s * (LANE + 1.2), CAUSEWAY.zEnd, LANDING2.z0, DECK);

for (const [i, L] of LEVELS.entries()) {
  box(-L.hw, L.hw, L.z0, L.z1, L.top);
  railRect(L.hw, L.z0, L.z1, L.top, { front: i ? 15.6 : LANE, back: i < LEVELS.length - 1 ? 15.6 : 0 });
}
for (const h of HALLS) {
  const L = LEVELS[h.level], m = h.kind === 'block' ? 3 : 6;
  const x0 = h.x - h.w / 2 - m, x1 = h.x + h.w / 2 + m, z0 = h.z - h.d / 2 - m, z1 = h.z + h.d / 2 + m;
  if (h.passage) {   // walk-through centre bay
    const p = h.passage / 2 - 1;
    box(x0, h.x - p, z0, z1, L.top + 60); box(h.x + p, x1, z0, z1, L.top + 60);
    box(h.x - p, h.x + p, z0, z1, L.top + 60, { bottom: L.top + h.colH * 0.8 });
  } else box(x0, x1, z0, z1, L.top + 260, { id: h.main ? 'mainHall' : undefined });
}
for (const st of PALACE_STAIRS) {
  box(-st.w / 2, st.w / 2, st.zHigh, st.zLow, 0, { ramp: st });
  for (const s of [-1, 1]) railBox(s * st.w / 2 - 0.6, s * st.w / 2 + 0.6, st.zHigh, st.zLow, st.yHigh);
}

for (const t of FLANK_TOWERS) if (t.onLevel) box(t.x - t.w / 2, t.x + t.w / 2, t.z - t.w / 2, t.z + t.w / 2, t.top + 200);

export const setColliderTop = (id, top) => { const c = colliders.find(c => c.id === id); if (c) c.top = top; };
