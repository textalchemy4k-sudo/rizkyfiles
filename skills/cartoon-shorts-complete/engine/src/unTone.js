// Card material that undoes the renderer's ACES tone mapping, so a 2D drawing lands on screen with exactly the colours
// it was drawn in (pure white stays white). three.js applies ACES to the whole frame in the output pass, so a card's
// "toneMapped: false" is not enough. ACES here is: c *= exposure / 0.6; c = IN * c; c = RRT(c); c = OUT * c.
// We invert each step: u = OUT^-1 * v; x = RRT^-1(u) (a quadratic, solved per channel); c = IN^-1 * x * 0.6 / exposure.
import * as THREE from 'three/webgpu';
import { texture, uniform, vec3, vec4, sqrt, max, min, Fn, float } from 'three/tsl';
const IN = new THREE.Matrix3().set(0.59719, 0.35458, 0.04823, 0.07600, 0.90834, 0.01566, 0.02840, 0.13383, 0.83777);
const OUT = new THREE.Matrix3().set(1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602);
const IN_INV = uniform(IN.clone().invert()), OUT_INV = uniform(OUT.clone().invert());
const invRRT = (u) => {   // solve (x(x+0.0245786) - 0.000090537) / (x(0.983729x + 0.4329510) + 0.238081) = u for x >= 0
  const A = float(1).sub(u.mul(0.983729)), B = float(0.0245786).sub(u.mul(0.432951)), C = float(-0.000090537).sub(u.mul(0.238081));
  return B.negate().add(sqrt(max(B.mul(B).sub(A.mul(C).mul(4)), 0))).div(A.mul(2));
};
export function unTonedCardMaterial(map, exposure = 1, extra = {}) {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: false, side: THREE.DoubleSide, fog: false, ...extra });
  const t = texture(map);
  m.colorNode = Fn(() => {
    const v = min(t.rgb, vec3(0.985));                       // ACES never quite reaches 1.0; 0.985 linear is ~0.993 sRGB
    const u = OUT_INV.mul(v);
    const x = vec3(invRRT(max(u.x, 0)), invRRT(max(u.y, 0)), invRRT(max(u.z, 0)));
    return vec4(max(IN_INV.mul(x), 0).mul(0.6 / exposure), t.a);
  })();
  m.opacityNode = t.a; m.alphaTest = 0.35; m.toneMapped = true;
  return m;
}
