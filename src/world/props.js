import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { heightAt, WORLD_SIZE } from './terrain.js';
import { plazaDistance, COURT } from './layout.js';

const rand = (a, b) => a + Math.random() * (b - a);

// Scatter N transforms on terrain within a height band.
function scatter(count, minH, maxH, radius = WORLD_SIZE * 0.45) {
  const out = [];
  let tries = 0;
  while (out.length < count && tries++ < count * 20) {
    const x = rand(-radius, radius), z = rand(-radius, radius);
    const y = heightAt(x, z);
    if (plazaDistance(x, z) < 25) continue;
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

export function createTrees(extra = []) {
  // Chinese pine: tall trunk, flat layered crowns offset to one side.
  const trunk = new THREE.CylinderGeometry(0.3, 0.5, 7, 6).translate(0, 3.5, 0);
  const crowns = [[3.0, 4.2, 0.6], [2.4, 5.6, -0.5], [1.6, 6.9, 0.3]].map(([r, y, ox]) =>
    new THREE.CylinderGeometry(r * 0.8, r, 0.9, 8).translate(ox, y, ox * 0.5));
  // Bake trunk/crown colors into vertex colors so one draw call covers all trees.
  const paint = (g, hex) => {
    const c = new THREE.Color(hex), n = g.attributes.position.count;
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).map((_, j) => [c.r, c.g, c.b][j % 3]), 3));
    return g;
  };
  const geo = mergeGeometries([paint(trunk, '#3e2b20'), ...crowns.map(g => paint(g, '#2a4630'))]);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
  return instanced(geo, mat, [...scatter(2600, 1.5, 120), ...extra], [0.8, 1.8]);
}

export function createRocks() {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const mat = new THREE.MeshStandardMaterial({ color: '#77716a', roughness: 1, flatShading: true });
  return instanced(geo, mat, scatter(900, -2, 150), [0.6, 3.5], { sink: 0.4 });
}

// Glowing crystal clusters — the "magic" accent of the world.
export function createCrystals() {
  const group = new THREE.Group();
  const geo = new THREE.OctahedronGeometry(1, 0).scale(0.5, 2.2, 0.5);
  const mat = new THREE.MeshStandardMaterial({
    color: '#8ff0c0', emissive: '#2fd690', emissiveIntensity: 1.8, roughness: 0.2, metalness: 0.1,
  });
  for (const p of scatter(14, 2, 60, WORLD_SIZE * 0.4)) {
    const cluster = new THREE.Group();
    const n = Math.floor(rand(3, 7));
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(geo, mat);
      c.position.set(rand(-1, 1), rand(0.5, 1.5), rand(-1, 1));
      c.rotation.set(rand(-0.5, 0.5), rand(0, 6), rand(-0.5, 0.5));
      c.scale.setScalar(rand(0.5, 1.4));
      cluster.add(c);
    }
    cluster.position.copy(p);
    group.add(cluster);
  }
  return group;
}

export function createFireflies(count = 600) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = rand(-COURT.x, COURT.x), z = rand(COURT.zMin, COURT.zMax);
    pos.set([x, heightAt(x, z) + rand(0.5, 6), z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: '#ffd27a', size: 0.5, transparent: true, opacity: 0.9,
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
