import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Kit, COL, hall, pagoda, tower, rail } from './architecture.js';
import { createCloudPuffs, createMist } from './clouds.js';
import {
  SPAWN, DECK, CW, PAD, STAIR1, CAUSEWAY, LANDINGS, PILLARS, LEVELS, PALACE_STAIRS,
  PAGODA_SPIRES, CLIFF, FALLS, setColliderTop,
} from './layout.js';

const noise = new ImprovedNoise();
const rand = (a, b) => a + Math.random() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------------------
// Rock: noise-displaced tapered column with vertex colours (moss toward the top).
// ---------------------------------------------------------------------------
const ROCK = new THREE.Color('#7a766d'), ROCK_DARK = new THREE.Color('#5a5852'), MOSS = new THREE.Color('#4d6338');
function rock(x, z, y0, y1, r0, r1, { seed = Math.random() * 100, rough = 0.32, moss = 0.75 } = {}) {
  const h = y1 - y0;
  const g = new THREE.CylinderGeometry(r1, r0, h, 14, Math.max(6, Math.round(h / 12))).translate(0, h / 2, 0);
  g.deleteAttribute('uv');
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
    const k = 1 + rough * noise.noise(px * 0.04 + seed, py * 0.025, pz * 0.04) + 0.12 * noise.noise(px * 0.15, py * 0.1 + seed, pz * 0.15);
    p.setXYZ(i, px * k, py, pz * k);
    const t = py / h, n = noise.noise(px * 0.08, py * 0.06, seed);
    c.copy(ROCK_DARK).lerp(ROCK, 0.5 + 0.5 * n).lerp(MOSS, THREE.MathUtils.smoothstep(t + 0.25 * n, moss, 1));
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g.translate(x, y0, z);
}

// ---------------------------------------------------------------------------
// Stairs: solid-looking flight (steps on a sloped underside), along -Z.
// ---------------------------------------------------------------------------
function stairs(kit, { w, zHigh, zLow, yHigh, yLow }) {
  const rise = yHigh - yLow, n = Math.round(rise / 0.3), run = (zLow - zHigh) / n;
  for (let i = 0; i < n; i++) {
    const top = yHigh - i * (rise / n);
    kit.box(w, 4, run + 0.02, 0, top - 2, zHigh + (i + 0.5) * run, i % 2 ? COL.marble : COL.marbleDark);
  }
  // stringers + rails
  const L = Math.hypot(zLow - zHigh, rise), ang = Math.atan2(rise, zLow - zHigh);
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(1.2, 4.5, L).rotateX(ang).translate(s * (w / 2 + 0.6), (yHigh + yLow) / 2 - 0.8, (zHigh + zLow) / 2);
    kit.add('paint', paintGeo(g, COL.marble));
    rail(kit, V(s * (w / 2 + 0.6), yHigh + 1.4, zHigh), V(s * (w / 2 + 0.6), yLow + 1.4, zLow));
  }
}
// small local helper so stairs can add an arbitrary geometry with a flat colour
function paintGeo(g, hex) {
  g = g.toNonIndexed(); g.deleteAttribute('uv');
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

// Rectangle of rails with gaps on the -z and +z edges (x ranges).
function railRect(kit, x0, x1, z0, z1, y, { front = [], back = [] } = {}) {
  const edge = (zz, gaps) => { let x = x0; for (const [a, b] of gaps) { rail(kit, V(x, y, zz), V(a, y, zz)); x = b; } rail(kit, V(x, y, zz), V(x1, y, zz)); };
  edge(z0, back); edge(z1, front);
  rail(kit, V(x0, y, z0), V(x0, y, z1)); rail(kit, V(x1, y, z0), V(x1, y, z1));
}

// Bronze tripod censer (ding).
function censer(kit, x, y, z) {
  const bronze = '#5b4a2e';
  kit.box(6, 1, 6, x, y + 0.5, z, COL.marbleDark);
  kit.add('paint', paintGeo(new THREE.CylinderGeometry(2.2, 1.8, 2.6, 16).translate(x, y + 3.6, z), bronze));
  kit.add('paint', paintGeo(new THREE.CylinderGeometry(1.4, 2.3, 1.6, 16).translate(x, y + 5.7, z), bronze));
  kit.add('paint', paintGeo(new THREE.SphereGeometry(0.6, 10, 8).translate(x, y + 7, z), COL.gold));
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    kit.add('paint', paintGeo(new THREE.CylinderGeometry(0.3, 0.4, 2.4, 6).translate(x + Math.cos(a) * 1.4, y + 2.2, z + Math.sin(a) * 1.4), bronze));
  }
}

// Stone lantern.
function lantern(kit, x, y, z) {
  kit.box(1.6, 0.6, 1.6, x, y + 0.3, z, COL.marbleDark);
  kit.box(0.6, 3.2, 0.6, x, y + 2.2, z, COL.marble);
  kit.box(1.4, 1.4, 1.4, x, y + 4.5, z, COL.marble);
  kit.add('paint', paintGeo(new THREE.ConeGeometry(1.3, 1, 4).rotateY(Math.PI / 4).translate(x, y + 5.7, z), COL.marbleDark));
}

// Marble shaft with a dragon coiling around it.
function dragonPillar(kit, rocks, p) {
  const h = p.top - p.base;
  kit.add('paint', paintGeo(new THREE.CylinderGeometry(p.r * 0.92, p.r, h, 36, 1).translate(p.x, p.base + h / 2, p.z), COL.marble));
  // capital + base drum
  kit.box(p.r * 2.6, 5, p.r * 2.6, p.x, p.top - 2.5, p.z, COL.marble);
  kit.box(p.r * 2.9, 1.5, p.r * 2.9, p.x, p.top - 0.75, p.z, COL.marbleDark);
  for (const y of [p.top - 9, p.top - 12]) kit.add('paint', paintGeo(new THREE.CylinderGeometry(p.r * 1.12, p.r * 1.05, 2.5, 36).translate(p.x, y, p.z), COL.marbleDark));
  // dragon: helical body + spine ridge + head near the top
  const turns = 2.3, y0 = p.base + 30, y1 = p.top - 16, pts = [], spine = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120, a = t * turns * Math.PI * 2 + (p.x < 0 ? 0 : Math.PI);
    const rr = p.r + 3.5 + Math.sin(t * 37) * 0.8, y = y0 + (y1 - y0) * t + Math.sin(t * 19) * 2.5;
    pts.push(V(p.x + Math.cos(a) * rr, y, p.z + Math.sin(a) * rr));
    spine.push(V(p.x + Math.cos(a) * (rr + 3.6), y + 2.2, p.z + Math.sin(a) * (rr + 3.6)));
  }
  kit.add('paint', paintGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 4.2, 10), '#e9e5db'));
  kit.add('paint', paintGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spine), 400, 1.1, 5), COL.marbleDark));
  const hd = pts[pts.length - 1], dir = hd.clone().sub(pts[pts.length - 4]).normalize();
  const head = new THREE.BoxGeometry(7, 5, 11).lookAt(dir).translate(hd.x + dir.x * 5, hd.y + dir.y * 5 + 1, hd.z + dir.z * 5);
  kit.add('paint', paintGeo(head, '#e9e5db'));
  // pavilion on top
  tower(kit, { x: p.x, y: p.top, z: p.z, ...p.pavilion });
}

// Scrolling waterfall streak texture.
function fallTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 128, w = rand(1, 5), y = Math.random() * 512, h = rand(60, 300);
    g.fillStyle = `rgba(255,255,255,${rand(0.2, 0.7)})`;
    g.fillRect(x, y, w, h); g.fillRect(x, y - 512, w, h);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Bent pine on a rock (foreground framing).
function pine(kit, x, y, z) {
  const trunk = [V(0, 0, 0), V(1.5, 6, 0.5), V(-1, 12, 0), V(3, 17, -1), V(9, 21, -2), V(15, 23, -3)].map(v => v.add(V(x, y, z)));
  kit.add('paint', paintGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(trunk), 40, 1.1, 8), '#4a3626'));
  const pads = [[0.35, 3.6, 1.2], [0.5, 4.5, 1.3], [0.62, 4, 1.1], [0.76, 5, 1.3], [0.88, 4.4, 1.2], [1, 3.8, 1.1]];
  const curve = new THREE.CatmullRomCurve3(trunk);
  for (const [t, r, k] of pads) {
    const c = curve.getPoint(t);
    for (let i = 0; i < 5; i++) {
      const g = new THREE.SphereGeometry(r * rand(0.5, 0.9), 10, 6).scale(1.3, 0.32 * k, 1)
        .translate(c.x + rand(-r, r) * 0.8, c.y + rand(-0.5, 1.5), c.z + rand(-r, r) * 0.6);
      kit.add('paint', paintGeo(g, i % 2 ? '#2d4a2c' : '#3a5a34'));
    }
  }
}

// ---------------------------------------------------------------------------
export function createSkyRealm() {
  const kit = new Kit(), rocks = [];
  const group = new THREE.Group();

  // Spawn landing on a rock outcrop, with a pine framing the left of the view
  kit.box(PAD.x1 - PAD.x0, 4, PAD.z1 - PAD.z0, 0, PAD.top - 2, (PAD.z0 + PAD.z1) / 2, COL.marble);
  kit.box(CW - 2, 0.08, PAD.z1 - PAD.z0 - 2, 0, PAD.top + 0.04, (PAD.z0 + PAD.z1) / 2, COL.marbleDark);
  kit.box(CW - 4, 0.1, PAD.z1 - PAD.z0 - 4, 0, PAD.top + 0.06, (PAD.z0 + PAD.z1) / 2, COL.marble);
  kit.box(4, 0.12, PAD.z1 - PAD.z0 - 4, 0, PAD.top + 0.08, (PAD.z0 + PAD.z1) / 2, COL.marbleDark);
  rocks.push(rock(0, 8, -70, PAD.top - 4, 34, 18, { moss: 0.85 }));
  rocks.push(rock(-30, -2, -40, PAD.top + 2, 16, 8, { moss: 0.6 }));
  rocks.push(rock(24, -2, -50, PAD.top - 6, 14, 8, { moss: 0.6 }));
  pine(kit, -30, PAD.top + 1, -4);
  railRect(kit, PAD.x0, PAD.x1, PAD.z0, PAD.z1, PAD.top, { back: [[-CW / 2 - 0.6, CW / 2 + 0.6]] });
  stairs(kit, STAIR1);

  // Causeway: deck, inlaid centre strip, piers sinking into the cloud, rails
  const zA = CAUSEWAY.zStart, zB = CAUSEWAY.zEnd, len = zA - zB, hw = CW / 2 + 1.2;
  kit.box(hw * 2, 3, len, 0, DECK - 1.5, (zA + zB) / 2, COL.marble);
  kit.box(5, 0.1, len, 0, DECK + 0.05, (zA + zB) / 2, COL.marbleDark);
  kit.box(hw * 2 + 1, 1.2, len, 0, DECK - 3.6, (zA + zB) / 2, COL.marbleDark);
  for (let z = zA - 20; z > zB; z -= 46) {
    kit.box(hw * 2 - 2, 120, 9, 0, DECK - 64, z, COL.marble);
    kit.box(hw * 2 + 2, 3, 11, 0, DECK - 5.5, z, COL.marbleDark);
  }
  let z = zA;
  for (const L of LANDINGS) {
    for (const s of [-1, 1]) rail(kit, V(s * (CW / 2 + 0.6), DECK, z), V(s * (CW / 2 + 0.6), DECK, L.z1));
    z = L.z0;
    const cz = (L.z0 + L.z1) / 2;
    kit.box(L.hw * 2, 5, L.z1 - L.z0, 0, DECK - 2.5, cz, COL.marble);
    kit.box(L.hw * 2 + 1.5, 1.5, L.z1 - L.z0 + 1.5, 0, DECK - 5, cz, COL.marbleDark);
    kit.box(L.hw * 2 - 8, 120, L.z1 - L.z0 - 8, 0, DECK - 66, cz, COL.marble);
    const gap = [[-CW / 2 - 0.6, CW / 2 + 0.6]];
    railRect(kit, -L.hw + 0.5, L.hw - 0.5, L.z0 + 0.5, L.z1 - 0.5, DECK, { front: gap, back: gap });
    if (L.censer) censer(kit, 0, DECK, cz);
    if (L.lanterns) for (const sx of [-1, 1]) for (const sz of [-1, 1]) lantern(kit, sx * (L.hw - 4), DECK, cz + sz * 8);
  }
  for (const s of [-1, 1]) rail(kit, V(s * (CW / 2 + 0.6), DECK, z), V(s * (CW / 2 + 0.6), DECK, zB));

  // Dragon pillars with timber pavilions
  for (const p of PILLARS) dragonPillar(kit, rocks, p);

  // Stacked palace: rock-founded marble terraces, halls, axial stairs
  for (const [i, L] of LEVELS.entries()) {
    const cz = (L.z0 + L.z1) / 2, d = L.z1 - L.z0;
    kit.box(L.hw * 2, 10, d, 0, L.top - 5, cz, COL.marble);
    kit.box(L.hw * 2 + 2, 1.6, d + 2, 0, L.top - 0.8, cz, COL.marbleDark);
    kit.box(L.hw * 2 + 3, 2, d + 3, 0, L.top - 10, cz, COL.marbleDark);
    // clustered crags tapering down into the cloud
    rocks.push(rock(0, cz, -110, L.top - 9, L.hw * 0.45, L.hw * 0.95, { moss: 0.9, rough: 0.3 }));
    for (const sx of [-1, 1]) rocks.push(rock(sx * L.hw * 0.6, cz + rand(-10, 10), -60 - rand(0, 40), L.top - rand(12, 30), L.hw * 0.2, L.hw * 0.42, { moss: 0.85, rough: 0.4 }));
    const gap = [[-11, 11]];
    railRect(kit, -L.hw + 0.5, L.hw - 0.5, L.z0 + 0.5, L.z1 - 0.5, L.top, { front: gap, back: i < LEVELS.length - 1 ? gap : [] });
    for (const h of L.halls) {
      const ht = hall(kit, { ...h, y: L.top, double: true, roof: 'slate', plaque: !!h.main, bays: h.bays ?? 7 });
      if (h.main) setColliderTop('mainHall', L.top + ht);
    }
  }
  PALACE_STAIRS.forEach(s => stairs(kit, s));
  // rear pavilions on the top level, behind the main hall
  for (const sx of [-1, 1]) tower(kit, { x: sx * 62, y: LEVELS[2].top, z: -880, w: 18, floors: 3, colH: 8 });

  // Pagodas on rock spires
  for (const s of PAGODA_SPIRES) {
    rocks.push(rock(s.x, s.z, -90, s.top, s.w * 1.4, s.w * 0.9, { moss: 0.8 }));
    pagoda(kit, { x: s.x, y: s.top, z: s.z, w: s.w * 0.55, floors: s.floors, colH: s.w * 0.4, roof: 'slate' });
  }

  // Cliff massif behind the palace
  for (let i = 0; i < 16; i++) {
    const x = -420 + i * 56 + rand(-20, 20), zz = CLIFF.z - rand(0, 140) - Math.abs(x) * 0.15;
    const top = CLIFF.top * (1 - Math.abs(x) / 900) * rand(0.75, 1.05);
    rocks.push(rock(x, zz, -90, top, rand(70, 110), rand(30, 55), { rough: 0.4, moss: 0.55 }));
  }

  const rockMesh = new THREE.Mesh(mergeGeometries(rocks), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  rockMesh.castShadow = rockMesh.receiveShadow = true;
  group.add(kit.build(), rockMesh);

  // Waterfalls down the cliff face
  const ftex = fallTexture(), falls = [];
  for (const f of FALLS) {
    const t = ftex.clone(); t.needsUpdate = true; t.repeat.set(f.w / 40, 3);
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.9, color: '#f4f8ff', fog: true });
    const top = CLIFF.top * 0.85, mesh = new THREE.Mesh(new THREE.PlaneGeometry(f.w, top + 40), m);
    mesh.position.set(f.x, top / 2 - 20, CLIFF.z + 60);
    falls.push(t); group.add(mesh);
  }

  // Cloud towers: around pillar shafts, under the palace, at the falls' base
  const puffs = [];
  for (const p of PILLARS) for (let i = 0; i < 3; i++) puffs.push({ x: p.x + rand(-40, 40), y: rand(-40, -15), z: p.z + rand(-30, 30), r: rand(26, 40) });
  for (const L of LEVELS) for (const sx of [-1, 1]) puffs.push({ x: sx * (L.hw + rand(10, 40)), y: L.top - rand(55, 80), z: (L.z0 + L.z1) / 2, r: rand(35, 55) });
  for (const f of FALLS) puffs.push({ x: f.x, y: 10, z: CLIFF.z + 80, r: 60 });
  for (let i = 0; i < 10; i++) {
    const sx = Math.random() < 0.5 ? -1 : 1;
    puffs.push({ x: sx * rand(45, 200), y: rand(-30, 0), z: rand(-60, -480), r: rand(25, 50) });
  }
  group.add(createCloudPuffs(puffs));

  const mist = createMist([
    ...LEVELS.map(L => ({ x: rand(-60, 60), y: L.top - 15, z: L.z1 + 10, s: 260, o: 0.55 })),
    ...FALLS.map(f => ({ x: f.x, y: 60, z: CLIFF.z + 100, s: 220, o: 0.8 })),
    ...PILLARS.map(p => ({ x: p.x, y: 20, z: p.z + 30, s: 180, o: 0.6 })),
  ]);
  group.add(mist);

  group.userData.update = (t, dt) => {
    for (const f of falls) f.offset.y += dt * 0.35;
    mist.userData.update(t);
  };
  return group;
}
