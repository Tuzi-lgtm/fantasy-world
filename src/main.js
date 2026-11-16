import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createCloudSea } from './world/clouds.js';
import { createSkyRealm } from './world/skyrealm.js';
import { loadAssets } from './world/assets.js';
import { SPAWN, HERO } from './world/layout.js';
import { Player } from './player/player.js';
import './style.css';

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.55;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// Light aerial haze: horizon clouds fade out, the palace (~800 m) stays crisp.
scene.fog = new THREE.FogExp2('#c3d4ea', 0.00022);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.5, 9000);
// Title screen shows the hero framing; entering drops the player on the landing.
camera.position.set(...HERO.pos);
camera.lookAt(...HERO.look);

// ---------- Sky & light: high sun from the upper left, clear blue sky ----------
const sky = new Sky();
sky.scale.setScalar(16000);
const su = sky.material.uniforms;
su.turbidity.value = 2.2; su.rayleigh.value = 3; su.mieCoefficient.value = 0.002; su.mieDirectionalG.value = 0.8;
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(40), THREE.MathUtils.degToRad(255));
su.sunPosition.value.copy(sunDir);
scene.add(sky);

const pmrem = new THREE.PMREMGenerator(renderer);
const skyScene = new THREE.Scene(); skyScene.add(sky.clone());
scene.environment = pmrem.fromScene(skyScene).texture;
scene.environmentIntensity = 0.6;

const sun = new THREE.DirectionalLight('#fff3e2', 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 1, far: 1600 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.4;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight('#bcd6ff', '#9aa6b8', 0.7));

// ---------- World ----------
scene.add(createCloudSea());
const realm = createSkyRealm();
scene.add(realm);
loadAssets(scene);

// ---------- Post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
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
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ---------- Loop ----------
const clock = new THREE.Clock();
let frames = 0, fpsTime = 0;
const shadowCenter = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  player.update(dt);

  // Shadow frustum sits a little ahead of the camera, where the eye looks.
  camera.getWorldDirection(shadowCenter).setY(0).normalize().multiplyScalar(180).add(camera.position);
  sun.target.position.copy(shadowCenter);
  sun.position.copy(shadowCenter).addScaledVector(sunDir, 700);

  realm.userData.update?.(t, dt);
  composer.render();

  frames++; fpsTime += dt;
  if (fpsTime > 0.5) {
    hud.textContent = `${Math.round(frames / fpsTime)} fps · ${player.flying ? 'flying' : 'walking'}`;
    frames = 0; fpsTime = 0;
  }
});

window.__world = { scene, camera, player, renderer, composer };
