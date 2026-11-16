// Sky realm layout: a marble causeway over a sea of clouds, framed by two dragon
// pillars, climbing to a palace stacked up a mountain. Axis runs along -Z.
// Every walkable surface and solid is listed as a collider; there is no ground.

// Scale is matched to the reference frame: causeway ~1.3 km, pillars ~250 m above
// the cloud tops, palace ~1.5 km out. Balustrades stay human-sized as the scale cue.
export const SPAWN = { x: 0, z: 10, y: 110 };      // top of the grand stair
export const HERO = { pos: [0, 150, 60], look: [0, 136, -40] };   // title-screen camera (reference framing)
export const DECK = 60;                            // causeway walking height
export const CW = 18;                              // causeway inner width
export const VOID = -40;                           // fall below this -> respawn

export const PAD = { x0: -26, x1: 26, z0: 0, z1: 22, top: SPAWN.y };
export const STAIR1 = { w: CW + 8, zHigh: 0, zLow: -250, yHigh: SPAWN.y, yLow: DECK };
export const CAUSEWAY = { zStart: -250, zEnd: -1300 };
export const LANDINGS = [
  { z0: -320, z1: -250, hw: 46, censer: true },
  { z0: -670, z1: -610, hw: 34, lanterns: true },
];

// Dragon pillars: the first slots for hand-made hero assets. Pavilion ~1.6x the
// shaft's width (with dragon), on a bracket corbel, as in the reference.
export const PILLARS = [{ x: -290, z: -800 }, { x: 290, z: -800 }].map(p => ({
  ...p, base: -160, top: 240, r: 28, pavilion: { w: 100, floors: 3, colH: 21 },
}));

// Palace depth layers, numbered as in the annotated reference (1 nearest):
// 1 pedestal pagodas flanking the causeway end
// 2 low gate building on the axis + wide two-tier pavilions further out
// 3 two towers per side
// 4 wide front hall (double roof) + one flank pavilion per side
// 5 very wide multi-storey block + corner pavilions + slender pagodas
// 6 top hall, highest and furthest back
export const LEVELS = [
  { layer: 2, top: DECK, z0: -1400, z1: -1300, hw: 120, halls: [
    { x: 0, z: -1350, w: 130, d: 40, colH: 15, bays: 7, passage: 18, double: false }] },
  { layer: 4, top: 95, z0: -1560, z1: -1445, hw: 155, halls: [
    { x: 0, z: -1505, w: 250, d: 70, colH: 22, bays: 11, passage: 22 }] },
  { layer: 5, top: 140, z0: -1730, z1: -1610, hw: 270, halls: [
    { x: 0, z: -1670, w: 470, d: 100, colH: 20, floors: 3, stacked: true }] },
  { layer: 6, top: 205, z0: -1910, z1: -1800, hw: 200, halls: [
    { x: 0, z: -1860, w: 320, d: 90, colH: 28, bays: 11, main: true }] },
];
export const PALACE_STAIRS = LEVELS.slice(1).map((L, i) => ({
  w: 28, zHigh: L.z1, zLow: LEVELS[i].z0, yHigh: L.top, yLow: LEVELS[i].top,
}));
// Forested rock islands either side of the causeway's last stretch.
export const FOREST_ROCKS = [-1, 1].flatMap(s => [
  { x: s * 45, z: -1060, top: 50, r: 30 }, { x: s * 95, z: -1120, top: 56, r: 45 },
  { x: s * 55, z: -1200, top: 54, r: 38 }, { x: s * 125, z: -1200, top: 58, r: 50 },
  { x: s * 60, z: -1275, top: 52, r: 32 },
]);
// Layer 1: three-storey towers on tall white pedestals.
export const PEDESTAL_TOWERS = [-1, 1].map(s => ({ x: s * 100, z: -1255, top: 98, w: 26, floors: 3, colH: 9 }));
// Layers 2-5 flank pavilions on rock spires (top = rock height they stand on).
export const FLANK_TOWERS = [-1, 1].flatMap(s => [
  { layer: 2, x: s * 180, z: -1345, top: 50, w: 42, floors: 2, colH: 10 },
  { layer: 3, x: s * 150, z: -1425, top: 78, w: 28, floors: 3, colH: 8 },
  { layer: 3, x: s * 215, z: -1440, top: 72, w: 30, floors: 3, colH: 8 },
  { layer: 4, x: s * 205, z: -1520, top: 102, w: 30, floors: 3, colH: 9 },
  { layer: 5, x: s * 225, z: -1615, top: 140, w: 34, floors: 2, colH: 10, onLevel: true },
]);
export const PAGODA_SPIRES = [-1, 1].flatMap(s => [
  { layer: 5, x: s * 300, z: -1660, top: 150, w: 22, floors: 5 },
  { layer: 6, x: s * 420, z: -1560, top: 110, w: 16, floors: 4 },
]);
export const CLIFF = { z: -2150, top: 1000 };
export const FALLS = [{ x: -40, w: 170, z: -1960 }, { x: 170, w: 45, z: -1980 }];

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
  for (const h of L.halls) {
    const m = h.stacked ? 3 : 10, x0 = h.x - h.w / 2 - m, x1 = h.x + h.w / 2 + m, z0 = h.z - h.d / 2 - m, z1 = h.z + h.d / 2 + m;
    if (h.passage) {   // walk-through centre bay
      const p = h.passage / 2 - 1;
      box(x0, h.x - p, z0, z1, L.top + 60); box(h.x + p, x1, z0, z1, L.top + 60);
      box(h.x - p, h.x + p, z0, z1, L.top + 60, { bottom: L.top + h.colH * 0.7 });
    } else box(x0, x1, z0, z1, L.top + 260, { id: h.main ? 'mainHall' : undefined });
  }
}
PALACE_STAIRS.forEach(ramp);

// Rails along the pad sides/back, stair and causeway edges (gaps at landings).
railBox(PAD.x0 - 1, PAD.x0 + 0.5, PAD.z0, PAD.z1, PAD.top);
railBox(PAD.x1 - 0.5, PAD.x1 + 1, PAD.z0, PAD.z1, PAD.top);
railBox(PAD.x0, PAD.x1, PAD.z1 - 0.5, PAD.z1 + 1, PAD.top);
for (const s of [-1, 1]) {
  const se = s * STAIR1.w / 2;
  box(Math.min(se, se + s * 1.2), Math.max(se, se + s * 1.2), STAIR1.zLow, STAIR1.zHigh, SPAWN.y + RAIL + 2);
  const e = s * CW / 2, x0 = Math.min(e, e + s * 1.2), x1 = Math.max(e, e + s * 1.2);
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
      const inner = open ? s * 15 : 0;
      railBox(Math.min(inner, s * L.hw), Math.max(inner, s * L.hw), zz - 1.5, zz + 1.5, L.top);
    }
  }
  for (const st of PALACE_STAIRS) box(s * st.w / 2 - 0.6, s * st.w / 2 + 0.6, st.zHigh, st.zLow, st.yHigh + RAIL + 2);
}

export const setColliderTop = (id, top) => { const c = colliders.find(c => c.id === id); if (c) c.top = top; };
