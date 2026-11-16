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

// Palace, front to back (reference layers): forested rocks with two pedestal towers
// flanking the causeway end -> gate hall the causeway runs into -> the main stacked
// palace (4 roof tiers) -> pavilions and pagodas stepping up on both flanks -> cliff + falls.
export const LEVELS = [
  { top: DECK, z0: -1400, z1: -1300, hw: 170, halls: [
    { x: 0, z: -1345, w: 160, d: 46, colH: 19, bays: 7, passage: 18, gate: true }] },
  { top: 90, z0: -1700, z1: -1450, hw: 240, halls: [
    { x: 0, z: -1585, w: 380, d: 160, colH: 30, floors: 4, stacked: true, main: true }] },
];
export const PALACE_STAIRS = LEVELS.slice(1).map((L, i) => ({
  w: 28, zHigh: L.z1, zLow: LEVELS[i].z0, yHigh: L.top, yLow: LEVELS[i].top,
}));
// Forested rock islands either side of the causeway's last stretch.
export const FOREST_ROCKS = [-1, 1].flatMap(s => [
  { x: s * 45, z: -1060, top: 50, r: 30 }, { x: s * 95, z: -1120, top: 56, r: 45 },
  { x: s * 55, z: -1200, top: 54, r: 38 }, { x: s * 120, z: -1230, top: 58, r: 50 },
  { x: s * 60, z: -1275, top: 52, r: 32 },
]);
// Three-storey towers on white pedestals (the pair flanking the causeway end) ...
export const PEDESTAL_TOWERS = [-1, 1].map(s => ({ x: s * 72, z: -1180, top: 100, w: 26, floors: 3, colH: 9 }));
// ... and towers / slender pagodas on rock spires stepping up behind on both flanks.
export const FLANK_TOWERS = [-1, 1].flatMap(s => [
  { x: s * 225, z: -1420, top: 80, w: 34, floors: 3, colH: 10 },
  { x: s * 290, z: -1530, top: 110, w: 30, floors: 3, colH: 9 },
  { x: s * 320, z: -1680, top: 140, w: 26, floors: 3, colH: 8 },
]);
export const PAGODA_SPIRES = [-1, 1].flatMap(s => [
  { x: s * 370, z: -1460, top: 85, w: 18, floors: 5 },
  { x: s * 215, z: -1760, top: 160, w: 20, floors: 5 },
  { x: s * 400, z: -1640, top: 125, w: 16, floors: 4 },
]);
export const CLIFF = { z: -2050, top: 1000 };
export const FALLS = [{ x: -40, w: 170, z: -1800 }, { x: 170, w: 45, z: -1820 }];

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
    const x0 = h.x - h.w / 2 - 10, x1 = h.x + h.w / 2 + 10, z0 = h.z - h.d / 2 - 10, z1 = h.z + h.d / 2 + 10;
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
