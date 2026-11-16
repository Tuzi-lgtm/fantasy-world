import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { heightAt, WORLD_SIZE } from './terrain.js';

const rand = (a, b) => a + Math.random() * (b - a);

// Scatter N transforms on terrain within a height band.
function scatter(count, minH, maxH, radius = WORLD_SIZE * 0.45) {
  const out = [];
  let tries = 0;
  while (out.length < count && tries++ < count * 20) {
    const x = rand(-radius, radius), z = rand(-radius, radius);
    const y = heightAt(x, z);
    if (y > minH && y < maxH) out.push(new THREE.Vector3(x, y, z));
  }
  return out;
}

function instanced(geo, mat, points, scaleRange, { sink = 0, cast = true } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, points.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  points.forEach((p, i) => {
    const k = rand(...scaleRange);
    q.setFromEuler(new THREE.Euler(rand(-0.08, 0.08), rand(0, Math.PI * 2), rand(-0.08, 0.08)));
    s.set(k, k, k);
    m.compose(new THREE.Vector3(p.x, p.y - sink * k, p.z), q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

export function createTrees() {
  const trunk = new THREE.CylinderGeometry(0.25, 0.4, 3, 6).translate(0, 1.5, 0);
  const crowns = [0, 1, 2].map(i =>
    new THREE.ConeGeometry(2.4 - i * 0.6, 3.2, 7).translate(0, 3.6 + i * 1.6, 0));
  // Bake trunk/crown colors into vertex colors so one draw call covers all trees.
  const paint = (g, hex) => {
    const c = new THREE.Color(hex), n = g.attributes.position.count;
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).map((_, j) => [c.r, c.g, c.b][j % 3]), 3));
    return g;
  };
  const geo = mergeGeometries([paint(trunk, '#4a3426'), ...crowns.map(g => paint(g, '#1f3d2b'))]);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  return instanced(geo, mat, scatter(1400, 1.5, 40), [0.8, 1.8]);
}

export function createRocks() {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const mat = new THREE.MeshStandardMaterial({ color: '#77716a', roughness: 1, flatShading: true });
  return instanced(geo, mat, scatter(500, -2, 60), [0.4, 2.5], { sink: 0.4 });
}

// Glowing crystal clusters — the "magic" accent of the world.
export function createCrystals() {
  const group = new THREE.Group();
  const geo = new THREE.OctahedronGeometry(1, 0).scale(0.5, 2.2, 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color: '#6fe3ff', emissive: '#2bb8ff', emissiveIntensity: 2.2, roughness: 0.2, metalness: 0.1,
  });
  for (const p of scatter(18, 2, 30, WORLD_SIZE * 0.3)) {
    const cluster = new THREE.Group();
    const n = Math.floor(rand(3, 7));
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(geo, mat);
      c.position.set(rand(-1, 1), rand(0.5, 1.5), rand(-1, 1));
      c.rotation.set(rand(-0.5, 0.5), rand(0, 6), rand(-0.5, 0.5));
      c.scale.setScalar(rand(0.5, 1.4));
      cluster.add(c);
    }
    const light = new THREE.PointLight('#4cc9ff', 40, 25, 2);
    light.position.y = 2.5;
    cluster.add(light);
    cluster.position.copy(p);
    group.add(cluster);
  }
  return group;
}

// Floating islands drifting above the valley.
export function createFloatingIslands() {
  const group = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: '#5b544d', roughness: 1, flatShading: true });
  const topMat = new THREE.MeshStandardMaterial({ color: '#4f6b32', roughness: 1, flatShading: true });
  for (let i = 0; i < 9; i++) {
    const r = rand(6, 16);
    const island = new THREE.Group();
    const base = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.6, 9).rotateX(Math.PI), rockMat);
    base.position.y = -r * 0.8;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.95, 1.2, 9), topMat);
    base.castShadow = top.castShadow = true;
    island.add(base, top);
    const a = (i / 9) * Math.PI * 2, d = rand(80, 240);
    island.position.set(Math.cos(a) * d, rand(55, 110), Math.sin(a) * d);
    island.userData.phase = rand(0, Math.PI * 2);
    island.userData.baseY = island.position.y;
    group.add(island);
  }
  group.userData.update = (t) => {
    for (const isl of group.children) {
      isl.position.y = isl.userData.baseY + Math.sin(t * 0.3 + isl.userData.phase) * 2;
      isl.rotation.y += 0.0005;
    }
  };
  return group;
}

export function createFireflies(count = 600) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = rand(-200, 200), z = rand(-200, 200);
    pos.set([x, heightAt(x, z) + rand(0.5, 6), z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: '#ffe9a0', size: 0.35, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  const base = pos.slice();
  pts.userData.update = (t) => {
    const a = geo.attributes.position.array;
    for (let i = 0; i < count; i++) {
      a[i * 3] = base[i * 3] + Math.sin(t * 0.7 + i) * 0.8;
      a[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 1.3 + i * 2.1) * 0.5;
      a[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.6 + i) * 0.8;
    }
    geo.attributes.position.needsUpdate = true;
    mat.opacity = 0.6 + Math.sin(t * 2) * 0.3;
  };
  return pts;
}
