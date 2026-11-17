import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Kit, COL, paint, grandHall, tieredBlock, pagoda, tower, rail, taperSlab, hexa, tubeR } from './architecture.js';
import { createCloudPuffs, createMist } from './clouds.js';
import {
  DECK, PAD, STAIR1, PLATFORM, CW3, LANE, LANDING2, TERRACE_B, CAUSEWAY, PILLARS, LEVELS, HALLS, PALACE_STAIRS,
  PEDESTAL_TOWERS, FLANK_TOWERS, PAGODA_SPIRES, CLIFF, FALLS, CRAGS, setColliderTop,
} from './layout.js';

const noise = new ImprovedNoise();
// Seeded, so the composition (rocks, trees, cloud towers) is the same on every load.
let seed = 20261117;
const rnd = () => {
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const rand = (a, b) => a + rnd() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0), smooth = THREE.MathUtils.smoothstep;

// ---------------------------------------------------------------------------
// Rock: noise-displaced tapered column with vertex colours (moss toward the top).
// ---------------------------------------------------------------------------
const ROCK = new THREE.Color('#8b8a85'), ROCK_DARK = new THREE.Color('#5c5f62'), MOSS = new THREE.Color('#465c36');
function rock(x, z, y0, y1, r0, r1, { rough = 0.32, moss = 0.75, seg = 14, dome = 0 } = {}) {
  const h = y1 - y0, sd = rand(0, 100), f = 30 / Math.max(r0, r1, 30);   // lower frequency on big rocks
  const g = new THREE.CylinderGeometry(r1, r0, h, seg, Math.max(6, Math.round(h / 12))).translate(0, h / 2, 0);
  g.deleteAttribute('uv');
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
    const k = 1 + rough * noise.noise(px * 0.04 * f + sd, py * 0.025 * f, pz * 0.04 * f) + 0.12 * noise.noise(px * 0.15 * f, py * 0.1 * f + sd, pz * 0.15 * f);
    const top = py > h - 0.01 ? 1 - Math.min((px * px + pz * pz) / (r1 * r1), 1) : 0;   // dome the cap
    p.setXYZ(i, px * k, py + top * r1 * dome, pz * k);
    const t = py / h, n = noise.noise(px * 0.08 * f, py * 0.06 * f, sd);
    c.copy(ROCK_DARK).lerp(ROCK, 0.5 + 0.5 * n).lerp(MOSS, smooth(t + 0.25 * n, moss, 1));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g.translate(x, y0, z);
}

// Boulder: noise-displaced lump (foreground outcrop).
function boulder(x, y, z, rx, ry, rz) {
  const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), sd = rand(0, 100);
  g.deleteAttribute('uv');
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
    const k = 1 + 0.3 * noise.noise(px * 1.3 + sd, py * 1.3, pz * 1.3) + 0.12 * noise.noise(px * 4 + sd, py * 4, pz * 4);
    p.setXYZ(i, px * k * rx, py * k * ry, pz * k * rz);
    c.copy(ROCK_DARK).lerp(ROCK, 0.5 + 0.5 * noise.noise(px * 3, py * 3 + sd, pz * 3)).lerp(MOSS, smooth(py * k + 0.3 * noise.noise(px * 2, sd, pz * 2), 0.55, 0.95) * 0.7);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g.translate(x, y, z);
}

// ---------------------------------------------------------------------------
// Stairs along -Z: steps on a sloped stringer, a carved centre ramp, rails.
// hwHigh / hwLow let the flight fan out as it descends.
// ---------------------------------------------------------------------------
function stairs(kit, s) {
  const hwA = s.hwHigh ?? s.w / 2, hwB = s.hwLow ?? s.w / 2;
  const rise = s.yHigh - s.yLow, n = Math.round(rise / 0.3), run = (s.zHigh - s.zLow) / n;
  for (let i = 0; i < n; i++)
    kit.box((hwA + (hwB - hwA) * (i + 0.5) / n) * 2, 4, run + 0.02, 0, s.yHigh - i * (rise / n) - 2, s.zHigh - (i + 0.5) * run, COL.marble);
  for (const [k, lift, col] of [[0.74, 0.4, COL.marbleDark], [0.715, 0.44, COL.marble], [0.36, 0.48, COL.marbleDark], [0.335, 0.52, COL.marble]])
    taperSlab(kit, { zA: s.zHigh, zB: s.zLow, hwA: hwA * k, hwB: hwB * k, yA0: s.yHigh - 1, yA1: s.yHigh + lift, yB0: s.yLow - 1, yB1: s.yLow + lift, color: col });
  for (const sg of [-1, 1]) {
    const xs = (hw) => (sg > 0 ? [hw, hw + 1.2] : [-hw - 1.2, -hw]), [a0, a1] = xs(hwA), [b0, b1] = xs(hwB);
    kit.add('paint', paint(hexa([
      [a0, s.yHigh - 4.5, s.zHigh], [a1, s.yHigh - 4.5, s.zHigh], [a1, s.yHigh + 0.4, s.zHigh], [a0, s.yHigh + 0.4, s.zHigh],
      [b0, s.yLow - 4.5, s.zLow], [b1, s.yLow - 4.5, s.zLow], [b1, s.yLow + 0.4, s.zLow], [b0, s.yLow + 0.4, s.zLow]]), COL.marble));
    rail(kit, V(sg * (hwA + 0.6), s.yHigh + 0.4, s.zHigh), V(sg * (hwB + 0.6), s.yLow + 0.4, s.zLow));
  }
}

// Rectangle of rails with gaps on the -z and +z edges (x ranges).
function railRect(kit, x0, x1, z0, z1, y, { front = [], back = [] } = {}) {
  const edge = (zz, gaps) => { let x = x0; for (const [a, b] of gaps) { rail(kit, V(x, y, zz), V(a, y, zz)); x = b; } rail(kit, V(x, y, zz), V(x1, y, zz)); };
  edge(z0, back); edge(z1, front);
  rail(kit, V(x0, y, z0), V(x0, y, z1)); rail(kit, V(x1, y, z0), V(x1, y, z1));
}

// Bronze tripod censer (ding) on a round marble medallion.
function censer(kit, x, y, z, k = 1) {
  const bronze = '#5b4a2e', g = [];
  kit.add('paint', paint(new THREE.CylinderGeometry(4.2 * k, 4.5 * k, 0.5, 24).translate(x, y + 0.25, z), COL.marbleDark));
  g.push(new THREE.CylinderGeometry(2.2, 1.8, 2.6, 16).translate(0, 3.6, 0));
  g.push(new THREE.CylinderGeometry(1.4, 2.3, 1.6, 16).translate(0, 5.7, 0));
  g.push(new THREE.SphereGeometry(0.6, 10, 8).translate(0, 6.9, 0));
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    g.push(new THREE.CylinderGeometry(0.3, 0.4, 2.4, 6).translate(Math.cos(a) * 1.4, 1.2, Math.sin(a) * 1.4));
  }
  for (const gg of g) kit.add('paint', paint(gg.scale(k, k, k).translate(x, y + 0.5, z), bronze));
}

// Stone lantern.
function lantern(kit, x, y, z, k = 1) {
  kit.box(1.6 * k, 0.6 * k, 1.6 * k, x, y + 0.3 * k, z, COL.marbleDark);
  kit.box(0.6 * k, 3.2 * k, 0.6 * k, x, y + 2.2 * k, z, COL.marble);
  kit.box(1.4 * k, 1.4 * k, 1.4 * k, x, y + 4.5 * k, z, COL.marble);
  kit.add('paint', paint(new THREE.ConeGeometry(1.3 * k, 1 * k, 4).rotateY(Math.PI / 4).translate(x, y + 5.7 * k, z), COL.marbleDark));
}

// ---------------------------------------------------------------------------
// Marble shaft carved with cloud scrolls, a dragon coiled down it (tail under the
// capital, head reared out over the cloud on the causeway side), timber pavilion on top.
// ---------------------------------------------------------------------------
const CARVED = '#e9e5db';
function dragonPillar(kit, p) {
  const h = p.top - p.base, r = p.r, mir = p.x < 0 ? 1 : -1;
  kit.add('paint', paint(new THREE.CylinderGeometry(r * 0.97, r, h, 40, 1).translate(p.x, p.base + h / 2, p.z), '#cdc8bb'));
  const drum = (rr, hh, y, col) => kit.add('paint', paint(new THREE.CylinderGeometry(rr, rr, hh, 40).translate(p.x, y, p.z), col));
  drum(r * 1.14, 3, p.top - 9.5, COL.marbleDark); drum(r * 1.22, 3, p.top - 6.5, COL.marble); drum(r * 1.3, 2, p.top - 4, COL.marbleDark);
  drum(r * 1.26, 3, p.top - 1.5, COL.marble);
  for (let i = 0; i < 150; i++) {   // cloud scrolls in relief
    const a = rand(0, 6.283), y = rand(10, p.top - 14), s = rand(4, 10);
    kit.add('paint', paint(new THREE.IcosahedronGeometry(s, 1).scale(0.55, rand(0.5, 0.9), 1).rotateY(-a)
      .translate(p.x + Math.cos(a) * r * 0.99, y, p.z + Math.sin(a) * r * 0.99), CARVED));
  }

  // dragon body: climbs out of the cloud in tight coils; the neck swings out below the capital
  const y0 = 18, y1 = p.top - 14, turns = 3.7, rb = r * 0.27, N = 240, pts = [];
  const aHead = Math.PI / 2 - mir * 0.7;
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = aHead + mir * (turns * Math.PI * 2 * Math.pow(1 - t, 1.35) + 0.45 * Math.sin(t * 13));
    const y = y0 + (y1 - y0) * Math.pow(Math.min(t / 0.84, 1), 0.9) - 20 * smooth(t, 0.84, 1) + Math.sin(t * 17) * 4.5 + Math.sin(t * 41 + 1) * 2;
    const R = r + rb * (0.2 + 0.2 * Math.sin(t * 29)) + 28 * Math.pow(smooth(t, 0.84, 1), 1.4);
    pts.push(V(p.x + Math.cos(a) * R, y, p.z + Math.sin(a) * R));
  }
  const curve = new THREE.CatmullRomCurve3(pts), len = curve.getLength();
  const rFn = (t) => rb * (0.3 + 0.7 * smooth(t, 0, 0.2)) * (1 - 0.22 * smooth(t, 0.9, 1));
  kit.add('carved', tubeR(curve, 640, 16, rFn, [len / 4, 16]));
  const out = (P) => V(P.x - p.x, 0, P.z - p.z).normalize(), q = new THREE.Quaternion();
  for (let i = 6; i < 392; i += 2) {   // dorsal fins
    const t = i / 400, P = curve.getPointAt(t), o = out(P), rr = rFn(t);
    const g = new THREE.ConeGeometry(rr * 0.2, rr * 0.5, 4).translate(0, rr * 0.2, 0)
      .applyQuaternion(q.setFromUnitVectors(UP, o.clone().multiplyScalar(0.7).add(V(0, 0.7, 0)).normalize()));
    kit.add('paint', paint(g.translate(P.x + o.x * rr * 0.75, P.y + rr * 0.6, P.z + o.z * rr * 0.75), CARVED));
  }
  for (const t of [0.42, 0.6, 0.76]) {   // clawed feet gripping the shaft
    const P = curve.getPointAt(t), o = out(P), rr = rFn(t), c = V(P.x + o.x * rr * 0.4, P.y - rr * 1.3, P.z + o.z * rr * 0.4);
    kit.add('paint', paint(new THREE.SphereGeometry(rr * 0.75, 10, 8).translate(c.x, c.y, c.z), CARVED));
    for (let k = -1.5; k <= 1.5; k++) {
      const d = V(-o.z * k * 0.5 - o.x * 0.3, -1, o.x * k * 0.5 - o.z * 0.3).normalize();
      kit.add('paint', paint(new THREE.ConeGeometry(rr * 0.2, rr * 1.4, 5).translate(0, rr * 0.7, 0).applyQuaternion(q.setFromUnitVectors(UP, d)).translate(c.x, c.y, c.z), CARVED));
    }
  }
  // head: built facing +z, then turned along the neck
  const fw = curve.getTangentAt(1), end = curve.getPointAt(1), parts = [];
  const cone = (rr, hh, pos, dir) => parts.push(new THREE.ConeGeometry(rr, hh, 6).translate(0, hh / 2, 0).applyQuaternion(q.setFromUnitVectors(UP, V(...dir).normalize())).translate(...pos));
  parts.push(new THREE.BoxGeometry(rb * 1.7, rb * 1.5, rb * 2.2).translate(0, 0, rb * 0.8));
  parts.push(new THREE.BoxGeometry(rb * 1.2, rb * 0.8, rb * 2.2).translate(0, rb * 0.05, rb * 2.8));
  parts.push(new THREE.BoxGeometry(rb * 1.0, rb * 0.32, rb * 2.1).rotateX(0.28).translate(0, rb * -0.85, rb * 2.5));
  parts.push(new THREE.SphereGeometry(rb * 0.45, 8, 6).translate(0, rb * 0.5, rb * 3.8));
  for (const sx of [-1, 1]) {
    cone(rb * 0.22, rb * 2.8, [sx * rb * 0.55, rb * 0.7, rb * 0.3], [sx * 0.25, 0.8, -0.9]);      // horns
    cone(rb * 0.07, rb * 3.4, [sx * rb * 0.6, rb * -0.1, rb * 3.6], [sx * 0.8, -0.35, 0.5]);      // whiskers
    for (let k = 0; k < 3; k++) cone(rb * 0.2, rb * 1.6, [sx * rb * 0.85, rb * (0.3 - k * 0.45), rb * 0.1], [sx * 0.8, 0.1 - k * 0.2, -0.8]);   // mane
    parts.push(new THREE.SphereGeometry(rb * 0.2, 8, 6).translate(sx * rb * 0.7, rb * 0.55, rb * 1.6));
  }
  const m = new THREE.Matrix4().lookAt(fw, V(0, 0, 0), UP).setPosition(end);
  for (const g of parts) kit.add('paint', paint(g.applyMatrix4(m), CARVED));

  tower(kit, { x: p.x, y: p.top, z: p.z, ...p.pavilion, corbel: r * 2.5 });
}

// Scrolling waterfall texture: bright streaks, alpha fading to nothing at the sides.
function fallTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  for (let i = 0; i < 520; i++) {
    const u = (rnd() + rnd() + rnd()) / 3, x = u * 256, w = rand(1, 6), y = rnd() * 512, h = rand(80, 360);
    g.fillStyle = `rgba(255,255,255,${rand(0.25, 0.8) * (1 - Math.abs(u - 0.5) * 1.6)})`;
    g.fillRect(x, y, w, h); g.fillRect(x, y - 512, w, h);
  }
  const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Wind-bent pine (foreground framing): leaning trunk, boughs, layered needle pads.
function pine(kit, x, y, z, k = 1) {
  const P = (a) => a.map(([px, py, pz]) => V(x + px * k, y + py * k, z + pz * k));
  const limb = (pts, r0, r1) => { const c = new THREE.CatmullRomCurve3(P(pts)); kit.add('paint', paint(tubeR(c, 24, 7, t => (r0 + (r1 - r0) * t) * k), '#4b3a2b')); };
  limb([[0, -1, 0], [0.7, 2.4, 0.3], [0.1, 4.6, 0.2], [1.3, 6.6, 0], [3.2, 8.2, -0.3], [5, 9.4, -0.6]], 0.6, 0.18);
  limb([[0.2, 4.2, 0.2], [-2.4, 5, 1], [-5.4, 5.2, 2], [-8.2, 5, 3]], 0.28, 0.08);
  limb([[1.3, 6.6, 0], [4.4, 7, 0.8], [7.6, 7.2, 1.2], [10.2, 6.8, 1.6]], 0.26, 0.07);
  limb([[2.4, 7.6, -0.2], [0.4, 9, -0.8], [-2.8, 9.8, -1.2]], 0.22, 0.07);
  limb([[0.4, 3, 0.2], [2.4, 3.6, 1.6], [4.6, 3.4, 3]], 0.2, 0.06);
  // [x, y, z, radius]: broad flat tiers, densest at the crown
  const pads = [[-7.4, 5.5, 2.8, 3.4], [-4, 5.9, 1.4, 3], [-8.6, 3.6, 4.2, 2.6], [-5, 3.4, 3.6, 2.4], [-3.2, 10.2, -1.2, 3.2], [-6.4, 8, 0.2, 2.8],
    [0.4, 8, 0.6, 3], [2.4, 10, -0.4, 3.2], [5.4, 10.4, -0.8, 3.4], [9.4, 7.5, 1.6, 3.2], [6.2, 7.8, 1.6, 2.8], [3.4, 11.8, -1, 2.2],
    [4.8, 4, 3.2, 2.6], [1.6, 5.6, 2.6, 2.2], [-1.4, 7, 2, 2.6], [8, 9.4, 0, 2.4]];
  for (const [px, py, pz, r] of pads) for (let i = 0; i < 34; i++) {
    const a = rand(0, 6.283), d = Math.sqrt(rnd()) * r * 0.82, s = rand(0.45, 0.95), lift = rand(-0.45, 0.5);
    const g = new THREE.IcosahedronGeometry(s * k, 1).scale(1.6, 0.5, 1.4).rotateY(a)
      .translate(x + (px + Math.cos(a) * d) * k, y + (py + lift) * k, z + (pz + Math.sin(a) * d * 0.8) * k);
    kit.add('paint', paint(g, lift > 0.2 ? '#44613a' : i % 2 ? '#2d472b' : '#213820'));
  }
}

// Instanced pines: pts = [x, y, z, scale].
function createForest(pts) {
  const parts = [paint(new THREE.CylinderGeometry(0.35, 0.5, 6, 6).translate(0, 3, 0), '#4a3626')];
  [[2.8, 4.4, 0.4], [2.2, 5.6, -0.4], [1.4, 6.7, 0.2]].forEach(([r, y, o]) =>
    parts.push(paint(new THREE.SphereGeometry(r, 8, 5).scale(1.2, 0.35, 1).translate(o, y, o * 0.5), '#35543a')));
  const mesh = new THREE.InstancedMesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), pts.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  pts.forEach(([x, y, z, k], i) => {
    m.compose(V(x, y, z), q.setFromEuler(e.set(0, rand(0, 6.28), 0)), V(k, k * rand(0.9, 1.3), k));
    mesh.setMatrixAt(i, m);
  });
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
export function createSkyRealm({ meshClouds = false } = {}) {
  const kit = new Kit(), rocks = [], trees = [];
  const group = new THREE.Group();
  const grove = (x, z, y, r, n, k0, k1) => { for (let i = 0; i < n; i++) { const a = rand(0, 6.283), d = r * Math.sqrt(rnd()); trees.push([x + Math.cos(a) * d, y, z + Math.sin(a) * d, rand(k0, k1)]); } };

  // ---- Lookout on a rock outcrop, pine framing the left of the view ----
  const top = PAD.top;
  for (let i = 0; i + 1 < PAD.plan.length; i++) {
    const [zA, hwA] = PAD.plan[i], [zB, hwB] = PAD.plan[i + 1];
    taperSlab(kit, { zA, zB, hwA: hwA + 0.9, hwB: hwB + 0.9, yA0: top - 2.4, yA1: top });
    taperSlab(kit, { zA, zB, hwA: hwA + 1.3, hwB: hwB + 1.3, yA0: top - 3.2, yA1: top - 2.4, color: COL.marbleDark });
    taperSlab(kit, { zA, zB, hwA: hwA * 0.46, hwB: hwB * 0.46, yA0: top, yA1: top + 0.05, color: COL.marbleDark });
    taperSlab(kit, { zA, zB, hwA: hwA * 0.38, hwB: hwB * 0.38, yA0: top, yA1: top + 0.08 });
    for (const s of [-1, 1]) rail(kit, V(s * (hwA + 0.45), top, zA), V(s * (hwB + 0.45), top, zB));
  }
  const [zBack, hwBack] = PAD.plan[0];
  rail(kit, V(-hwBack - 0.45, top, zBack), V(hwBack + 0.45, top, zBack));
  rocks.push(rock(0, 15, -140, top - 4, 30, 10, { moss: 1.15, rough: 0.4 }));
  rocks.push(rock(0, -28, -140, 91.5, 24, 6.5, { moss: 1.15, rough: 0.4 }));
  rocks.push(rock(-18, 0, -110, 98, 20, 9, { moss: 1.15, rough: 0.45 }));
  for (const [bx, by, bz, rx, ry, rz] of [   // craggy outcrop under the pine and round the lookout
    [-18.5, 99.5, -5, 7, 5, 6], [-12.5, 101, 5, 5, 5.5, 5], [-25, 97, 5, 7, 5, 7], [-11, 102, 15, 4.5, 5.5, 5], [-17, 99, 14, 6, 5, 6],
    [-13, 96, -15, 6, 5, 5], [-9, 100, -4, 3.5, 4, 3.5], [10.5, 101.5, -2.5, 3.6, 4.6, 3.4], [11.5, 101, 12, 4.5, 5.5, 5], [13, 98, 4, 5, 5, 5], [10, 103, 24, 4, 4, 4], [-10.5, 103, 26, 4, 4, 4]])
    rocks.push(boulder(bx, by, bz, rx, ry, rz));
  pine(kit, -18.7, 102.6, -4.7, 0.92);
  for (const [sx, sy, sz, n] of [[-12.5, 106, 5, 6], [-24, 101.5, 4, 6], [10.5, 105.6, -2.5, 4], [11.5, 106, 12, 5], [-17, 103.5, 14, 6], [-10, 103.5, -4, 4]])
    for (let i = 0; i < n; i++) {   // shrubs on the outcrop
      const s = rand(0.5, 1.1);
      kit.add('paint', paint(new THREE.IcosahedronGeometry(s, 1).scale(1.3, 0.75, 1.1).translate(sx + rand(-2.2, 2.2), sy + s * 0.2, sz + rand(-2.2, 2.2)), i % 2 ? '#3d5a30' : '#2f4a2a'));
    }
  stairs(kit, STAIR1);

  // ---- Censer terrace: upper tier at deck level on a wider lower tier sinking into the cloud ----
  const P = PLATFORM, pz = (P.z0 + P.z1) / 2, pd = P.z1 - P.z0, ly = DECK - P.lowerDrop;
  kit.box(P.hw * 2, 3, pd, 0, DECK - 1.5, pz, COL.marble);
  kit.box(P.hw * 2 + 1.4, 1.2, pd + 1.4, 0, DECK - 3.4, pz, COL.marbleDark);
  kit.box(P.hw * 2 - 2, P.lowerDrop, pd - 2, 0, ly + P.lowerDrop / 2 - 2, pz, COL.marble);
  kit.box(P.lowerHw * 2, 3, pd + 10, 0, ly - 1.5, pz, COL.marble);
  kit.box(P.lowerHw * 2 + 1.4, 1.2, pd + 11.4, 0, ly - 3.4, pz, COL.marbleDark);
  kit.box(P.lowerHw * 2 - 3, 170, pd + 7, 0, ly - 88, pz, COL.marble);
  for (const dy of [14, 28]) kit.box(P.lowerHw * 2 - 2, 1.5, pd + 8, 0, ly - dy, pz, COL.marbleDark);
  railRect(kit, -P.hw + 0.5, P.hw - 0.5, P.z0 + 0.5, P.z1 - 0.5, DECK, { front: [[-STAIR1.hwLow - 1.2, STAIR1.hwLow + 1.2]], back: [[-CW3 - 1.2, CW3 + 1.2]] });
  railRect(kit, -P.lowerHw + 0.5, P.lowerHw - 0.5, P.z0 - 4.5, P.z1 + 4.5, ly, { front: [[-P.hw, P.hw]], back: [[-P.hw, P.hw]] });
  for (const dx of [-4.2, 4.2]) kit.box(0.5, 0.06, pd, dx, DECK + 0.03, pz, COL.marbleDark);
  censer(kit, 0, DECK, pz, 0.9);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) lantern(kit, sx * (P.hw - 5), DECK, pz + sz * (pd / 2 - 5), 0.8);

  // ---- Causeway: deck on piers sinking into the cloud ----
  const deck = (hw, zA, zB) => {
    const len = zA - zB, zc = (zA + zB) / 2;
    kit.box(hw * 2 + 2.4, 3, len, 0, DECK - 1.5, zc, COL.marble);
    kit.box(hw * 2 + 3.4, 1.2, len, 0, DECK - 3.6, zc, COL.marbleDark);
    for (const s of [-1, 1]) {
      rail(kit, V(s * (hw + 0.6), DECK, zA), V(s * (hw + 0.6), DECK, zB));
      kit.box(0.5, 0.06, len, s * hw * 0.4, DECK + 0.03, zc, COL.marbleDark);     // inlaid lane borders
    }
    for (let z = zA - 11.5; z > zB + 3; z -= 11.5) kit.box(hw * 2, 0.06, 0.4, 0, DECK + 0.03, z, COL.marbleDark);   // paving joints
    for (let z = zA - 23; z > zB + 6; z -= 46) {
      kit.box(hw * 2 - 2, 180, 10, 0, DECK - 94, z, COL.marble);
      kit.box(hw * 2 + 3.6, 3, 11.5, 0, DECK - 5.5, z, COL.marbleDark);
    }
  };
  deck(CW3, P.z0, LANDING2.z1);                       // three lanes: low kerbs divide them
  for (const s of [-1, 1]) kit.box(0.7, 0.5, P.z0 - LANDING2.z1, s * 5.5, DECK + 0.25, (P.z0 + LANDING2.z1) / 2, COL.marble);
  const L2 = LANDING2, l2z = (L2.z0 + L2.z1) / 2;
  kit.box(L2.hw * 2, 4, L2.z1 - L2.z0, 0, DECK - 2, l2z, COL.marble);
  kit.box(L2.hw * 2 + 1.5, 1.4, L2.z1 - L2.z0 + 1.5, 0, DECK - 4.6, l2z, COL.marbleDark);
  kit.box(L2.hw * 2 - 6, 180, L2.z1 - L2.z0 - 6, 0, DECK - 95, l2z, COL.marble);
  railRect(kit, -L2.hw + 0.5, L2.hw - 0.5, L2.z0 + 0.5, L2.z1 - 0.5, DECK, { front: [[-CW3 - 1.2, CW3 + 1.2]], back: [[-LANE - 1.2, LANE + 1.2]] });
  censer(kit, 0, DECK, l2z, 0.6);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {   // corner blocks with lanterns
    kit.box(5, 3.2, 5, sx * (L2.hw - 3.2), DECK + 1.6, l2z + sz * ((L2.z1 - L2.z0) / 2 - 3.2), COL.marble);
    lantern(kit, sx * (L2.hw - 3.2), DECK + 3.2, l2z + sz * ((L2.z1 - L2.z0) / 2 - 3.2), 1.1);
  }
  deck(LANE, L2.z0, CAUSEWAY.zEnd);
  for (const s of [-1, 1]) {   // low side terraces past the landing
    const T = TERRACE_B, w = T.hw - LANE - 1.2, x = s * (LANE + 1.2 + w / 2), len = L2.z0 - T.z0, zc = (L2.z0 + T.z0) / 2, ty = DECK - T.drop;
    kit.box(w, 3, len, x, ty - 1.5, zc, COL.marble);
    kit.box(w + 1, 1.2, len + 1, x, ty - 3.6, zc, COL.marbleDark);
    kit.box(w - 2, 170, len - 2, x, ty - 88, zc, COL.marble);
    rail(kit, V(s * (T.hw - 0.5), ty, L2.z0), V(s * (T.hw - 0.5), ty, T.z0));
    rail(kit, V(s * (LANE + 1.8), ty, T.z0 + 0.5), V(s * (T.hw - 0.5), ty, T.z0 + 0.5));
  }

  // ---- Dragon pillars ----
  for (const p of PILLARS) dragonPillar(kit, p);

  // ---- Forested rock ridge either side of the causeway, widening toward the palace ----
  for (const s of [-1, 1]) for (let z = -445; z > -1275; z -= 46) {
    const far = 0.115 * (29 - z), n = 1 + Math.floor(far / 62);
    for (let i = 0; i < n; i++) {
      const r = rand(26, 42), x = s * (LANE + 6 + r * 0.8 + (far - LANE - 6) * (i + rnd() * 0.8) / n), ty = rand(32, 50);
      if (PEDESTAL_TOWERS.some(t => Math.hypot(x - t.x, z - t.z) < r + 34)) continue;
      rocks.push(rock(x, z + rand(-14, 14), -120, ty, r * 0.5, r, { moss: 0.72, dome: 0.25 }));
      grove(x, z, ty - 1, r * 0.8, 7, 1.8, 3.2);
    }
  }
  for (const t of PEDESTAL_TOWERS) {   // layer 1
    rocks.push(rock(t.x, t.z, -120, 22, t.ped * 1.1, t.ped * 1.7, { moss: 0.7 }));
    kit.box(t.ped, t.top - 14, t.ped, t.x, (t.top + 14) / 2, t.z, COL.marble);
    kit.box(t.ped * 1.16, 3, t.ped * 1.16, t.x, 23.5, t.z, COL.marbleDark);
    kit.box(t.ped * 1.12, 1.6, t.ped * 1.12, t.x, t.top - 0.8, t.z, COL.marbleDark);
    tower(kit, { x: t.x, y: t.top, z: t.z, w: t.w, floors: 3, height: t.apex - t.top, corbel: t.ped * 0.9 });
  }

  // ---- Stacked palace: terraces on crags, halls, axial stairs ----
  for (const [i, L] of LEVELS.entries()) {
    const cz = (L.z0 + L.z1) / 2, d = L.z1 - L.z0, last = i === LEVELS.length - 1;
    kit.box(L.hw * 2, 3, d, 0, L.top - 1.5, cz, COL.marble);
    kit.box(L.hw * 2 + 2, 1.4, d + 2, 0, L.top - 3.6, cz, COL.marbleDark);
    kit.box(L.hw * 2 - 1.5, 26, d - 1.5, 0, L.top - 17, cz, i ? COL.red : COL.marble);   // red retaining wall under the marble cap
    kit.box(L.hw * 2, 2.5, d, 0, L.top - 31, cz, COL.marbleDark);
    const n = Math.ceil(2 * L.hw / (d * 0.95));
    for (let k = 0; k < n; k++) rocks.push(rock(-L.hw + (k + 0.5) * 2 * L.hw / n, cz + rand(-8, 8), -160, L.top - 30, d * 0.42, d * 0.66, { moss: 0.9, rough: 0.3 }));
    const g = i ? 15.6 : LANE + 1.2;
    railRect(kit, -L.hw + 0.5, L.hw - 0.5, L.z0 + 0.5, L.z1 - 0.5, L.top, { front: [[-g, g]], back: last ? [] : [[-15.6, 15.6]] });
    const halls = HALLS.filter(h => h.level === i);
    for (let k = 0; k < 60; k++) {   // courtyard pines
      const x = rand(-L.hw + 8, L.hw - 8), z = rand(L.z0 + 6, L.z1 - 6);
      if (Math.abs(x) > 26 && !halls.some(h => Math.abs(x - h.x) < h.w / 2 + 16 && Math.abs(z - h.z) < h.d / 2 + 14)) trees.push([x, L.top, z, rand(2.4, 3.8)]);
    }
  }
  for (const h of HALLS) {
    const y = LEVELS[h.level].top;
    const ht = h.kind === 'block' ? tieredBlock(kit, { ...h, y }) : grandHall(kit, { ...h, y });
    if (h.main) setColliderTop('mainHall', y + ht);
  }
  PALACE_STAIRS.forEach(s => stairs(kit, s));
  rocks.push(rock(0, -1712, -160, 136, 44, 34, { moss: 0.9 }));   // carries the long stair to the top hall
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) lantern(kit, sx * 24, DECK, LEVELS[0].z1 - 8 + sz * 4, 2.4);

  // Layers 2-5: pavilions and pagodas on rock spires up both flanks
  for (const t of FLANK_TOWERS) {
    if (!t.onLevel) { rocks.push(rock(t.x, t.z, -120, t.top, t.w * 0.7, t.w * 0.95, { moss: 0.85 })); grove(t.x, t.z, t.top - 1, t.w * 0.9, 5, 2.2, 3.2); }
    tower(kit, { x: t.x, y: t.top, z: t.z, w: t.w, floors: t.floors, height: t.apex - t.top });
  }
  for (const s of PAGODA_SPIRES) {
    rocks.push(rock(s.x, s.z, -120, s.top, s.w * 2.2, s.w * 1.3, { moss: 0.8 }));
    grove(s.x, s.z, s.top - 1, s.w * 1.2, 5, 2.2, 3.2);
    pagoda(kit, { x: s.x, y: s.top, z: s.z, w: s.w, floors: s.floors, height: s.apex - s.top });
  }

  // ---- Karst massif and crags behind the palace ----
  for (let i = 0; i < 8; i++) {
    const x = CLIFF.x0 + 50 + (CLIFF.x1 - CLIFF.x0 - 100) * i / 7 + rand(-18, 18);
    rocks.push(rock(x, CLIFF.z - rand(0, 70), -160, CLIFF.top * rand(0.8, 1.05), rand(95, 125), rand(48, 72), { rough: 0.36, moss: 0.93, seg: 20 }));
  }
  for (const c of CRAGS) {
    rocks.push(rock(c.x, c.z, -160, c.top, c.r * 1.6, c.r * 0.55, { rough: 0.42, moss: 0.82, seg: 16 }));
    grove(c.x, c.z, c.top - 2, c.r * 0.5, 7, 3, 5);
    if (c.top < 200) tower(kit, { x: c.x, y: c.top, z: c.z, w: c.r * 0.5, floors: 2, colH: c.r * 0.22 });
  }

  const rockMesh = new THREE.Mesh(mergeGeometries(rocks.map(g => (g.index ? g.toNonIndexed() : g))), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  rockMesh.castShadow = rockMesh.receiveShadow = true;
  group.add(kit.build(), rockMesh);

  // Waterfalls: a broad veil down the massif
  const ftex = fallTexture(), falls = [];
  for (const f of FALLS) for (const [k, dz, op] of [[1, 0, 0.95], [0.6, 6, 0.8]]) {   // two layered veils each
    const t = ftex.clone(); t.needsUpdate = true; t.repeat.set(1, (f.y1 - f.y0) / 260); t.offset.y = rnd();
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.03, opacity: op, color: new THREE.Color('#f6f9ff').multiplyScalar(1.5), fog: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(f.w * 1.5 * k, f.y1 - f.y0), m);
    mesh.position.set(f.x + (k < 1 ? f.w * 0.2 : 0), (f.y0 + f.y1) / 2, f.z + dz);
    falls.push(t); group.add(mesh);
  }

  // ---- Cloud towers (baked into the cloud volume): round the pillar shafts, beside the
  // causeway, banked against the palace flanks, and great cumulus wrapping the massif ----
  const puffs = [], low = (top, r) => top - 1.25 * r;   // centre height that puts the crown at `top`
  for (const p of PILLARS) for (let i = 0; i < 6; i++) {
    const a = i / 6 * 6.283 + rand(0, 0.8), d = rand(70, 120), r = rand(40, 60);
    puffs.push({ x: p.x + Math.cos(a) * d, y: low(rand(52, 76), r), z: p.z + Math.sin(a) * d, r });
  }
  for (let i = 0; i < 22; i++) {
    const s = i % 2 ? 1 : -1, r = rand(42, 78), x = s * rand(60 + r * 1.3, 430);
    puffs.push({ x, y: low(rand(44, 58) + Math.abs(x) * 0.06, r), z: rand(-190, -1150), r });
  }
  for (const s of [-1, 1]) {
    puffs.push({ x: s * rand(430, 480), y: 60, z: -1330, r: 120 }, { x: s * rand(480, 540), y: 110, z: -1560, r: 150 });
    puffs.push({ x: s * 175, y: 235, z: -1945, r: 105 });
  }
  puffs.push({ x: 520, y: 170, z: -1850, r: 215 }, { x: 395, y: 300, z: -1960, r: 135 }, { x: -430, y: 300, z: -1990, r: 200 }, { x: -350, y: 130, z: -1720, r: 160 });
  for (const f of FALLS) puffs.push({ x: f.x, y: 150, z: f.z + 40, r: 90 });
  group.userData.puffs = puffs;
  const mist = !meshClouds ? null : createMist([
    ...LEVELS.map(L => ({ x: rand(-150, 150), y: L.top - 30, z: L.z1 + 20, s: 700, o: 0.5 })),
    ...PILLARS.map(p => ({ x: p.x, y: 60, z: p.z + 80, s: 500, o: 0.55 })),
  ]);
  if (meshClouds) group.add(createCloudPuffs(puffs), mist);
  group.add(createForest(trees));

  group.userData.update = (t, dt) => {
    for (const f of falls) f.offset.y += dt * 0.35;
    mist?.userData.update(t);
  };
  return group;
}
