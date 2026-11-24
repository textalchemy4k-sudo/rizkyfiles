// Storyboard page pattern: frame n renders beat n+1 (one still per beat, timed to the voice).
// Copy the imports from the engine's src/board.js (scene, camera, world, cast T, cars, props, helpers).
import { renderer, scene, camera, world, T, V, look, finish, resetRoad, seat, stand } from './setup.js';

const BEATS = [
  {
    t: '0.0-2.5', vo: 'First line of the voice,', tr: 'open',
    set() {
      resetRoad(0);                                   // 0 = day, 1 = night (world.setTime)
      stand(T.hero, 2.0, 5.0, Math.PI / 2, {          // x, z, facing; then the pose
        E: { joy: 0.4 },                              // the face from emotions
        hand: { R: { pos: V(2.3, 0.9, 5.2), w: 1 } }, // a hand target (holding a prop)
        lookAt: V(0, 1.6, 0),
      });
      look(V(-1.5, 1.4, 9), V(2, 1.0, 5), 44);         // camera position, target, fov
      T.hero.draw(camera);                            // redraw the 2D character for this camera
      finish(5, V(2, 0, 5));                          // strip window, rails, grass and sun around the focus
    },
  },
  { t: '2.5-4.0', vo: 'second line.', tr: 'continuous move (pull-out)', set() { /* ... */ } },
];

window.SCENE = { fps: 30, frames: BEATS.length, width: 1080, height: 1920 };
window.BEATS = BEATS.map(({ t, vo, tr }, i) => ({ n: i + 1, t, vo, tr }));   // -> cook/beats.json
window.renderFrame = async (n) => { BEATS[n].set(); await renderer.renderAsync(scene, camera); };
await window.renderFrame(0); window.ready = true;
