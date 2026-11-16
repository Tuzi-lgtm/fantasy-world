import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { heightAt } from './terrain.js';

// Loads your own assets listed in public/models/manifest.json.
// Each entry: { "file": "castle.glb", "position": [x, z], "scale": 1, "rotationY": 0, "yOffset": 0 }
// Y is snapped to the terrain unless "y" is given explicitly.
export async function loadAssets(scene) {
  let manifest;
  try {
    const res = await fetch('/models/manifest.json');
    if (!res.ok) return;
    manifest = await res.json();
  } catch { return; }

  const draco = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  const loader = new GLTFLoader().setDRACOLoader(draco);

  await Promise.all(manifest.map(async (e) => {
    try {
      const gltf = await loader.loadAsync(`/models/${e.file}`);
      const obj = gltf.scene;
      const [x, z] = e.position ?? [0, 0];
      obj.position.set(x, e.y ?? heightAt(x, z) + (e.yOffset ?? 0), z);
      obj.scale.setScalar(e.scale ?? 1);
      obj.rotation.y = e.rotationY ?? 0;
      obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(obj);
    } catch (err) {
      console.warn(`Failed to load ${e.file}`, err);
    }
  }));
}
