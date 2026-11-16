import * as THREE from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';

const noise = new ImprovedNoise();
export const WORLD_SIZE = 800;

// Fractal noise height field: a valley bowl with mountains around the rim.
export function heightAt(x, z) {
  let h = 0, amp = 1, freq = 0.004;
  for (let i = 0; i < 5; i++) {
    h += noise.noise(x * freq, z * freq, 1.7) * amp;
    amp *= 0.5; freq *= 2;
  }
  const r = Math.hypot(x, z) / (WORLD_SIZE * 0.5);
  const bowl = Math.pow(Math.min(r, 1.2), 2.2) * 90;   // rim mountains
  return h * 28 + bowl - 6;
}

export function createTerrain() {
  const seg = 256;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const grass = new THREE.Color('#4f6b32'), moss = new THREE.Color('#2f4a2a');
  const rock = new THREE.Color('#6b6560'), snow = new THREE.Color('#e8ecf2'), sand = new THREE.Color('#9c8c62');

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    if (y < 0.8) c.copy(sand);
    else if (y < 25) c.copy(grass).lerp(moss, THREE.MathUtils.smoothstep(y, 5, 25));
    else if (y < 55) c.copy(moss).lerp(rock, THREE.MathUtils.smoothstep(y, 25, 45));
    else c.copy(rock).lerp(snow, THREE.MathUtils.smoothstep(y, 55, 70));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.receiveShadow = true;
  return mesh;
}
