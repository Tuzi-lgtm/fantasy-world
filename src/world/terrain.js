import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { G, plazaDistance, RIVER, COURT } from './layout.js';

const noise = new ImprovedNoise();
export const WORLD_SIZE = 1600;

function natural(x, z) {
  let h = 0, amp = 1, freq = 0.002;
  for (let i = 0; i < 5; i++) {
    h += noise.noise(x * freq, z * freq, 1.7) * amp;
    amp *= 0.5; freq *= 2;
  }
  const r = Math.hypot(x, z) / (WORLD_SIZE * 0.5);
  const bowl = Math.pow(Math.min(r, 1.2), 2.4) * 170;   // rim mountains
  return h * 40 + bowl - 4;
}

// Terrain height: natural valley, flattened under the palace, river carved in.
export function heightAt(x, z) {
  const d = plazaDistance(x, z);
  const m = 1 - THREE.MathUtils.smoothstep(d, 0, 140);
  let h = THREE.MathUtils.lerp(natural(x, z), G - 0.3, m);
  if (Math.abs(z - RIVER.z) < RIVER.w / 2 + 2 && Math.abs(x) < COURT.x) h = RIVER.bed;
  return h;
}

export function createTerrain() {
  const seg = 512;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const grass = new THREE.Color('#5a6b34'), moss = new THREE.Color('#34492c');
  const rock = new THREE.Color('#6e6a62'), snow = new THREE.Color('#e8ecf2'), sand = new THREE.Color('#9c8c62');

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    if (y < 0.8) c.copy(sand);
    else if (y < 40) c.copy(grass).lerp(moss, THREE.MathUtils.smoothstep(y, 8, 40));
    else if (y < 110) c.copy(moss).lerp(rock, THREE.MathUtils.smoothstep(y, 50, 90));
    else c.copy(rock).lerp(snow, THREE.MathUtils.smoothstep(y, 130, 160));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.receiveShadow = true;
  return mesh;
}
