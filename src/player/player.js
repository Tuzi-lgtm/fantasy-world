import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { heightAt, WORLD_SIZE } from '../world/terrain.js';

const EYE = 1.7, WALK = 8, RUN = 18, FLY = 40, GRAVITY = 30, JUMP = 11;

export class Player {
  constructor(camera, dom) {
    this.camera = camera;
    this.controls = new PointerLockControls(camera, dom);
    this.vel = new THREE.Vector3();
    this.keys = {};
    this.flying = false;
    this.onGround = false;
    addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyF') { this.flying = !this.flying; this.vel.y = 0; }
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
  }

  update(dt) {
    if (!this.controls.isLocked) return;
    const k = this.keys, cam = this.camera;
    const speed = this.flying ? FLY : (k.ShiftLeft || k.ShiftRight ? RUN : WALK);

    const fwd = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
    const side = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    this.controls.moveForward(fwd * speed * dt);
    this.controls.moveRight(side * speed * dt);

    const ground = heightAt(cam.position.x, cam.position.z) + EYE;
    if (this.flying) {
      cam.position.y += ((k.Space ? 1 : 0) - (k.KeyC ? 1 : 0)) * speed * dt;
      cam.position.y = Math.max(cam.position.y, ground);
    } else {
      if (k.Space && this.onGround) this.vel.y = JUMP;
      this.vel.y -= GRAVITY * dt;
      cam.position.y += this.vel.y * dt;
      this.onGround = cam.position.y <= ground;
      if (this.onGround) { cam.position.y = ground; this.vel.y = 0; }
    }

    const lim = WORLD_SIZE * 0.48;
    cam.position.x = THREE.MathUtils.clamp(cam.position.x, -lim, lim);
    cam.position.z = THREE.MathUtils.clamp(cam.position.z, -lim, lim);
  }
}
