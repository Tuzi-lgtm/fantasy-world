import { heightAt } from './terrain.js';
import { colliders, G } from './layout.js';

// Height the player stands on at (x, z), given their current feet height.
export function walkHeight(x, z, feet = Infinity) {
  let h = heightAt(x, z);
  for (const c of colliders) {
    if (x < c.x0 || x > c.x1 || z < c.z0 || z > c.z1) continue;
    if (c.bottom !== undefined && feet < c.bottom - 0.5) continue;
    let top = c.top;
    if (c.ramp) {
      const r = c.ramp, t = (z - r.zLow) / (r.zHigh - r.zLow);
      top = r.yLow + (r.yHigh - r.yLow) * Math.min(Math.max(t, 0), 1);
    }
    if (c.arch) top = G + c.arch.rise * Math.sin(Math.PI * (z - c.arch.z0) / c.arch.len);
    if (c.priority) return top;
    h = Math.max(h, top);
  }
  return h;
}
