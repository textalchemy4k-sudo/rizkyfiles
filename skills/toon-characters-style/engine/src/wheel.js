// A real road wheel built from profiles (no flat discs):
//   tyre    - lathe of a measured 275/55R20 cross-section: bead, rounded sidewall with a bulge, shoulder, tread crown;
//             tread blocks are separate bevelled blocks laid round the crown (they cast/receive light, not a texture)
//   rim     - lathe of the barrel: inner flange, bead seat, drop centre, outer bead seat, a thick rolled outer lip
//   face    - 6 bevelled spokes, each a tapered shape extruded and bent so the face is dished (concave), meeting a
//             domed centre hub with a chrome cap and 6 hex lug nuts on a raised bolt circle
//   brakes  - vented disc (two plates with vanes between), hat, and a caliper bridge that wraps the disc edge
// Axis: the wheel spins about local x; `side` = +1 for the right-hand wheels (outer face toward +x), -1 for the left.
import * as THREE from 'three/webgpu';
const V2 = (x, y) => new THREE.Vector2(x, y);
const lathe = (pts, seg = 96) => { const g = new THREE.LatheGeometry(pts.map(([r, x]) => V2(r, x)), seg); g.rotateZ(-Math.PI / 2); return g; };   // profile (radius, axial x) -> axis along x
export function makeWheel(side, M, opts = {}) {
  const R = opts.R ?? 0.405, W = opts.W ?? 0.275, RIM = opts.RIM ?? 0.254;
  const g = new THREE.Group();
  const rubber = new THREE.MeshStandardMaterial({ color: '#17171a', roughness: 0.86 });
  const rubberSide = new THREE.MeshStandardMaterial({ color: '#1e1e21', roughness: 0.7 });
  const paint = M.wheelPaint, lip = M.wheelLip, chrome = M.chrome;
  // ---------------------------------------------------------------- tyre carcass (sidewalls + crown), profile from inner bead to outer bead
  const h = W / 2, cr = R - 0.012;   // crown radius under the tread blocks
  // profile (radius, axial) from the inner bead round the crown to the outer bead
  const prof = [], sw = (t) => 0.018 * Math.sin(t * Math.PI) ** 0.8, sh = 0.03;
  for (let k = 0; k <= 12; k++) { const t = k / 12; prof.push([RIM + 0.004 + t * (cr - sh - RIM - 0.004), -(h - 0.012 + sw(t))]); }
  for (let k = 1; k <= 8; k++) { const a = Math.PI + k / 8 * Math.PI / 2; prof.push([cr - sh + sh * -Math.sin(a), -(h - sh) + sh * Math.cos(a)]); }
  for (let k = 1; k < 10; k++) prof.push([cr, -(h - sh) + k / 10 * (2 * (h - sh))]);
  for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI / 2; prof.push([cr - sh + sh * Math.cos(a), (h - sh) + sh * Math.sin(a)]); }
  for (let k = 12; k >= 0; k--) { const t = k / 12; prof.push([RIM + 0.004 + t * (cr - sh - RIM - 0.004), h - 0.012 + sw(t)]); }
  const carcass = new THREE.Mesh(lathe(prof, 120), rubberSide); carcass.material.side = THREE.DoubleSide; g.add(carcass);
  // tread: two rows of bevelled blocks with a centre groove, staggered, round the crown
  const blockGeo = (() => { const s = new THREE.Shape(), bw = 0.055, bl = 0.07, r = 0.008; s.moveTo(-bw / 2 + r, -bl / 2); s.lineTo(bw / 2 - r, -bl / 2); s.quadraticCurveTo(bw / 2, -bl / 2, bw / 2, -bl / 2 + r); s.lineTo(bw / 2 - 0.008, bl / 2 - r); s.quadraticCurveTo(bw / 2 - 0.008, bl / 2, bw / 2 - 0.008 - r, bl / 2); s.lineTo(-bw / 2 + 0.008 + r, bl / 2); s.quadraticCurveTo(-bw / 2 + 0.008, bl / 2, -bw / 2 + 0.008, bl / 2 - r); s.lineTo(-bw / 2, -bl / 2 + r); s.quadraticCurveTo(-bw / 2, -bl / 2, -bw / 2 + r, -bl / 2);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.011, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2, curveSegments: 3 }); return geo; })();
  const N = 54, rows = [-0.085, -0.03, 0.03, 0.085];
  const treads = new THREE.InstancedMesh(blockGeo, rubber, N * rows.length), Mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  // orient each block: local z (extrusion) points outward radially; build matrices directly
  let n = 0;
  rows.forEach((x, ri) => { for (let i = 0; i < N; i++) { const a = (i + (ri % 2) * 0.5) / N * Math.PI * 2, rad = new THREE.Vector3(0, Math.cos(a), Math.sin(a)), tan = new THREE.Vector3(0, -Math.sin(a), Math.cos(a)), ax = new THREE.Vector3(1, 0, 0);
    const rot = new THREE.Matrix4().makeBasis(ax.clone().multiplyScalar(ri % 2 ? 1 : -1).applyAxisAngle(rad, 0.35 * (ri < 2 ? 1 : -1)), tan, rad); const p = rad.clone().multiplyScalar(cr - 0.004).add(new THREE.Vector3(x, 0, 0)); rot.setPosition(p); treads.setMatrixAt(n++, rot); } });
  treads.castShadow = true; g.add(treads);
  // ---------------------------------------------------------------- rim barrel (lathe): flanges, bead seats, drop centre, rolled outer lip
  const barrel = [[RIM + 0.018, -h + 0.006], [RIM + 0.012, -h], [RIM - 0.002, -h + 0.012], [RIM - 0.004, -h + 0.04], [RIM - 0.03, -h + 0.06], [RIM - 0.034, -0.02], [RIM - 0.03, 0.03], [RIM - 0.006, h - 0.05], [RIM - 0.004, h - 0.016], [RIM + 0.004, h - 0.004], [RIM + 0.02, h + 0.004], [RIM + 0.024, h + 0.012], [RIM + 0.012, h + 0.02], [RIM - 0.004, h + 0.014]];
  const barrelM = new THREE.Mesh(lathe(barrel.map(([r, x]) => [r, x * side])), paint); barrelM.material.side = THREE.DoubleSide; g.add(barrelM);
  const lipM = new THREE.Mesh(new THREE.TorusGeometry(RIM + 0.014, 0.009, 12, 96), lip); lipM.rotation.y = Math.PI / 2; lipM.position.x = side * (h + 0.006); g.add(lipM);
  // ---------------------------------------------------------------- spokes: tapered, bevelled, dished toward the hub
  const faceX = side * (h - 0.02);
  const spokeShape = new THREE.Shape(); { const r0 = 0.075, r1 = RIM - 0.03, w0 = 0.07, w1 = 0.042; spokeShape.moveTo(r0, -w0 / 2); spokeShape.bezierCurveTo(r0 + 0.06, -w0 / 2 + 0.004, r1 - 0.05, -w1 / 2 - 0.006, r1, -w1 / 2 - 0.012); spokeShape.quadraticCurveTo(r1 + 0.014, 0, r1, w1 / 2 + 0.012); spokeShape.bezierCurveTo(r1 - 0.05, w1 / 2 + 0.006, r0 + 0.06, w0 / 2 - 0.004, r0, w0 / 2); spokeShape.closePath(); }
  const spokeGeo = new THREE.ExtrudeGeometry(spokeShape, { depth: 0.022, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 4, curveSegments: 12 });
  { const p = spokeGeo.attributes.position; for (let i = 0; i < p.count; i++) { const rr = p.getX(i), dish = -0.05 * (1 - (rr - 0.075) / (RIM - 0.105)); p.setZ(i, p.getZ(i) + dish); } spokeGeo.computeVertexNormals(); }
  for (let k = 0; k < 6; k++) {
    const sp = new THREE.Mesh(spokeGeo, paint); sp.castShadow = true;
    // spoke plane (r along local x, width along local y, depth local z) -> wheel: r radial in yz, depth along x
    const a = k / 6 * Math.PI * 2, rad = new THREE.Vector3(0, Math.cos(a), Math.sin(a)), tan = new THREE.Vector3(0, -Math.sin(a), Math.cos(a)), ax = new THREE.Vector3(side, 0, 0);
    const m = new THREE.Matrix4().makeBasis(rad, tan, ax); m.setPosition(faceX - side * 0.01, 0, 0); sp.applyMatrix4(m); g.add(sp);
  }
  // hub: a domed boss, raised bolt circle with hex lug nuts, chrome centre cap
  const hubProf = [[0.0, 0.0], [0.07, 0.0], [0.085, -0.012], [0.09, -0.03], [0.084, -0.05]].map(([r, x]) => [r, faceX - side * 0.055 + side * (0.03 + x)]);
  const hub = new THREE.Mesh(lathe(hubProf.map(([r, x]) => [r, x])), paint); hub.material.side = THREE.DoubleSide; g.add(hub);
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + Math.PI / 6, nut = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.022, 6), chrome); nut.rotation.z = Math.PI / 2; nut.position.set(faceX - side * 0.02, Math.cos(a) * 0.058, Math.sin(a) * 0.058); g.add(nut); }
  const capProf = []; for (let k = 0; k <= 10; k++) { const t = k / 10; capProf.push([0.042 * Math.cos(t * Math.PI / 2), side * 0.018 * Math.sin(t * Math.PI / 2)]); }
  const cap = new THREE.Mesh(lathe(capProf.map(([r, x]) => [r, faceX - side * 0.022 + x])), chrome); cap.material.side = THREE.DoubleSide; g.add(cap);
  // ---------------------------------------------------------------- brakes behind the spokes: vented disc, hat, caliper (caliper doesn't spin)
  const discMat = new THREE.MeshStandardMaterial({ color: '#8d9096', metalness: 0.85, roughness: 0.32 });
  const discX = side * (h - 0.11);
  for (const dx of [-0.012, 0.012]) { const plate = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.19, 64), discMat); plate.material.side = THREE.DoubleSide; plate.rotation.y = Math.PI / 2; plate.position.x = discX + dx; g.add(plate); }
  const vanes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.085, 0.006), discMat, 36), vm = new THREE.Matrix4();
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; vm.makeRotationX(a); vm.setPosition(discX, Math.cos(a) * 0.145, Math.sin(a) * 0.145); vanes.setMatrixAt(i, vm); } g.add(vanes);
  const hat = new THREE.Mesh(lathe([[0.1, discX], [0.095, discX + side * 0.03], [0.07, discX + side * 0.05], [0.0, discX + side * 0.05]]), discMat); hat.material.side = THREE.DoubleSide; g.add(hat);
  const caliper = new THREE.Group(); caliper.position.x = discX;
  const cs = new THREE.Shape(); cs.absarc(0, 0, 0.215, 0.35, 1.25, false); cs.absarc(0, 0, 0.165, 1.25, 0.35, true); cs.closePath();
  const cgeo = new THREE.ExtrudeGeometry(cs, { depth: 0.07, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 3, curveSegments: 16 }); cgeo.translate(0, 0, -0.035);
  const cal = new THREE.Mesh(cgeo, M.caliper); cal.rotation.y = Math.PI / 2; cal.castShadow = true; caliper.add(cal);
  g.userData.caliper = caliper;
  return g;
}
