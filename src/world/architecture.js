import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// Palette + materials
// ---------------------------------------------------------------------------
export const COL = {
  marble: '#dad5c8', marbleDark: '#bcb5a5', red: '#8a3220', column: '#bd4a2b',
  teal: '#2b5c5e', tealDark: '#1d3f42', gold: '#c99b3b', soffit: '#3d5f5c',
  ridge: '#a8771c', plaque: '#1c2f5a', timber: '#cc6238', timberDark: '#7a3320', slateRidge: '#262d36', rafter: '#96452a',
};

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// One glazed tile column per texture width; overlap line at the bottom.
const tileTex = canvasTex(64, 64, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0);
  [[0, '#3a3a3a'], [0.12, '#ffffff'], [0.45, '#e2e2e2'], [0.85, '#a0a0a0'], [1, '#3a3a3a']]
    .forEach(([o, c]) => gr.addColorStop(o, c));
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, h - 5, w, 5);
});

// Lattice doors, one bay per texture width.
const latticeTex = canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = '#7a2e1e'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#b86a3a'; g.lineWidth = 3;
  g.strokeRect(8, 8, w - 16, h - 16);
  g.save(); g.beginPath(); g.rect(14, 14, w - 28, h * 0.62); g.clip();
  g.lineWidth = 2;
  for (let i = -h; i < w + h; i += 14) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
    g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
  }
  g.restore();
  g.strokeRect(14, h * 0.7, w - 28, h * 0.24);
});

// Overlapping scales (bump map for the carved dragons).
const scaleTex = canvasTex(64, 64, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let r = -1; r < 3; r++) for (let c = -1; c < 3; c++) {
    const x = c * 32 + (r % 2 ? 16 : 0), y = r * 32;
    const gr = g.createRadialGradient(x + 16, y + 6, 2, x + 16, y + 6, 26);
    gr.addColorStop(0, '#f0f0f0'); gr.addColorStop(0.8, '#909090'); gr.addColorStop(1, '#202020');
    g.fillStyle = gr; g.beginPath(); g.arc(x + 16, y + 6, 24, 0, Math.PI); g.fill();
  }
});
scaleTex.colorSpace = THREE.NoColorSpace;

export const paving = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#8f8a80'; g.fillRect(0, 0, w, h);
  const rows = 8, cols = 4;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols + 1; c++) {
    const off = (r % 2) * (w / cols / 2);
    const v = 150 + Math.random() * 30;
    g.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
    g.fillRect(c * w / cols - off + 2, r * h / rows + 2, w / cols - 4, h / rows - 4);
  }
});
paving.repeat.set(1 / 12, 1 / 12);

const MATS = {
  paint: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }),
  lattice: new THREE.MeshStandardMaterial({ map: latticeTex, roughness: 0.7 }),
  yellow: new THREE.MeshStandardMaterial({ map: tileTex, color: '#e3a92b', roughness: 0.35, metalness: 0.15, side: THREE.DoubleSide }),
  green: new THREE.MeshStandardMaterial({ map: tileTex, color: '#3f8a5c', roughness: 0.35, metalness: 0.15, side: THREE.DoubleSide }),
  slate: new THREE.MeshStandardMaterial({ map: tileTex, color: '#46535f', roughness: 0.55, metalness: 0.1, side: THREE.DoubleSide }),
  carved: new THREE.MeshStandardMaterial({ color: '#e6e2d8', roughness: 0.62, bumpMap: scaleTex, bumpScale: 2.5 }),
  blue: new THREE.MeshStandardMaterial({ map: tileTex, color: '#3c5f9e', roughness: 0.35, metalness: 0.15, side: THREE.DoubleSide }),
};

// ---------------------------------------------------------------------------
// Kit: collects geometry per material, merges into few draw calls.
// ---------------------------------------------------------------------------
const norm = (g) => {
  if (g.index) g = g.toNonIndexed();
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
};

function paint(g, hex) {
  g = norm(g);
  g.deleteAttribute('uv');
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

export { paint };

export class Kit {
  constructor() { this.parts = {}; }
  add(mat, g) { (this.parts[mat] ??= []).push(mat === 'paint' ? g : norm(g)); return this; }
  box(w, h, d, x, y, z, hex) { return this.add('paint', paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), hex)); }
  build({ cast = true } = {}) {
    const group = new THREE.Group();
    for (const [mat, list] of Object.entries(this.parts)) {
      if (!list.length) continue;
      const mesh = new THREE.Mesh(mergeGeometries(list), MATS[mat]);
      mesh.castShadow = cast; mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }
}

// ---------------------------------------------------------------------------
// Hip roof (wudian) with concave profile and upturned corners.
// W, D: eave half-extents. R: ridge half-length. H: rise. t1 < 1 gives a skirt
// (lower eave of a double roof). Origin at eave level, centred.
// ---------------------------------------------------------------------------
export function hipRoof(kit, o) {
  const { W, D, H, t1 = 1, color = 'yellow', x = 0, y = 0, z = 0, inner, rotY = 0 } = o;
  const R = Math.max(o.R ?? W - D * 0.85, 0);
  const lift = o.lift ?? D * 0.16, flare = o.flare ?? D * 0.07, thk = o.thk ?? D * 0.05;
  const ridgeCol = color === 'slate' ? COL.slateRidge : COL.ridge, soffitCol = color === 'slate' ? COL.rafter : COL.soffit;
  const M = 12, N = 24, tileW = o.tileW ?? Math.max(D * 0.04, 0.6), slant = Math.hypot(D, H);
  const m4 = new THREE.Matrix4().makeRotationY(rotY).setPosition(x, y, z);

  const P = (side, a, t) => {
    const hx = W + (R - W) * t, hz = D * (1 - t);
    const c = Math.abs(a) ** 3, k = 1 - t;
    let px, pz;
    if (side < 2) { px = a * hx; pz = side === 0 ? hz : -hz; }
    else { px = side === 2 ? hx : -hx; pz = a * hz; }
    const out = flare * c * k * k;
    px += Math.sign(px) * out; pz += Math.sign(pz) * out;
    return [px, H * Math.pow(t, 1.7) + lift * c * Math.pow(k, 2.5), pz];
  };

  const grid = (rows, cols, fn, uvFn) => {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) {
      const p = fn(i, j); pos.push(...p); if (uvFn) uv.push(...uvFn(i, j, p));
    }
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j, b = a + cols + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (uvFn) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g.applyMatrix4(m4);
  };

  for (let s = 0; s < 4; s++) {
    // tiled top surface
    kit.add(color, grid(M, N, (i, j) => P(s, -1 + 2 * j / N, t1 * i / M),
      (i, j, p) => [(s < 2 ? p[0] : p[2]) / tileW, (t1 * i / M) * slant / (tileW * 1.6)]));
    // fascia + soffit back to the bracket band
    const [iw, id] = inner ?? [W * 0.8, D * 0.7];
    kit.add('paint', paint(grid(2, N, (i, j) => {
      const a = -1 + 2 * j / N, p = P(s, a, 0);
      if (i === 0) return p;
      if (i === 1) return [p[0], p[1] - thk, p[2]];
      return s < 2 ? [a * iw, -thk * 0.5, s === 0 ? id : -id] : [s === 2 ? iw : -iw, -thk * 0.5, a * id];
    }), soffitCol));
  }

  // hip ridges
  const rr = Math.max(D * 0.022, 0.15);
  for (const [s, a] of [[0, 1], [0, -1], [1, 1], [1, -1]]) {
    const pts = []; for (let i = 0; i <= 10; i++) pts.push(new THREE.Vector3(...P(s, a, t1 * i / 10)));
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, rr, 5).applyMatrix4(m4);
    kit.add('paint', paint(g, ridgeCol));
  }
  // main ridge + ornaments
  if (t1 >= 1) {
    const rh = Math.max(D * 0.07, 0.4), rw = rr * 2.4;
    if (R > 0.5) {
      kit.add('paint', paint(new THREE.BoxGeometry(2 * R + rw, rh, rw).translate(0, H + rh / 2 - rr, 0).applyMatrix4(m4), ridgeCol));
      for (const sx of [-1, 1]) // chiwen: tall end ornaments, curled inward
        kit.add('paint', paint(new THREE.BoxGeometry(rw * 1.4, rh * 2.6, rw * 1.6)
          .translate(sx * R, H + rh * 1.3, 0).applyMatrix4(m4), ridgeCol));
    } else {
      kit.add('paint', paint(new THREE.SphereGeometry(rh * 0.9, 10, 8).translate(0, H + rh, 0).applyMatrix4(m4), COL.gold));
      kit.add('paint', paint(new THREE.ConeGeometry(rh * 0.5, rh * 3, 8).translate(0, H + rh * 3, 0).applyMatrix4(m4), COL.gold));
    }
  }
  const hx = W + (R - W) * t1, hz = D * (1 - t1);
  return { topY: y + H * Math.pow(t1, 1.7), hx, hz };
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);

// Hexahedron from 8 corners: 0-3 at the +z end (x-,y- / x+,y- / x+,y+ / x-,y+), 4-7 at the -z end.
export function hexa(c) {
  const pos = [];
  for (const [a, b, d, e] of [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]])
    for (const i of [a, b, d, a, d, e]) pos.push(...c[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
// Slab centred on x whose half-width and top/bottom change linearly from zA (larger z) to zB.
export function taperSlab(kit, { zA, zB, hwA, hwB, yA0, yA1, yB0 = yA0, yB1 = yA1, cx = 0, color = COL.marble }) {
  return kit.add('paint', paint(hexa([
    [cx - hwA, yA0, zA], [cx + hwA, yA0, zA], [cx + hwA, yA1, zA], [cx - hwA, yA1, zA],
    [cx - hwB, yB0, zB], [cx + hwB, yB0, zB], [cx + hwB, yB1, zB], [cx - hwB, yB1, zB]]), color));
}

// Tube with a radius that varies along the curve (dragon bodies, trunks).
export function tubeR(curve, segs, radial, rFn, uvRep = [1, 1]) {
  const fr = curve.computeFrenetFrames(segs, false), pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, P = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i], r = rFn(t);
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2, c = Math.cos(a), s = -Math.sin(a);
      pos.push(P.x + r * (c * N.x + s * B.x), P.y + r * (c * N.y + s * B.y), P.z + r * (c * N.z + s * B.z));
      uv.push(t * uvRep[0], j / radial * uvRep[1]);
    }
  }
  for (let i = 1; i <= segs; i++) for (let j = 1; j <= radial; j++) {
    const a = (radial + 1) * (i - 1) + (j - 1), b = (radial + 1) * i + (j - 1), c = (radial + 1) * i + j, d = (radial + 1) * (i - 1) + j;
    idx.push(a, b, d, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Human-scale marble balustrade between two base points (any direction, may slope):
// capped posts, two rails and a solid carved panel between them.
// ---------------------------------------------------------------------------
export function rail(kit, a, b, { h = 3, sp = 2.4, color = COL.marble } = {}) {
  const len = a.distanceTo(b); if (len < 0.5) return;
  const n = Math.max(1, Math.round(len / sp));
  for (let i = 0; i <= n; i++) {   // tall capped posts, closely spaced, along every edge (proportions from the reference)
    const p = a.clone().lerp(b, i / n);
    kit.box(0.5, h, 0.5, p.x, p.y + h / 2, p.z, color);
    kit.box(0.66, 0.12, 0.66, p.x, p.y + h + 0.06, p.z, color);
    kit.add('paint', paint(new THREE.OctahedronGeometry(0.36, 1).scale(1, 1.5, 1).translate(p.x, p.y + h + 0.62, p.z), color));
  }
  // top rail well above eye level, carved panel below it: the view stays open between them
  const m = new THREE.Matrix4().lookAt(a, b, UP), mid = a.clone().lerp(b, 0.5);
  for (const [w, t, yy] of [[0.32, 0.22, h * 0.9], [0.12, h * 0.38, h * 0.27], [0.32, 0.18, h * 0.06]])
    kit.add('paint', paint(new THREE.BoxGeometry(w, t, len).applyMatrix4(m.clone().setPosition(mid.x, mid.y + yy, mid.z)), color));
}

// Architectural-scale timber railing (axis aligned, level): posts and three bars.
export function fence(kit, a, b, { h, n, color = COL.timber }) {
  const len = a.distanceTo(b), bar = h * 0.09, alongX = Math.abs(b.x - a.x) > Math.abs(b.z - a.z);
  n = Math.max(1, n ?? Math.round(len / (h * 1.3)));
  for (let i = 0; i <= n; i++) { const p = a.clone().lerp(b, i / n); kit.box(bar * 1.5, h, bar * 1.5, p.x, p.y + h / 2, p.z, color); }
  const mid = a.clone().lerp(b, 0.5);
  for (const yy of [0.95, 0.55, 0.14]) kit.box(alongX ? len : bar, bar, alongX ? bar : len, mid.x, mid.y + h * yy, mid.z, color);
}
const fenceRing = (kit, x, y, z, ex, ez, o) => {
  fence(kit, V(x - ex, y, z + ez), V(x + ex, y, z + ez), o); fence(kit, V(x - ex, y, z - ez), V(x + ex, y, z - ez), o);
  fence(kit, V(x - ex, y, z - ez), V(x - ex, y, z + ez), { ...o, n: o.nz ?? o.n }); fence(kit, V(x + ex, y, z - ez), V(x + ex, y, z + ez), { ...o, n: o.nz ?? o.n });
};
const column = (kit, x, y, z, r, h, hex = COL.column) =>
  kit.add('paint', paint(new THREE.CylinderGeometry(r, r * 1.08, h, 8).translate(x, y + h / 2, z), hex));
// Lattice-clad box: one door leaf per `nx` across the front and back.
function latticeBox(kit, w, h, d, x, y, z, nx) {
  const g = new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * nx);
  kit.add('lattice', g);
}
// Fit colH so a builder's total height hits `height` (builders are linear in colH).
const fitColH = (fn, o) => {
  const m = (c) => fn(new Kit(), { ...o, height: undefined, colH: c }), h1 = m(1), h2 = m(2);
  return 1 + (o.height - h1) / (h2 - h1);
};

// ---------------------------------------------------------------------------
// Palace hall with explicit proportions (measured off the reference frame).
// Body w x d on a marble plinth, columns colH, bracket band, then either one hip roof
// ({roofH, R}) or a skirt roof + clerestory + upper hip roof ({skirt, upper}).
// (x, y, z) = centre of the plinth bottom. Returns total height.
// ---------------------------------------------------------------------------
export function grandHall(kit, o) {
  const { x = 0, y = 0, z = 0, w, d, colH, bays = 9, over, roof = 'slate', passage = 0, plaque = true } = o;
  const bw = w / bays, nd = Math.max(2, Math.round(d / bw)), bd = d / nd, cr = Math.max(bw * 0.05, colH * 0.024);
  const ph = o.plinth ?? colH * 0.09, ap = o.apron ?? bw * 0.35;
  kit.box(w + 2 * ap + ph, ph * 0.5, d + 2 * ap + ph, x, y + ph * 0.25, z, COL.marbleDark);
  kit.box(w + 2 * ap, ph * 0.5, d + 2 * ap, x, y + ph * 0.75, z, COL.marble);
  const y0 = y + ph;
  for (let i = 0; i <= bays; i++) for (const s of [-1, 1]) column(kit, x - w / 2 + i * bw, y0, z + s * d / 2, cr, colH);
  for (let j = 1; j < nd; j++) for (const s of [-1, 1]) column(kit, x + s * w / 2, y0, z - d / 2 + j * bd, cr, colH);

  // walls set back behind the colonnade, lattice doors front and back
  const iw = w - bw * 0.9, id = d - bd * 0.9;
  if (passage) {
    const sw = (iw - passage) / 2, sx = passage / 2 + sw / 2;
    for (const sg of [-1, 1]) latticeBox(kit, sw, colH, id, x + sg * sx, y0, z, Math.max(1, Math.round((bays - 1) / 2)));
    kit.box(passage, colH * 0.22, id, x, y0 + colH * 0.89, z, COL.red);
  } else latticeBox(kit, iw, colH, id, x, y0, z, bays - 1);

  // architrave + stepped bracket band carrying the eave
  const bh = o.band ?? colH * 0.28, yb = y0 + colH;
  kit.box(w + cr * 2.4, bh * 0.3, d + cr * 2.4, x, yb + bh * 0.15, z, COL.teal);
  kit.box(w + cr * 2.6, bh * 0.05, d + cr * 2.6, x, yb + bh * 0.31, z, COL.gold);
  for (let k = 0; k < 3; k++) {
    const e = over * (0.25 + 0.25 * k) * 2;
    kit.box(w + e, bh * 0.22, d + e, x, yb + bh * (0.45 + 0.22 * k), z, k % 2 ? COL.timberDark : COL.tealDark);
  }
  const yr = yb + bh, W = w / 2 + over, D = d / 2 + over;
  let top;
  if (!o.skirt) {
    top = hipRoof(kit, { W, D, R: o.R, H: o.roofH ?? D * 0.55, lift: o.lift, color: roof, x, y: yr, z, inner: [w / 2, d / 2] }).topY;
  } else {
    const sk = hipRoof(kit, { W, D, R: o.skirt.R, H: o.skirt.H, t1: o.skirt.t1, lift: o.lift, color: roof, x, y: yr, z, inner: [w / 2, d / 2] });
    const u = o.upper, ux = sk.hx + 0.3, uz = sk.hz + 0.3, yw = sk.topY, wh = u.wall;
    latticeBox(kit, ux * 2, wh * 0.72, uz * 2, x, yw, z, bays - 2);
    const un = Math.max(3, bays - 2);
    for (let i = 0; i <= un; i++) for (const s of [-1, 1]) column(kit, x - ux + i * 2 * ux / un, yw, z + s * uz, cr * 0.8, wh * 0.72);
    kit.box(ux * 2 + cr * 2, wh * 0.1, uz * 2 + cr * 2, x, yw + wh * 0.77, z, COL.teal);
    kit.box(ux * 2 + u.over * 0.8, wh * 0.18, uz * 2 + u.over * 0.8, x, yw + wh * 0.91, z, COL.tealDark);
    if (plaque) {
      kit.box(bw * 0.8, wh * 0.62, 0.8, x, yw + wh * 0.4, z + uz + 0.5, COL.gold);
      kit.box(bw * 0.68, wh * 0.5, 0.9, x, yw + wh * 0.4, z + uz + 0.6, COL.plaque);
    }
    top = hipRoof(kit, { W: ux + u.over, D: uz + u.over, R: u.R, H: u.H, lift: u.lift, color: roof, x, y: yw + wh, z, inner: [ux, uz] }).topY;
  }
  return top - y;
}

// ---------------------------------------------------------------------------
// Wide multi-storey block: equal storeys, each under a thin skirt eave, barely
// stepping in; railed galleries on the upper storeys. Eaves land every `pitch`.
// ---------------------------------------------------------------------------
export function tieredBlock(kit, { x = 0, y = 0, z = 0, w, d, floors = 4, pitch, over, bays = 21, roof = 'slate', topH }) {
  const rise = pitch * 0.13, band = pitch * 0.1, dk = pitch * 0.035, ph = pitch * 0.06;
  kit.box(w + over * 1.6, ph, d + over * 1.6, x, y + ph / 2, z, COL.marble);
  let yy = y + ph, sw = w, sd = d;
  for (let f = 0; f < floors; f++) {
    const hh = pitch - rise - band - (f ? dk : ph), bw = sw / bays, nz = Math.max(2, Math.round(sd / bw));
    const cr = Math.max(bw * 0.05, hh * 0.03);
    if (f) {   // gallery deck + railing
      kit.box(sw + over * 0.9, dk, sd + over * 0.9, x, yy + dk / 2, z, COL.timberDark); yy += dk;
      fenceRing(kit, x, yy, z, sw / 2 + over * 0.4, sd / 2 + over * 0.4, { h: pitch * 0.1, n: bays * 2, nz: nz * 2 });
    }
    for (let i = 0; i <= bays; i++) for (const s of [-1, 1]) column(kit, x - sw / 2 + sw * i / bays, yy, z + s * sd / 2, cr, hh);
    for (let j = 1; j < nz; j++) for (const s of [-1, 1]) column(kit, x + s * sw / 2, yy, z - sd / 2 + sd * j / nz, cr, hh);
    latticeBox(kit, sw - bw * 0.5, hh, sd - bw * 0.5, x, yy, z, bays);
    kit.box(sw, hh * 0.05, 0.8, x, yy + hh * 0.52, z + sd / 2, COL.timber);
    kit.box(sw + cr * 2, band * 0.4, sd + cr * 2, x, yy + hh + band * 0.2, z, COL.tealDark);
    kit.box(sw + over * 0.8, band * 0.6, sd + over * 0.8, x, yy + hh + band * 0.7, z, COL.timberDark);
    yy += hh + band;
    const W = sw / 2 + over, D = sd / 2 + over;
    if (f === floors - 1) {
      yy = hipRoof(kit, { W, D, H: topH ?? D * 0.3, color: roof, x, y: yy, z, inner: [sw / 2, sd / 2], lift: D * 0.12 }).topY;
    } else {
      const t1 = (over + 0.5) / (0.85 * D);   // tuck the skirt back to the wall line
      const sk = hipRoof(kit, { W, D, H: rise / Math.pow(t1, 1.7), t1, color: roof, x, y: yy, z, inner: [sw / 2, sd / 2], lift: D * 0.1 });
      yy = sk.topY; sw = sk.hx * 2; sd = sk.hz * 2;
    }
  }
  return yy - y;
}

// ---------------------------------------------------------------------------
// Open timber pavilion tower (pillar tops, flank pavilions): galleried deck wider
// than the storey, tall two-level first storey, short upper storeys, thin roofs with
// a wide overhang (0.28 x width), bracket bands; optional corbel down to a support.
// Pass `height` to fit the storeys to a measured total. Returns total height.
// ---------------------------------------------------------------------------
export function tower(kit, o) {
  const { x = 0, y = 0, z = 0, w, floors = 3, roof = 'slate', corbel = 0 } = o;
  const bays = o.bays ?? (w > 60 ? 7 : w > 30 ? 5 : 3), colH = o.height ? fitColH(tower, o) : o.colH, bay0 = w / bays;
  let yy = y, s = w;
  if (corbel) {   // stepped bracket tiers flaring from the support to the deck
    const h = w * 0.075, steps = 4;
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / steps, ww = corbel + (w * 1.1 - corbel) * t;
      kit.box(ww, h / steps * 0.55, ww, x, yy + h * (i + 0.72) / steps, z, i % 2 ? COL.timberDark : COL.timber);
      kit.box(ww * 0.95, h / steps * 0.45, ww * 0.95, x, yy + h * (i + 0.22) / steps, z, COL.tealDark);
    }
    yy += h;
  }
  const hr = colH * 0.12, band = colH * 0.09;
  for (let f = 0; f < floors; f++) {
    const h = f === 0 ? colH : colH * 0.42, nb = Math.max(1, Math.round(s / bay0)), bay = s / nb;
    const bal = s + 2 * Math.min(bay * 0.45, s * 0.07), dk = colH * 0.035, cr = Math.max(bay * 0.045, h * 0.02);
    kit.box(bal, dk, bal, x, yy + dk / 2, z, COL.timberDark);
    kit.box(bal + dk * 0.6, dk * 0.4, bal + dk * 0.6, x, yy + dk * 0.8, z, COL.timber);
    yy += dk;
    fenceRing(kit, x, yy, z, bal / 2 - hr * 0.1, bal / 2 - hr * 0.1, { h: f ? hr * 0.8 : hr, n: nb * 3 });
    for (let i = 0; i <= nb; i++) for (const sd of [-1, 1]) {
      const t = -s / 2 + s * i / nb;
      column(kit, x + t, yy, z + sd * s / 2, cr, h);
      if (i && i < nb) column(kit, x + sd * s / 2, yy, z + t, cr, h);
    }
    // tie beams; the first storey has an upper gallery with its own railing
    for (const yb of f ? [0.9] : [0.4, 0.92]) {
      const bt = Math.max(h * 0.035, cr);
      kit.box(s, bt, bt, x, yy + h * yb, z + s / 2, COL.timber); kit.box(s, bt, bt, x, yy + h * yb, z - s / 2, COL.timber);
      kit.box(bt, bt, s, x + s / 2, yy + h * yb, z, COL.timber); kit.box(bt, bt, s, x - s / 2, yy + h * yb, z, COL.timber);
    }
    if (!f) fenceRing(kit, x, yy + h * 0.42, z, s / 2, s / 2, { h: hr * 0.8, n: nb * 3 });
    latticeBox(kit, s * 0.7, h, s * 0.7, x, yy, z, nb);
    kit.box(s + cr * 2, band * 0.3, s + cr * 2, x, yy + h + band * 0.15, z, COL.tealDark);
    const ov = s * (o.over ?? 0.28);
    for (let k = 0; k < 2; k++) kit.box(s + ov * (0.5 + 0.5 * k), band * 0.35, s + ov * (0.5 + 0.5 * k), x, yy + h + band * (0.475 + 0.35 * k), z, k ? COL.timberDark : COL.timber);
    yy += h + band;
    const D = s / 2 + ov;
    if (f === floors - 1) {
      yy = hipRoof(kit, { W: D, D, R: D * 0.4, H: D * 0.5, color: roof, x, y: yy, z, inner: [s / 2, s / 2], lift: D * 0.15 }).topY + D * 0.14;
    } else {
      yy = hipRoof(kit, { W: D, D, R: 0, H: D * 0.36, t1: 0.42, color: roof, x, y: yy, z, inner: [s / 2, s / 2], lift: D * 0.15 }).topY;
      s *= 0.86;
    }
  }
  return yy - y;
}

// Slender pagoda: stacked square storeys, each with a skirt roof, spire roof on top.
export function pagoda(kit, o) {
  const { x = 0, y = 0, z = 0, w, floors = 5, roof = 'slate' } = o, colH = o.height ? fitColH(pagoda, o) : o.colH;
  kit.box(w * 1.5, colH * 0.3, w * 1.5, x, y + colH * 0.15, z, COL.marble);
  let yy = y + colH * 0.3, s = w;
  for (let f = 0; f < floors; f++) {
    const h = f === 0 ? colH : colH * 0.6;
    latticeBox(kit, s, h, s, x, yy, z, 2);
    for (const cx of [-1, 1]) for (const cz of [-1, 1]) column(kit, x + cx * s / 2, yy, z + cz * s / 2, s * 0.05, h);
    kit.box(s * 1.08, h * 0.18, s * 1.08, x, yy + h + h * 0.09, z, COL.tealDark);
    yy += h * 1.18;
    const D = s / 2 + s * 0.3;
    if (f === floors - 1) {
      yy = hipRoof(kit, { W: D, D, R: 0, H: D * 1.1, color: roof, x, y: yy, z, inner: [s / 2, s / 2] }).topY + D * 0.3;
    } else {
      const sk = hipRoof(kit, { W: D, D, R: 0, H: D * 0.8, t1: 0.42, color: roof, x, y: yy, z, inner: [s / 2, s / 2] });
      yy = sk.topY; s *= 0.88;
    }
  }
  return yy - y;
}
