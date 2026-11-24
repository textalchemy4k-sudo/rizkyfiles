// Shared geometry helpers with no scene dependencies (safe to import from world.js and props.js).
import * as THREE from 'three/webgpu';
export const rbox = (w, h, d, r) => { r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4); const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const b = Math.min(r * 0.4, d * 0.3); const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-4, d - 2 * b), bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 6 }); g.translate(0, 0, -(d - 2 * b) / 2); return g; };
// I-beam (W6x9) cross-section, extruded along +y from 0 to len
export function ibeamGeo(len, d = 0.15, bf = 0.1, tf = 0.008, tw = 0.006) {
  const s = new THREE.Shape(); const hd = d / 2, hb = bf / 2, ht = tw / 2;
  s.moveTo(-hb, -hd); s.lineTo(hb, -hd); s.lineTo(hb, -hd + tf); s.lineTo(ht, -hd + tf); s.lineTo(ht, hd - tf); s.lineTo(hb, hd - tf); s.lineTo(hb, hd); s.lineTo(-hb, hd); s.lineTo(-hb, hd - tf); s.lineTo(-ht, hd - tf); s.lineTo(-ht, -hd + tf); s.lineTo(-hb, -hd + tf); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g;   // section in x-z, length along +y
}
