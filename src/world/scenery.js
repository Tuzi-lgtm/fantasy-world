import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { Kit, hall, pagoda } from './architecture.js';
import { heightAt } from './terrain.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const noise = new ImprovedNoise();
const rand = (a, b) => a + Math.random() * (b - a);

function rockGeo(r, h, seed) {
  const g = new THREE.ConeGeometry(r, h, 12, 8).rotateX(Math.PI);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y > h / 2 - 0.01) continue;   // keep top flat
    const k = 1 + 0.35 * noise.noise(x * 0.15, y * 0.15 + seed, z * 0.15);
    p.setXYZ(i, x * k, y, z * k);
  }
  g.computeVertexNormals();
  return g.translate(0, -h / 2, 0);
}

// Floating islands, most carrying temples or pagodas. Group bobs as a unit.
export function createFloatingTemples() {
  const group = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: '#5d5750', roughness: 1, flatShading: true });
  const grassMat = new THREE.MeshStandardMaterial({ color: '#4f6a34', roughness: 1 });
  const count = 10;
  for (let i = 0; i < count; i++) {
    const r = rand(16, 30);
    const island = new THREE.Group();
    const base = new THREE.Mesh(rockGeo(r, r * 2.4, i * 7), rockMat);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r, 1.5, 24).translate(0, 0.25, 0), grassMat);
    base.castShadow = top.castShadow = true; top.receiveShadow = true;
    island.add(base, top);

    const kit = new Kit(), kind = i % 5;
    if (kind === 1) pagoda(kit, { y: 1, w: r * 0.45, floors: 5, colH: r * 0.3 });
    else if (kind !== 4) hall(kit, { y: 1, w: r * 1.1, d: r * 0.7, colH: r * 0.22, bays: 5, double: kind !== 3, roof: kind === 2 ? 'green' : 'yellow' });
    if (kind !== 4) island.add(kit.build());

    const a = (i / count) * Math.PI * 2 + rand(-0.2, 0.2), dist = rand(300, 620);
    island.position.set(Math.cos(a) * dist, rand(110, 230), Math.sin(a) * dist - 80);
    island.rotation.y = Math.atan2(-island.position.x, -island.position.z + -80);  // face the palace
    island.userData = { phase: rand(0, 6.28), baseY: island.position.y };
    group.add(island);
  }
  group.userData.update = (t) => {
    for (const isl of group.children) isl.position.y = isl.userData.baseY + Math.sin(t * 0.25 + isl.userData.phase) * 3;
  };
  return group;
}

// Karst stone pillars ringing the valley (Zhangjiajie-style backdrop).
export function createPeaks() {
  const geos = [], tops = [];
  const rock = new THREE.Color('#6b6a63'), green = new THREE.Color('#3d5233');
  for (let i = 0; i < 46; i++) {
    const a = rand(0, Math.PI * 2), d = rand(520, 760);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (z > 300 && Math.abs(x) < 150) continue;   // keep the spawn view open-ish
    const h = rand(140, 320), r = rand(18, 42), y0 = heightAt(x, z) - 20;
    const g = new THREE.CylinderGeometry(r * rand(0.55, 0.8), r, h, 10, 14).translate(0, h / 2, 0);
    const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let j = 0; j < p.count; j++) {
      const px = p.getX(j), py = p.getY(j), pz = p.getZ(j);
      const k = 1 + 0.3 * noise.noise(px * 0.06 + i * 10, py * 0.02, pz * 0.06);
      p.setXYZ(j, px * k, py, pz * k);
      c.copy(rock).lerp(green, THREE.MathUtils.smoothstep(py / h, 0.8, 0.98) + 0.25 * Math.max(0, noise.noise(px * 0.1, py * 0.05, i)));
      col.set([c.r, c.g, c.b], j * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    geos.push(g.translate(x, y0, z));
    tops.push({ x, y: y0 + h, z, r: r * 0.55 });
  }
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  mesh.castShadow = mesh.receiveShadow = true;
  return { mesh, tops };
}

// Soft billboard clouds drifting at mid altitude.
export function createClouds() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = 64 + rand(-30, 30), y = 64 + rand(-12, 12), r = rand(20, 40);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const group = new THREE.Group();
  for (let i = 0; i < 70; i++) {
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: rand(0.5, 0.9), color: '#fff6ea' });
    const s = new THREE.Sprite(m);
    const a = rand(0, Math.PI * 2), d = rand(380, 820);
    s.position.set(Math.cos(a) * d, rand(70, 200), Math.sin(a) * d - 80);
    const k = rand(140, 320); s.scale.set(k, k * 0.35, 1);
    s.userData.speed = rand(0.5, 2);
    group.add(s);
  }
  group.userData.update = (dt) => { for (const s of group.children) { s.position.x += s.userData.speed * dt; if (s.position.x > 900) s.position.x -= 1800; } };
  return group;
}
