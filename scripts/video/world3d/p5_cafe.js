
/* =====================================================================================
   5. THE CAFE — procedural props, physically based materials, warm key from the city lights and lamps, cool rim from the far windows.
   Everything is modelled here: no logos, no lettering, no real product.
   ===================================================================================== */
const CAFE = new THREE.Group(); CAFE.name = 'Cafe'; universe.add(CAFE);
function vnoise2(seed) {
  const P = new Float32Array(65536), r = mulberry32(seed); for (let i = 0; i < 65536; i++) P[i] = r();
  const at = (x, y) => P[((x & 255) << 8) | (y & 255)];
  return (x, y) => { const i = Math.floor(x), j = Math.floor(y); let f = x - i, g = y - j; f = f * f * (3 - 2 * f); g = g * g * (3 - 2 * g);
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1); return a + (b - a) * f + (c - a) * g + (a - b - c + d) * f * g; };
}
function canvasTex(w, h, srgb, repeat, fill) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), im = g.createImageData(w, h); fill(im.data, w, h); g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(repeat[0], repeat[1]); t.anisotropy = MAX_ANISO; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
// walnut: straight grain along x only (the table's length), a slow drift of the growth lines, long fibres, fine pores. Nothing runs across the grain
const WOOD = (() => {
  const W = 2048, H = 1024, n = vnoise2(11), hgt = new Float32Array(W * H), alb = new Float32Array(W * H * 3);
  const c0 = [0.082, 0.046, 0.027], c1 = [0.185, 0.104, 0.057], c2 = [0.30, 0.176, 0.096];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H;
    const g = v + 0.022 * (n(u * 1.5, v * 3.0) - 0.5) + 0.006 * (n(u * 4.5 + 9, v * 9.0 + 4) - 0.5);
    const ring = g * 15 + 1.3 * n(u * 0.8 + 3, g * 3.5), f = ring - Math.floor(ring), band = Math.pow(Math.abs(f * 2 - 1), 1.5);
    const streak = n(u * 6, g * 230) * 0.6 + n(u * 15 + 5, g * 500) * 0.4;
    const pore = Math.pow(n(u * 55, g * 680), 8) * 1.4;
    const t = Math.min(1, Math.max(0, 0.30 + 0.34 * band + 0.42 * (streak - 0.5) + 0.26 * (n(u * 0.7 + 7, g * 2.2) - 0.5)));
    const a = t < 0.5 ? c0 : c1, b = t < 0.5 ? c1 : c2, k = t < 0.5 ? t * 2 : t * 2 - 1, dark = 1 - Math.min(0.3, pore * 0.6);
    const i = (y * W + x) * 3; alb[i] = (a[0] + (b[0] - a[0]) * k) * dark; alb[i + 1] = (a[1] + (b[1] - a[1]) * k) * dark; alb[i + 2] = (a[2] + (b[2] - a[2]) * k) * dark;
    hgt[y * W + x] = streak * 0.4 + band * 0.08 - pore * 0.3;
  }
  const lin2s = x => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055) * 255;
  const map = canvasTex(W, H, true, null, d => { for (let i = 0, N = W * H; i < N; i++) { d[i * 4] = lin2s(alb[i * 3]); d[i * 4 + 1] = lin2s(alb[i * 3 + 1]); d[i * 4 + 2] = lin2s(alb[i * 3 + 2]); d[i * 4 + 3] = 255; } });
  const nrm = canvasTex(W, H, false, null, d => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const xp = (x + 1) % W, xm = (x + W - 1) % W, yp = (y + 1) % H, ym = (y + H - 1) % H;
    const dx = (hgt[y * W + xp] - hgt[y * W + xm]) * 1.0, dy = (hgt[yp * W + x] - hgt[ym * W + x]) * 1.0, l = Math.hypot(dx, dy, 1), i = (y * W + x) * 4;
    d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255; } });
  const rgh = canvasTex(W / 2, H / 2, false, null, (d, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = hgt[(y * 2) * W + x * 2], i = (y * w + x) * 4, g = 255 * Math.min(0.85, 0.74 - 0.16 * v); d[i] = d[i + 1] = d[i + 2] = g; d[i + 3] = 255; } });
  return { map, nrm, rgh };
})();
// oak boards for the floor: boards along x, each with its own tone, dark joints between them, grain along the board
const FLOOR_TEX = canvasTex(1024, 1024, true, null, (d, w, h) => {
  const n = vnoise2(23), r = mulberry32(41), rows = 8, tone = [], cut = [];
  for (let i = 0; i < rows; i++) { tone.push(0.72 + 0.56 * r()); cut.push(r()); }
  const wrapN = (u, v) => n(u, v) * (1 - u / 6) + n(u - 6, v) * (u / 6);       // joins at the tile's edge
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const vv = y / h * rows, p = Math.floor(vv), fv = vv - p, u = x / w, du = Math.abs(((u - cut[p] + 1.5) % 1) - 0.5);
    const grain = wrapN(u * 6, vv * 26 + p * 37) * 0.7 + wrapN(u * 6, vv * 90 + p * 11) * 0.3, sh = tone[p] * (0.62 + 0.76 * grain);
    const joint = Math.min(1, Math.min(fv, 1 - fv) * 60) * Math.min(1, du * 180), f = sh * (0.35 + 0.65 * joint), i = (y * w + x) * 4;
    d[i] = 92 * f; d[i + 1] = 62 * f; d[i + 2] = 40 * f; d[i + 3] = 255; } });
// the fine tooth of rolled paint: no large shapes, so a wall lit from the side stays a clean painted wall
const PLASTER_N = canvasTex(512, 512, false, [5, 5], (d, w, h) => { const n = vnoise2(5), H = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) H[y * w + x] = n(x * 0.5, y * 0.5) * 0.6 + n(x * 0.95, y * 0.95) * 0.4;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (H[y * w + (x + 1) % w] - H[y * w + (x + w - 1) % w]) * 1.5, dy = (H[((y + 1) % h) * w + x] - H[((y + h - 1) % h) * w + x]) * 1.5, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4; d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255; } });
const WOOD_MAT = new THREE.MeshStandardMaterial({ map: WOOD.map, normalMap: WOOD.nrm, normalScale: new THREE.Vector2(0.1, 0.1), roughnessMap: WOOD.rgh, roughness: 1.0, metalness: 0, envMapIntensity: 0.4 });
// the grain follows the object's own x axis whatever its size or UVs: a board of any shape shows the same straight walnut, at real scale
WOOD_MAT.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
  vec2 woodUv = vec2(position.x / 1.6 + 0.5, (position.z + position.y) / 0.86 + 0.5); vMapUv = woodUv; vNormalMapUv = woodUv; vRoughnessMapUv = woodUv;`); };
WOOD_MAT.customProgramCacheKey = () => 'wood-axis';
const SHELF_MAT = new THREE.MeshStandardMaterial({ color: 0x38210f, roughness: 0.62, envMapIntensity: 0.3 });
const STEEL_MAT = new THREE.MeshStandardMaterial({ color: 0x17181a, metalness: 0.9, roughness: 0.42 });
const BRASS_MAT = new THREE.MeshStandardMaterial({ color: 0xb08a55, metalness: 1, roughness: 0.32 });
const PLASTER_MAT = new THREE.MeshStandardMaterial({ color: 0x5b4c40, roughness: 0.86, normalMap: PLASTER_N, normalScale: new THREE.Vector2(0.09, 0.09), envMapIntensity: 0.12 });
const CONCRETE_MAT = new THREE.MeshStandardMaterial({ color: 0x4c4138, roughness: 0.88, normalMap: PLASTER_N, normalScale: new THREE.Vector2(0.09, 0.09), envMapIntensity: 0.12 });
const DADO_MAT = new THREE.MeshStandardMaterial({ color: 0x24332b, roughness: 0.58, normalMap: PLASTER_N, normalScale: new THREE.Vector2(0.05, 0.05), envMapIntensity: 0.18 });
const FLOOR_MAT = new THREE.MeshStandardMaterial({ map: FLOOR_TEX, roughness: 0.56, metalness: 0, envMapIntensity: 0.24 });
const CERAMIC_MAT = new THREE.MeshPhysicalMaterial({ color: 0xe9e2d6, roughness: 0.5, metalness: 0, clearcoat: 0.18, clearcoatRoughness: 0.42, envMapIntensity: 0.42 });
const box = (w, h, d, mat, x, y, z, parent = CAFE, cast = false) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
// a room of closed slabs: floor, ceiling, side walls, and two window walls built around their openings
const ROOM = { x: 3.6, zb: -3.6, zf: 2.4, h: 3.0, t: 0.25 };
{
  const { x: X, zb: ZB, zf: ZF, h: Y, t: T } = ROOM, L = ZF - ZB, zc = (ZF + ZB) / 2;
  const floor = box(2 * X + 2 * T, T, L + 2 * T, FLOOR_MAT, 0, -T / 2, zc); floor.name = 'Floor';
  { const g = floor.geometry, uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3.5, uv.getY(i) * 9); }
  box(2 * X + 2 * T, T, L + 2 * T, PLASTER_MAT, 0, Y + T / 2, zc).name = 'Ceiling';
  box(T, Y, L, PLASTER_MAT, -X - T / 2, Y / 2, zc).name = 'WallW';
  box(T, Y, L, PLASTER_MAT, X + T / 2, Y / 2, zc).name = 'WallE';
  const winWall = (z, x0, x1, y0, y1, mullions, mat) => {
    box(x0 + X, Y, T, mat, (-X + x0) / 2, Y / 2, z); box(X - x1, Y, T, mat, (x1 + X) / 2, Y / 2, z);
    box(x1 - x0, y0, T, mat, (x0 + x1) / 2, y0 / 2, z); box(x1 - x0, Y - y1, T, mat, (x0 + x1) / 2, (y1 + Y) / 2, z);
    for (const mx of mullions) box(0.05, y1 - y0, 0.09, STEEL_MAT, mx, (y0 + y1) / 2, z);
    box(x1 - x0, 0.05, 0.09, STEEL_MAT, (x0 + x1) / 2, y0 + 0.025, z); box(x1 - x0, 0.05, 0.09, STEEL_MAT, (x0 + x1) / 2, y1 - 0.025, z);
    box(0.05, y1 - y0, 0.09, STEEL_MAT, x0 + 0.025, (y0 + y1) / 2, z); box(0.05, y1 - y0, 0.09, STEEL_MAT, x1 - 0.025, (y0 + y1) / 2, z);
  };
  winWall(ZF + T / 2, -3.0, 3.0, 0.45, 2.7, [-1.1, 1.1], CONCRETE_MAT);
  box(6, 0.05, 0.09, STEEL_MAT, 0, 2.25, ZF + T / 2);
  winWall(ZB - T / 2, -3.2, 3.2, 0.78, 2.62, [-1.6, 0, 1.6], PLASTER_MAT);
  // painted dado, skirting, rail, window sill and curtains: the room reads at its real size
  const dado = (w, d, x, z) => { box(w, 0.86, d, DADO_MAT, x, 0.43, z); box(w + 0.012, 0.022, d + 0.012, SHELF_MAT, x, 0.87, z); box(w + 0.006, 0.11, d + 0.006, STEEL_MAT, x, 0.055, z); };
  dado(0.02, L, -X + 0.01, zc); dado(0.02, L, X - 0.01, zc);
  box(2 * X, 0.76, 0.02, DADO_MAT, 0, 0.38, ZB + 0.01); box(2 * X, 0.11, 0.026, STEEL_MAT, 0, 0.055, ZB + 0.013); box(6.56, 0.034, 0.17, SHELF_MAT, 0, 0.768, ZB + 0.06);
  const folds = (cx, w) => { const g = new THREE.PlaneGeometry(w, 2.72, 96, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const a = p.getX(i) / w * Math.PI * 2; p.setZ(i, 0.028 * Math.sin(a * 4.2 + cx) + 0.012 * Math.sin(a * 11.0 + cx * 2.0)); } g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x6d5c4b, roughness: 1, envMapIntensity: 0.1, side: THREE.DoubleSide })); m.position.set(cx, 1.42, ZB + 0.11); m.receiveShadow = true; m.material.userData.thin = true; CAFE.add(m); };
  folds(-3.22, 0.62); folds(3.22, 0.62); box(7.1, 0.018, 0.018, STEEL_MAT, 0, 2.79, ZB + 0.11);
}
// window glass: clean, a faint tint, reflections from the environment only
const GLASS_MAT = new THREE.MeshPhysicalMaterial({ color: 0x9fb2b4, metalness: 0, roughness: 0.06, transparent: true, opacity: 0.045, alphaMap: null, envMapIntensity: 0.9, depthWrite: false, side: THREE.DoubleSide });
GLASS_MAT.userData.passable = true; GLASS_MAT.userData.thin = true;
for (const [w, h, x, y, z] of [[6, 2.25, 0, 1.575, ROOM.zf + ROOM.t / 2], [6.4, 1.84, 0, 1.7, ROOM.zb - ROOM.t / 2]]) {
  const g = noDepth(new THREE.Mesh(new THREE.PlaneGeometry(w, h), GLASS_MAT)); g.position.set(x, y, z); g.renderOrder = 6; g.name = 'WindowGlass'; g.userData.passable = true; CAFE.add(g);
}
// the night behind the far windows: a smooth sky over soft far buildings. It sits right behind the openings and under the light field (renderOrder 2), and covers what the city and sky layers would show there
{
  const c = document.createElement('canvas'); c.width = 1024; c.height = 320; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 320);
  gr.addColorStop(0, '#0d1420'); gr.addColorStop(0.62, '#141a26'); gr.addColorStop(1, '#2c2522'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 320);
  g.filter = 'blur(9px)'; const r = mulberry32(17); for (let i = 0; i < 26; i++) { const w = 50 + r() * 90, h = 70 + r() * 190; g.fillStyle = `rgba(${6 + r() * 6},${8 + r() * 6},${12 + r() * 8},0.85)`; g.fillRect(r() * 1024 - w / 2, 320 - h, w, h + 20); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const b = noDepth(new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.0), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }))); b.position.set(0, 1.7, ROOM.zb - ROOM.t - 0.01); b.renderOrder = 1.5; b.name = 'FarNight'; b.userData.passable = true; b.material.userData.thin = true; CAFE.add(b);
}
// the table
const TABLE = new THREE.Group(); TABLE.position.set(0.22, 0, 0.02); CAFE.add(TABLE);
{
  const top = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.036, 0.82, 4, 0.006), WOOD_MAT); top.position.y = TABLE_Y - 0.018; top.castShadow = top.receiveShadow = true; top.name = 'TableTop'; TABLE.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.011, TABLE_Y - 0.036, 16), STEEL_MAT); l.position.set(sx * 0.66, (TABLE_Y - 0.036) / 2, sz * 0.32); l.castShadow = true; TABLE.add(l); }
  box(1.34, 0.03, 0.02, STEEL_MAT, 0, TABLE_Y - 0.05, 0.32, TABLE); box(1.34, 0.03, 0.02, STEEL_MAT, 0, TABLE_Y - 0.05, -0.32, TABLE);
}
const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
// cup, saucer, spoon, coffee
const CUP_POS = V3(0.20, TABLE_Y, -0.125);
const CUP = new THREE.Group(); CUP.position.copy(CUP_POS); CAFE.add(CUP);
{
  const saucer = new THREE.Mesh(lathe([[0, 0.002], [0.03, 0.002], [0.036, 0.003], [0.052, 0.009], [0.072, 0.016], [0.076, 0.0185], [0.0775, 0.0205], [0.076, 0.0215], [0.071, 0.0195], [0.05, 0.012], [0.037, 0.0075], [0.03, 0.0075], [0, 0.0075]]), CERAMIC_MAT);
  saucer.castShadow = saucer.receiveShadow = true; saucer.name = 'Saucer'; CUP.add(saucer);
  const body = new THREE.Mesh(lathe([[0, 0.0085], [0.022, 0.0085], [0.024, 0.0095], [0.0242, 0.012], [0.028, 0.016], [0.036, 0.028], [0.0415, 0.044], [0.0442, 0.06], [0.0452, 0.070], [0.0455, 0.0725], [0.0445, 0.0735], [0.0428, 0.0725], [0.0425, 0.070], [0.041, 0.058], [0.038, 0.044], [0.033, 0.030], [0.024, 0.018], [0, 0.015]], 96), CERAMIC_MAT);
  body.castShadow = body.receiveShadow = true; body.name = 'Cup'; CUP.add(body);
  const hc = new THREE.CatmullRomCurve3([V3(0.0405, 0.062, 0), V3(0.058, 0.066, 0), V3(0.070, 0.054, 0), V3(0.066, 0.038, 0), V3(0.050, 0.030, 0), V3(0.0355, 0.030, 0)]);
  const handle = new THREE.Mesh(new THREE.TubeGeometry(hc, 48, 0.0042, 14), CERAMIC_MAT); handle.castShadow = true; handle.rotation.y = -0.65; handle.name = 'CupHandle'; CUP.add(handle);
  const coffeeTex = canvasTex(512, 512, true, null, (d, w, h) => { const n = vnoise2(3); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = x / w - 0.5, dy = y / h - 0.5, r = Math.hypot(dx, dy) * 2, ang = Math.atan2(dy, dx), m = n(x * 0.03 + 5 * Math.cos(ang) * r, y * 0.03 + 5 * Math.sin(ang) * r), crema = Math.min(1, Math.max(0, (r - 0.72 + 0.14 * (m - 0.5)) * 6)) * 0.85 + 0.24 * Math.pow(m, 3), i = (y * w + x) * 4;
      d[i] = 34 + crema * 112; d[i + 1] = 19 + crema * 60; d[i + 2] = 10 + crema * 24; d[i + 3] = 255; } });
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.0422, 64).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: coffeeTex, roughness: 0.5, specularIntensity: 0.1, specularColor: new THREE.Color(0.95, 0.74, 0.55), envMapIntensity: 0.06 })); coffee.position.y = 0.0635; coffee.name = 'Coffee'; coffee.receiveShadow = true; CUP.add(coffee);
  const spoon = new THREE.Group(); spoon.position.set(0.058, 0.0205, 0.018); spoon.rotation.set(-0.06, 0.74, 0.02); CUP.add(spoon);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.011, 24, 16), new THREE.MeshStandardMaterial({ color: 0xcfcfcb, metalness: 1, roughness: 0.2 })); bowl.scale.set(0.62, 0.16, 1); bowl.position.z = -0.018; bowl.castShadow = true; spoon.add(bowl);
  const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.0013, 0.074, 6, 10), bowl.material); stem.rotation.x = Math.PI / 2 - 0.05; stem.position.set(0, 0.0015, 0.024); stem.scale.x = 1.5; stem.castShadow = true; spoon.add(stem);
}
// a closed notebook and a glass of water (no lettering)
{
  const nb = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.016, 0.21, 3, 0.003), new THREE.MeshStandardMaterial({ color: 0x20302a, roughness: 0.68, normalMap: PLASTER_N, normalScale: new THREE.Vector2(0.5, 0.5) })); nb.position.set(0.53, TABLE_Y + 0.008, -0.1); nb.rotation.y = 0.28; nb.castShadow = nb.receiveShadow = true; nb.name = 'Notebook'; CAFE.add(nb);
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.143, 0.011, 0.204), new THREE.MeshStandardMaterial({ color: 0xcfc6b2, roughness: 0.9 })); pages.position.copy(nb.position); pages.rotation.copy(nb.rotation); pages.position.x += 0.0015; pages.scale.y = 1.15; CAFE.add(pages);
  // a glass tumbler: what makes glass read on a dark room is its edges. Bright thin rim, Fresnel edge, two long window highlights, and the light it gathers on the table
  const glassMat = (rim) => { const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vL; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; vL = position; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; varying vec3 vL; void main(){ vec3 N = normalize(vN), V = normalize(vV); if (dot(N, V) < 0.0) N = -N; float ndv = max(dot(N, V), 0.0);
      float F = 0.03 + 0.97 * pow(clamp(1.0 - ndv, 0.0, 1.0), 4.0);
      float win = smoothstep(0.86, 0.985, dot(N, normalize(vec3(0.60, 0.10, 0.79)))) * smoothstep(0.012, 0.03, vL.y) * smoothstep(0.108, 0.09, vL.y);
      float lamp = smoothstep(0.93, 0.995, dot(N, normalize(vec3(-0.66, 0.16, 0.73)))) * smoothstep(0.012, 0.03, vL.y) * smoothstep(0.108, 0.09, vL.y);
      float lip = smoothstep(0.1085, 0.1105, vL.y), foot = smoothstep(0.014, 0.004, vL.y);
      vec3 c = vec3(0.62, 0.72, 0.88) * (F * 0.8 + win * 0.2) + vec3(1.0, 0.8, 0.58) * (lamp * 0.26 + lip * 0.75 + foot * 0.26);
      gl_FragColor = vec4(c * ${rim.toFixed(2)}, F * 0.32 + 0.012); }` }); m.userData.thin = true; return m; };
  const gl = new THREE.Mesh(lathe([[0, 0.0], [0.028, 0.0], [0.0315, 0.0025], [0.036, 0.1095], [0.0356, 0.111], [0.0348, 0.111], [0.0342, 0.1095], [0.0300, 0.012], [0.024, 0.0085], [0, 0.0075]], 96), glassMat(1)); gl.position.set(-0.27, TABLE_Y + 0.0004, -0.13); gl.renderOrder = 8; gl.name = 'WaterGlass'; CAFE.add(gl);   // stays in the depth-of-field depth, so its edges keep their true focus
  const water = noDepth(new THREE.Mesh(lathe([[0, 0.0085], [0.0298, 0.0125], [0.0327, 0.078], [0.0333, 0.0795], [0.03, 0.0782], [0, 0.0782]], 64), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; vY = position.y; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec3 N = normalize(vN), V = normalize(vV); if (dot(N, V) < 0.0) N = -N; float e = pow(clamp(1.0 - dot(N, V), 0.0, 1.0), 2.5), men = smoothstep(0.0765, 0.0785, vY);
      gl_FragColor = vec4(vec3(0.52, 0.60, 0.68) * (e * 0.16 + men * 0.34), 0.05 + e * 0.32); }` }))); water.position.copy(gl.position); water.renderOrder = 7; CAFE.add(water);
}
// contact shadows, tight under each thing that touches the table (the wide soft ones are in the phone part), the glass's gathered light, and the floor's occlusion
{
  const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 24, 64, 64, 63); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.72)'); gr.addColorStop(0.78, 'rgba(255,255,255,0.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const rectTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.filter = 'blur(9px)'; g.fillStyle = '#fff'; g.fillRect(24, 24, 80, 80); return new THREE.CanvasTexture(c); })();
  const causticTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.filter = 'blur(2.2px)'; g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 38, 0.35, 2.8); g.stroke(); g.lineWidth = 2.5; g.globalAlpha = 0.6; g.beginPath(); g.arc(64, 74, 24, 0.6, 2.5); g.stroke(); return new THREE.CanvasTexture(c); })();
  const lay = (tex, w, d, x, y, z, o, ry = 0, add = false, col = 0x000000) => { const m = noDepth(new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, color: col, transparent: true, opacity: o, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }))); m.material.userData.thin = true; m.userData.passable = true; m.position.set(x, y, z); m.rotation.y = ry; m.renderOrder = 4; CAFE.add(m); return m; };
  const TY = TABLE_Y + 0.0009;
  lay(rectTex, 0.158, 0.116, 0, TY, -0.012, 0.92);                       // the stand's base
  lay(blobTex, 0.135, 0.135, CUP_POS.x, TY, CUP_POS.z, 0.86);            // the saucer
  lay(rectTex, 0.25, 0.345, 0.53, TY, -0.1, 0.85, 0.28);                 // the notebook
  lay(blobTex, 0.112, 0.112, -0.27, TY, -0.13, 0.62);                    // the glass
  lay(causticTex, 0.13, 0.13, -0.277, TY + 0.0002, -0.118, 0.15, 0.4, true, 0xffe2bd);   // the light the glass gathers, on the side away from the lamp
  for (const [x, z, r, o] of [[0.22, 0.02, 2.3, 0.5], [-1.9, -1.9, 1.15, 0.6], [2.0, -1.8, 1.15, 0.6], [2.4, 1.05, 1.15, 0.6], [-2.3, 0.95, 1.15, 0.6]]) lay(blobTex, r, r * 0.8, x, 0.002, z, o);
}
// the rest of the room: lamps, tables, chairs, shelf (seen out of focus, still real shapes)
const LAMP_POS = [[0.28, 1.98, 0.02], [-1.9, 2.05, -1.9], [2.0, 2.05, -1.8], [2.3, 2.05, 1.1], [-2.2, 2.05, 1.0]];
const LAMP_LIGHTS = [];
{
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(9.5, 6.2, 3.2) });
  const shade = lathe([[0.012, 0.16], [0.03, 0.15], [0.06, 0.10], [0.135, 0.0], [0.133, -0.003], [0.058, 0.095], [0.028, 0.143], [0.012, 0.152]], 48);
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x151412, metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide }); shadeMat.userData.thin = true;
  LAMP_POS.forEach(([x, y, z], i) => {
    const g = new THREE.Group(); g.position.set(x, y, z); CAFE.add(g);
    const s = new THREE.Mesh(shade, shadeMat); g.add(s);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 14), bulbMat); b.position.y = 0.03; g.add(b);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, ROOM.h - y - 0.15, 8), STEEL_MAT); c.position.y = 0.15 + (ROOM.h - y - 0.15) / 2; g.add(c);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.026, 28), STEEL_MAT); rose.position.y = ROOM.h - y - 0.013; g.add(rose);
    const L = new THREE.PointLight(0xffc488, 1, 0, 2); L.position.set(x, y - 0.03, z); CAFE.add(L); LAMP_LIGHTS.push({ L, I: i === 0 ? 1.5 : 2.6 });
  });
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.55 }), cushion = new THREE.MeshStandardMaterial({ color: 0x4a2f24, roughness: 0.9 });
  const chair = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; CAFE.add(g);
    const seat = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.05, 0.42, 3, 0.015), cushion); seat.position.y = 0.46; g.add(seat);
    const back = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.26, 0.03, 3, 0.012), chairMat); back.position.set(0, 0.72, -0.2); back.rotation.x = -0.08; g.add(back);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, sz < 0 ? 0.74 : 0.45, 10), chairMat); l.position.set(sx * 0.18, sz < 0 ? 0.37 : 0.225, sz * 0.18); g.add(l); } };
  const smallTable = (x, z) => { const t = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.034, 0.7, 3, 0.006), WOOD_MAT); t.position.set(x, TABLE_Y - 0.017, z); CAFE.add(t); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, TABLE_Y - 0.034, 14), STEEL_MAT); st.position.set(x, (TABLE_Y - 0.034) / 2, z); CAFE.add(st); const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.018, 28), STEEL_MAT); ft.position.set(x, 0.009, z); CAFE.add(ft); chair(x - 0.62, z, Math.PI / 2); chair(x + 0.62, z, -Math.PI / 2); };
  smallTable(-1.9, -1.9); smallTable(2.0, -1.8); smallTable(2.4, 1.05); smallTable(-2.3, 0.95);
  chair(0.22, -0.72, 0);
  // shelves on both side walls, with jars and bottles out of focus
  const rnd = mulberry32(9), jar = new THREE.CylinderGeometry(0.05, 0.05, 1, 16), jm = [new THREE.MeshStandardMaterial({ color: 0x6c4a2a, roughness: 0.3 }), new THREE.MeshStandardMaterial({ color: 0x2a4a3a, roughness: 0.25 }), new THREE.MeshStandardMaterial({ color: 0xc9b89c, roughness: 0.55 }), new THREE.MeshStandardMaterial({ color: 0x1c2228, roughness: 0.2, metalness: 0.4 })];
  for (const sx of [-1, 1]) for (const y of [1.25, 1.75]) { box(0.28, 0.03, 3.9, SHELF_MAT, sx * (ROOM.x - 0.14), y, -0.4); for (let i = 0; i < 26; i++) { const h = 0.12 + rnd() * 0.2, m = new THREE.Mesh(jar, jm[Math.floor(rnd() * 4)]); m.scale.set(0.7 + rnd() * 0.5, h, 0.7 + rnd() * 0.5); m.position.set(sx * (ROOM.x - 0.15 + (rnd() - 0.5) * 0.06), y + 0.015 + h / 2, -2.2 + i * 0.145 + rnd() * 0.05); CAFE.add(m); } }
}
// light: warm key (from the city through the front window, and the lamp), cool rim from the far windows, soft fill
const KEY_LIGHT = new THREE.DirectionalLight(0xffd2a0, 1.15); KEY_LIGHT.position.set(-1.0, 3.0, 2.0); KEY_LIGHT.target.position.set(0.1, TABLE_Y, 0); KEY_LIGHT.castShadow = true; KEY_LIGHT.shadow.mapSize.set(2048, 2048); CAFE.add(KEY_LIGHT, KEY_LIGHT.target);
const RIM_LIGHT = new THREE.DirectionalLight(0xa8c6f5, 0.34); RIM_LIGHT.position.set(1.6, 1.9, -3.4); RIM_LIGHT.target.position.set(0.1, TABLE_Y, 0); CAFE.add(RIM_LIGHT, RIM_LIGHT.target);
const FILL_LIGHT = new THREE.HemisphereLight(0x8a7a6a, 0x1a1412, 0.42); scene.add(FILL_LIGHT);
// the environment that reflects in glass, ceramic, metal and lacquer: warm lamps, the far windows' cool glow with city lights
scene.environment = (() => {
  const s = new THREE.Scene(); s.background = new THREE.Color(0x0c0a09);
  const room = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 7), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.075, 0.055, 0.042), side: THREE.BackSide })); room.position.y = 0.8; s.add(room);
  const panel = (w, h, c, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); };
  panel(6.2, 1.7, [0.16, 0.22, 0.36], 0, 1, -3.4);                                    // the far windows (cool sky glow)
  panel(5.6, 2.1, [0.34, 0.25, 0.18], 0, 0.9, 3.4);                                   // the front window (warm street)
  const r = mulberry32(3); for (let i = 0; i < 60; i++) { const a = r(); panel(0.05 + r() * 0.1, 0.05 + r() * 0.1, a < 0.6 ? [6, 3.6, 1.8] : [2.5, 3.4, 6], (r() - 0.5) * 6, 0.2 + r() * 1.6, r() < 0.5 ? -3.35 : 3.35); }
  for (const [x, y, z] of LAMP_POS) panel(0.34, 0.34, [16, 10, 5.5], x, 1.4, z, 0, Math.PI / 2);
  const pm = new THREE.PMREMGenerator(renderer); const t = pm.fromScene(s, 0.02, 0.05, 30).texture; pm.dispose(); return t;
})();
// steam that stays: it rises from the coffee in every act and takes the far windows' cool light on its right edge. Drawn from the film's clock (STEAM_U.uT), so a frame depends on t alone
const CAFE_STEAM_U = { uT: { value: 0 }, uA: { value: 0 } };
const CAFE_STEAM = noDepth(new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.36), new THREE.ShaderMaterial({ uniforms: CAFE_STEAM_U, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: `varying vec2 vP; void main(){ vP = vec2(position.x, position.y + 0.18); float s = length(modelViewMatrix[0].xyz); vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * s; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float uT, uA; varying vec2 vP; ${NOISE_GLSL}
    float den(vec2 p){ float y = clamp(p.y / 0.36, 0.0, 1.0);
      float bend = (fbm(vec3(y * 2.1 - uT * 0.20, uT * 0.06, 3.0), 3) - 0.44) * 0.13 * y + (fbm(vec3(y * 4.6 - uT * 0.33, uT * 0.09, 9.0), 2) - 0.37) * 0.04 * y;
      float w = 0.020 + 0.060 * y, x = (p.x - bend) / w;
      float tex = fbm(vec3(x * 1.3, y * 4.4 - uT * 0.46, uT * 0.12), 4);
      return smoothstep(0.26, 0.60, tex) * exp(-x * x * 1.4) * smoothstep(0.0, 0.045, y) * pow(1.0 - y, 1.4); }
    void main(){ float d = den(vP), dr = den(vP + vec2(0.007, 0.0));
      vec3 c = vec3(0.60, 0.53, 0.47) * d * 0.105 + vec3(0.56, 0.72, 1.0) * (d * 0.055 + max(d - dr, 0.0) * 0.55);
      gl_FragColor = vec4(c * uA, 0.0); }` })));
CAFE_STEAM.position.copy(CUP_POS).add(V3(0, 0.066 + 0.18, 0)); CAFE_STEAM.frustumCulled = false; CAFE_STEAM.renderOrder = 9; CAFE_STEAM.name = 'CoffeeSteam'; CAFE_STEAM.userData.passable = true; CAFE_STEAM.material.userData.thin = true; CAFE_STEAM.material.userData.passable = true;
CAFE_STEAM.onBeforeRender = () => { CAFE_STEAM_U.uT.value = STEAM_U.uT.value; CAFE_STEAM_U.uA.value = smoother(range(-Math.log(CAM.D), -Math.log(3.5), -Math.log(1.5))); CAFE_STEAM.material.uniformsNeedUpdate = true; };
CAFE.add(CAFE_STEAM);
// the city's ground stops at the cafe's walls: inside the footprint the room's own floor is what the eye sees, from outside the window as well
CITY_MAT.fragmentShader = CITY_MAT.fragmentShader.replace(/void main\(\)\s*\{/, m => m + ' if (abs(vP.x) < 3.85 && vP.y > -3.85 && vP.y < 2.65) discard;');
