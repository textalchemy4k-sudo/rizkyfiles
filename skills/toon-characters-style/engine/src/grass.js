// Thin grass, ported from the studio's raw-WebGPU engine (story-shorts-webgpu B_GRASS) to three.js TSL: every blade is a
// tapered strip of ROWS segments, built in the vertex stage from per-blade data (base, height, yaw, lean, width, seed).
// Blades bend by lean and wind, half-turn toward the camera so they never vanish edge-on, and taper to a point. Colour
// runs dark at the root, mid green, light at the tip, with a few dry straw blades; it is lit by the scene like everything
// else, so it sits in the night. One draw call for hundreds of thousands of blades.
import * as THREE from 'three/webgpu';
import { Fn, uv, vec2, vec3, vec4, float, sin, cos, mix, smoothstep, normalize, cross, dot, pow, cameraPosition, instancedBufferAttribute, varying, transformNormalToView, uniform, fract, step } from 'three/tsl';
const ROWS = 6;
export function makeGrass(blades, opts = {}) {
  // blades: Float32Array of 8 per blade: x, y, z, h, yaw, lean, width, seed
  const n = blades.length / 8, geo = new THREE.InstancedBufferGeometry();
  const pos = [], uvs = [], idx = [];
  for (let r = 0; r < ROWS; r++) for (const u of [-1, 1]) { pos.push(0, 0, 0); uvs.push(u, r / (ROWS - 1)); }
  for (let r = 0; r < ROWS - 1; r++) { const a = r * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(idx);
  const A = new Float32Array(n * 4), B = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { for (let k = 0; k < 4; k++) { A[i * 4 + k] = blades[i * 8 + k]; B[i * 4 + k] = blades[i * 8 + 4 + k]; } }
  const aA = new THREE.InstancedBufferAttribute(A, 4), aB = new THREE.InstancedBufferAttribute(B, 4);
  geo.setAttribute('ga', aA); geo.setAttribute('gb', aB); geo.instanceCount = n;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -1000), 5000);
  const time = uniform(0);
  const mat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.8 });
  const a = instancedBufferAttribute(aA), b = instancedBufferAttribute(aB);
  const u = uv().x, v = uv().y;
  const base = a.xyz, h = a.w, yaw = b.x, lean = b.y, w = b.z, seed = b.w;
  const dir = vec3(cos(yaw), 0, sin(yaw));
  const vh = normalize(base.xz.sub(cameraPosition.xz));
  const S = normalize(mix(vec3(sin(yaw).negate(), 0, cos(yaw)), vec3(vh.y.negate(), 0, vh.x), 0.45));
  const wv = sin(time.mul(1.6).add(dot(base.xz, vec2(0.37, 0.23))).add(seed.mul(5))).mul(0.5).add(sin(time.mul(2.7).add(dot(base.xz, vec2(0.9, -0.4)))).mul(0.25));
  const ln = lean.add(wv.mul(opts.wind ?? 0.08));
  const p = base.add(vec3(0, h.mul(v).mul(float(1).sub(ln.mul(ln).mul(v).mul(0.35))), 0)).add(dir.mul(ln.mul(h).mul(v).mul(v))).add(S.mul(u.mul(w).mul(0.5).mul(pow(float(1).sub(v), 0.85))));
  mat.positionNode = p;
  const T = normalize(vec3(0, 1, 0).add(dir.mul(ln.mul(v).mul(2))));
  const nW = normalize(cross(S, T).add(S.mul(u).mul(0.45)));
  mat.normalNode = transformNormalToView(nW);
  // colour along the blade, a few dry blades, slight per-blade variation
  const sd = varying(seed), vv = varying(v);
  const dry = step(0.93, fract(sd.mul(13.7)));
  const lo = vec3(0.02, 0.06, 0.015), mid0 = vec3(0.10, 0.27, 0.06), tip0 = vec3(0.27, 0.45, 0.11);
  const mid = mix(mid0, vec3(0.48, 0.45, 0.16), dry).mul(float(0.8).add(fract(sd.mul(3.31)).mul(0.4))), tip = mix(tip0, vec3(0.66, 0.58, 0.25), dry);
  const alb = mix(mix(lo, mid, smoothstep(0, 0.45, vv)), tip, smoothstep(0.55, 1, vv));
  const lum = alb.x.mul(0.3).add(alb.y.mul(0.59)).add(alb.z.mul(0.11));
  mat.colorNode = mix(alb, vec3(lum, lum, lum).mul(vec3(0.95, 1.0, 1.05)), opts.desat ?? 0).mul(opts.tint ?? 1);
  mat.aoNode = mix(float(0.3), float(1), smoothstep(0, 0.7, vv));
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = false;
  mesh.userData.time = time;
  return mesh;
}
