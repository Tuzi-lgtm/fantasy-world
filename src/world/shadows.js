import * as THREE from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';

// Sun shadows over the whole realm.
//
// The sun and the geometry never move, so the cascades are not fitted to the view:
//  - two square maps centred on the camera (fine detail, then mid range), re-rendered
//    only when the camera has moved a tenth of their size;
//  - one map of the whole realm, rendered once.
// Standing still costs no shadow rendering at all. three's CSM helper supplies the
// lights and the shader patch that picks one map per fragment by view depth.

const UP = new THREE.Vector3(0, 1, 0);
const REALM = new THREE.Box3(new THREE.Vector3(-520, 0, -2300), new THREE.Vector3(520, 1000, 80));
const DIST = 2600;        // light distance from a camera-centred map (clears the cliff top)
const CORNER = 1.5;       // view distance / view depth at the corner of a wide frame
const MOVE = 0.1;         // re-render a map once the camera is this fraction of its half-size off centre

export function createSunShadows(scene, camera, { sunDir, color, intensity, quality = 1 }) {
  const near = [{ r: 40, size: 2048 }, { r: 380, size: 4096 }];
  const limit = near.map(c => c.r * (1 - MOVE) / CORNER);          // view depth each camera-centred map is good for
  const csm = new CSM({
    camera, parent: scene, cascades: near.length + 1, maxFar: camera.far, mode: 'custom',
    customSplitsCallback: (n, cn, far, out) => { for (const l of limit) out.push(l / (far - cn)); out.push(1); },
    lightDirection: sunDir.clone().negate(), lightIntensity: intensity,
  });
  const right = new THREE.Vector3().crossVectors(UP, sunDir).normalize(), up = new THREE.Vector3().crossVectors(sunDir, right);
  for (const l of csm.lights) { l.color.copy(color); l.shadow.autoUpdate = false; }

  // Bias in texels: enough for a 42 degree sun on level paving without detaching the rails' shadows.
  const setBias = (light, texel) => {
    const cam = light.shadow.camera;
    light.shadow.bias = -3 * texel / (cam.far - cam.near);
    light.shadow.normalBias = 1.5 * texel;
    cam.updateProjectionMatrix();
  };
  const aim = (light, centre, dist) => {
    light.target.position.copy(centre); light.position.copy(centre).addScaledVector(sunDir, dist);
    light.target.updateMatrixWorld(); light.updateMatrixWorld();
    light.shadow.needsUpdate = true;
  };

  near.forEach((c, i) => {
    const light = c.light = csm.lights[i], size = Math.round(c.size * quality);
    light.shadow.mapSize.set(size, size);
    Object.assign(light.shadow.camera, { left: -c.r, right: c.r, bottom: -c.r, top: c.r, near: 10, far: DIST + c.r + 300 });
    c.texel = 2 * c.r / size; c.centre = new THREE.Vector3(Infinity, 0, 0);
    setBias(light, c.texel);
  });

  // Whole-realm map: fit the light's frame round the realm box.
  const far = csm.lights[near.length], centre = REALM.getCenter(new THREE.Vector3()), p = new THREE.Vector3();
  const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = lo.clone().negate();
  for (let k = 0; k < 8; k++) {
    p.set(k & 1 ? REALM.max.x : REALM.min.x, k & 2 ? REALM.max.y : REALM.min.y, k & 4 ? REALM.max.z : REALM.min.z).sub(centre);
    const q = new THREE.Vector3(p.dot(right), p.dot(up), p.dot(sunDir));
    lo.min(q); hi.max(q);
  }
  const fsize = Math.round(4096 * quality), fdist = hi.z + 200;
  far.shadow.mapSize.set(fsize, fsize);
  Object.assign(far.shadow.camera, { left: lo.x, right: hi.x, bottom: lo.y, top: hi.y, near: 10, far: fdist - lo.z + 300 });
  setBias(far, Math.max(hi.x - lo.x, hi.y - lo.y) / fsize);
  aim(far, centre, fdist);

  const q = new THREE.Vector3();
  return {
    csm,
    // Patch every lit material under `root` (also call for assets loaded later).
    setup(root) {
      root.traverse(o => {
        for (const m of [].concat(o.material ?? [])) if (m.isMeshStandardMaterial && !m.defines?.USE_CSM) csm.setupMaterial(m);
      });
    },
    // Re-render every map (call when shadow-casting geometry is added, e.g. a loaded asset).
    refresh() { for (const l of csm.lights) l.shadow.needsUpdate = true; },
    update(pos) {
      for (const c of near) {
        if (pos.distanceTo(c.centre) < c.r * MOVE) continue;
        // snap to the map's texel grid so shadow edges don't crawl between re-renders
        const x = Math.round(pos.dot(right) / c.texel) * c.texel, y = Math.round(pos.dot(up) / c.texel) * c.texel;
        q.copy(right).multiplyScalar(x).addScaledVector(up, y).addScaledVector(sunDir, pos.dot(sunDir));
        c.centre.copy(pos);
        aim(c.light, q, DIST);
      }
    },
  };
}
