// Sky realm layout: a marble causeway over a sea of clouds, framed by two dragon
// pillars, running to a palace stacked up a mountain. Axis runs along -Z.
// Every walkable surface and solid is listed as a collider; there is no ground.
//
// Positions and sizes are solved from the reference frame: each landmark's pixel
// position was unprojected through the HERO camera (45 deg lens, pitched 9.3 deg down).
// The concept's scale is not self-consistent, so the frame wins: a human-scale lookout
// and balustrades in the foreground, mega-scale causeway, pillars and palace beyond.
export const DECK = 60;                            // causeway walking height
export const TOP = 92;                             // lookout at the head of the grand stair
export const SPAWN = { x: 0, z: 12, y: TOP };
export const HERO = { pos: [0, 120, 29], look: [0, 103.62, -71] };   // title-screen camera (reference framing)
export const VOID = -30;                           // fall below this -> respawn

export const CW3 = 15.5, LANE = 10.5;              // half-widths: three-lane causeway, single lane
// Grand stair from the lookout down to the level path, solved against the lines drawn over
// the reference: the areas between the horizontal lines (frame rows 472-442 and 442-433)
// are flat terraces. Two flights come down to the first terrace, a short flight lies edge-on
// to the camera between the terraces, and a long flight runs from the second to the path.
// Half-widths put the balustrade tops on the drawn rail lines: flared, stepping in after
// the first terrace, returning inward at the foot.
export const PATH0 = 12.5;                         // half-width of the level path from the stair foot
export const APPROACH = [
  { zA: 45, zB: -15.7, yA: 92, yB: 92, hwA: 18, hwB: 18 },            // lookout
  { zA: -15.7, zB: -32.6, yA: 92, yB: 85.2, hwA: 18, hwB: 19.6 },     // flight 1
  { zA: -32.6, zB: -35.6, yA: 85.2, yB: 85.2, hwA: 19.6, hwB: 19 },
  { zA: -35.6, zB: -48.6, yA: 85.2, yB: 80, hwA: 19, hwB: 20 },       // flight 2
  { zA: -48.6, zB: -57.6, yA: 80, yB: 80, hwA: 20, hwB: 15.8 },       // first terrace
  { zA: -57.6, zB: -66.26, yA: 80, yB: 76, hwA: 14.1, hwB: 15 },      // flight 3 (balustrades step in)
  { zA: -66.26, zB: -69.6, yA: 76, yB: 76, hwA: 15, hwB: 14 },        // second terrace
  { zA: -69.6, zB: -119, yA: 76, yB: DECK, hwA: 14, hwB: 14.5 },      // flight 4
];
// Four terraces along the causeway (front = toward the camera). Gaps are the adjoining path half-widths.
export const PLATFORMS = [
  { z0: -181, z1: -146, hw: 29.5, front: PATH0, back: CW3, feature: 'censer' },
  { z0: -440, z1: -385, hw: 30, front: CW3, back: LANE, feature: 'censer' },
  { z0: -850, z1: -790, hw: 34, front: LANE, back: LANE, feature: 'statue' },
  { z0: -1280, z1: -1220, hw: 38, front: LANE, back: 38, feature: 'lanterns' },
];
export const DECKS = [   // causeway runs between the terraces
  { zA: APPROACH[APPROACH.length - 1].zB, zB: PLATFORMS[0].z1, hw: PATH0 },
  { zA: PLATFORMS[0].z0, zB: PLATFORMS[1].z1, hw: CW3 },
  { zA: PLATFORMS[1].z0, zB: PLATFORMS[2].z1, hw: LANE },
  { zA: PLATFORMS[2].z0, zB: PLATFORMS[3].z1, hw: LANE },
];
export const TERRACE_B = { z0: -600, hw: 27, drop: 6 };   // low side terraces past the second platform

// Dragon pillars: the first slots for hand-made hero assets.
export const PILLARS = [{ x: -183, z: -441 }, { x: 186, z: -441 }].map(p => ({
  ...p, base: -160, top: 150, r: 31, pavilion: { w: 78, floors: 3, colH: 31 },
}));

// Palace depth layers, numbered as in the annotated reference (1 nearest):
// 1 pedestal pagodas flanking the causeway   2 low gate hall + outer pavilions
// 3 tower pairs on spires                    4 wide front hall + a side hall each side
// 5 very wide four-storey block + corner towers   6 top hall, highest and furthest back
export const LEVELS = [
  { layer: 2, top: DECK, z0: -1322, z1: -1280, hw: 112 },
  { layer: 4, top: 78, z0: -1480, z1: -1352, hw: 245 },
  { layer: 5, top: 111, z0: -1655, z1: -1524, hw: 262 },
  { layer: 6, top: 195, z0: -1890, z1: -1765, hw: 256 },
];
// kind: hall (grandHall) | block (tieredBlock). Sizes are body sizes; eaves add `over`.
export const HALLS = [
  { level: 0, kind: 'hall', x: 0, z: -1300, w: 200, d: 18, colH: 10, bays: 11, over: 5, roofH: 6, plinth: 0.6, apron: 2, passage: 21, plaque: false },
  { level: 1, kind: 'hall', x: 0, z: -1420, w: 190, d: 70, colH: 37.4, bays: 9, over: 12, roofH: 25, R: 58, plinth: 0.6, apron: 5, band: 10, passage: 21.1 },
  ...[-1, 1].map(s => ({ level: 1, kind: 'hall', x: s * 168, z: -1440, w: 96, d: 44, colH: 30, bays: 5, over: 11, roofH: 14, plinth: 3, apron: 5, band: 9 })),
  { level: 2, kind: 'block', x: 0, z: -1597, w: 424, d: 90, floors: 4, pitch: 23.7, over: 12, topH: 14 },
  { level: 3, kind: 'hall', x: 0, z: -1830, w: 437, d: 84, colH: 35.2, bays: 13, over: 14, plinth: 0.8, apron: 5, band: 9.6, lift: 19, main: true,
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
  { layer: 2, x: -295, z: -1221, top: 53, apex: 111, w: 44, floors: 2 },
  { layer: 2, x: 329, z: -1221, top: 44, apex: 105, w: 62, floors: 2 },
  { layer: 3, x: -286, z: -1371, top: 78, apex: 127, w: 44, floors: 3 },
  { layer: 3, x: -225, z: -1318, top: 86, apex: 119, w: 26, floors: 3 },
  { layer: 3, x: 310, z: -1371, top: 95, apex: 127, w: 47, floors: 3 },
  { layer: 3, x: 207, z: -1321, top: 94, apex: 121, w: 24, floors: 3 },
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

for (const g of APPROACH) taper(g.zA, g.hwA, g.zB, g.hwB, g.yA, g.yA === g.yB ? {} : { ramp: { zHigh: g.zA, zLow: g.zB, yHigh: g.yA, yLow: g.yB } });
railBox(-APPROACH[0].hwA, APPROACH[0].hwA, APPROACH[0].zA - 0.5, APPROACH[0].zA + 1, TOP);
for (const P of PLATFORMS) {
  box(-P.hw, P.hw, P.z0, P.z1, DECK);
  railRect(P.hw, P.z0, P.z1, DECK, { front: P.front, back: P.back });
  if (P.feature !== 'lanterns') box(-3, 3, (P.z0 + P.z1) / 2 - 3, (P.z0 + P.z1) / 2 + 3, DECK + 8);
}
for (const D of DECKS) {
  box(-D.hw, D.hw, D.zB, D.zA, DECK);
  for (const s of [-1, 1]) railBox(s * D.hw, s * (D.hw + 1.2), D.zB, D.zA, DECK);
}

for (const [i, L] of LEVELS.entries()) {
  box(-L.hw, L.hw, L.z0, L.z1, L.top);
  railRect(L.hw, L.z0, L.z1, L.top, { front: i ? 15.6 : PLATFORMS[3].hw, back: i < LEVELS.length - 1 ? 15.6 : 0 });
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
