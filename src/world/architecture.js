import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// Palette + materials
// ---------------------------------------------------------------------------
export const COL = {
  marble: '#d6d0c2', marbleDark: '#bdb5a4', red: '#8a2318', column: '#a52a1c',
  teal: '#2b5c5e', tealDark: '#1d3f42', gold: '#c99b3b', soffit: '#3d5f5c',
  ridge: '#a8771c', plaque: '#1c2f5a', timber: '#9c3a22', timberDark: '#5e2216', slateRidge: '#2a323c',
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
  g.fillStyle = '#5c160f'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#c9963a'; g.lineWidth = 3;
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
  slate: new THREE.MeshStandardMaterial({ map: tileTex, color: '#55667a', roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide }),
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
  const ridgeCol = color === 'slate' ? COL.slateRidge : COL.ridge, soffitCol = color === 'slate' ? COL.timber : COL.soffit;
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

// ---------------------------------------------------------------------------
// Hall: plinth, colonnade, lattice front, bracket band, single/double hip roof.
// (x, y, z) = centre of the plinth bottom. Returns total height.
// ---------------------------------------------------------------------------
export function hall(kit, o) {
  const { x = 0, y = 0, z = 0, w, d, colH, bays = 9, double = true, roof = 'yellow', plaque = true, passage = 0 } = o;
  const bw = w / bays, cr = bw * 0.1, nd = Math.max(2, Math.round(d / bw)), bd = d / nd;
  const ph = o.plinthH ?? colH * 0.12, P = bw * 0.6;
  kit.box(w + 2 * P, ph, d + 2 * P, x, y + ph / 2, z, COL.marble);
  kit.box(w + 2 * P + 0.6, ph * 0.18, d + 2 * P + 0.6, x, y + ph * 0.91, z, COL.marbleDark);
  const y0 = y + ph;

  // columns
  const col = (cx, cz) => kit.add('paint', paint(
    new THREE.CylinderGeometry(cr, cr * 1.06, colH, 10).translate(x + cx, y0 + colH / 2, z + cz), COL.column));
  for (let i = 0; i <= bays; i++) for (const s of [-1, 1]) col(-w / 2 + i * bw, s * d / 2);
  for (let j = 1; j < nd; j++) for (const s of [-1, 1]) col(s * w / 2, -d / 2 + j * bd);

  // inner walls + lattice doors on the front
  const iw = w - bw * 1.1, id = d - bd * 1.1;
  if (passage) {   // walk-through gate hall: open centre bay
    const sw = (iw - passage) / 2, sx = passage / 2 + sw / 2;
    for (const sg of [-1, 1]) {
      kit.box(sw, colH, id, x + sg * sx, y0 + colH / 2, z, COL.red);
      for (const fz of [1, -1]) {
        const lat = new THREE.PlaneGeometry(sw - 0.2, colH * 0.92).translate(x + sg * sx, y0 + colH * 0.46, z + fz * (id / 2 + 0.05));
        if (fz < 0) lat.rotateY(0);
        const uv = lat.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * Math.max(1, Math.round((bays - 1) / 2)));
        kit.add('lattice', lat);
      }
    }
    kit.box(passage, colH * 0.25, id, x, y0 + colH * 0.875, z, COL.red);
  } else {
    kit.box(iw, colH, id, x, y0 + colH / 2, z, COL.red);
    const lat = new THREE.PlaneGeometry(iw - 0.2, colH * 0.92).translate(x, y0 + colH * 0.46, z + id / 2 + 0.05);
    const uv = lat.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (bays - 1));
    kit.add('lattice', lat);
  }

  // bracket band (architrave + dougong layer)
  const bh = colH * 0.3, yb = y0 + colH;
  kit.box(w + cr * 2.4, bh * 0.35, d + cr * 2.4, x, yb + bh * 0.175, z, COL.teal);
  kit.box(w + cr * 2.6, bh * 0.06, d + cr * 2.6, x, yb + bh * 0.33, z, COL.gold);
  kit.box(w + bw * 0.5, bh * 0.65, d + bw * 0.5, x, yb + bh * 0.675, z, COL.tealDark);
  const yr = yb + bh;

  const over = Math.min(bw * 1.1, colH * 0.45);
  const W = w / 2 + over, D = d / 2 + over;
  let top;
  if (double) {
    const sk = hipRoof(kit, { W, D, H: D * 0.55, t1: 0.42, color: roof, x, y: yr, z, inner: [w / 2 + bw * 0.25, d / 2 + bw * 0.25] });
    const ux = sk.hx + 0.2, uz = sk.hz + 0.2, uh = colH * 0.42;
    const yw = sk.topY;
    kit.box(ux * 2, uh + (sk.topY - yr), uz * 2, x, yr + (uh + sk.topY - yr) / 2, z, COL.red);
    kit.box(ux * 2 + 0.6, uh * 0.35, uz * 2 + 0.6, x, yw + uh - uh * 0.175 + uh * 0.35, z, COL.teal);
    if (plaque) {
      kit.box(bw * 1.3, uh * 0.75, 0.5, x, yw + uh * 0.55, z + uz + 0.3, COL.gold);
      kit.box(bw * 1.1, uh * 0.6, 0.6, x, yw + uh * 0.55, z + uz + 0.35, COL.plaque);
    }
    const y2 = yw + uh + uh * 0.35;
    const o2 = over * 0.9, W2 = ux + o2, D2 = uz + o2;
    top = hipRoof(kit, { W: W2, D: D2, H: D2 * 0.7, color: roof, x, y: y2, z, inner: [ux, uz] }).topY;
  } else {
    top = hipRoof(kit, { W, D, H: D * 0.7, color: roof, x, y: yr, z, inner: [w / 2 + bw * 0.25, d / 2 + bw * 0.25] }).topY;
  }
  return top - y;
}

// Pagoda: stacked storeys, each with a skirt roof, full roof on top.
export function pagoda(kit, { x = 0, y = 0, z = 0, w, floors = 5, colH, roof = 'green' }) {
  kit.box(w * 1.5, colH * 0.3, w * 1.5, x, y + colH * 0.15, z, COL.marble);
  let yy = y + colH * 0.3, s = w;
  for (let f = 0; f < floors; f++) {
    const h = f === 0 ? colH : colH * 0.6;
    kit.box(s, h, s, x, yy + h / 2, z, COL.red);
    for (const cx of [-1, 1]) for (const cz of [-1, 1])
      kit.add('paint', paint(new THREE.CylinderGeometry(s * 0.04, s * 0.04, h, 8).translate(x + cx * s / 2, yy + h / 2, z + cz * s / 2), COL.column));
    kit.box(s * 1.06, h * 0.18, s * 1.06, x, yy + h + h * 0.09, z, COL.teal);
    yy += h * 1.18;
    const D = s / 2 + s * 0.28;
    if (f === floors - 1) {
      hipRoof(kit, { W: D, D, R: 0, H: D * 1.1, color: roof, x, y: yy, z, inner: [s / 2, s / 2] });
    } else {
      const sk = hipRoof(kit, { W: D, D, R: 0, H: D * 0.8, t1: 0.42, color: roof, x, y: yy, z, inner: [s / 2, s / 2] });
      yy = sk.topY; s = Math.min(sk.hx * 2 + 0.4, s * 0.88);
    }
  }
}

// ---------------------------------------------------------------------------
// Balustrade between two base points (any direction, may slope).
// ---------------------------------------------------------------------------
const UP = new THREE.Vector3(0, 1, 0);
export function rail(kit, a, b, { h = 1.6, sp = 2.2, spouts = null, color = COL.marble } = {}) {
  const len = a.distanceTo(b); if (len < 0.5) return;
  const n = Math.max(1, Math.round(len / sp));
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(b, i / n);
    kit.box(0.4, h, 0.4, p.x, p.y + h / 2, p.z, color);
    kit.add('paint', paint(new THREE.IcosahedronGeometry(0.36, 0).scale(1, 1.25, 1).translate(p.x, p.y + h + 0.3, p.z), color));
    if (spouts) kit.box(0.5, 0.5, 0.5, p.x + spouts.x * 0.9, p.y - 0.7, p.z + spouts.z * 0.9, COL.marbleDark);
  }
  for (const yy of [h * 0.85, h * 0.12]) {
    const g = new THREE.BoxGeometry(0.28, 0.22, len);
    const m = new THREE.Matrix4().lookAt(a, b, UP).setPosition(a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, yy, 0)));
    kit.add('paint', paint(g.applyMatrix4(m), color));
  }
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Rectangle of rails at height y, with gaps on the front (+z) edge.
function railRect(kit, x0, x1, z0, z1, y, gaps = [], spouts = false) {
  const so = (dx, dz) => (spouts ? { x: dx, z: dz } : null);
  rail(kit, V(x0, y, z0), V(x1, y, z0), { spouts: so(0, -1) });
  rail(kit, V(x0, y, z0), V(x0, y, z1), { spouts: so(-1, 0) });
  rail(kit, V(x1, y, z0), V(x1, y, z1), { spouts: so(1, 0) });
  let x = x0;
  for (const [g0, g1] of gaps) { rail(kit, V(x, y, z1), V(g0, y, z1), { spouts: so(0, 1) }); x = g1; }
  rail(kit, V(x, y, z1), V(x1, y, z1), { spouts: so(0, 1) });
}

// ---------------------------------------------------------------------------
// Composite structures
// ---------------------------------------------------------------------------
// Three-tier marble terrace (xumizuo) with grand central stair.
export function terrace(kit, { cx, cz, w, d, tiers, tierH, inset, G, stairW, stairTopZ, stairLowZ }) {
  for (let k = 0; k < tiers; k++) {
    const hx = w / 2 - k * inset, hz = d / 2 - k * inset, y0 = G + k * tierH, y1 = y0 + tierH;
    kit.box(hx * 2, tierH * 0.12, hz * 2 + 0.01, cx, y0 + tierH * 0.06, cz, COL.marbleDark);           // base moulding
    kit.box(hx * 2 - 1.2, tierH * 0.76, hz * 2 - 1.2, cx, y0 + tierH * 0.5, cz, COL.marble);           // recessed waist
    kit.box(hx * 2 + 0.8, tierH * 0.12, hz * 2 + 0.8, cx, y1 - tierH * 0.06, cz, COL.marble);         // top lip
    railRect(kit, cx - hx + 0.6, cx + hx - 0.6, cz - hz + 0.6, cz + hz - 0.6, y1, [[-stairW / 2 - 0.5, stairW / 2 + 0.5]], true);
  }
  // grand stair: solid steps + central carved slab + flanking rails
  const rise = (tiers * tierH);
  const n = Math.round(rise / 0.35), run = (stairLowZ - stairTopZ) / n;
  for (let i = 0; i < n; i++) {
    const h = (n - i) * (rise / n);
    kit.box(stairW, h, run + 0.02, cx, G + h / 2, stairTopZ + (i + 0.5) * run, i % 2 ? COL.marble : COL.marbleDark);
  }
  const L = Math.hypot(stairLowZ - stairTopZ, rise), ang = Math.atan2(rise, stairLowZ - stairTopZ);
  const slab = new THREE.BoxGeometry(stairW * 0.32, 0.5, L).rotateX(ang)
    .translate(cx, G + rise / 2 + 0.2, (stairTopZ + stairLowZ) / 2);
  kit.add('paint', paint(slab, COL.marbleDark));
  for (const s of [-1, 1]) {
    const xr = cx + s * (stairW / 2 - 0.3);
    rail(kit, V(xr, G + rise, stairTopZ), V(xr, G, stairLowZ));
  }
}

// Fortress gate (Meridian-gate style): red masonry base with arched tunnels.
export function gateBase(kit, { z, w, d, h, tunnels, G }) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  for (const t of [...tunnels].sort((a, b) => a.x - b.x)) {
    const r = t.w / 2;
    s.lineTo(t.x - r, 0); s.lineTo(t.x - r, t.h - r);
    s.absarc(t.x, t.h - r, r, Math.PI, 0, true);
    s.lineTo(t.x + r, 0);
  }
  s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 16 })
    .translate(0, G, z - d / 2);
  kit.add('paint', paint(g, COL.red));
  kit.box(w + 1.5, 1.6, d + 1.5, 0, G + h + 0.8, z, COL.marble);
  kit.box(w + 0.6, 0.8, d + 0.6, 0, G + h - 0.4, z, COL.marbleDark);
  railRect(kit, -w / 2, w / 2, z - d / 2, z + d / 2, G + h + 1.6);
}

// Courtyard wall with tiled cap, axis aligned (from (x0,z0) to (x1,z1)).
export function wall(kit, x0, z0, x1, z1, { h, t, G, roof = 'yellow' }) {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const [bw, bd] = alongX ? [len, t] : [t, len];
  kit.box(bw + 0.4, 1.4, bd + 0.4, cx, G + 0.7, cz, COL.marble);
  kit.box(bw, h, bd, cx, G + h / 2, cz, COL.red);
  const W = len / 2 + 1.2, D = t / 2 + 1.4;
  kit.box(alongX ? len + 0.6 : t + 0.6, 1.2, alongX ? t + 0.6 : len + 0.6, cx, G + h + 0.6, cz, COL.teal);
  hipRoof(kit, { W, D, R: W - 1.5, H: D * 0.8, lift: D * 0.1, x: cx, y: G + h + 1.2, z: cz, rotY: alongX ? 0 : Math.PI / 2, inner: [len / 2, t / 2] });
}

// Arched marble bridge spanning the river along Z.
export function bridge(kit, { x, w, z, len, rise, G, bed }) {
  const s = new THREE.Shape(), half = len / 2, r = 6;
  s.moveTo(-half, 0);
  for (let i = 1; i <= 16; i++) { const u = -half + len * i / 16; s.lineTo(u, rise * Math.sin(Math.PI * i / 16)); }
  s.lineTo(half, bed - G); s.lineTo(r, bed - G);
  s.absarc(0, bed - G, r, 0, Math.PI, false);
  s.lineTo(-half, bed - G); s.lineTo(-half, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false, curveSegments: 12 })
    .rotateY(Math.PI / 2).translate(x - w / 2, G, z);
  kit.add('paint', paint(g, COL.marble));
  for (const sx of [-1, 1]) {
    const xr = x + sx * (w / 2 - 0.3);
    for (let i = 0; i < 8; i++) {
      const u0 = -half + len * i / 8, u1 = -half + len * (i + 1) / 8;
      const y0 = rise * Math.sin(Math.PI * i / 8), y1 = rise * Math.sin(Math.PI * (i + 1) / 8);
      rail(kit, V(xr, G + y0, z - u0), V(xr, G + y1, z - u1), { h: 1.3, sp: 3.3 });
    }
  }
}

// River banks: retaining walls + balustrades, gaps for bridges.
export function riverBanks(kit, { z, w, x0, x1, bridges, G, bed }) {
  for (const s of [-1, 1]) {
    const zb = z + s * (w / 2 + 1);
    kit.box(x1 - x0, G - bed, 2, (x0 + x1) / 2, (G + bed) / 2, zb, COL.marbleDark);
    let x = x0;
    for (const b of [...bridges].sort((a, c) => a.x - c.x)) {
      rail(kit, V(x, G, zb), V(b.x - b.w / 2 - 0.5, G, zb), { h: 1.3 }); x = b.x + b.w / 2 + 0.5;
    }
    rail(kit, V(x, G, zb), V(x1, G, zb), { h: 1.3 });
  }
}

// Monumental paifang: four pillars, three openings, tiled roofs.
export function paifang(kit, { z, center, side, pillar: p, h, G }) {
  const xi = center / 2 + p / 2, xo = center / 2 + p + side + p / 2, ho = h * 0.72;
  for (const s of [-1, 1]) {
    for (const [px, ph] of [[s * xi, h], [s * xo, ho]]) {
      kit.box(p * 1.8, 5, p * 1.8, px, G + 2.5, z, COL.marble);
      kit.box(p, ph, p, px, G + ph / 2, z, COL.column);
    }
    // side span
    const sx = s * (xi + xo) / 2, sw = xo - xi;
    kit.box(sw, 2.2, p * 0.8, sx, G + ho - 4, z, COL.teal);
    kit.box(sw, 0.4, p * 0.85, sx, G + ho - 2.7, z, COL.gold);
    kit.box(sw + p, 1.6, p * 1.3, sx, G + ho - 1.6, z, COL.tealDark);
    hipRoof(kit, { W: sw / 2 + p * 0.9, D: p * 1.3, H: p * 1.2, color: 'blue', x: sx, y: G + ho - 0.8, z, inner: [sw / 2, p * 0.6] });
  }
  // centre span, plaque, roof
  kit.box(2 * xi, 3, p * 0.8, 0, G + h - 6, z, COL.teal);
  kit.box(2 * xi, 0.5, p * 0.85, 0, G + h - 4.3, z, COL.gold);
  kit.box(2 * xi + p, 2, p * 1.4, 0, G + h - 3, z, COL.tealDark);
  kit.box(center * 0.5, 4.5, 0.6, 0, G + h - 9.8, z + p * 0.42, COL.gold);
  kit.box(center * 0.45, 3.8, 0.7, 0, G + h - 9.8, z + p * 0.45, COL.plaque);
  hipRoof(kit, { W: xi + p * 1.2, D: p * 1.5, H: p * 1.5, color: 'blue', x: 0, y: G + h - 2, z, inner: [xi, p * 0.7] });
}

// Open timber tower (pillar-top pavilion), proportioned from the reference:
// balcony deck wider than the storey, thin wide roofs (~0.2 x width overhang),
// short upper storeys, optional bracket corbel down to a narrower support.
export function tower(kit, { x = 0, y = 0, z = 0, w, floors = 3, colH, roof = 'slate', corbel = 0 }) {
  if (corbel) {
    const h = w * 0.16, steps = 4;
    for (let i = 0; i < steps; i++) {   // stepped bracket tiers, each wider than the last
      const t = (i + 1) / steps, ww = corbel + (w * 1.12 - corbel) * t;
      kit.box(ww, h / steps * 0.55, ww, x, y + h * (i + 0.72) / steps, z, i % 2 ? COL.timberDark : COL.timber);
      kit.box(ww * 0.96, h / steps * 0.45, ww * 0.96, x, y + h * (i + 0.22) / steps, z, COL.tealDark);
    }
    y += h;
  }
  let yy = y, s = w;
  for (let f = 0; f < floors; f++) {
    const h = f === 0 ? colH : colH * 0.62;
    const bal = s * 1.12, dk = Math.max(s * 0.022, 0.8);
    kit.box(bal, dk, bal, x, yy + dk / 2, z, COL.timberDark);
    kit.box(bal + 0.4, dk * 0.35, bal + 0.4, x, yy + dk * 0.15, z, COL.timber);
    yy += dk;
    const e = bal / 2 - 0.3, r = { color: COL.timber, h: 1.4, sp: 1.8 };
    rail(kit, V(x - e, yy, z - e), V(x + e, yy, z - e), r); rail(kit, V(x - e, yy, z + e), V(x + e, yy, z + e), r);
    rail(kit, V(x - e, yy, z - e), V(x - e, yy, z + e), r); rail(kit, V(x + e, yy, z - e), V(x + e, yy, z + e), r);
    const n = Math.max(3, Math.round(s / 15)), cr = Math.max(0.5, s * 0.009);
    for (let i = 0; i <= n; i++) for (const sd of [-1, 1]) {
      const t = -s / 2 + s * i / n;
      for (const [cx, cz] of [[t, sd * s / 2], [sd * s / 2, t]])
        kit.add('paint', paint(new THREE.CylinderGeometry(cr, cr * 1.1, h, 8).translate(x + cx, yy + h / 2, z + cz), COL.column));
    }
    // horizontal tie beams give the open red timber frame of the reference
    for (const yb of [h * 0.55, h * 0.92]) {
      kit.box(s, h * 0.05, 0.6, x, yy + yb, z + s / 2, COL.timber); kit.box(s, h * 0.05, 0.6, x, yy + yb, z - s / 2, COL.timber);
      kit.box(0.6, h * 0.05, s, x + s / 2, yy + yb, z, COL.timber); kit.box(0.6, h * 0.05, s, x - s / 2, yy + yb, z, COL.timber);
    }
    const core = new THREE.BoxGeometry(s * 0.8, h, s * 0.8).translate(x, yy + h / 2, z);
    const uv = core.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * Math.max(3, Math.round(s / 12)));
    kit.add('lattice', core);
    kit.box(s * 1.03, h * 0.1, s * 1.03, x, yy + h + h * 0.05, z, COL.timber);
    yy += h * 1.1;
    const D = s / 2 + s * 0.22;
    if (f === floors - 1) {
      hipRoof(kit, { W: D, D, R: D * 0.45, H: D * 0.42, color: roof, x, y: yy, z, inner: [s / 2, s / 2], lift: D * 0.12 });
    } else {
      const sk = hipRoof(kit, { W: D, D, R: 0, H: D * 0.36, t1: 0.42, color: roof, x, y: yy, z, inner: [s / 2, s / 2], lift: D * 0.12 });
      yy = sk.topY; s = s * 0.84;
    }
  }
}

// Stacked multi-storey palace (the reference's central building): each storey
// narrows (~0.82) under its own thin skirt roof; balconies on the upper storeys.
export function stackedHall(kit, { x = 0, y = 0, z = 0, w, d, floors = 4, colH, roof = 'slate' }) {
  const ph = colH * 0.15;
  kit.box(w + colH * 1.2, ph, d + colH * 1.2, x, y + ph / 2, z, COL.marble);
  let yy = y + ph, sw = w, sd = d;
  for (let f = 0; f < floors; f++) {
    const h = f === 0 ? colH : colH * 0.7, bw = 12;
    if (f > 0) {
      const e = [sw / 2 + 2, sd / 2 + 2], r = { color: COL.timber, h: 1.4, sp: 2 };
      kit.box(sw + 4, 0.8, sd + 4, x, yy + 0.4, z, COL.timberDark); yy += 0.8;
      rail(kit, V(x - e[0], yy, z + e[1]), V(x + e[0], yy, z + e[1]), r); rail(kit, V(x - e[0], yy, z - e[1]), V(x + e[0], yy, z - e[1]), r);
      rail(kit, V(x - e[0], yy, z - e[1]), V(x - e[0], yy, z + e[1]), r); rail(kit, V(x + e[0], yy, z - e[1]), V(x + e[0], yy, z + e[1]), r);
    }
    const nx = Math.max(3, Math.round(sw / bw)), nz = Math.max(2, Math.round(sd / bw));
    const col = (cx, cz) => kit.add('paint', paint(new THREE.CylinderGeometry(1.1, 1.2, h, 8).translate(x + cx, yy + h / 2, z + cz), COL.column));
    for (let i = 0; i <= nx; i++) for (const s2 of [-1, 1]) col(-sw / 2 + sw * i / nx, s2 * sd / 2);
    for (let j = 1; j < nz; j++) for (const s2 of [-1, 1]) col(s2 * sw / 2, -sd / 2 + sd * j / nz);
    const core = new THREE.BoxGeometry(sw - 3, h, sd - 3).translate(x, yy + h / 2, z);
    const uv = core.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * nx);
    kit.add('lattice', core);
    kit.box(sw + 2, h * 0.12, sd + 2, x, yy + h + h * 0.06, z, COL.timber);
    yy += h * 1.12;
    const over = colH * 0.55, W = sw / 2 + over, D = sd / 2 + over;
    if (f === floors - 1) {
      hipRoof(kit, { W, D, H: D * 0.55, color: roof, x, y: yy, z, inner: [sw / 2, sd / 2], lift: D * 0.12 });
    } else {
      const sk = hipRoof(kit, { W, D, H: D * 0.42, t1: 0.42, color: roof, x, y: yy, z, inner: [sw / 2, sd / 2], lift: D * 0.12 });
      yy = sk.topY; sw *= 0.82; sd *= 0.85;
    }
  }
  return yy - y;
}

export { MATS };
