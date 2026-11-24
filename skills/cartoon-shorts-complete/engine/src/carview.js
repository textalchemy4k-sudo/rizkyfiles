// Inspection page for the car model: frame n renders view n (0 front 3/4, 1 side, 2 rear 3/4, 3 top, 4 left-rear low, 5 doors open).
import * as THREE from 'three/webgpu';
import { CarBody, CX } from './cruiser.js';
import { PickupBody } from './pickup.js';
import { CarInterior } from './car.js';
const W = 1080, H = 1920;
const renderer = new THREE.WebGPURenderer({ antialias: true }); renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; document.body.appendChild(renderer.domElement); await renderer.init();
const scene = new THREE.Scene(); scene.background = new THREE.Color('#9fb6cf');
const env = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#5d8bc9'); g.addColorStop(0.48, '#dfe8f2'); g.addColorStop(0.52, '#7a7468'); g.addColorStop(1, '#3a3630'); x.fillStyle = g; x.fillRect(0, 0, 512, 256); const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
const sun = new THREE.DirectionalLight('#fff4e0', 3); sun.position.set(-6, 9, -4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); scene.add(sun);
scene.add(new THREE.HemisphereLight('#cfe0ff', '#5a5040', 1.3));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: '#6a6a66', roughness: 0.9 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const isP = location.search.includes('pickup'); const car = isP ? new PickupBody(env) : new CarBody(env); if (isP) car.setLivery('#3a5f8a'); else if (location.search.includes('plain')) car.setLivery('#8a1f22'); scene.add(car.group);
const cabin = new CarInterior(isP ? { cabEnd: 0.93, rear: false, seat: '#6b4a32' } : { seat: location.search.includes('tan') ? '#7a4e30' : undefined }); scene.add(cabin.group); cabin.attachDoorTrims(car, CX);
const camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 200);
const VIEWS = [[[CX - 7.5, 1.7, -8.5], [CX, 0.9, -0.2]], [[CX - 12, 1.1, -0.3], [CX, 0.9, -0.3]], [[CX + 6.5, 1.9, 8.5], [CX, 0.9, 0.3]], [[CX + 0.01, 11, -0.3], [CX, 0, -0.3]], [[CX - 2.6, 1.3, 7.4], [CX + 0.2, 0.8, -1.5]], [[CX - 5.5, 2.2, -5.0], [CX, 0.9, -0.2]],
  [[CX - 2.0, 0.55, -2.4], [CX - 0.87, 0.4, -2.0]],      // 6 front-left wheel close-up
  [[CX - 3.2, 0.12, 0.6], [CX, 0.35, -0.3]],            // 7 underside, from low at the side
  [[CX - 1.6, 2.6, 3.4], [CX, 1.75, 1.2]],              // 8 roof rear: rails, spoiler, antenna
  [[CX - 1.6, 1.0, 3.6], [CX - 0.8, 0.85, 2.1]],        // 9 rear-left corner: tail lamp, bumper, wheel
  [[CX - 2.2, 2.5, -1.4], [CX, 1.75, -0.3]],            // 10 roof front: light bar
  [[CX - 1.3, 0.45, 0.95 + 0.9], [CX - 0.87, 0.4, 0.95]],
  [[CX - 2.6, 1.2, 0.9], [CX - 1.2, 0.8, -0.6]],     // 12 open front door from behind it: trim panel
  [[CX - 2.3, 1.35, 0.7], [CX + 0.0, 0.5, -0.55]],   // 13 into the footwell through the open driver door
  [[CX - 0.9, 1.3, -3.4], [CX - 0.2, 1.2, -0.6]]];   // 14 through the windshield  // 13 into the footwell through the open door: pedals, mats, seat   // 11 rear-left wheel from behind (wheel well, tub)
window.renderFrame = async (f) => {
  const v = VIEWS[f % VIEWS.length]; car.update(0, f === 0 ? 0.25 : 0, f === 5 ? 1 : (f === 12 || f === 13) ? { FL: 1 } : 0, f === 5 ? 1 : 0, f === 5 ? 1 : 0); if (isP) car.setTail(f === 2 ? 0 : 0); (0);
  camera.position.set(...v[0]); camera.lookAt(...v[1]); camera.fov = f === 3 ? 30 : f >= 6 ? 40 : 36; camera.updateProjectionMatrix();
  await renderer.renderAsync(scene, camera);
};
window.SCENE = { fps: 30, frames: VIEWS.length, width: W, height: H };
await window.renderFrame(0); window.ready = true;
