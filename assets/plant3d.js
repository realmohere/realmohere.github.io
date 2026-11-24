/* 3D version of the growing plant, drawn with Three.js (assets/vendor, loaded only when used).
 *
 * plant.js still owns everything else: the scroll timeline, the layout, the cards and the labels.
 * It hands this file the plant's geometry (in screen pixels) and, for every scroll position, how far
 * each part has grown. Here the same plant is rebuilt in 3D: round stems, curved leaves with veins,
 * flowers that open, a seed and roots in a cut-away block of soil, real light and shadow, and a camera
 * that turns slowly as you scroll. Nothing moves on its own: a frame is drawn only when plant.js asks.
 *
 * The flat SVG plant stays in use when this cannot run: reduced motion, no WebGL, or no JavaScript.
 */
const api = window.Plant;
const gl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();

if (api && api.animated && gl) {
  import('./vendor/three.module.min.js').then(start).catch(() => {});
}

function start(THREE) {
  const stage = document.querySelector('#grow .stage');
  const canvas = document.createElement('canvas');
  canvas.className = 'plant3d';
  canvas.setAttribute('aria-hidden', 'true');
  stage.insertBefore(canvas, stage.querySelector('svg.plant'));

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { canvas.remove(); return; }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;
  

  const V = (x, y, z) => new THREE.Vector3(x, -y, z || 0);
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const k = (u, a, b) => clamp((u - a) / (b - a), 0, 1);
  const eo = (x) => 1 - Math.pow(1 - x, 3);
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const rad = Math.PI / 180;

  // ---- Textures, drawn once on small canvases ----
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function leafTex(dark, mid, light, pale) {
    return canvasTex(256, 128, (x, w, h) => {
      const b = w * 0.16, L = w - b, cy = h / 2, hw = h * 0.46;
      const tipX = w - 2, tipY = cy - hw * 0.1;
      // stalk
      x.strokeStyle = dark; x.lineWidth = 5; x.lineCap = 'round';
      x.beginPath(); x.moveTo(2, cy); x.quadraticCurveTo(b * 0.5, cy + 2, b + 4, cy); x.stroke();
      // upper half
      let g = x.createLinearGradient(b, 0, w, 0); g.addColorStop(0, dark); g.addColorStop(0.55, mid); g.addColorStop(1, light);
      x.fillStyle = g;
      x.beginPath(); x.moveTo(b, cy);
      x.bezierCurveTo(b + L * 0.14, cy - hw * 1.0, b + L * 0.62, cy - hw * 1.06, tipX, tipY);
      x.quadraticCurveTo(b + L * 0.5, cy - 1, b, cy); x.fill();
      // lower half, lighter
      g = x.createLinearGradient(b, 0, w, 0); g.addColorStop(0, mid); g.addColorStop(0.55, light); g.addColorStop(1, pale);
      x.fillStyle = g;
      x.beginPath(); x.moveTo(b, cy);
      x.bezierCurveTo(b + L * 0.16, cy + hw * 0.92, b + L * 0.68, cy + hw * 0.78, tipX, tipY);
      x.quadraticCurveTo(b + L * 0.5, cy - 1, b, cy); x.fill();
      // veins and midrib
      x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 1.4;
      for (let j = 1; j <= 5; j++) {
        const t = j / 6.2, mx = b + L * t, my = cy - hw * 0.1 * t * t, reach = Math.sin(Math.PI * Math.min(t + 0.1, 0.95)) * 0.8;
        x.beginPath(); x.moveTo(mx, my); x.quadraticCurveTo(mx + L * 0.08, my - hw * reach * 0.6, mx + L * 0.17, cy - hw * reach); x.stroke();
        x.beginPath(); x.moveTo(mx, my); x.quadraticCurveTo(mx + L * 0.08, my + hw * reach * 0.5, mx + L * 0.18, cy + hw * reach * 0.8); x.stroke();
      }
      x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 2.2;
      x.beginPath(); x.moveTo(b, cy); x.quadraticCurveTo(b + L * 0.5, cy - 1, tipX, tipY); x.stroke();
    });
  }
  const texLeafA = leafTex('#163a2c', '#3c6a49', '#6f8f60', '#9db38c');
  const texLeafB = leafTex('#2f5a40', '#5d8656', '#8fae7c', '#c2d2ae');
  const texPetal = canvasTex(128, 128, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h, 4, w / 2, h * 0.6, h * 0.75);
    g.addColorStop(0, '#7a3a26'); g.addColorStop(0.35, '#b4684a'); g.addColorStop(0.8, '#e0a084'); g.addColorStop(1, '#f2c7ad');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(w / 2, h);
    x.bezierCurveTo(w * 0.02, h * 0.7, w * 0.08, h * 0.05, w / 2, h * 0.04);
    x.bezierCurveTo(w * 0.92, h * 0.05, w * 0.98, h * 0.7, w / 2, h); x.fill();
    x.strokeStyle = 'rgba(120,50,30,.25)'; x.lineWidth = 1;
    for (let j = -2; j <= 2; j++) { x.beginPath(); x.moveTo(w / 2, h); x.quadraticCurveTo(w / 2 + j * 9, h * 0.5, w / 2 + j * 15, h * 0.12); x.stroke(); }
  });
  let texSoil = null;
  function soilTex(top, mid, low) {
    return canvasTex(512, 256, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(0.5, mid); g.addColorStop(1, low);
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        const big = rnd(i + 3) > 0.97, px = rnd(i + 11) * w, py = rnd(i + 29) * h;
        x.fillStyle = big ? `rgba(120,100,80,${0.18 + rnd(i) * 0.2})` : `rgba(60,48,36,${0.08 + rnd(i + 5) * 0.14})`;
        x.beginPath(); x.ellipse(px, py, big ? 2 + rnd(i) * 3 : 0.6 + rnd(i) * 1.1, big ? 1.4 + rnd(i + 1) * 1.8 : 0.5 + rnd(i + 2) * 0.8, rnd(i + 9) * 3, 0, Math.PI * 2); x.fill();
      }
    });
  }

  // ---- Materials ----
  const mats = {
    stem: new THREE.MeshStandardMaterial({ color: 0x1f4a34, roughness: 0.55, metalness: 0 }),
    root: new THREE.MeshStandardMaterial({ color: 0x9b7a5c, roughness: 0.9 }),
    leafA: new THREE.MeshStandardMaterial({ map: texLeafA, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.62 }),
    leafB: new THREE.MeshStandardMaterial({ map: texLeafB, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.62 }),
    petal: new THREE.MeshStandardMaterial({ map: texPetal, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5 }),
    heart: new THREE.MeshStandardMaterial({ color: 0xf0c869, roughness: 0.6 }),
    sepal: new THREE.MeshStandardMaterial({ color: 0x3f6a4c, roughness: 0.6, side: THREE.DoubleSide }),
    seed: new THREE.MeshStandardMaterial({ color: 0xa8603f, roughness: 0.38, side: THREE.DoubleSide }),
    soilFace: new THREE.MeshStandardMaterial({ roughness: 1 }),
    ground: new THREE.MeshStandardMaterial({ roughness: 1 }),
    grass: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }),
  };
  const shadowMats = [];
  const leafGeo = (() => { // a leaf-sized sheet, cupped along the midrib and curving down towards the tip
    const g = new THREE.PlaneGeometry(1, 1, 12, 6);
    g.translate(0.5, 0, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, -0.55 * y * y + 0.12 * x * x);
    }
    g.computeVertexNormals();
    return g;
  })();
  const petalGeo = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 4, 6);
    g.translate(0, 0.5, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.35 * x * x - 0.18 * y * y); }
    g.computeVertexNormals();
    return g;
  })();

  // A tube that narrows along a 3D path. It is revealed from its base by drawing only the first
  // segments, with the last ring slid between two points so growth is smooth, not stepped.
  function tube(pts, r0, r1, radial, mat) {
    const n = pts.length, pos = new Float32Array(n * radial * 3), idx = [];
    const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
    let L = 0; const ls = [0];
    for (let i = 1; i < n; i++) { L += pts[i].distanceTo(pts[i - 1]); ls.push(L); }
    const rings = [];
    for (let i = 0; i < n; i++) {
      T.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      N.crossVectors(T, Z).normalize(); B.crossVectors(N, T).normalize();
      const r = r0 + (r1 - r0) * Math.pow(ls[i] / (L || 1), 0.8);
      const ring = [];
      for (let j = 0; j < radial; j++) {
        const a = (j / radial) * Math.PI * 2, c = Math.cos(a) * r, s = Math.sin(a) * r;
        const o = (i * radial + j) * 3;
        pos[o] = pts[i].x + N.x * c + B.x * s; pos[o + 1] = pts[i].y + N.y * c + B.y * s; pos[o + 2] = pts[i].z + N.z * c + B.z * s;
        ring.push(pos[o], pos[o + 1], pos[o + 2]);
      }
      rings.push(ring);
    }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial;
      idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat); cap.castShadow = true;
    const g = new THREE.Group(); g.add(mesh, cap);
    let moved = -1;
    const P = geo.attributes.position;
    function restore() { if (moved < 0) return; const ring = rings[moved]; for (let j = 0; j < radial; j++) P.setXYZ(moved * radial + j, ring[j * 3], ring[j * 3 + 1], ring[j * 3 + 2]); moved = -1; }
    return {
      g, L, ls, pts,
      at(f) { // point at a fraction of the length
        const t = clamp(f, 0, 1) * L; let i = 1; while (i < n - 1 && ls[i] < t) i++;
        const s = (t - ls[i - 1]) / ((ls[i] - ls[i - 1]) || 1);
        return new THREE.Vector3().lerpVectors(pts[i - 1], pts[i], s);
      },
      radiusAt(f) { return r0 + (r1 - r0) * Math.pow(clamp(f, 0, 1), 0.8); },
      set(p) {
        restore();
        if (p <= 0.003) { g.visible = false; return; }
        g.visible = true;
        const t = clamp(p, 0, 1) * L; let i = 1; while (i < n - 1 && ls[i] < t) i++;
        const s = (t - ls[i - 1]) / ((ls[i] - ls[i - 1]) || 1);
        if (i < n) { // slide ring i between ring i-1 and its real position
          const A = rings[i - 1], Bq = rings[i];
          for (let j = 0; j < radial; j++) P.setXYZ(i * radial + j, A[j * 3] + (Bq[j * 3] - A[j * 3]) * s, A[j * 3 + 1] + (Bq[j * 3 + 1] - A[j * 3 + 1]) * s, A[j * 3 + 2] + (Bq[j * 3 + 2] - A[j * 3 + 2]) * s);
          moved = i;
        }
        P.needsUpdate = true;
        geo.setDrawRange(0, i * radial * 6);
        const tip = new THREE.Vector3().lerpVectors(pts[i - 1], pts[i], s), r = r0 + (r1 - r0) * Math.pow(p, 0.8);
        cap.position.copy(tip); cap.scale.setScalar(r * 0.98);
      },
    };
  }

  // A leaf: the outer group sits on its attachment point and turns in the picture plane like the
  // flat version; the inner one tilts it in depth and rolls it open as it unfolds.
  function leaf3(d, base, i) {
    const outer = new THREE.Group(), inner = new THREE.Group();
    const len = d.len * 1.3, w = len * d.ratio * 2.25;
    const m = new THREE.Mesh(leafGeo, d.cls === 'b' ? mats.leafB : mats.leafA);
    m.scale.set(len, w, w * 0.9); m.castShadow = true;
    inner.add(m); outer.add(inner);
    outer.position.copy(base);
    const roll = (rnd(i * 3 + 1) - 0.5) * 70 * rad, pitch = (rnd(i * 5 + 2) - 0.5) * 70 * rad;
    return { g: outer, set(v) {
      if (v <= 0.002) { outer.visible = false; return; }
      outer.visible = true;
      const e = eo(v), o = eo(k(v, 0.25, 1)), sc = 0.12 + 0.88 * e;
      outer.rotation.set(0, 0, -(d.ang + (1 - e) * d.fold) * rad);
      inner.rotation.set(roll + (1 - o) * 1.2, pitch * e, 0);
      inner.scale.set(sc, sc * (0.2 + 0.8 * o), sc);
    } };
  }

  // A flower: five petals around an axis that leans towards the viewer; closed it is a bud.
  function flower3(d, tip, tangent) {
    const g = new THREE.Group();
    g.position.copy(tip);
    const axis = tangent.clone().multiplyScalar(0.55).add(new THREE.Vector3(0, 0.15, 0.85)).normalize();
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    const r = d.r * 1.25, petals = [];
    for (let i = 0; i < 5; i++) {
      const spin = new THREE.Group(); spin.rotation.y = i * 72 * rad + 0.3;
      const tilt = new THREE.Group(); spin.add(tilt);
      const m = new THREE.Mesh(petalGeo, mats.petal); m.scale.set(r * 0.85, r, r); m.castShadow = true;
      tilt.add(m); g.add(spin); petals.push(tilt);
    }
    const heart = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 14, 10), mats.heart); heart.position.y = r * 0.08; g.add(heart);
    const sepal = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, r * 0.45, 10, 1, true), mats.sepal); sepal.rotation.x = Math.PI; sepal.position.y = -r * 0.05; g.add(sepal);
    return { g, set(grow, open) {
      if (grow <= 0.002) { g.visible = false; return; }
      g.visible = true;
      const o = eo(open);
      g.scale.setScalar(0.3 + 0.7 * eo(grow));
      petals.forEach((t) => { t.rotation.x = (8 + 74 * o) * rad; });
      heart.scale.setScalar(0.4 + 0.6 * o);
    } };
  }

  // ---- Scene ----
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 20000);
  const hemi = new THREE.HemisphereLight(0xfff4e2, 0x8a7656, 1.9);
  const fill = new THREE.DirectionalLight(0xe8f0ff, 0.7); fill.position.set(1, 0.2, 1.4);
  const sun = new THREE.DirectionalLight(0xfff6ea, 1.9);
  sun.castShadow = true;
  scene.add(hemi, fill, sun, sun.target);
  let world = null, plant = null, parts = null, S = null, D = 1;

  function cssColor(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function applyTheme() {
    const bg = new THREE.Color(cssColor('--bg', '#F4F1E9'));
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, D * 1.02, D + (S && S.mobile ? 1100 : 1700));
    if (texSoil) texSoil.dispose();
    texSoil = soilTex(cssColor('--soil-top', '#E3DBC9'), cssColor('--soil-mid', '#DDD3BF'), cssColor('--soil-low', '#ECE7DB'));
    texSoil.wrapS = texSoil.wrapT = THREE.RepeatWrapping;
    if (S) texSoil.repeat.set(4 * S.W / 512, (S.H - S.g + 400) / 256);
    mats.soilFace.map = texSoil; mats.soilFace.needsUpdate = true;
    mats.ground.color.set(cssColor('--soil-top', '#E3DBC9'));
    const dark = bg.getHSL({}).l < 0.3;
    hemi.intensity = dark ? 1.0 : 1.9; sun.intensity = dark ? 1.4 : 1.9;
    mats.grass.color.set(dark ? 0x6f8f62 : 0x8fae7c);
  }

  function dispose(obj) {
    obj.traverse((o) => { if (o.isMesh && o.geometry !== leafGeo && o.geometry !== petalGeo) o.geometry.dispose(); });
  }

  function build(sc) {
    S = sc;
    if (world) { scene.remove(world); dispose(world); }
    world = new THREE.Group(); scene.add(world);
    plant = new THREE.Group(); world.add(plant);
    const { W, H, g, cx, mobile } = sc;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    D = (H / 2) / Math.tan(15 * rad);
    camera.updateProjectionMatrix();

    // Ground: a block of soil cut open at the front, so the roots show; its top runs back into the distance
    const faceH = H - g + 400;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W * 4, faceH), mats.soilFace);
    face.position.set(W / 2, -g - faceH / 2, 0); face.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(W * 8, 6000), mats.ground);
    top.rotation.x = -Math.PI / 2; top.position.set(W / 2, -g, -3000); top.receiveShadow = true;
    const lip = new THREE.Mesh(new THREE.BoxGeometry(W * 4, 2, 2), new THREE.MeshStandardMaterial({ color: 0x8a7a62, roughness: 1 }));
    lip.position.set(W / 2, -g, 0);
    world.add(face, top, lip);

    // Grass: thin blades scattered over the ground, thicker towards the front edge
    const clumps = mobile ? 260 : 700, per = 7, blades = clumps * per;
    const bladeGeo = new THREE.BufferGeometry();
    bladeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.1, 1, 0.15]), 3));
    bladeGeo.computeVertexNormals();
    const grass = new THREE.InstancedMesh(bladeGeo, mats.grass, blades);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), col = new THREE.Color();
    for (let i = 0; i < blades; i++) {
      const c = Math.floor(i / per);
      let x = (rnd(c + 7) - 0.5) * W * 2.6 + W / 2, z = -Math.pow(rnd(c + 13), 2.2) * 1800 - 6;
      if (Math.abs(x - cx) < 50 && z > -80) x += 120;
      x += (rnd(i + 71) - 0.5) * 9; z += (rnd(i + 73) - 0.5) * 9;
      const h = 6 + rnd(i + 3) * (mobile ? 12 : 17), wdt = 1.6 + rnd(i + 5) * 1.6;
      e3.set((rnd(i + 17) - 0.5) * 0.5, rnd(i + 19) * Math.PI * 2, (rnd(i + 23) - 0.5) * 0.5);
      m4.compose(new THREE.Vector3(x, -g, z), q.setFromEuler(e3), new THREE.Vector3(wdt, h, wdt));
      grass.setMatrixAt(i, m4);
      grass.setColorAt(i, col.setHSL(0.2 + rnd(i + 31) * 0.09, 0.18 + rnd(i + 37) * 0.14, 0.4 + rnd(i + 41) * 0.18));
    }
    grass.receiveShadow = true;
    world.add(grass);

    // Plant: rebuilt from the flat geometry, with depth added
    const stemZ = (f) => (mobile ? 6 : 16) * Math.sin(f * 3.3 + 0.4) * Math.min(1, f * 2.2);
    const stemPts = sc.stem.pts.map((p, i, a) => V(p.x, p.y, stemZ(i / (a.length - 1))));
    const stem = tube(stemPts, sc.stem.w0 * 0.55, sc.stem.w1 * 0.55, 12, mats.stem);
    plant.add(stem.g);
    const stemAt = (f) => stem.at(f);
    const stemFracOfY = (y) => clamp((sc.stem.pts[0].y - y) / (sc.stem.pts[0].y - sc.stem.pts[sc.stem.pts.length - 1].y), 0, 1);

    // the growing tip: a closed pair of young leaves
    const apex = new THREE.Group();
    const a1 = new THREE.Mesh(leafGeo, mats.leafB); a1.scale.set(16, 7, 6); a1.rotation.set(0.6, 0, Math.PI / 2 + 0.12);
    const a2 = new THREE.Mesh(leafGeo, mats.leafA); a2.scale.set(14, 6, 6); a2.rotation.set(-0.6, 0, Math.PI / 2 - 0.12);
    apex.add(a1, a2); plant.add(apex);

    const roots = [sc.rootMain].concat(sc.rootlets).map((r, i) => {
      const t = tube(r.pts.map((p) => V(p.x, p.y, 3 + i * 0.2)), r.w0 * 0.5, Math.max(0.3, r.w1 * 0.5), 6, mats.root);
      t.g.traverse((o) => { o.castShadow = false; });
      plant.add(t.g); return t;
    });

    const leaves = [];
    let li = 0;
    sc.cotys.forEach((d) => { const L = leaf3(d, V(d.x, d.y, stemZ(stemFracOfY(d.y))), li++); plant.add(L.g); leaves.push([d, L]); });
    sc.stemLeaves.forEach((s) => { const d = s.l; const L = leaf3(d, V(d.x, d.y, stemZ(stemFracOfY(d.y))), li++); plant.add(L.g); leaves.push([d, L]); });

    const brs = sc.branches.map((b, i) => {
      const n = b.br.pts.length, z0 = stemZ(stemFracOfY(b.br.pts[0].y));
      const bulge = (mobile ? 10 : 35 + rnd(i + 61) * 45) * (rnd(i + 67) > 0.5 ? 1 : -1);
      const pts = b.br.pts.map((p, j) => { const t = j / (n - 1); return V(p.x, p.y, z0 * (1 - t) + bulge * Math.sin(Math.PI * t * 0.85)); });
      const t = tube(pts, b.br.w0 * 0.55, b.br.w1 * 0.55, 10, mats.stem);
      plant.add(t.g);
      const bl = b.leaves.map((L, j) => { const d = L.l; const m = leaf3(d, t.at(L.f), li++); plant.add(m.g); return [d, m]; });
      const tipP = pts[n - 1], tan = new THREE.Vector3().subVectors(pts[n - 1], pts[n - 3]).normalize();
      const fl = flower3(b.bloom, tipP, tan); plant.add(fl.g);
      const node = new THREE.Mesh(new THREE.SphereGeometry(b.br.w0 * 0.62, 12, 8), mats.stem);
      node.position.copy(pts[0]); node.castShadow = true; plant.add(node);
      return { b, t, bl, fl, node, tip: tipP };
    });

    // Seed: two halves of a shiny husk that split open at the ground
    const seed = new THREE.Group(), sd = sc.seed;
    seed.position.copy(V(sd.x, sd.y, 4));
    const half = (side) => {
      const piv = new THREE.Group();
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14, side > 0 ? 0 : Math.PI, Math.PI), mats.seed);
      m.rotation.y = Math.PI / 2; // split along the vertical plane facing the viewer
      m.scale.set(6.2 * sd.sc, 8.8 * sd.sc, 5.4 * sd.sc); m.position.y = 8.6 * sd.sc; m.castShadow = true;
      piv.add(m); seed.add(piv); piv.rotation.z = -16 * rad; return piv;
    };
    const sL = half(-1), sR = half(1);
    plant.add(seed);

    parts = { stem, apex, roots, leaves, brs, sL, sR, seed };

    // Sun from the upper left and slightly in front; its shadow falls behind the plant onto the ground
    sun.position.set(cx - W * 0.6, -g + H * 1.3, H * 0.9);
    sun.target.position.set(cx, -g, -80);
    const sh = sun.shadow.camera, ext = Math.max(W, H) * 0.9;
    sh.left = -ext; sh.right = ext; sh.top = ext; sh.bottom = -ext; sh.near = 10; sh.far = H * 4;
    sh.updateProjectionMatrix();
    sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    applyTheme();
  }

  const v3 = new THREE.Vector3();
  function render(u, tx, ty, s) {
    if (!parts) return;
    const { stem, apex, roots, leaves, brs, sL, sR } = parts;
    const sc = S;
    // the whole scene follows the flat camera (side shift on phones, step back at the end)
    world.position.set(tx, -ty, 0); world.scale.setScalar(s);

    // growth, read from the flat plant's state
    const o = Math.max(0, sc.seed.v);
    sL.rotation.z = -16 * rad + 18 * o * rad; sL.position.x = -1.8 * o * sc.seed.sc;
    sR.rotation.z = -16 * rad - 18 * o * rad; sR.position.x = 1.8 * o * sc.seed.sc;
    roots[0].set(Math.max(0, sc.rootMain.p));
    sc.rootlets.forEach((r, i) => roots[i + 1].set(Math.max(0, r.p)));
    const ps = Math.max(0, sc.stem.p);
    stem.set(ps);
    if (ps > 0.003) {
      apex.visible = true;
      const tp = stem.at(Math.min(1, ps + 2 / stem.L)), tq = stem.at(Math.max(0, ps - 4 / stem.L));
      apex.position.copy(tp);
      apex.rotation.z = Math.atan2(tp.y - tq.y, tp.x - tq.x) - Math.PI / 2;
      apex.scale.setScalar(clamp(stem.radiusAt(ps) / 2.2, 0.45, 1.4));
    } else apex.visible = false;
    leaves.forEach(([d, L]) => L.set(Math.max(0, d.v)));
    brs.forEach((B) => {
      const bp = Math.max(0, B.b.br.p);
      B.t.set(bp);
      B.node.visible = bp > 0.01;
      B.bl.forEach(([d, L]) => L.set(Math.max(0, d.v)));
      B.fl.set(B.b.bloom.gv || 0, B.b.bloom.ov || 0);
    });

    // camera: turns slowly around the plant as you scroll, and rises a little at the end
    const total = sc.branches.length;
    const yawMax = sc.mobile ? 6 : 11;
    const end = 2.05 + total * 1.25;
    // level and straight on at the start, then a slow turn from one side to the other, rising a little at the end
    const a = yawMax * (2 * k(u, 0.6, end) - 1) * k(u, 0.15, 1.1) * rad;
    const b = (-5 + 4 * k(u, 0.3, 1.6) + 6 * k(u, end, end + 0.8)) * rad;
    const pivot = new THREE.Vector3(sc.W / 2, -sc.H / 2, 0);
    camera.position.set(pivot.x + Math.sin(a) * Math.cos(b) * D, pivot.y + Math.sin(b) * D, Math.cos(a) * Math.cos(b) * D);
    camera.lookAt(pivot);
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
  }

  function tip(i) {
    const B = parts && parts.brs[i];
    if (!B) return [0, 0];
    v3.copy(B.tip).applyMatrix4(plant.matrixWorld).project(camera);
    return [(v3.x + 1) / 2 * S.W, (1 - v3.y) / 2 * S.H];
  }

  // theme changes recolour the soil and fog
  const redraw = () => { if (S) { applyTheme(); api.refresh(); } };
  new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);

  api.attach({ build, render, tip });
}
