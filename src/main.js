import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createCloudSea } from './world/clouds.js';
import { createSkyRealm } from './world/skyrealm.js';
import { CloudPass } from './world/volumeClouds.js';
import { createSunShadows } from './world/shadows.js';
import { loadAssets } from './world/assets.js';
import { SPAWN, HERO } from './world/layout.js';
import { Player } from './player/player.js';
import './style.css';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.52;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// Aerial haze: the palace (~1.5 km) sits in blue distance, the pillars stay crisp.
scene.fog = new THREE.FogExp2('#b9cde8', 0.00032);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.5, 14000);
// Title screen shows the hero framing; entering drops the player on the landing.
camera.position.set(...HERO.pos);
camera.lookAt(...HERO.look);

// ---------- Sky & light: warm sun from the upper right, raking slightly toward the camera ----------
// (measured off the reference: shadows fall to the left and a little toward the viewer, about as long as the figure)
const sky = new Sky();
sky.scale.setScalar(16000);
const su = sky.material.uniforms;
su.turbidity.value = 2.2; su.rayleigh.value = 3; su.mieCoefficient.value = 0.002; su.mieDirectionalG.value = 0.8;
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(48), THREE.MathUtils.degToRad(108));
su.sunPosition.value.copy(sunDir);

// Visible sky: a simple gradient dome (clear blue overhead, haze at the horizon).
// The physical Sky above only feeds the environment lighting.
const dome = new THREE.Mesh(new THREE.SphereGeometry(12000, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { horizon: { value: new THREE.Color('#d3e1f0') }, mid: { value: new THREE.Color('#79a8de') }, zenith: { value: new THREE.Color('#386fbe') } },
  vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
  fragmentShader: `uniform vec3 horizon, mid, zenith; varying vec3 vDir;
    void main(){ float e = max(vDir.y, 0.0);
      vec3 c = mix(horizon, mid, smoothstep(0.0, 0.2, e)); c = mix(c, zenith, smoothstep(0.2, 0.85, e));
      gl_FragColor = vec4(c, 1.0); }`,
}));
dome.renderOrder = -1;
scene.add(dome);

const pmrem = new THREE.PMREMGenerator(renderer);
const skyScene = new THREE.Scene(); skyScene.add(sky.clone());
scene.environment = pmrem.fromScene(skyScene).texture;
scene.environmentIntensity = 0.15;

// Key light: its colour and strength; the lights themselves live in the shadow rig (see below).
const SUN = { color: new THREE.Color('#ffe2bb'), intensity: 10 };   // strong key: roughly 12:1 over the fill
// Sky fill from above, bright bounce off the cloud sea from below (lights soffits and shaded facades).
scene.add(new THREE.HemisphereLight('#a9c8ff', '#efe3d2', 0.45));

// ---------- World ----------
// Volumetric clouds by default; ?clouds=mesh keeps the old opaque mesh clouds.
const MESH_CLOUDS = new URLSearchParams(location.search).get('clouds') === 'mesh';
if (MESH_CLOUDS) scene.add(createCloudSea());
const realm = createSkyRealm({ meshClouds: MESH_CLOUDS });
scene.add(realm);
// Sun shadows across the whole realm (?shadows=low halves the map sizes).
const shadows = createSunShadows(scene, camera, { sunDir, ...SUN, quality: new URLSearchParams(location.search).get('shadows') === 'low' ? 0.5 : 1 });
shadows.setup(scene);
loadAssets(scene, obj => { shadows.setup(obj); shadows.refresh(); });

// ---------- Post ----------
const composer = new EffectComposer(renderer);
const clouds = MESH_CLOUDS ? null : new CloudPass(scene, camera, { puffs: realm.userData.puffs, sunDir, sunColor: SUN.color, fog: scene.fog });
composer.addPass(clouds ?? new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.1, 0.4, 0.95));
composer.addPass(new OutputPass());

// ---------- Player ----------
const player = new Player(camera, renderer.domElement);
const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');
let entered = false;
overlay.addEventListener('click', () => {
  if (!entered) { entered = true; player.respawn(); camera.rotation.set(THREE.MathUtils.degToRad(-6), 0, 0, 'YXZ'); }
  player.controls.lock();
});
player.controls.addEventListener('lock', () => overlay.classList.add('hidden'));
player.controls.addEventListener('unlock', () => overlay.classList.remove('hidden'));

addEventListener('resize', () => {
  dome.position.copy(camera.position);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ---------- Loop ----------
const clock = new THREE.Clock();
let frames = 0, fpsTime = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  player.update(dt);

  shadows.update(camera.position);

  dome.position.copy(camera.position);
  realm.userData.update?.(t, dt);
  clouds?.update(t);
  composer.render();

  frames++; fpsTime += dt;
  if (fpsTime > 0.5) {
    hud.textContent = `${Math.round(frames / fpsTime)} fps · ${player.flying ? 'flying' : 'walking'}`;
    frames = 0; fpsTime = 0;
  }
});

window.__world = { scene, camera, player, renderer, composer, dome, clouds, shadows };
