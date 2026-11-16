import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createTerrain, heightAt, WORLD_SIZE } from './world/terrain.js';
import { createTrees, createRocks, createCrystals, createFireflies } from './world/props.js';
import { createPalace } from './world/palace.js';
import { createFloatingTemples, createPeaks, createClouds } from './world/scenery.js';
import { walkHeight } from './world/collision.js';
import { SPAWN } from './world/layout.js';
import { createWaterNormals } from './world/waterNormals.js';
import { loadAssets } from './world/assets.js';
import { Player } from './player/player.js';
import './style.css';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.65;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// Density chosen so the main hall (~600 m from spawn) stays readable (~50% fog).
const fogColor = new THREE.Color('#c4c2ba');
scene.fog = new THREE.FogExp2(fogColor, 0.0012);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.3, 4000);
camera.position.set(SPAWN.x, walkHeight(SPAWN.x, SPAWN.z) + 1.7, SPAWN.z);

// ---------- Sky & light (golden hour) ----------
const sky = new Sky();
sky.scale.setScalar(7000);
const su = sky.material.uniforms;
su.turbidity.value = 6; su.rayleigh.value = 2.2; su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.85;
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(74), THREE.MathUtils.degToRad(35));
su.sunPosition.value.copy(sunDir);
scene.add(sky);

// Image-based ambient from the sky itself.
const pmrem = new THREE.PMREMGenerator(renderer);
const skyScene = new THREE.Scene(); skyScene.add(sky.clone());
scene.environment = pmrem.fromScene(skyScene).texture;
scene.environmentIntensity = 0.5;

const sun = new THREE.DirectionalLight('#ffd6a0', 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 1, far: 900 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight('#bcd4ff', '#3a2e22', 0.6));

// ---------- World ----------
scene.add(createTerrain());
const water = new Water(new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2), {
  textureWidth: 512, textureHeight: 512,
  waterNormals: createWaterNormals(),
  sunDirection: sunDir.clone(), sunColor: '#ffe2b8', waterColor: '#0e3a4a', distortionScale: 2.5, fog: true,
});
water.rotation.x = -Math.PI / 2;
water.position.y = 0;
scene.add(water);

const peaks = createPeaks();
scene.add(createPalace(), peaks.mesh);
scene.add(createTrees(peaks.tops.map(t => new THREE.Vector3(t.x, t.y, t.z))), createRocks(), createCrystals());
const islands = createFloatingTemples();
const clouds = createClouds();
const fireflies = createFireflies();
scene.add(islands, clouds, fireflies);
loadAssets(scene);

// ---------- Post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.6, 0.9));
composer.addPass(new OutputPass());

// ---------- Player ----------
const player = new Player(camera, renderer.domElement);
const overlay = document.getElementById('overlay');
const hud = document.getElementById('hud');
overlay.addEventListener('click', () => player.controls.lock());
player.controls.addEventListener('lock', () => overlay.classList.add('hidden'));
player.controls.addEventListener('unlock', () => overlay.classList.remove('hidden'));

addEventListener('resize', () => {
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

  // Shadow frustum follows the player.
  sun.target.position.copy(camera.position);
  sun.position.copy(camera.position).addScaledVector(sunDir, 450);

  water.material.uniforms.time.value += dt * 0.5;
  islands.userData.update(t);
  clouds.userData.update(dt);
  fireflies.userData.update(t);
  composer.render();

  frames++; fpsTime += dt;
  if (fpsTime > 0.5) {
    hud.textContent = `${Math.round(frames / fpsTime)} fps · ${player.flying ? 'flying' : 'walking'}`;
    frames = 0; fpsTime = 0;
  }
});

// Expose for debugging / screenshot automation.
window.__world = { scene, camera, player, renderer, water, composer };
