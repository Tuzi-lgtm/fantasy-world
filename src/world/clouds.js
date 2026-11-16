import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const noise = new ImprovedNoise();
const rand = (a, b) => a + Math.random() * (b - a);
const crease = new THREE.Color('#5d7298'), top = new THREE.Color('#fffaf1'), mid = new THREE.Color('#d9e2ef');

// Shared cloud material: vertex colours carry height/crease shading, lights do the rest.
export const cloudMat = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 1, metalness: 0, emissive: '#3a4a66', emissiveIntensity: 0.05,
});

const shade = (c, t) => (t < 0.5 ? c.copy(crease).lerp(mid, t * 2) : c.copy(mid).lerp(top, (t - 0.5) * 2));

// Billow height field: |noise| gives rounded tops and sharp creases.
function cloudHeight(x, z) {
  const n1 = Math.abs(noise.noise(x * 0.0024, z * 0.0024, 3.1));
  const n2 = Math.abs(noise.noise(x * 0.0075, z * 0.0075, 7.7));
  const n3 = Math.abs(noise.noise(x * 0.02, z * 0.02, 1.3));
  const big = noise.noise(x * 0.0007, z * 0.0007, 5.5);
  let h = 60 * Math.sqrt(n1) + 36 * Math.sqrt(n2) + 15 * Math.sqrt(n3) + 45 * big - 72;
  // keep a lower trough under the causeway so the deck floats above the cloud
  if (z < 120 && z > -1350) h -= 50 * (1 - THREE.MathUtils.smoothstep(Math.abs(x), 20, 200));
  return { h, k: Math.sqrt(n2) * 0.6 + Math.sqrt(n3) * 0.4 };
}

// Opaque displaced cloud deck reaching the horizon. Grid is denser near the axis.
export function createCloudSea() {
  const N = 500, S = 9000, cz = -900;
  const pos = new Float32Array((N + 1) * (N + 1) * 3), col = new Float32Array(pos.length), c = new THREE.Color();
  const warp = (u) => Math.sign(u) * u * u * S;
  let p = 0;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const x = warp(-1 + 2 * j / N), z = warp(-1 + 2 * i / N) + cz;
    const { h, k } = cloudHeight(x, z);
    pos.set([x, h, z], p);
    shade(c, THREE.MathUtils.clamp(0.5 * THREE.MathUtils.smoothstep(h, -50, 50) + 0.6 * k - 0.1, 0, 1));
    col.set([c.r, c.g, c.b], p);
    p += 3;
  }
  const idx = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const a = i * (N + 1) + j, b = a + N + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, cloudMat);
  mesh.receiveShadow = true;
  return mesh;
}

// Billowing cloud towers: cauliflower clusters of lumpy spheres, smaller toward the top.
export function createCloudPuffs(spots) {
  const geos = [], c = new THREE.Color();
  for (const s of spots) {
    const n = Math.round(rand(9, 15));
    for (let i = 0; i < n; i++) {
      const up = Math.random();                       // 0 = base, 1 = crown
      const r = s.r * rand(0.28, 0.6) * (1 - up * 0.45);
      const ox = s.x + rand(-1, 1) * s.r * (1.3 - up * 0.8), oz = s.z + rand(-1, 1) * s.r * (1 - up * 0.6);
      const oy = s.y + up * s.r * 0.9;
      const g = new THREE.SphereGeometry(r, 26, 16).scale(1.35, 1, 1.2);
      g.deleteAttribute('uv');
      const p = g.attributes.position, col = new Float32Array(p.count * 3), f = 2.2 / r, seed = Math.random() * 50;
      for (let j = 0; j < p.count; j++) {
        const x = p.getX(j), y = p.getY(j), z = p.getZ(j);
        const b = Math.abs(noise.noise(x * f + seed, y * f, z * f)) + 0.5 * Math.abs(noise.noise(x * f * 2.3, y * f * 2.3 + seed, z * f * 2.3));
        let k = 1 + 0.32 * Math.sqrt(b);
        if (y < 0) k -= 0.35 * (-y / r);                // flatter bottoms
        p.setXYZ(j, x * k + ox, y * k + oy, z * k + oz);
        const t = 0.15 + 0.45 * ((y / r + 1) / 2) + 0.2 * up + 0.35 * Math.sqrt(b);
        shade(c, THREE.MathUtils.clamp(t, 0, 1));
        col.set([c.r, c.g, c.b], j * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      geos.push(g);
    }
  }
  const mesh = new THREE.Mesh(mergeGeometries(geos), cloudMat);
  mesh.receiveShadow = true;
  return mesh;
}

// Soft drifting mist sprites (accents only).
export function createMist(spots) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = 64 + rand(-30, 30), y = 64 + rand(-12, 12), r = rand(20, 40);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const group = new THREE.Group();
  for (const s of spots) {
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: s.o ?? 0.8, color: '#ffffff' });
    const sp = new THREE.Sprite(m);
    sp.position.set(s.x, s.y, s.z); sp.scale.set(s.s, s.s * 0.45, 1);
    sp.userData = { x0: s.x, ph: rand(0, 6.28) };
    group.add(sp);
  }
  group.userData.update = (t) => { for (const sp of group.children) sp.position.x = sp.userData.x0 + Math.sin(t * 0.05 + sp.userData.ph) * 15; };
  return group;
}
