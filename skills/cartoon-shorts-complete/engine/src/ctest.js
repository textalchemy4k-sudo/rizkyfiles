import * as THREE from 'three/webgpu';
import { buildWorld, RC, GX } from './world.js';
import { Toon2D } from './toon2d.js';
import { features } from './face2d.js';
import { CAST } from './cast.js';
import { CutoffSaw } from './saw.js';
const W = 1080, H = 1920;
const renderer = new THREE.WebGPURenderer({ antialias: true }); renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; document.body.appendChild(renderer.domElement); await renderer.init();
const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 9000);
const world = buildWorld(scene); world.setTime(0); world.cutGrooves(30, 0.6); world.grooves.push({ z: 0.3, p: 0.7, fresh: 1 }); world.setStripWindow(8, -6);
const names = Object.keys(CAST), guys = names.map((n) => { const t = new Toon2D(CAST[n]); scene.add(t.group); return t; });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const saw = new CutoffSaw(world.envDay); scene.add(saw.group);
window.renderFrame = async (f) => {
  if (f === 0) {   // line-up, standing, facing the camera, different feelings
    camera.position.set(RC + 2.6, 1.1, 5.2); camera.lookAt(RC + 2.6, 0.85, 0); camera.updateMatrixWorld(); saw.group.visible = false;
    const E = [{ joy: 0.3 }, { doubt: 0.5 }, { effort: 0.4 }, { joy: 0.9 }, { doubt: 0.7, tired: 0.2 }];
    guys.forEach((g, i) => { const x = RC + 0.6 + i * 1.0; g.group.visible = true; g.pose({ root: V3(x, 0, 0), yaw: (i - 2) * 0.25, crouch: 0.05, bend: 0, feet: { L: { pos: V3(x - 0.1, 0.02, 0), yaw: 0 }, R: { pos: V3(x + 0.1, 0.02, 0), yaw: 0 } }, lookAt: camera.position.clone(), face: features(E[i]), sun: world.sunDir, t: 0 }); g.draw(camera); });
  } else {   // the hero kneeling at the shoulder, cutting a groove
    guys.forEach((g, i) => (g.group.visible = i === 0)); saw.group.visible = true;
    const hz = 0.3, sx = GX - 0.175;
    saw.group.position.set(sx, 0.0 - 0.012, hz - 0.24); saw.group.rotation.set(0.05, 0, 0); saw.update({ bladeAngle: 3, trigger: 1, interlock: 1 }); saw.group.updateMatrixWorld(true);
    const rear = saw.group.localToWorld(saw.grips.rear.position.clone()), front = saw.group.localToWorld(saw.grips.front.position.clone());
    const root = V3(GX - 0.75, 0, hz - 0.15), g = guys[0];
    g.pose({ root, yaw: Math.PI / 2 - 0.15, crouch: 0.95, bend: 0.5, feet: { L: { pos: V3(root.x + 0.32, 0.02, root.z - 0.2), yaw: 1.4 }, R: { pos: V3(root.x - 0.42, 0.05, root.z + 0.1), yaw: 1.4 } }, kneePoles: { R: V3(0.3, -1, 0) },
      hand: { L: { pos: front, w: 1 }, R: { pos: rear, w: 1 } }, lookAt: saw.group.localToWorld(saw.contactLocal(0)), face: features({ effort: 0.5 }), sun: world.sunDir, t: 0, armsFront: true });
    camera.position.set(GX + 2.2, 0.9, hz + 2.6); camera.lookAt(GX - 0.3, 0.45, hz - 0.2); camera.fov = 40; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); g.draw(camera);
  }
  world.placeLight(V3(RC + 2, 0, 0));
  await renderer.renderAsync(scene, camera);
};
window.SCENE = { fps: 30, frames: 2, width: W, height: H };
await window.renderFrame(0); window.ready = true;
