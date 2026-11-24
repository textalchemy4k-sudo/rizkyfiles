// Storyboard for shorts 17 "rumble strips": frame n renders beat n+1 (one still per beat, timed to the voice).
import { W, H, V, renderer, scene, townScene, camera, world, town, RX, LANE_R, T, cars, makeCar, heroTruck, railTruck, stateTruck, crashCar, driftCar, signCrash, inspCar, passA, passB, thermos, spillG, saw, sparks, sawDust, sign, hammer, ladder, cones, glint, debris, crashDust, cv, cg, armTex, armCard, drawArms, look, sunDir, stand, seat, resetRoad, finish, heroAtGroove, THREE, features, CX, EYE, PITCH, P, RC, GX, LANE, EDGE, RAIL, SUN_DAY, MOON_DIR, ROADW } from './setup.js';
const BEATS = [
  { t: '0.0-2.5', vo: 'He cut rough grooves into the edge of the road,', tr: 'open', set() {
    resetRoad(0); world.cutGrooves(30, 0.6); world.grooves.push({ z: 0.3, p: 0.7, fresh: 1 }); for (const g of world.grooves) if (g.z < 6) g.fresh = 0.6;
    heroTruck.place(GX + 1.55, 13, 0.02); const hit = heroAtGroove(0.3);
    look(V(GX - 2.4, 1.15, 3.4), V(GX + 0.75, 0.55, 0.05), 44); T.hero.draw(camera);
    sparks.update(hit, V(0.2, 0, -1).normalize(), 0.37, camera, 1); sawDust.update((t) => hit.clone().add(V(0.15 * (1.2 - t), 0, 0.3 * (1.2 - t))), 1.2, { rate: 8, life: 1.0, strength: 0.05, halfW: 0.05 }); finish(0, V(GX, 0, 0)); } },
  { t: '2.5-4.0', vo: 'one after another.', tr: 'continuous move (pull-out)', set() {
    resetRoad(0); world.cutGrooves(60, 0.6); world.grooves.push({ z: 0.3, p: 0.7, fresh: 1 });
    heroTruck.place(GX + 1.55, 13, 0.02); const hit = heroAtGroove(0.3); look(V(GX + 3.4, 4.2, -9), V(GX - 0.2, 0, 10), 50); T.hero.draw(camera);
    sparks.update(hit, V(0.2, 0, -1).normalize(), 0.37, camera, 1); finish(5, V(GX, 0, 5)); } },
  { t: '4.0-6.0', vo: "You see, there's a long, straight highway", tr: 'continuous move (rises to aerial)', set() {
    resetRoad(0); world.cutGrooves(60, 0.6); heroTruck.place(GX + 1.55, 13, 0.02); heroAtGroove(0.3); passA.place(RC - LANE / 2, -160, Math.PI); passA.dust.update((t) => V(RC - LANE / 2, 0, -160 - 25 * (t - 1)), 1, { strength: 0.35 });
    look(V(RC, 48, 60), V(RC, 0, -230), 62); T.hero.draw(camera); finish(5, V(RC, 0, -60)); } },
  { t: '6.0-9.7', vo: 'where almost every night a car drifts off the road and crashes.', tr: 'FADE to night, same angle, camera flies in', set() {
    resetRoad(1); world.rails[1].dents.push({ z: -82, len: 2.4, out: 0.55, drop: 0.12, twist: 0.6 });
    crashCar.place(RX - 1.35, -81.5, -0.42, 0.03); crashCar.night(true); debris.visible = true; debris.position.set(RX - 1.2, 0, -82.5);
    crashDust.update((t) => V(RX - 1.4, 0, -82 + 6 * (1 - t)), 1, { rate: 16, life: 1.6, strength: 0.5, halfW: 0.6, night: 1 });
    seat(T.driver, crashCar, { E: { surprise: 0.9, fear: 0.6 }, hand: {} });
    look(V(RC + 5.5, 8.5, -64), V(RX - 1.6, 0.5, -82), 44, 0.02); T.driver.draw(camera); finish(-80, V(RX, 0, -82)); } },
  { t: '10.1-11.0', vo: "Nobody's drunk,", tr: 'cut', set() {
    resetRoad(1); world.rails[1].dents.push({ z: -82, len: 2.4, out: 0.55, drop: 0.12, twist: 0.6 }); crashCar.place(RX - 1.35, -81.5, -0.42, 0.03); crashCar.night(true); debris.visible = true; debris.position.set(RX - 1.2, 0, -82.5);
    const yaw = Math.PI + crashCar.rig.rotation.y; seat(T.driver, crashCar, { E: { surprise: 0.5, doubt: 0.6, fear: 0.3 }, lookAt: crashCar.L(-1.6, 1.3, -1.2), hand: { L: { pos: crashCar.cabin.wheel.localToWorld(crashCar.cabin.gripLocal(-1)), w: 1 } } }); void yaw;
    look(crashCar.L(-1.9, 1.35, -1.3), crashCar.L(0.08, 1.22, 0.2), 34); T.driver.draw(camera); finish(-80, V(RX, 0, -82)); } },
  { t: '11.1-12.9', vo: 'and the road is dry and empty.', tr: 'fly-down to a low angle', set() {
    resetRoad(1); look(V(RC + 1.2, 0.6, -20), V(RC - 0.2, 0.1, -400), 40); finish(-20, V(RC, 0, -60)); } },
  { t: '13.0-15.2', vo: 'The cars just roll slowly off the edge.', tr: 'FADE', set() {
    resetRoad(1); const z = -140; driftCar.place(LANE_R + 2.0, z, -0.09); driftCar.night(true); driftCar.body.update(0, -0.05);
    driftCar.dust.update((t) => V(LANE_R + 1.6 - 0.4 * (1 - t), 0, z + 2.6 + 20 * (1 - t)), 1, { strength: 0.18, night: 1 });
    seat(T.driver, driftCar, { E: { tired: 1 }, life: { blink: 1 }, bend: 0.12 });
    look(V(LANE_R + 0.4, 1.7, z + 9.5), V(LANE_R + 2.4, 0.7, z - 6), 46); T.driver.draw(camera); finish(z, V(LANE_R, 0, z)); } },
  { t: '15.3-17.7', vo: 'So, the state puts up a giant warning sign,', tr: 'FADE to day', set() {
    resetRoad(0.08); world.rails[1].dents.push({ z: -10, len: 2, out: 0.4, drop: 0.1, twist: 0.4 }, { z: -55, len: 2.2, out: 0.5, drop: 0.12, twist: 0.5 });
    stateTruck.place(RC + EDGE + 0.9, -8, 0.03); ladder.visible = true; ladder.position.copy(sign.localToWorld(V(1.2, 0, -0.75))); ladder.rotation.set(0.22, sign.rotation.y + Math.PI, 0);
    cones.forEach((c, i) => { c.visible = true; c.position.set(RC + LANE + 0.35, 0, -14 - i * 5); });
    const post = sign.localToWorld(V(-1.65, 1.45, 0.05)), yaw = sign.rotation.y + Math.PI / 4, root = sign.localToWorld(V(-2.25, 0, 0.45));
    const rt = V(Math.cos(yaw), 0, -Math.sin(yaw)), up = root.clone().add(V(0, 1.72, 0)).addScaledVector(rt, 0.78);
    look(sign.localToWorld(V(-2.2, 1.6, 11.5)), sign.localToWorld(V(-0.2, 2.4, 0)), 56);
    stand(T.stateman, root.x, root.z, yaw, { hand: { R: { pos: up, w: 1 }, L: { pos: post.clone().add(V(0, -0.1, 0)), w: 1 } }, lookAt: post, E: { effort: 0.45, joy: 0.25 }, armsFront: true });
    hammer.visible = true; hammer.position.copy(up).add(V(0, -0.03, 0)); hammer.rotation.set(0, yaw - Math.PI / 2, 0.35);
    T.stateman.draw(camera); finish(-20, V(RX, 0, -30)); } },
  { t: '17.8-19.2', vo: 'and the crashes kept coming.', tr: 'timelapse day to night, zoom out', set() {
    resetRoad(0.72); world.rails[1].dents.push({ z: -10, len: 2, out: 0.4, drop: 0.1, twist: 0.4 }, { z: -55, len: 2.2, out: 0.5, drop: 0.12, twist: 0.5 }, { z: -34, len: 2.4, out: 0.6, drop: 0.14, twist: 0.6 });
    signCrash.place(RX - 1.3, -34, -0.5, 0.04); signCrash.night(true); P.crumple(signCrash.body.group, signCrash.L(CX + 0.8, 0.7, -2.9), V(-0.6, 0, 1).applyQuaternion(signCrash.rig.quaternion), 0.75, 0.22, 3);
    debris.visible = true; debris.position.set(RX - 1.2, 0, -35.5); crashDust.update((t) => V(RX - 1.6, 0, -35 - 6 * (1 - t)), 1, { rate: 16, life: 1.6, strength: 0.45, halfW: 0.6, night: 0.6 });
    look(V(RC + 2.2, 3.4, -4), V(RX + 0.6, 1.6, -33), 54); finish(-40, V(RX, 0, -34)); } },
  { t: '19.3-23.4', vo: "The only one who's happy is the guardrail company, which has never been busier.", tr: 'FADE', set() {
    resetRoad(0.05); for (const z of [-6, -38, -61, -95, -130, -170]) world.rails[1].dents.push({ z, len: 1.8 + (z % 3) * 0.2, out: 0.35 + ((-z) % 7) * 0.04, drop: 0.1, twist: 0.5 });
    railTruck.place(RX - 1.75, 2, 0.02); railTruck.body.update(0, 0, 0, 1, 0);
    const b = railTruck.L(CX + 0.75, 0, railTruck.body.bed.z1 + 0.6);
    stand(T.railman, b.x - 0.95, b.z + 0.25, -2.6, { E: { joy: 1 }, lookAt: camera.position, hand: { L: { pos: railTruck.L(CX + 0.62, 0.95, railTruck.body.bed.z1 + 0.2), w: 0.8 } } });
    look(V(RX - 4.3, 1.55, 10.8), V(RX - 2.0, 1.0, 3.4), 44); stand(T.railman, b.x - 2.35, b.z - 0.2, -0.75, { E: { joy: 1 }, lookAt: camera.position, hand: { R: { pos: railTruck.L(CX - 1.04, 0.98, railTruck.body.bed.z1 - 0.3), w: 1 } } }); T.railman.draw(camera); finish(0, V(RX, 0, 0)); } },
  { t: '23.5-24.6', vo: 'Then he shows up', tr: 'FADE, same angle on the damaged rails', set() {
    resetRoad(0.05); for (const z of [-6, -38, -61, -95]) world.rails[1].dents.push({ z, len: 2, out: 0.45, drop: 0.1, twist: 0.5 });
    heroTruck.place(RC + EDGE + 1.0, -14, 0.02); heroTruck.body.update(0, 0, { FL: 1 }, 0, 0);
    const yaw = heroTruck.rig.rotation.y - Math.PI / 2 - 0.35, root = heroTruck.L(CX - 1.38, 0, -0.32);
    const pose = () => T.hero.pose({ root, yaw, crouch: 0.32, bend: 0.18, feet: { L: { pos: heroTruck.L(CX - 0.98, 0.52, -0.42), yaw }, R: { pos: heroTruck.L(CX - 1.62, 0.02, -0.2), yaw } }, hand: { R: { pos: heroTruck.L(CX - 1.05, 1.62, -0.05), w: 1 }, L: { pos: heroTruck.L(CX - 1.95, 0.95, -0.9), w: 0.6 } }, lookAt: heroTruck.L(CX - 4, 0.2, -2), face: features({ joy: 0.4 }), sun: sunDir(), t: 0, armsFront: false });
    heroTruck.dust.update((t) => heroTruck.L(CX, 0, 2.6 + 8 * (1 - t)), 1, { strength: 0.2 });
    look(heroTruck.L(CX - 3.6, 1.8, -4.4), heroTruck.L(CX - 0.9, 0.95, -0.25), 44); pose(); T.hero.group.visible = true; T.hero.draw(camera); finish(-14, V(RX, 0, -14)); } },
  { t: '24.6-26.6', vo: 'with a machine and starts grinding', tr: 'push-in on the saw, glint, slight slow-mo', set() {
    resetRoad(0.05); world.cutGrooves(-20, -24); heroTruck.place(RC + EDGE + 1.0, -14, 0.02);
    const root = V(GX + 1.06, 0, -24.8), yaw = -Math.PI / 2 - 0.2; saw.group.visible = true; saw.group.position.set(GX + 0.45, 0.42, -25.05); saw.group.rotation.set(0, -Math.PI / 2 - 0.2, -0.15); saw.update({ bladeAngle: 0.5, trigger: 0, interlock: 0 }); saw.group.updateMatrixWorld(true);
    const rear = saw.group.localToWorld(saw.grips.rear.position.clone()), front = saw.group.localToWorld(saw.grips.front.position.clone());
    stand(T.hero, root.x, root.z, yaw, { crouch: 0.3, bend: 0.4, E: { joy: 0.5, effort: 0.2 }, hand: { L: { pos: front, w: 1 }, R: { pos: rear, w: 1 } }, lookAt: saw.group.position.clone().add(V(0, -0.3, 0)), armsFront: true });
    glint.visible = true; glint.position.copy(saw.group.localToWorld(saw.contactLocal(0.25))).add(V(-0.08, 0.1, 0.05)); glint.scale.set(0.22, 0.22, 1);
    look(V(GX - 2.6, 1.25, -21.6), V(GX + 0.8, 0.8, -25.0), 42); T.hero.draw(camera); finish(-25, V(GX, 0, -25)); } },
  { t: '26.6-28.8', vo: 'grooves into the shoulder, mile after mile,', tr: 'timelapse', set() {
    resetRoad(0.12); world.cutGrooves(40, -140); world.grooves.forEach((g) => (g.fresh = g.z < -100 ? 1 : 0.3));
    const hit = heroAtGroove(-140.4); heroTruck.place(GX + 1.55, -128, 0.02);
    passA.place(LANE_R, -118, 0); passA.dust.update((t) => V(LANE_R, 0, -118 + 2.8 + 25 * (1 - t)), 1, { strength: 0.45 });
    passB.place(RC - LANE / 2, -175, Math.PI); passB.dust.update((t) => V(RC - LANE / 2, 0, -175 - 2.8 - 25 * (1 - t)), 1, { strength: 0.45 });
    sparks.update(hit, V(0.2, 0, -1).normalize(), 0.37, camera, 1);
    look(V(GX + 6, 7, -112), V(GX - 1, 0, -150), 48); T.hero.draw(camera); finish(-140, V(GX, 0, -140)); } },
  { t: '28.8-30.9', vo: 'until the whole edge of the road looks ruined.', tr: 'creative angle', set() {
    resetRoad(0.15); world.cutGrooves(60, -300); world.grooves.forEach((g, i) => (g.fresh = (i % 7) / 10));
    sawDust.update((t) => V(GX, 0, -2 - 20 * (1 - t)), 1, { rate: 10, life: 2, strength: 0.2, halfW: 0.3 });
    look(V(GX + 0.9, 0.95, 1.6), V(GX - 0.1, 0.0, -5), 50, -0.12); finish(-5, V(GX, 0, -5)); } },
  { t: '31.9-34.6', vo: "Eventually, the state sends an inspector to prove it's pointless.", tr: 'FADE to town', scene: 'town', set() {
    resetRoad(0); const x = ROADW - 1.2, z = 8;
    for (const c of town.cars) if (c.s > 0 && Math.abs(c.z - z) < 4) c.car.group.visible = false;
    townScene.add(inspCar.rig); inspCar.place(x, z, 0); inspCar.night(false);
    townScene.add(T.inspector.group); seat(T.inspector, inspCar, { E: { doubt: 0.7, joy: 0.1 }, turn: 0.5, lookAt: V(x - 3, 1.3, z - 1.5), sun: town.sunDir, hand: { R: { pos: inspCar.cabin.wheel.localToWorld(inspCar.cabin.gripLocal(1)), w: 1 } } });
    look(inspCar.L(-2.3, 1.5, -1.7), inspCar.L(0.15, 1.15, 0.25), 40); T.inspector.draw(camera); town.placeLight(V(x, 0, z)); } },
  { t: '34.8-36.3', vo: 'He drives the road at 3am', tr: 'FADE, same side-window angle, night road', set() {
    resetRoad(1); scene.add(inspCar.rig); const z = -400; inspCar.place(LANE_R, z, 0); inspCar.night(true); thermos.visible = true;
    seat(T.inspector, inspCar, { E: { tired: 0.4 }, sun: MOON_DIR }); inspCar.dust.update((t) => V(LANE_R, 0, z + 2.6 + 25 * (1 - t)), 1, { strength: 0.15, night: 1 });
    look(inspCar.L(-2.3, 1.5, -1.7), inspCar.L(0.15, 1.15, 0.25), 40); T.inspector.draw(camera); finish(z, V(LANE_R, 0, z)); } },
  { t: '36.3-38.7', vo: 'with a thermos of coffee, and halfway down,', tr: 'CUT to POV', set() {
    resetRoad(1); scene.add(inspCar.rig); const z = -600; inspCar.place(LANE_R, z, 0); inspCar.night(true);
    const e = inspCar.L(EYE.x + 0.02, EYE.y - 0.02, EYE.z), tg = inspCar.L(0.69, 0.72, 0.1); look(e, tg, 60); drawArms(inspCar, false); finish(z, V(LANE_R, 0, z)); } },
  { t: '38.7-40.6', vo: 'his car drifts toward the edge.', tr: 'CUT outside', set() {
    resetRoad(1); scene.add(inspCar.rig); const z = -700; inspCar.place(LANE_R + 1.3, z, -0.07); inspCar.night(true); inspCar.body.update(0, -0.04);
    seat(T.inspector, inspCar, { E: { tired: 1 }, life: { blink: 1 }, bend: 0.14 });
    inspCar.dust.update((t) => V(LANE_R + 1.3 - 0.5 * (1 - t), 0, z + 2.6 + 22 * (1 - t)), 1, { strength: 0.15, night: 1 });
    look(V(RC + EDGE + 0.6, 0.85, z - 13), inspCar.L(CX, 0.8, -0.5), 42); T.inspector.draw(camera); finish(z - 4, V(LANE_R, 0, z)); } },
  { t: '40.6-42.7', vo: 'The whole car roars and shakes,', tr: 'continuous (on the strips, heavy shake)', set() {
    resetRoad(1); world.cutGrooves(-650, -760); scene.add(inspCar.rig); const z = -710; inspCar.place(GX - 0.87, z, 0.03, 0.035, 0.01); inspCar.night(true);
    seat(T.inspector, inspCar, { E: { surprise: 1, fear: 0.7 }, bend: -0.05 });
    sawDust.update((t) => V(GX, 0, z + 2.6 + 12 * (1 - t)), 1, { rate: 18, life: 1.2, strength: 0.4, halfW: 0.1, night: 0.6 });
    look(V(GX + 2.4, 0.55, z - 6.5), inspCar.L(CX + 0.4, 0.6, 0.3), 44, 0.05); T.inspector.draw(camera); finish(z, V(GX, 0, z)); } },
  { t: '42.8-44.6', vo: 'and he yanks the wheel back', tr: 'CUT to POV', set() {
    resetRoad(1); world.cutGrooves(-650, -760); scene.add(inspCar.rig); const z = -716; inspCar.place(GX - 1.2, z, 0.12, -0.02); inspCar.night(true); inspCar.cabin.update(0, 52, 2.6, 1.2);
    const e = inspCar.L(EYE.x, EYE.y, EYE.z); look(e, inspCar.L(EYE.x, EYE.y + Math.sin(PITCH) * 10, EYE.z - Math.cos(PITCH) * 10), 66, -0.06); drawArms(inspCar, true); finish(z, V(GX, 0, z)); } },
  { t: '44.6-47.9', vo: 'so hard the coffee goes everywhere. So, why do they work?', tr: 'continuous, no transition', set() {
    resetRoad(1); scene.add(inspCar.rig); const z = -730; inspCar.place(LANE_R + 0.6, z, 0.2); inspCar.night(true); thermos.visible = false; spillG.visible = true; inspCar.cabin.update(0, 50, 2.5, 1.2);
    seat(T.inspector, inspCar, { E: { surprise: 0.7, fear: 0.5, effort: 0.4 }, lookAt: inspCar.L(0.7, 0.6, 0.2), turn: -0.3 });
    for (const o of inspCar.body.tail) if (o.isSprite) o.visible = false; look(inspCar.L(1.02, 1.56, -0.8), inspCar.L(0.42, 0.82, 0.1), 60); T.inspector.draw(camera); finish(z, V(LANE_R, 0, z)); } },
  { t: '48.0-49.8', vo: "Well, they're called rumble strips.", tr: 'FADE', set() {
    resetRoad(1); world.cutGrooves(-900, -1200); scene.add(inspCar.rig); inspCar.place(LANE_R, -1040, 0); inspCar.night(true);
    look(V(GX + 0.45, 0.16, -952), V(GX - 0.3, 0.2, -1040), 46, -0.05); finish(-960, V(GX, 0, -960)); } },
  { t: '49.9-52.5', vo: 'Almost every driver who left that road was asleep,', tr: 'cut', set() {
    resetRoad(1); scene.add(inspCar.rig); const z = -1100; inspCar.place(LANE_R + 0.2, z, -0.02); inspCar.night(true);
    seat(T.inspector, inspCar, { E: { tired: 1 }, life: { blink: 1 }, bend: 0.2, lookAt: inspCar.L(0.3, 0.4, -2) });
    for (const o of inspCar.body.tail) if (o.isSprite) o.visible = false; look(inspCar.L(CX - 0.2, 1.95, -3.0), inspCar.L(0.08, 1.15, 0.1), 38); T.inspector.draw(camera); finish(z, V(LANE_R, 0, z)); } },
  { t: '52.5-54.1', vo: "and a sign can't wake someone up,", tr: 'FADE to POV, slight zoom on the sign', set() {
    resetRoad(1); scene.add(inspCar.rig); world.rails[1].dents.push({ z: -34, len: 2.4, out: 0.6, drop: 0.14, twist: 0.6 }); inspCar.place(LANE_R, 30, 0); inspCar.night(true);
    const e = inspCar.L(EYE.x, EYE.y, EYE.z); look(e, sign.localToWorld(V(0, 3.4, 0)).lerp(inspCar.L(EYE.x, EYE.y, -40), 0.45), 44); drawArms(inspCar, true); camera.fov = 38; camera.updateProjectionMatrix(); drawArms(inspCar, true); finish(0, V(RX, 0, 0)); } },
  { t: '54.2-56.5', vo: 'But a road that shakes the whole car can.', tr: 'POV, heavy shake', set() {
    resetRoad(1); world.cutGrooves(-1200, -1400); scene.add(inspCar.rig); const z = -1250; inspCar.place(GX - 0.95, z, -0.04, 0.03, 0.012); inspCar.night(true); inspCar.cabin.update(0, 48, 2.4, -0.25);
    const e = inspCar.L(EYE.x, EYE.y + 0.02, EYE.z); look(e, inspCar.L(EYE.x + 0.45, EYE.y + Math.sin(PITCH - 0.02) * 10, EYE.z - Math.cos(PITCH) * 10), 66, 0.06); drawArms(inspCar, true); finish(z, V(GX, 0, z)); } },
];
window.BEATS = BEATS.map((b, i) => ({ n: i + 1, t: b.t, vo: b.vo, tr: b.tr }));
window.renderFrame = async (f) => {
  const b = BEATS[f]; sign.visible = f >= 7;
  // the town beat borrows the inspector car + toon; put them back on the road scene for the others
  if (b.scene !== 'town') { scene.add(inspCar.rig); for (const c of town.cars) c.car.group.visible = true; }
  b.set(); sign.visible = f >= 7;
  await renderer.renderAsync(b.scene === 'town' ? townScene : scene, camera);
};
window.SCENE = { fps: 30, frames: BEATS.length, width: W, height: H };
await window.renderFrame(0); window.ready = true;
window.DBG = { armCard, cv, camera, inspCar };
window.DBG2 = { T, saw, world };
