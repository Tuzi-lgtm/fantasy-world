import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createTerrain, heightAt, WORLD_SIZE } from './world/terrain.js';
import { createTrees, createRocks, createCrystals, createFloatingIslands, createFireflies } from './world/props.js';
import { createWaterNormals } from './world/waterNormals.js';
import { loadAssets } from './world/assets.js';
import { Player } from './player/player.js';
import './style.css';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const fogColor = new THREE.Color('#9fb3c8');
scene.fog = new THREE.FogExp2(fogColor, 0.0042);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 3000);
camera.position.set(0, heightAt(0, 60) + 1.7, 60);

// ---------- Sky & light (golden hour) ----------
const sky = new Sky();
sky.scale.setScalar(5000);
const su = sky.material.uniforms;
su.turbidity.value = 6; su.rayleigh.value = 2.2; su.mieCoefficient.value = 0.006; su.mieDirectionalG.value = 0.85;
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(82), THREE.MathUtils.degToRad(200));
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
Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 600 });
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

scene.add(createTrees(), createRocks(), createCrystals());
const islands = createFloatingIslands();
const fireflies = createFireflies();
scene.add(islands, fireflies);
loadAssets(scene);

// ---------- Post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.6, 0.6, 0.85));
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
  sun.position.copy(camera.position).addScaledVector(sunDir, 300);

  water.material.uniforms.time.value += dt * 0.5;
  islands.userData.update(t);
  fireflies.userData.update(t);
  composer.render();

  frames++; fpsTime += dt;
  if (fpsTime > 0.5) {
    hud.textContent = `${Math.round(frames / fpsTime)} fps · ${player.flying ? 'flying' : 'walking'}`;
    frames = 0; fpsTime = 0;
  }
});

// Expose for debugging / screenshot automation.
window.__world = { scene, camera, player };
