import { colliders } from './layout.js';

// Height the player stands on at (x, z), given their current feet height.
// No ground: outside every collider this is -Infinity (the void).
export function walkHeight(x, z, feet = Infinity) {
  let h = -Infinity;
  for (const c of colliders) {
    if (x < c.x0 || x > c.x1 || z < c.z0 || z > c.z1) continue;
    if (c.bottom !== undefined && feet < c.bottom - 0.5) continue;
    let top = c.top;
    if (c.ramp) {
      const r = c.ramp, t = (z - r.zLow) / (r.zHigh - r.zLow);
      top = r.yLow + (r.yHigh - r.yLow) * Math.min(Math.max(t, 0), 1);
    }
    if (c.taper) {   // half-width varies along z; a rail-high band just outside the edge
      const t = c.taper, k = Math.min(Math.max((z - t.z0) / (t.z1 - t.z0), 0), 1);
      const hw = t.hw0 + (t.hw1 - t.hw0) * k, ax = Math.abs(x);
      if (ax > hw + 1.2) continue;
      if (ax > hw) top += 4.4;
    }
    h = Math.max(h, top);
  }
  return h;
}
