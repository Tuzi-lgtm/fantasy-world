import * as THREE from 'three';

// Procedural, tileable water normal map (sum of periodic waves -> height -> normals).
export function createWaterNormals(size = 256) {
  const h = new Float32Array(size * size);
  const waves = Array.from({ length: 24 }, () => ({
    kx: Math.round((Math.random() - 0.5) * 16), ky: Math.round((Math.random() - 0.5) * 16),
    ph: Math.random() * Math.PI * 2,
  })).filter(w => w.kx || w.ky);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0;
    for (const w of waves) {
      const k = Math.hypot(w.kx, w.ky);
      v += Math.sin(((w.kx * x + w.ky * y) / size) * Math.PI * 2 + w.ph) / k;
    }
    h[y * size + x] = v;
  }
  const data = new Uint8Array(size * size * 4), s = 2.5;
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = new THREE.Vector3((at(x - 1, y) - at(x + 1, y)) * s, (at(x, y - 1) - at(x, y + 1)) * s, 1).normalize();
    const i = (y * size + x) * 4;
    data[i] = (n.x * 0.5 + 0.5) * 255; data[i + 1] = (n.y * 0.5 + 0.5) * 255; data[i + 2] = (n.z * 0.5 + 0.5) * 255; data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
