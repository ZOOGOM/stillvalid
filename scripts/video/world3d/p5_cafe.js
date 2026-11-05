
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
const FLOOR_TEX = canvasTex(1536, 1536, true, null, (d, w, h) => {
  const n = vnoise2(23), r = mulberry32(41), rows = 20, tone = [], cut = [];
  for (let i = 0; i < rows; i++) { tone.push(0.8 + 0.4 * r()); cut.push(r()); }
  const wrapN = (u, v) => n(u, v) * (1 - u / 6) + n(u - 6, v) * (u / 6);       // joins at the tile's edge
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const vv = y / h * rows, p = Math.floor(vv), fv = vv - p, u = x / w, du = Math.abs(((u - cut[p] + 1.5) % 1) - 0.5);
    const grain = wrapN(u * 6, vv * 26 + p * 37) * 0.7 + wrapN(u * 6, vv * 90 + p * 11) * 0.3, sh = tone[p] * (0.62 + 0.76 * grain);
    const joint = Math.min(1, Math.min(fv, 1 - fv) * 60) * Math.min(1, du * 180), f = sh * (0.35 + 0.65 * joint), i = (y * w + x) * 4;
    d[i] = 92 * f; d[i + 1] = 62 * f; d[i + 2] = 40 * f; d[i + 3] = 255; } });
// the fine tooth of rolled paint: no large shapes, so a wall lit from the side stays a clean painted wall
const PLASTER_N = canvasTex(512, 512, false, [5, 5], (d, w, h) => { const n = vnoise2(5), H = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) H[y * w + x] = n(x * 0.5, y * 0.5) * 0.6 + n(x * 0.95, y * 0.95) * 0.4;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (H[y * w + (x + 1) % w] - H[y * w + (x + w - 1) % w]) * 1.5, dy = (H[((y + 1) % h) * w + x] - H[((y + h - 1) % h) * w + x]) * 1.5, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4; d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255; } });
const WOOD_MAT = new THREE.MeshStandardMaterial({ map: WOOD.map, normalMap: WOOD.nrm, normalScale: new THREE.Vector2(0.14, 0.14), roughnessMap: WOOD.rgh, roughness: 0.8, metalness: 0, envMapIntensity: 0.55 });
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
const FLOOR_MAT = new THREE.MeshStandardMaterial({ map: FLOOR_TEX, roughness: 0.46, metalness: 0, envMapIntensity: 0.3 });
// glazed stoneware: a matt body under a clear coat of glass, which is what gives a cup its window highlights
const CERAMIC_MAT = new THREE.MeshPhysicalMaterial({ color: 0xf2eee6, roughness: 0.34, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.9 });
const CUP_GLAZE = CERAMIC_MAT.clone(); CUP_GLAZE.vertexColors = true;
const SPOON_MAT = new THREE.MeshStandardMaterial({ color: 0xcfd0ce, metalness: 1, roughness: 0.17, envMapIntensity: 0.85 });
SPOON_MAT.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\n radiance = min(radiance, vec3(1.5));').replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n reflectedLight.directSpecular *= 0.12;'); }; SPOON_MAT.customProgramCacheKey = () => 'spoon-soft';
const FRAME_MAT = new THREE.MeshStandardMaterial({ color: 0x2b2926, metalness: 1, roughness: 0.38, envMapIntensity: 0.62 }); FRAME_MAT.userData.thin = true;
const COFFEE_MAT = new THREE.MeshPhysicalMaterial({ roughness: 0.16, specularIntensity: 0.9, specularColor: new THREE.Color(0.95, 0.8, 0.65), envMapIntensity: 0.14 });
// the gloss map's panes are far brighter than any wall: glazes take its reflections and almost none of its light; and the coat mirrors the map alone, since a direct light's tiny hot spot reads as a stain once out of focus
const glossOnly = (m, key) => { m.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\n iblIrradiance *= 0.2;').replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n reflectedLight.directSpecular *= 0.5; clearcoatSpecularDirect *= 0.0;'); }; m.customProgramCacheKey = () => 'gloss-only-' + key; };
glossOnly(CERAMIC_MAT, 'c'); glossOnly(CUP_GLAZE, 'g'); glossOnly(COFFEE_MAT, 'k');
// furniture is built from closed plates and merged, so a chair is a single draw
function placed(g, x, y, z, rx = 0, ry = 0, rz = 0) { return g.applyMatrix4(new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(1, 1, 1))); }
function mergeGeo(list) { const parts = list.map(g => g.index ? g.toNonIndexed() : g); let n = 0; parts.forEach(g => { n += g.attributes.position.count; });
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let o = 0; parts.forEach(g => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; });
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('uv', new THREE.BufferAttribute(U, 2)); return out; }
function plate(w, d, r, h, bev) { const s = new THREE.Shape(), x = -w / 2, y = -d / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0); s.lineTo(x + w, y + d - r); s.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2); s.lineTo(x + r, y + d); s.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI); s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bev, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelOffset: -bev, bevelSegments: 3, curveSegments: 10 }); g.rotateX(-Math.PI / 2); g.translate(0, bev, 0); return g; }
const box = (w, h, d, mat, x, y, z, parent = CAFE, cast = false) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
// a room of closed slabs: floor, ceiling, side walls, and two window walls built around their openings
const ROOM = { x: 3.6, zb: -3.6, zf: 2.4, h: 3.0, t: 0.25 };
{
  const { x: X, zb: ZB, zf: ZF, h: Y, t: T } = ROOM, L = ZF - ZB, zc = (ZF + ZB) / 2;
  const floor = box(2 * X + 2 * T, T, L + 2 * T, FLOOR_MAT, 0, -T / 2, zc); floor.name = 'Floor';
  { const g = floor.geometry, uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3.5, uv.getY(i) * 3.6); }
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
  // a real top: 42 mm thick with an eased edge that catches the light. Square steel legs that taper to the floor, a steel apron under the top, rubber feet
  const TH = 0.042, top = new THREE.Mesh(new RoundedBoxGeometry(1.5, TH, 0.82, 5, 0.0095), WOOD_MAT); top.position.y = TABLE_Y - TH / 2; top.castShadow = top.receiveShadow = true; top.name = 'TableTop'; TABLE.add(top);
  const lh = TABLE_Y - TH, parts = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const g = new RoundedBoxGeometry(0.046, lh, 0.046, 3, 0.006), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.62 + 0.38 * (p.getY(i) + lh / 2) / lh; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals(); parts.push(placed(g, sx * 0.662, lh / 2, sz * 0.33)); }
  parts.push(placed(new RoundedBoxGeometry(1.31, 0.055, 0.02, 2, 0.004), 0, lh - 0.0275, 0.33), placed(new RoundedBoxGeometry(1.31, 0.055, 0.02, 2, 0.004), 0, lh - 0.0275, -0.33), placed(new RoundedBoxGeometry(0.02, 0.055, 0.62, 2, 0.004), 0.662, lh - 0.0275, 0), placed(new RoundedBoxGeometry(0.02, 0.055, 0.62, 2, 0.004), -0.662, lh - 0.0275, 0));
  const legs = new THREE.Mesh(mergeGeo(parts), FRAME_MAT); legs.castShadow = true; legs.receiveShadow = true; legs.name = 'TableFrame'; TABLE.add(legs);
}
const lathe = (pts, seg = 64) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
// cup, saucer, spoon, coffee
const CUP_POS = V3(0.20, TABLE_Y, -0.125);
const CUP = new THREE.Group(); CUP.position.copy(CUP_POS); CAFE.add(CUP);
{
  const shaded = (g, n, v) => { const c = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < g.attributes.position.count; i++) { const a = v[i % n]; c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = a; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
  const sp = [[0, 0.002], [0.03, 0.002], [0.036, 0.003], [0.052, 0.009], [0.072, 0.016], [0.076, 0.0185], [0.0775, 0.0205], [0.076, 0.0215], [0.071, 0.0195], [0.05, 0.012], [0.037, 0.0075], [0.03, 0.0075], [0, 0.0075]];
  const saucer = new THREE.Mesh(shaded(lathe(sp, 96), sp.length, [0.7, 0.7, 0.7, 0.8, 0.9, 1, 1, 1, 1, 0.94, 0.62, 0.42, 0.42]), CUP_GLAZE);
  saucer.castShadow = saucer.receiveShadow = true; saucer.name = 'Saucer'; CUP.add(saucer);
  const bp = [[0, 0.0085], [0.022, 0.0085], [0.024, 0.0095], [0.0242, 0.012], [0.028, 0.016], [0.036, 0.028], [0.0415, 0.044], [0.0442, 0.06], [0.0452, 0.070], [0.0455, 0.0725], [0.0445, 0.0735], [0.0428, 0.0725], [0.0425, 0.070], [0.041, 0.058], [0.038, 0.044], [0.033, 0.030], [0.024, 0.018], [0, 0.015]];
  const body = new THREE.Mesh(shaded(lathe(bp, 128), bp.length, [0.3, 0.32, 0.36, 0.42, 0.56, 0.82, 1, 1, 1, 1, 1, 0.96, 0.8, 0.46, 0.4, 0.4, 0.4, 0.4]), CUP_GLAZE);
  body.castShadow = body.receiveShadow = true; body.name = 'Cup'; CUP.add(body);
  // the handle: an ear that is flat in section, thick where it grows out of the wall and slimmer around the bend
  const handle = (() => { const hc = new THREE.CatmullRomCurve3([V3(0.0425, 0.0625, 0), V3(0.0505, 0.0665, 0), V3(0.0625, 0.0655, 0), V3(0.0702, 0.0555, 0), V3(0.0668, 0.042, 0), V3(0.0545, 0.0325, 0), V3(0.0355, 0.0265, 0)]);
    const n = 64, m = 16, pos = [], idx = []; for (let i = 0; i <= n; i++) { const u = i / n, c = hc.getPoint(u), t = hc.getTangent(u), nx = -t.y, ny = t.x, e = Math.abs(u - 0.5) * 2, thick = 0.0031 + 0.0034 * e * e * e, wide = 0.0052 + 0.0028 * e * e * e;
      for (let k = 0; k < m; k++) { const a = k / m * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); pos.push(c.x + nx * thick * ca, c.y + ny * thick * ca, wide * sa); } }
    for (let i = 0; i < n; i++) for (let k = 0; k < m; k++) { const a = i * m + k, b = i * m + (k + 1) % m, d = (i + 1) * m + k, e = (i + 1) * m + (k + 1) % m; idx.push(a, b, d, b, e, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
  { const h = new THREE.Mesh(handle, CERAMIC_MAT); h.castShadow = true; h.rotation.y = -0.65; h.name = 'CupHandle'; CUP.add(h); }
  const coffeeTex = canvasTex(512, 512, true, null, (d, w, h) => { const n = vnoise2(3); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = x / w - 0.5, dy = y / h - 0.5, r = Math.hypot(dx, dy) * 2, ang = Math.atan2(dy, dx), m = n(x * 0.03 + 5 * Math.cos(ang) * r, y * 0.03 + 5 * Math.sin(ang) * r), crema = Math.min(1, Math.max(0, (r - 0.72 + 0.14 * (m - 0.5)) * 6)) * 0.85 + 0.24 * Math.pow(m, 3), i = (y * w + x) * 4;
      d[i] = 34 + crema * 112; d[i + 1] = 19 + crema * 60; d[i + 2] = 10 + crema * 24; d[i + 3] = 255; } });
  COFFEE_MAT.map = coffeeTex;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.0422, 64).rotateX(-Math.PI / 2), COFFEE_MAT); coffee.position.y = 0.0635; coffee.name = 'Coffee'; coffee.receiveShadow = true; CUP.add(coffee);
  // a teaspoon of polished steel lying in the saucer: a shallow egg-shaped bowl, a narrow neck, a handle that widens to a rounded end and rests on the saucer's rim
  const spoonG = (() => { const LN = 0.122, NS = 84, NR = 18, pos = [], idx = [], ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let i = 0; i <= NS; i++) { const s = i / NS, e = s < 0.36 ? Math.sqrt(Math.max(0, 1 - Math.pow((s - 0.18) / 0.18, 2))) : 0, bowlW = 0.0135 * e * (s < 0.18 ? 0.86 + 0.14 * s / 0.18 : 1), neck = s < 0.3 ? 0 : (0.0016 + 0.0034 * ss(0.5, 0.97, s)) * (s > 0.965 ? Math.sqrt(Math.max(0, 1 - Math.pow((s - 0.965) / 0.035, 2))) : 1);
      const w = Math.max(bowlW, neck, 1e-4), y0 = 0.0074 * ss(0.3, 0.52, s) - 0.0016 * ss(0.62, 1, s), dp = 0.0052 * e, th = s < 0.33 ? 0.0009 : 0.0015;
      for (let k = 0; k < NR; k++) { const a = k / NR * Math.PI * 2, t = Math.cos(a); pos.push(w * t, y0 - dp * (1 - t * t) + Math.sin(a) * th / 2, (s - 0.18) * LN); } }
    for (let i = 0; i < NS; i++) for (let k = 0; k < NR; k++) { const a = i * NR + k, b = i * NR + (k + 1) % NR, c = (i + 1) * NR + (k + 1) % NR, d = (i + 1) * NR + k; idx.push(a, b, c, a, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
  const spoon = new THREE.Mesh(spoonG, SPOON_MAT); spoon.rotation.order = 'YXZ'; spoon.rotation.set(0, 1.02, 0.1); spoon.position.set(-0.02, 0.0172, 0.049); spoon.castShadow = spoon.receiveShadow = true; spoon.name = 'Spoon'; CUP.add(spoon);
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
  for (const [x, z] of [[-1.9, -1.9], [2.0, -1.8], [2.4, 1.05], [-2.3, 0.95]]) { lay(blobTex, 0.62, 0.62, x + 0.05, TABLE_Y + 0.0012, z - 0.04, 0.2, 0, true, 0xffb56e); lay(blobTex, 0.09, 0.09, x + 0.07, TABLE_Y + 0.0009, z - 0.06, 0.6); }
}
// the rest of the room: lamps, tables, chairs, shelf (seen out of focus, still real shapes)
const LAMP_POS = [[0.28, 1.98, 0.02], [-1.9, 2.05, -1.9], [2.0, 2.05, -1.8], [2.3, 2.05, 1.1], [-2.2, 2.05, 1.0]];
const LAMP_LIGHTS = [];
{
  // pendants: spot lights, so the light falls in pools under the shades and the ceiling stays dark, as it does in a real room
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(9.5, 6.2, 3.2) });
  const shade = lathe([[0.012, 0.16], [0.03, 0.15], [0.06, 0.10], [0.135, 0.0], [0.133, -0.003], [0.058, 0.095], [0.028, 0.143], [0.012, 0.152]], 48);
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0x151412, metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide }); shadeMat.userData.thin = true;
  const glowIn = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.98, 0.5), side: THREE.BackSide }); glowIn.userData.thin = true;
  const inst = (geo, mat, list, name, cast) => { const m = new THREE.InstancedMesh(geo, mat, list.length), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(); list.forEach(([x, y, z, ry = 0, sy = 1], i) => { M.compose(V3(x, y, z), Q.setFromEuler(E.set(0, ry, 0)), V3(1, sy, 1)); m.setMatrixAt(i, M); }); m.instanceMatrix.needsUpdate = true; m.castShadow = !!cast; m.frustumCulled = false; m.name = name; CAFE.add(m); return m; };
  inst(shade, shadeMat, LAMP_POS, 'LampShade');
  inst(lathe([[0.128, 0.002], [0.056, 0.092], [0.026, 0.138], [0.012, 0.146]], 32), glowIn, LAMP_POS, 'LampInner');
  inst(new THREE.SphereGeometry(0.035, 20, 14).translate(0, 0.03, 0), bulbMat, LAMP_POS, 'LampBulb');
  inst(new THREE.CylinderGeometry(0.0055, 0.0055, 1, 8).translate(0, 0.5, 0), STEEL_MAT, LAMP_POS.map(([x, y, z]) => [x, y + 0.15, z, 0, ROOM.h - y - 0.15]), 'LampCord');
  inst(new THREE.CylinderGeometry(0.05, 0.058, 0.026, 28), STEEL_MAT, LAMP_POS.map(([x, , z]) => [x, ROOM.h - 0.013, z]), 'LampRose');
  LAMP_POS.forEach(([x, y, z], i) => { const L = new THREE.SpotLight(0xffc488, 1, 0, 1.12, 0.8, 2); L.position.set(x, y - 0.03, z); L.target.position.set(x, 0, z); CAFE.add(L, L.target); LAMP_LIGHTS.push({ L, I: i === 0 ? 1.5 : 2.6 }); });
  // chairs: a steel-tube frame whose back legs run up into the back rest, a bent walnut back curved around the sitter, a padded seat on a wooden shell
  const seatShell = plate(0.44, 0.42, 0.07, 0.016, 0.004); seatShell.translate(0, 0.428, 0);
  const seatPad = plate(0.415, 0.395, 0.062, 0.042, 0.016); seatPad.translate(0, 0.442, 0.002);
  const backRest = (() => { const W = 0.40, sag = 0.042, t = 0.013, h = 0.17, R = (W * W / 4 + sag * sag) / (2 * sag), a = Math.asin(W / 2 / R), cy = -R, s = new THREE.Shape();
    const ex = R * Math.sin(a), ey = cy + R * Math.cos(a); s.absarc(0, cy, R + t / 2, Math.PI / 2 + a, Math.PI / 2 - a, true); s.absarc(ex, ey, t / 2, Math.PI / 2 - a, -Math.PI / 2 - a, true); s.absarc(0, cy, R - t / 2, Math.PI / 2 - a, Math.PI / 2 + a, false); s.absarc(-ex, ey, t / 2, 1.5 * Math.PI + a, Math.PI / 2 + a, true);
    const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: 0.0035, bevelThickness: 0.0035, bevelOffset: -0.0035, bevelSegments: 2, curveSegments: 14 }); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const e = Math.pow(p.getX(i) / (W / 2), 4); p.setY(i, h / 2 + (p.getY(i) - h / 2) * (1 - 0.2 * e)); } g.computeVertexNormals();
    return placed(g, 0, 0.665, -0.205, -0.13); })();
  const tb = (pts, seg = 14, r = 0.0108) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(p[0], p[1], p[2]))), seg, r, 8);
  const frameParts = [];
  for (const sx of [-1, 1]) {
    frameParts.push(tb([[sx * 0.205, 0.008, -0.25], [sx * 0.192, 0.22, -0.215], [sx * 0.178, 0.43, -0.178], [sx * 0.168, 0.62, -0.19], [sx * 0.158, 0.82, -0.232]], 22));
    frameParts.push(tb([[sx * 0.205, 0.008, 0.205], [sx * 0.182, 0.43, 0.165]], 6));
    frameParts.push(tb([[sx * 0.18, 0.425, 0.165], [sx * 0.178, 0.425, -0.178]], 4, 0.0085));
    frameParts.push(tb([[sx * 0.195, 0.2, 0.188], [sx * 0.192, 0.2, -0.214]], 4, 0.0065));
    for (const [z, f] of [[-0.25, 0.205], [0.205, 0.205]]) frameParts.push(placed(new THREE.CylinderGeometry(0.0125, 0.0135, 0.012, 10), sx * f, 0.006, z));
  }
  frameParts.push(tb([[-0.18, 0.425, 0.165], [0.18, 0.425, 0.165]], 4, 0.0085), tb([[-0.178, 0.425, -0.178], [0.178, 0.425, -0.178]], 4, 0.0085));
  const CUSHION_MAT = new THREE.MeshStandardMaterial({ color: 0x5a3527, roughness: 0.82, envMapIntensity: 0.2 });
  // the far furniture's walnut: the same grain from one texture, since it is never in focus (the main table keeps all three)
  const FAR_WOOD = new THREE.MeshStandardMaterial({ map: WOOD.map, roughness: 0.56, metalness: 0, envMapIntensity: 0.5 });
  FAR_WOOD.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>\n vMapUv = vec2(position.x / 1.6 + 0.5, (position.z + position.y) / 0.86 + 0.5);`); }; FAR_WOOD.customProgramCacheKey = () => 'wood-far';
  // round bistro tables on a cast-iron pedestal
  const TOP_R = 0.37, bistroTop = lathe([[0, TABLE_Y - 0.03], [TOP_R - 0.018, TABLE_Y - 0.03], [TOP_R - 0.004, TABLE_Y - 0.022], [TOP_R, TABLE_Y - 0.012], [TOP_R - 0.002, TABLE_Y - 0.005], [TOP_R - 0.008, TABLE_Y], [0, TABLE_Y]], 56);
  const bistroBase = lathe([[0, 0], [0.235, 0], [0.242, 0.006], [0.232, 0.014], [0.15, 0.03], [0.07, 0.052], [0.036, 0.09], [0.027, 0.16], [0.024, 0.4], [0.027, TABLE_Y - 0.11], [0.04, TABLE_Y - 0.07], [0.13, TABLE_Y - 0.038], [0.13, TABLE_Y - 0.03], [0, TABLE_Y - 0.03]], 40);
  const BISTRO = [[-1.9, -1.9], [2.0, -1.8], [2.4, 1.05], [-2.3, 0.95]];
  inst(bistroTop, FAR_WOOD, BISTRO.map(([x, z]) => [x, 0, z, x * 2.1]), 'BistroTop');
  inst(bistroBase, FRAME_MAT, BISTRO.map(([x, z]) => [x, 0, z]), 'BistroBase');
  // every chair stands where someone left it, a little off square
  const CHAIRS = [[-0.17, -0.70, 0.07], [0.66, -0.74, -0.13]];
  BISTRO.forEach(([x, z], i) => { const j = [0.16, -0.11, 0.09, -0.2][i], k = [-0.08, 0.14, -0.17, 0.1][i]; CHAIRS.push([x - 0.60, z + j * 0.25, Math.PI / 2 + j], [x + 0.60, z + k * 0.25, -Math.PI / 2 + k]); });
  const chairs = CHAIRS.map(([x, z, ry]) => [x, 0, z, ry]);
  inst(mergeGeo([seatShell, backRest]), FAR_WOOD, chairs, 'ChairWood', true);
  inst(seatPad, CUSHION_MAT, chairs, 'ChairPad');
  inst(mergeGeo(frameParts), FRAME_MAT, chairs, 'ChairFrame');
  // a long upholstered bench under the far windows
  const BENCH_MAT = new THREE.MeshStandardMaterial({ color: 0x2f4a3d, roughness: 0.46, envMapIntensity: 0.5 });
  const BN = 5, BW = 1.1, BX = i => (i - (BN - 1) / 2) * BW;
  box(BN * BW + 0.03, 0.3, 0.5, SHELF_MAT, 0, 0.17, ROOM.zb + 0.27).name = 'BenchBase'; box(BN * BW - 0.02, 0.02, 0.46, STEEL_MAT, 0, 0.01, ROOM.zb + 0.25);
  inst(new RoundedBoxGeometry(BW - 0.012, 0.115, 0.52, 4, 0.04), BENCH_MAT, Array.from({ length: BN }, (_, i) => [BX(i), 0.375, ROOM.zb + 0.29]), 'BenchSeat', false);
  inst(placed(new RoundedBoxGeometry(BW - 0.012, 0.31, 0.105, 4, 0.045), 0, 0, 0, -0.14), BENCH_MAT, Array.from({ length: BN }, (_, i) => [BX(i), 0.595, ROOM.zb + 0.095]), 'BenchBack', false);
  // on each bistro table a candle in a small glass, and the little light it spreads there
  inst(new THREE.CylinderGeometry(0.024, 0.021, 0.05, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 0.58, 0.2) }), BISTRO.map(([x, z]) => [x + 0.07, TABLE_Y + 0.025, z - 0.06]), 'Candle');
  // shelves on both side walls: books by the row with some jars between them, one draw each
  const rnd = mulberry32(9), BOOK_C = [0x6c4a2a, 0x2a4a3a, 0xb7a68a, 0x1c2228, 0x7a3b2a, 0x8a7a5c, 0x38414c, 0x5a2f22], JAR_C = [0xc9b89c, 0x6c4a2a, 0x2a4a3a, 0x1c2228];
  const books = [], jars = [];
  for (const sx of [-1, 1]) for (const y of [1.25, 1.75]) { box(0.28, 0.03, 3.9, SHELF_MAT, sx * (ROOM.x - 0.14), y, -0.4); let z = -2.26;
    while (z < 1.42) { if (rnd() < 0.2) { const h = 0.1 + rnd() * 0.12, r = 0.75 + rnd() * 0.45; jars.push([sx * (ROOM.x - 0.15), y + 0.015 + h / 2, z + 0.05, r, h, JAR_C[Math.floor(rnd() * 4)]]); z += 0.14 + rnd() * 0.08; continue; }
      const n = 3 + Math.floor(rnd() * 11), c0 = Math.floor(rnd() * 8), lean = rnd() < 0.3 ? (rnd() - 0.5) * 0.22 : 0; for (let i = 0; i < n && z < 1.46; i++) { const t = 0.018 + rnd() * 0.028, h = 0.17 + rnd() * 0.09, d = 0.12 + rnd() * 0.05; books.push([sx * (ROOM.x - 0.2 + (rnd() - 0.5) * 0.012), y + 0.015 + h / 2, z + t / 2, t, h, d, i === n - 1 ? lean : 0, BOOK_C[rnd() < 0.55 ? c0 : Math.floor(rnd() * 8)]]); z += t + 0.0015; } z += 0.03 + rnd() * 0.12; } }
  const instC = (geo, mat, n, name, fill) => { const m = new THREE.InstancedMesh(geo, mat, n), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), C = new THREE.Color(); for (let i = 0; i < n; i++) { const [x, y, z, sxv, syv, szv, rx, col] = fill(i); M.compose(V3(x, y, z), Q.setFromEuler(E.set(rx, 0, 0)), V3(sxv, syv, szv)); m.setMatrixAt(i, M); m.setColorAt(i, C.set(col)); } m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.frustumCulled = false; m.name = name; CAFE.add(m); return m; };
  instC(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.66, envMapIntensity: 0.25 }), books.length, 'Books', i => { const b = books[i]; return [b[0], b[1], b[2], b[5], b[4], b[3], b[6], b[7]]; });
  instC(new THREE.CylinderGeometry(0.05, 0.05, 1, 16), new THREE.MeshStandardMaterial({ roughness: 0.3, envMapIntensity: 0.5 }), jars.length, 'Jars', i => { const j = jars[i]; return [j[0], j[1], j[2], j[3], j[4], j[3], 0, j[5]]; });
  // wall light: a warm scallop above and below each sconce, a strip under each shelf and the glow it throws down the wall
  const glowTex = (w, h, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'lighter'; paint(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const scallopT = glowTex(128, 256, (g, w, h) => { for (const [cy, ry, a] of [[0.5, 0.5, 0.95], [0.5, 0.26, 0.75]]) { g.save(); g.translate(w / 2, cy * h); g.scale(0.46 * w, ry * h); const r = g.createRadialGradient(0, 0, 0.02, 0, 0, 1); r.addColorStop(0, `rgba(255,200,140,${a})`); r.addColorStop(0.3, `rgba(190,130,80,${a * 0.55})`); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fill(); g.restore(); } });
  const stripT = glowTex(64, 64, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, 'rgba(255,190,125,0.95)'); r.addColorStop(0.3, 'rgba(180,120,75,0.42)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  const glowMat = t => { const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); m.userData.thin = m.userData.passable = true; return m; };
  const onWall = (sx, w, h, y, z, off = 0.024) => placed(new THREE.PlaneGeometry(w, h), sx * (ROOM.x - off), y, z, 0, -sx * Math.PI / 2);
  const washes = noDepth(new THREE.Mesh(mergeGeo([-1, 1].flatMap(sx => [onWall(sx, 1.0, 2.0, 1.92, -2.92), onWall(sx, 1.0, 2.0, 1.92, 1.98)])), glowMat(scallopT))); washes.renderOrder = 1.6; washes.userData.passable = true; washes.name = 'WallWash'; CAFE.add(washes);
  const glows = noDepth(new THREE.Mesh(mergeGeo([-1, 1].flatMap(sx => [1.25, 1.75].map(y => onWall(sx, 3.86, 0.36, y - 0.195, -0.4)))), glowMat(stripT))); glows.renderOrder = 1.6; glows.userData.passable = true; glows.name = 'ShelfGlow'; CAFE.add(glows);
  inst(placed(new THREE.BoxGeometry(0.012, 0.006, 3.82), 0, 0, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.3, 1.55, 0.85) }), [-1, 1].flatMap(sx => [1.25, 1.75].map(y => [sx * (ROOM.x - 0.21), y - 0.019, -0.4])), 'ShelfStrip');
  inst(placed(new THREE.CylinderGeometry(0.038, 0.038, 0.17, 16), 0, 0, 0), BRASS_MAT, [-1, 1].flatMap(sx => [-2.92, 1.98].map(z => [sx * (ROOM.x - 0.034), 1.92, z])), 'Sconce');
  // the floor's own shadow, painted once: walls, bench, tables and chairs on the boards. Costs one texture read on the floor
  const fw = 2 * ROOM.x + 2 * ROOM.t, fd = ROOM.zf - ROOM.zb + 2 * ROOM.t, S = 150, c = document.createElement('canvas'); c.width = Math.round(fw * S); c.height = Math.round(fd * S);
  const g2 = c.getContext('2d'), fx = x => (x + fw / 2) * S, fz = z => (z - (ROOM.zf + ROOM.zb) / 2 + fd / 2) * S; g2.fillStyle = '#fff'; g2.fillRect(0, 0, c.width, c.height);
  const lampOf = (x, z) => LAMP_POS.reduce((b, l) => Math.hypot(l[0] - x, l[2] - z) < Math.hypot(b[0] - x, b[2] - z) ? l : b, LAMP_POS[0]);
  const shad = (blur, a, x, z, draw) => { g2.save(); g2.filter = `blur(${blur}px)`; g2.fillStyle = `rgba(14,8,5,${a})`; g2.translate(fx(x), fz(z)); g2.beginPath(); draw(g2); g2.fill(); g2.restore(); };
  // walls and bench
  g2.save(); g2.filter = 'blur(26px)'; g2.strokeStyle = 'rgba(14,8,5,0.62)'; g2.lineWidth = 46; g2.strokeRect(fx(-ROOM.x), fz(ROOM.zb), 2 * ROOM.x * S, (ROOM.zf - ROOM.zb) * S); g2.restore();
  shad(18, 0.8, 0, ROOM.zb + 0.27, q => q.rect(-(BN * BW / 2 + 0.03) * S, -0.3 * S, (BN * BW + 0.06) * S, 0.7 * S));
  // what each pendant's pool loses under a table top and a seat
  BISTRO.forEach(([x, z]) => { shad(13, 0.62, x, z, q => q.arc(0, 0, TOP_R * 1.12 * S, 0, 7)); shad(5, 0.72, x, z, q => q.arc(0, 0, 0.255 * S, 0, 7)); });
  CHAIRS.forEach(([x, z, ry]) => { const l = lampOf(x, z), dx = x - l[0], dz = z - l[2], k = 0.46 / 2.0; shad(8, 0.5, x + dx * k, z + dz * k, q => { q.rotate(-ry); q.rect(-0.22 * S, -0.21 * S, 0.44 * S, 0.42 * S); });
    const cs = Math.cos(ry), sn = Math.sin(ry); for (const [lx, lz] of [[-0.205, -0.25], [0.205, -0.25], [-0.205, 0.205], [0.205, 0.205]]) shad(2.5, 0.72, x + lx * cs + lz * sn, z - lx * sn + lz * cs, q => q.arc(0, 0, 0.022 * S, 0, 7)); });
  shad(22, 0.42, 0.22, 0.02, q => q.rect(-0.75 * S, -0.41 * S, 1.5 * S, 0.82 * S));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) shad(3, 0.75, 0.22 + sx * 0.665, 0.02 + sz * 0.33, q => q.arc(0, 0, 0.03 * S, 0, 7));
  const bake = new THREE.CanvasTexture(c); bake.colorSpace = THREE.NoColorSpace; bake.flipY = false; bake.generateMipmaps = true; bake.minFilter = THREE.LinearMipmapLinearFilter;
  FLOOR_MAT.onBeforeCompile = s => { s.uniforms.tBake = { value: bake };
    s.vertexShader = s.vertexShader.replace('void main() {', 'varying vec2 vBakeUv;\nvoid main() {').replace('#include <uv_vertex>', `#include <uv_vertex>\n vBakeUv = vec2(position.x / ${fw.toFixed(3)} + 0.5, position.z / ${fd.toFixed(3)} + 0.5);`);
    s.fragmentShader = s.fragmentShader.replace('void main() {', 'uniform sampler2D tBake; varying vec2 vBakeUv;\nvoid main() {').replace('#include <aomap_fragment>', 'reflectedLight.directSpecular *= 0.3;\n#include <aomap_fragment>').replace('#include <opaque_fragment>', 'outgoingLight *= texture2D(tBake, vBakeUv).rgb;\n#include <opaque_fragment>'); };
  FLOOR_MAT.customProgramCacheKey = () => 'floor-bake';
}
// light: warm key (from the city through the front window, and the lamp), cool rim from the far windows, soft fill
const KEY_LIGHT = new THREE.DirectionalLight(0xffd2a0, 1.05); KEY_LIGHT.position.set(-1.0, 3.0, 2.0); KEY_LIGHT.target.position.set(0.1, TABLE_Y, 0); KEY_LIGHT.castShadow = true; KEY_LIGHT.shadow.mapSize.set(1024, 1024); CAFE.add(KEY_LIGHT, KEY_LIGHT.target);
const RIM_LIGHT = new THREE.DirectionalLight(0xa8c6f5, 0.34); RIM_LIGHT.position.set(1.6, 1.9, -3.4); RIM_LIGHT.target.position.set(0.1, TABLE_Y, 0); CAFE.add(RIM_LIGHT, RIM_LIGHT.target);
const FILL_LIGHT = new THREE.HemisphereLight(0x8a7a6a, 0x1a1412, 0.38); scene.add(FILL_LIGHT);
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
// what glaze and polished metal mirror: tall window panes beside the viewer, the far windows low and cool behind the table, the pendants overhead, dark wood below. Its own map, so nothing else in the room changes
const GLOSS_ENV = (() => {
  const s = new THREE.Scene();
  const dome = new THREE.SphereGeometry(30, 32, 16), dc = new Float32Array(dome.attributes.position.count * 3), dp = dome.attributes.position;
  for (let i = 0; i < dp.count; i++) { const e = dp.getY(i) / 30, k = smoother(clamp01((e + 0.08) / 0.2)); dc[i * 3] = lerp(0.11, 0.035, k); dc[i * 3 + 1] = lerp(0.06, 0.028, k); dc[i * 3 + 2] = lerp(0.034, 0.022, k); }
  dome.setAttribute('color', new THREE.BufferAttribute(dc, 3)); s.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const pane = (azDeg, wDeg, y0, y1, c, R = 4) => { const a = azDeg * deg, w = 2 * R * Math.tan(wDeg * deg / 2), m = new THREE.Mesh(new THREE.PlaneGeometry(w, y1 - y0), new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), side: THREE.DoubleSide })); m.position.set(R * Math.sin(a), (y0 + y1) / 2, R * Math.cos(a)); m.rotation.y = a; s.add(m); };
  pane(-46, 15, -3.6, 3.2, [15, 12.6, 10]); pane(-27, 7, -3.6, 3.2, [15, 12.6, 10]);     // two panes of a tall window: the long highlight down the cup
  pane(64, 5, -2.8, 3, [5.5, 7, 10]);                                                     // a thin cool line on the far side
  for (const az of [150, 170, 190, 210]) pane(az, 17, 0.05, 1.5, [0.42, 0.52, 0.76]);      // the far windows, in saucer and table
  for (const [x, y, z] of LAMP_POS) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(22, 14.5, 8), side: THREE.DoubleSide })); m.position.set(x, y - 0.74, z); m.rotation.x = Math.PI / 2; s.add(m); }
  const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(s, 0, 0.05, 60).texture; pm.dispose(); return t;
})();
for (const m of [CERAMIC_MAT, CUP_GLAZE, SPOON_MAT, FRAME_MAT, COFFEE_MAT]) { m.envMap = GLOSS_ENV; m.needsUpdate = true; }
// steam that stays: two thin threads leave the coffee, drift apart and thin out within a hand's height. Drawn from the film's clock (STEAM_U.uT), so a frame depends on t alone
const CAFE_STEAM_U = { uT: { value: 0 }, uA: { value: 0 } };
const CAFE_STEAM = noDepth(new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.14), new THREE.ShaderMaterial({ uniforms: CAFE_STEAM_U, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  vertexShader: `varying vec2 vP; void main(){ vP = vec2(position.x, position.y + 0.07); float s = length(modelViewMatrix[0].xyz); vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); mv.xy += position.xy * s; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float uT, uA; varying vec2 vP; ${NOISE_GLSL}
    float thread(vec2 p, float y, float k, float x0){
      float sy = sqrt(y), bend = (fbm(vec3(y * 3.4 - uT * 0.26, uT * 0.05, k), 2) - 0.375) * 0.105 * sy + (fbm(vec3(y * 9.0 - uT * 0.5, uT * 0.08, k + 6.0), 2) - 0.375) * 0.036 * sy;
      float x = (p.x - x0 - bend) / (0.0015 + 0.0065 * y);
      return exp(-x * x); }
    void main(){ float y = clamp(vP.y / 0.14, 0.0, 1.0);
      float d = thread(vP, y, 3.0, -0.004) + 0.6 * thread(vP, y, 11.0, 0.006);
      d *= smoothstep(0.14 + 0.46 * y, 0.40 + 0.34 * y, fbm(vec3(vP.x * 46.0, y * 7.5 - uT * 0.7, uT * 0.15), 3));   // the thread frays as it rises
      d *= smoothstep(0.0, 0.05, y) * pow(1.0 - y, 2.8);
      vec3 c = vec3(0.74, 0.68, 0.62) * d * 0.44 + vec3(0.52, 0.66, 0.92) * d * 0.14;
      gl_FragColor = vec4(c * uA, 0.0); }` })));
CAFE_STEAM.position.copy(CUP_POS).add(V3(0, 0.064 + 0.07, 0)); CAFE_STEAM.frustumCulled = false; CAFE_STEAM.renderOrder = 9; CAFE_STEAM.name = 'CoffeeSteam'; CAFE_STEAM.userData.passable = true; CAFE_STEAM.material.userData.thin = true; CAFE_STEAM.material.userData.passable = true;
CAFE_STEAM.onBeforeRender = () => { CAFE_STEAM_U.uT.value = STEAM_U.uT.value; CAFE_STEAM_U.uA.value = smoother(range(-Math.log(CAM.D), -Math.log(3.5), -Math.log(1.5))); CAFE_STEAM.material.uniformsNeedUpdate = true; };
CAFE.add(CAFE_STEAM);
// the lights behind the far windows, there from the first moment the windows can be seen. The city's own lights stay hidden behind the rows of buildings until the lens is close: this layer
// draws the same lights (same positions, same lens, drawn at the plane right behind the far wall so that only the room can cover them) at whatever share the city's layer is not yet giving,
// so their sum holds still. With them, the room's pendants as a faint reflection in the night glass.
const FAR_LIGHTS = (() => {
  const a = CITY_POINTS.geometry.attributes, N = 300, ZG = ROOM.zb - ROOM.t / 2, refl = LAMP_POS.map(([x, y, z]) => [x, y - 0.02, 2 * ZG - z]), M = N + refl.length;
  const P = new Float32Array(M * 3), C = new Float32Array(M * 3), S = new Float32Array(M), Q = new Float32Array(M), K = new Float32Array(M);
  P.set(a.position.array.subarray(0, N * 3)); C.set(a.color.array.subarray(0, N * 3)); S.set(a.sz.array.subarray(0, N)); Q.set(a.aer.array.subarray(0, N));
  refl.forEach(([x, y, z], i) => { const j = N + i; P.set([x, y, z], j * 3); C.set([0.95, 0.66, 0.38], j * 3); S[j] = 0.05; K[j] = 1; });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setAttribute('sz', new THREE.BufferAttribute(S, 1)); g.setAttribute('aer', new THREE.BufferAttribute(Q, 1)); g.setAttribute('keep', new THREE.BufferAttribute(K, 1));
  const u = { uPx: CITY_LIGHTS_U.uPx, uD: CITY_LIGHTS_U.uD, uCoc: CITY_LIGHTS_U.uCoc, uFar: { value: 0 }, uEye: CITY_U.uEyeW };
  const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, fragmentShader: CITY_POINTS.material.fragmentShader,
    vertexShader: CITY_POINTS.material.vertexShader.replace('attribute float sz, aer;', 'uniform vec3 uEye; attribute float keep; attribute float sz, aer;')
      .replace('gl_Position = projectionMatrix * mv;', `vec3 ray = position - uEye; vec3 q = uEye + ray * ((${(ROOM.zb - ROOM.t - 0.02).toFixed(3)} - uEye.z) / ray.z); gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
        if (ray.z >= 0.0 || abs(q.x) > 3.6 || q.y < 0.4 || q.y > 3.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);`)
      .replace('* uFar;', '* (keep > 0.5 ? keep * 0.5 : uFar);') });
  const pts = noDepth(new THREE.Points(g, m)); pts.frustumCulled = false; pts.renderOrder = 2; pts.name = 'FarLights'; pts.userData.passable = true; m.userData.thin = true; CAFE.add(pts);
  pts.onBeforeRender = () => { const ln = Math.log(CAM.D); u.uFar.value = Math.max(0, 1 - CITY_LIGHTS_U.uFar.value, smoother(range(ln, Math.log(45), Math.log(22)))); m.uniformsNeedUpdate = true; const all = u.uFar.value > 0.002; g.setDrawRange(all ? 0 : N, all ? M : M - N); };   // once the city's layer has taken over only the reflections stay: 300 discs drawn black would cost as much as the bokeh itself
  return pts;
})();
// the city's ground stops at the cafe's walls: inside the footprint the room's own floor is what the eye sees, from outside the window as well
CITY_MAT.fragmentShader = CITY_MAT.fragmentShader.replace(/void main\(\)\s*\{/, m => m + ' if (abs(vP.x) < 3.85 && vP.y > -3.85 && vP.y < 2.65) discard;');
