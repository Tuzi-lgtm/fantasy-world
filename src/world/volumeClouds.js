import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { cloudHeight } from './clouds.js';

// Raymarched cloud sea. The scene is rendered with depth, the cloud volume is marched
// at reduced resolution up to that depth, then composited back with a depth-aware upsample.
//
// Density = a baked top-height map (billow field + cloud towers stamped in) eroded near
// the surface by tiling 3D Worley noise. Light: Beer-Lambert + powder, two-lobe HG,
// multiple-scattering octaves, height-gradient ambient, hand-applied aerial fog.

export const CLOUD_QUALITY = { scale: 0.5, steps: 128 };

const MAP = 1024, S = 9000, CZ = -900;        // global map: warped grid, denser near the axis
const LOCAL = { cx: 0, hx: 1100, cz: -1100, hz: 1300 };   // linear high-res map over the realm
// Seeded, so the cloud towers land in the same place on every load.
let seed = 7;
const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rand = (a, b) => a + rnd() * (b - a);

// Map axes: texel index <-> world coordinate.
const warpAxis = (c) => ({
  coord: (k) => { const u = -1 + 2 * (k + 0.5) / MAP; return c + Math.sign(u) * u * u * S; },
  idx: (w) => Math.floor((Math.sign(w - c) * Math.sqrt(Math.min(Math.abs(w - c) / S, 1)) * 0.5 + 0.5) * MAP),
});
const linAxis = (c, half) => ({
  coord: (k) => c + (-1 + 2 * (k + 0.5) / MAP) * half,
  idx: (w) => Math.floor(((w - c) / half * 0.5 + 0.5) * MAP),
});

// Cloud towers: cauliflower clusters of ellipsoid domes (shared by both maps).
function towerBlobs(puffs) {
  const out = [];
  for (const s of puffs) {
    const n = Math.round(rand(9, 15));
    for (let b = 0; b < n; b++) {
      const up = rnd(), r = s.r * rand(0.28, 0.6) * (1 - up * 0.45) * 1.25;
      out.push({ x: s.x + rand(-1, 1) * s.r * (1.3 - up * 0.8), z: s.z + rand(-1, 1) * s.r * (1 - up * 0.6), y: s.y + up * s.r * 0.9, r });
    }
  }
  return out;
}

// Sea layer: RG half-float map. R: cloud top height. G: cos(slope), so "depth below top"
// becomes a distance to the surface on steep slopes.
function bakeSea(ax, az) {
  const h = new Float32Array(MAP * MAP);
  const xs = Float32Array.from({ length: MAP }, (_, j) => ax.coord(j));
  const zs = Float32Array.from({ length: MAP }, (_, i) => az.coord(i));
  for (let i = 0; i < MAP; i++) for (let j = 0; j < MAP; j++) h[i * MAP + j] = cloudHeight(xs[j], zs[i]).h;
  const data = new Uint16Array(MAP * MAP * 2), H = THREE.DataUtils.toHalfFloat;
  let max = -Infinity;
  for (let i = 0; i < MAP; i++) for (let j = 0; j < MAP; j++) {
    const k = i * MAP + j, jl = Math.max(j - 1, 0), jr = Math.min(j + 1, MAP - 1), il = Math.max(i - 1, 0), ir = Math.min(i + 1, MAP - 1);
    const gx = (h[i * MAP + jr] - h[i * MAP + jl]) / Math.max(xs[jr] - xs[jl], 1e-3);
    const gz = (h[ir * MAP + j] - h[il * MAP + j]) / Math.max(zs[ir] - zs[il], 1e-3);
    data[k * 2] = H(h[k]); data[k * 2 + 1] = H(1 / Math.sqrt(1 + gx * gx + gz * gz));
    max = Math.max(max, h[k]);
  }
  const tex = new THREE.DataTexture(data, MAP, MAP, THREE.RGFormat, THREE.HalfFloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return { tex, max };
}

// Cloud towers: a 3D distance field (metres inside each ellipsoid, smooth union),
// flatter on the underside. Byte = distance + 128.
const BOX = { x0: -1100, y0: -200, z0: -2400, sx: 2200, sy: 830, sz: 2600, nx: 256, ny: 96, nz: 304 };
function bakeTowers(blobs) {
  const { x0, y0, z0, sx, sy, sz, nx, ny, nz } = BOX, vx = sx / nx, vy = sy / ny, vz = sz / nz;
  const f = new Float32Array(nx * ny * nz).fill(-128);
  const smax = (a, b, k) => { const q = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + q * q * k * 0.25; };
  let top = -Infinity;
  for (const { x, y, z, r } of blobs) {
    const rx = r * 1.35, rz = r * 1.2, ry = r, ryb = r * 0.5, pad = 40;
    top = Math.max(top, y + ry);
    const lo = (w, o, v, n) => Math.max(0, Math.floor((w - o) / v)), hi = (w, o, v, n) => Math.min(n - 1, Math.ceil((w - o) / v));
    const i0 = lo(x - rx - pad, x0, vx), i1 = hi(x + rx + pad, x0, vx, nx);
    const j0 = lo(y - ryb - pad, y0, vy), j1 = hi(y + ry + pad, y0, vy, ny);
    const k0 = lo(z - rz - pad, z0, vz), k1 = hi(z + rz + pad, z0, vz, nz);
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = x0 + (i + 0.5) * vx, py = y0 + (j + 0.5) * vy, pz = z0 + (k + 0.5) * vz;
      const qx = (px - x) / rx, qy = (py - y) / (py < y ? ryb : ry), qz = (pz - z) / rz;
      const d = (1 - Math.sqrt(qx * qx + qy * qy + qz * qz)) * Math.min(rx, rz, py < y ? ryb : ry);
      const n = (k * ny + j) * nx + i;
      f[n] = smax(f[n], d, 18);
    }
  }
  const data = new Uint8Array(f.length);
  for (let n = 0; n < f.length; n++) data[n] = Math.max(0, Math.min(255, Math.round(f[n] + 128)));
  const tex = new THREE.Data3DTexture(data, nx, ny, nz);
  tex.format = THREE.RedFormat;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return { tex, max: top };
}

// Tiling Worley fbm, inverted so cells read as round billows.
function bakeNoise(N = 64) {
  const data = new Uint8Array(N * N * N);
  const octs = [[4, 0.6], [8, 0.27], [16, 0.13]].map(([c, w]) => ({ c, w, pts: Float32Array.from({ length: c * c * c * 3 }, Math.random) }));
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0;
    for (const { c, w, pts } of octs) {
      const px = x / N * c, py = y / N * c, pz = z / N * c;
      const ix = Math.floor(px), iy = Math.floor(py), iz = Math.floor(pz);
      let m = 9;
      for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const cx = ix + dx, cy = iy + dy, cz = iz + dz;
        const q = ((((cz % c) + c) % c) * c * c + (((cy % c) + c) % c) * c + (((cx % c) + c) % c)) * 3;
        const ex = cx + pts[q] - px, ey = cy + pts[q + 1] - py, ez = cz + pts[q + 2] - pz;
        m = Math.min(m, ex * ex + ey * ey + ez * ez);
      }
      v += w * (1 - Math.min(Math.sqrt(m), 1));
    }
    data[(z * N + y) * N + x] = Math.round(THREE.MathUtils.clamp(v, 0, 1) * 255);
  }
  const tex = new THREE.Data3DTexture(data, N, N, N);
  tex.format = THREE.RedFormat;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

// ---------- shaders ----------
const vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const march = (steps) => /* glsl */`
precision highp float;
precision highp sampler3D;
varying vec2 vUv;
uniform sampler2D tDepth, tHeight, tLocal;
uniform sampler3D tNoise, tTowers;
uniform mat4 projInv, camWorld;
uniform vec3 camPos, sunDir, sunCol, ambTop, ambBot, fogCol;
uniform float time, fogDensity, yMax, tMax;

const float S = ${S.toFixed(1)}, CZ = ${CZ.toFixed(1)}, YMIN = -420.0;
const float SIGMA = 0.055;          // extinction at full density (1/m)
const float PI4 = 12.566371;

const vec4 LOC = vec4(${LOCAL.cx.toFixed(1)}, ${LOCAL.cz.toFixed(1)}, ${LOCAL.hx.toFixed(1)}, ${LOCAL.hz.toFixed(1)});
const vec3 B0 = vec3(${BOX.x0.toFixed(1)}, ${BOX.y0.toFixed(1)}, ${BOX.z0.toFixed(1)}), BS = vec3(${BOX.sx.toFixed(1)}, ${BOX.sy.toFixed(1)}, ${BOX.sz.toFixed(1)});
vec2 topH(vec2 xz) {
  vec2 l = (xz - LOC.xy) / LOC.zw;
  if (max(abs(l.x), abs(l.y)) < 0.995) return textureLod(tLocal, l * 0.5 + 0.5, 0.0).rg;
  vec2 p = vec2(xz.x, xz.y - CZ) / S;
  vec2 u = sign(p) * sqrt(min(abs(p), 1.0));
  return textureLod(tHeight, u * 0.5 + 0.5, 0.0).rg;
}
float towers(vec3 p) {
  vec3 u = (p - B0) / BS;
  if (any(lessThan(u, vec3(0.0))) || any(greaterThan(u, vec3(1.0)))) return -1e4;
  return textureLod(tTowers, u, 0.0).r * 255.0 - 128.0;
}
// approx. distance inside the cloud (negative outside): sea layer or towers
float depthBelow(vec3 p, vec2 m) { return max((m.x - p.y) * m.y, towers(p)); }

float density(vec3 p, float h) {
  float base = clamp(h / 18.0, 0.0, 1.0);
  vec3 w = vec3(time * 1.2, 0.0, time * 0.6);
  float n = texture(tNoise, (p + w) / 150.0).r * 0.6 + texture(tNoise, (p + w * 1.6) / 46.0).r * 0.4;
  float edge = 1.0 - clamp(h / 75.0, 0.0, 1.0);          // erosion strongest at the surface
  return clamp((base - (1.0 - n) * 1.05 * edge) * 2.6, 0.0, 1.0);
}
float coarse(vec3 p) { vec2 th = topH(p.xz); return clamp(depthBelow(p, th) / 22.0, 0.0, 1.0); }

float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (PI4 * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }

void main() {
  float z = texture(tDepth, vUv).x;
  vec4 vp = projInv * vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0); vp /= vp.w;
  float tScene = z >= 1.0 ? 1e9 : length(vp.xyz);
  vec3 rd = normalize((camWorld * vec4(normalize(vp.xyz), 0.0)).xyz), ro = camPos;

  float t0 = 0.0, t1 = 1e9;
  if (abs(rd.y) > 1e-5) {
    float ta = (yMax - ro.y) / rd.y, tb = (YMIN - ro.y) / rd.y;
    t0 = max(min(ta, tb), 0.0); t1 = max(ta, tb);
  } else if (ro.y > yMax || ro.y < YMIN) t1 = -1.0;
  t1 = min(t1, min(tScene, tMax));
  if (t0 >= t1) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }

  float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float cosT = dot(rd, sunDir);
  float ph[3];
  for (int k = 0; k < 3; k++) {
    float c = pow(0.5, float(k));
    ph[k] = mix(hg(cosT, 0.65 * c), hg(cosT, -0.2 * c), 0.35);
  }

  float T = 1.0, tw = 0.0, ws = 0.0;
  vec3 L = vec3(0.0);
  float t = t0;
  bool first = true;
  for (int i = 0; i < ${steps}; i++) {
    if (t >= t1 || T < 0.01) break;
    vec3 p = ro + rd * t;
    vec2 th = topH(p.xz);
    float h = depthBelow(p, th);
    if (h < -1.0) { t += clamp(-h * 0.6, 1.0, 400.0); continue; }   // empty space above the surface
    float dt = clamp(t * 0.0055, 1.2, 45.0);
    if (first) { t += dt * jit; first = false; p = ro + rd * t; th = topH(p.xz); h = depthBelow(p, th); }
    float d = density(p, h);
    if (d > 0.002) {
      float sig = d * SIGMA;
      // optical depth toward the sun: one detailed sample + two coarse ones
      vec3 q0 = p + sunDir * 5.0;
      float od = density(q0, depthBelow(q0, topH(q0.xz))) * 8.0
               + coarse(p + sunDir * 18.0) * 20.0 + coarse(p + sunDir * 50.0) * 45.0
               + coarse(p + sunDir * 110.0) * 80.0;
      od *= SIGMA;
      // sky occlusion: crevices between billows sit below their neighbours' tops
      float nb = 0.25 * (topH(p.xz + vec2(48.0, 0.0)).x + topH(p.xz - vec2(48.0, 0.0)).x
                       + topH(p.xz + vec2(0.0, 48.0)).x + topH(p.xz - vec2(0.0, 48.0)).x);
      float ao = clamp(1.0 - (nb - p.y) / 42.0, 0.0, 1.0);
      ao *= ao;
      vec3 sun = vec3(0.0);
      for (int k = 0; k < 3; k++) {
        float a = pow(0.5, float(k)), b = pow(0.5, float(k));
        sun += a * exp(-od * b) * ph[k] * (k == 0 ? 1.0 : mix(0.08, 1.0, ao));
      }
      float powder = 1.0 - exp(-sig * 40.0);
      vec3 amb = mix(ambBot, ambTop, exp(-max(h, 0.0) / 28.0)) * mix(0.3, 1.0, ao);
      vec3 Sc = (sunCol * sun * mix(0.55, 1.0, powder) + amb) * sig;
      float Tr = exp(-sig * dt);
      L += T * (Sc - Sc * Tr) / sig;
      float a = T * (1.0 - Tr);
      tw += a * t; ws += a;
      T *= Tr;
    }
    t += dt;
  }
  // aerial perspective (matches the scene's FogExp2)
  float tm = ws > 0.0 ? tw / ws : t1;
  float f = exp(-pow(fogDensity * tm, 2.0));
  L = L * f + fogCol * (1.0 - T) * (1.0 - f);
  gl_FragColor = vec4(L, T);
}`;

const composite = /* glsl */`
#include <packing>
varying vec2 vUv;
uniform sampler2D tScene, tCloud, tDepth;
uniform vec2 cloudRes;
uniform float near, far;
float lin(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, near, far); }
void main() {
  vec4 sc = texture2D(tScene, vUv);
  float zc = lin(vUv);
  vec2 p = vUv * cloudRes - 0.5, f = fract(p), b = (floor(p) + 0.5) / cloudRes;
  vec4 acc = vec4(0.0); float ws = 0.0;
  for (int k = 0; k < 4; k++) {
    vec2 o = vec2(float(k - (k / 2) * 2), float(k / 2));
    vec2 uv = b + o / cloudRes;
    float wb = mix(1.0 - f.x, f.x, o.x) * mix(1.0 - f.y, f.y, o.y);
    float w = wb * (exp(-abs(lin(uv) - zc) / (0.03 * zc)) + 1e-3);
    acc += texture2D(tCloud, uv) * w; ws += w;
  }
  vec4 c = acc / max(ws, 1e-6);
  gl_FragColor = vec4(sc.rgb * c.a + c.rgb, 1.0);
}`;

// ---------- pass ----------
export class CloudPass extends Pass {
  constructor(scene, camera, { puffs = [], sunDir, sunColor, fog }) {
    super();
    this.scene = scene; this.camera = camera;
    const global = bakeSea(warpAxis(0), warpAxis(CZ));
    const local = bakeSea(linAxis(LOCAL.cx, LOCAL.hx), linAxis(LOCAL.cz, LOCAL.hz));
    const tw = bakeTowers(towerBlobs(puffs));
    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.sceneRT.depthTexture = new THREE.DepthTexture(1, 1, THREE.FloatType);
    this.cloudRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });

    const lin = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
    this.marchMat = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: march(CLOUD_QUALITY.steps), depthTest: false, depthWrite: false,
      uniforms: {
        tDepth: { value: this.sceneRT.depthTexture }, tHeight: { value: global.tex }, tLocal: { value: local.tex }, tTowers: { value: tw.tex }, tNoise: { value: bakeNoise() },
        projInv: { value: camera.projectionMatrixInverse }, camWorld: { value: camera.matrixWorld }, camPos: { value: new THREE.Vector3() },
        sunDir: { value: sunDir }, sunCol: { value: sunColor.clone().multiplyScalar(20) },
        ambTop: { value: lin('#9dbcf0', 0.5) }, ambBot: { value: lin('#506aa6', 0.2) },
        fogCol: { value: fog.color }, fogDensity: { value: fog.density * 0.5 },   // the sea stays readable out to the horizon
        time: { value: 0 }, yMax: { value: Math.max(global.max, local.max, tw.max) + 4 }, tMax: { value: camera.far * 0.95 },
      },
    });
    this.compMat = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: composite, depthTest: false, depthWrite: false,
      uniforms: {
        tScene: { value: this.sceneRT.texture }, tCloud: { value: this.cloudRT.texture }, tDepth: { value: this.sceneRT.depthTexture },
        cloudRes: { value: new THREE.Vector2() }, near: { value: camera.near }, far: { value: camera.far },
      },
    });
    this.quad = new FullScreenQuad(this.marchMat);
  }

  setSize(w, h) {
    this.sceneRT.setSize(w, h);
    const cw = Math.max(1, Math.round(w * CLOUD_QUALITY.scale)), ch = Math.max(1, Math.round(h * CLOUD_QUALITY.scale));
    this.cloudRT.setSize(cw, ch);
    this.compMat.uniforms.cloudRes.value.set(cw, ch);
  }

  update(t) { this.marchMat.uniforms.time.value = t; }

  render(renderer, writeBuffer) {
    renderer.setRenderTarget(this.sceneRT);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    this.marchMat.uniforms.camPos.value.setFromMatrixPosition(this.camera.matrixWorld);
    this.quad.material = this.marchMat;
    renderer.setRenderTarget(this.cloudRT);
    this.quad.render(renderer);

    this.quad.material = this.compMat;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  dispose() { this.sceneRT.dispose(); this.cloudRT.dispose(); this.marchMat.dispose(); this.compMat.dispose(); this.quad.dispose(); }
}
