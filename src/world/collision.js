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
    h = Math.max(h, top);
  }
  return h;
}
