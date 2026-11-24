// Lighting reference extracted from the cartoon-shorts engine (world.js and setup.js).
// 1) time of day: day -> dusk -> night blend of domes, clouds, sun/moon, hemisphere, fog and env maps
  W.setTime = (k, renderer) => {
    const day = 1 - sstep(0.35, 0.75, k), dusk = Math.max(0, 1 - Math.abs(k - 0.5) / 0.3), night = sstep(0.55, 0.95, k);
    dayDome.material.opacity = day; duskDome.material.opacity = dusk * (1 - day * 0.2); const cTint = new THREE.Color('#ffffff').lerp(new THREE.Color('#e9a9b2'), dusk).lerp(new THREE.Color('#5a6688'), night); W.dayClouds.children.forEach((c) => { c.material.opacity = day; c.material.color.copy(cTint); }); W.nightSky.children.forEach((c) => (c.material.opacity = night * (c.userData.op ?? 1)));
    W.dayClouds.visible = day > 0.01; W.nightSky.visible = night > 0.01;
    const sunDir = SUN_DAY.clone().lerp(new THREE.Vector3(-0.8, 0.12, -0.6).normalize(), sstep(0, 0.6, k)).normalize();
    const lightDir = night > 0.5 ? MOON_DIR : sunDir;
    W.sun.color.set('#fff2dc').lerp(new THREE.Color('#ffa868'), dusk).lerp(new THREE.Color('#b8c6ff'), night);
    W.sun.intensity = 3.2 * day + 2.0 * dusk + 1.1 * night;
    W.sunDir = lightDir.clone();
    W.hemi.color.set('#bcd4f0').lerp(new THREE.Color('#d0a088'), dusk).lerp(new THREE.Color('#6c7ca4'), night); W.hemi.groundColor.set('#6a6040').lerp(new THREE.Color('#3a4034'), night); W.hemi.intensity = 1.25 * day + 1.0 * dusk + 2.3 * night;
    scene.fog.color.set('#d4e2ee').lerp(new THREE.Color('#8e7298'), dusk).lerp(new THREE.Color('#46557a'), night); W.cloudK.value = day; scene.fog.density = 0.00045 + 0.0028 * night;
    scene.environment = night > 0.5 ? W.envNight : W.envDay; scene.environmentIntensity = 0.9 * (1 - night) + 0.6 * night;
    W.timeK = k;
  };

// 2) headlights as a soft wash (several wide spots, intensity ~ d^3) and a night cabin light
  const heads = new THREE.Group(); body.group.add(heads); heads.visible = false;
  for (const [d, k] of [[5, 0.05], [9, 0.12], [15, 0.4], [23, 0.55], [33, 0.45], [46, 0.25]]) { const s = new THREE.SpotLight('#fff1dc', 0.05 * k * d * d * d / 0.8, 0, Math.min(1.0, 4 / d + 0.15), 1.0, 2); s.position.set(CX, 1.0, -1.2); s.target.position.set(CX - 0.3, 0, -2.9 - d); heads.add(s, s.target); }
  const cab = new THREE.Group(); body.group.add(cab); cab.visible = false;   // night cabin light: dash glow and moon fill (a soft light so the cabin reads)
  for (const [c, i, dd, p] of [['#d8dde8', 2.2, 2.6, [0.3, 1.52, -0.15]], ['#c8d0e0', 1.2, 1.6, [0.3, 0.6, -0.1]], ['#ff9a4a', 0.5, 0.9, [0.1, 0.98, -0.55]], ['#a8b8e0', 1.8, 2.6, [-0.2, 1.5, -0.4]]]) { const l = new THREE.PointLight(c, i, dd, 2); l.position.set(...p); cab.add(l); }
