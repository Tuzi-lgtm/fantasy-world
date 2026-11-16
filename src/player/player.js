import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { SPAWN, VOID } from '../world/layout.js';
import { walkHeight } from '../world/collision.js';

const STEP = 1.0, DROP = 2.5, LIMIT = 3000, EYE = 1.7, WALK = 8, RUN = 18, FLY = 40, GRAVITY = 30, JUMP = 11;

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
    const ox = cam.position.x, oz = cam.position.z, feet = cam.position.y - EYE;
    this.controls.moveForward(fwd * speed * dt);
    this.controls.moveRight(side * speed * dt);

    // Anything taller than a step blocks (walls, terrace faces). Slide along axes.
    if (!this.flying) {
      const nx = cam.position.x, nz = cam.position.z;
      // Blocked: anything taller than a step, or (while grounded) a drop off an edge.
      const blocked = (x, z) => {
        const h = walkHeight(x, z, feet);
        return h > feet + STEP || (this.onGround && h < feet - DROP);
      };
      if (blocked(nx, nz)) {
        if (!blocked(nx, oz)) cam.position.z = oz;
        else if (!blocked(ox, nz)) cam.position.x = ox;
        else { cam.position.x = ox; cam.position.z = oz; }
      }
    }

    const ground = walkHeight(cam.position.x, cam.position.z, feet) + EYE;
    if (this.flying) {
      cam.position.y += ((k.Space ? 1 : 0) - (k.KeyC ? 1 : 0)) * speed * dt;
      if (ground > -Infinity) cam.position.y = Math.max(cam.position.y, ground);
    } else {
      if (k.Space && this.onGround) this.vel.y = JUMP;
      this.vel.y -= GRAVITY * dt;
      cam.position.y += this.vel.y * dt;
      this.onGround = cam.position.y <= ground;
      if (this.onGround) { cam.position.y = ground; this.vel.y = 0; }
    }

    cam.position.x = THREE.MathUtils.clamp(cam.position.x, -LIMIT, LIMIT);
    cam.position.z = THREE.MathUtils.clamp(cam.position.z, -LIMIT, LIMIT);
    if (cam.position.y < VOID) this.respawn();
  }

  respawn() {
    this.camera.position.set(SPAWN.x, SPAWN.y + EYE, SPAWN.z);
    this.vel.set(0, 0, 0); this.flying = false;
  }
}
