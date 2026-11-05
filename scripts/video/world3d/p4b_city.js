
/* =====================================================================================
   4b. SEOUL AS A FIELD OF LIGHT — no building models. The large-scale density comes from the NASA Black Marble 3 km patch itself, so the
   field continues what the Earth map shows; the Han river is a dark curve; Gwanghwamun is only a mass of brighter light.
   The 3D lights (towers of lit windows, street lamps) are one point field whose disc grows with the lens's circle of confusion,
   so the same lights become the bokeh behind the phone.
   ===================================================================================== */
const CITY_HALF = 90000;
const lonOf = x => SV_LON + x / 88000, latOf = z => SV_LAT - z / 111000, xOfLon = l => (l - SV_LON) * 88000, zOfLat = l => (SV_LAT - l) * 111000;
const HAN_RIVER = [[125.70, 37.50], [126.05, 37.60], [126.32, 37.69], [126.52, 37.74], [126.64, 37.68], [126.72, 37.63], [126.78, 37.60], [126.84, 37.575], [126.90, 37.545], [126.93, 37.533], [126.945, 37.530], [126.96, 37.515], [126.995, 37.513], [127.01, 37.525], [127.02, 37.535], [127.04, 37.535], [127.08, 37.52], [127.115, 37.545], [127.18, 37.56], [127.28, 37.52], [127.40, 37.54], [127.55, 37.51], [127.74, 37.49], [127.98, 37.40], [128.35, 37.30]];
const cnH = (x, y) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const cnN = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); const a = cnH(ix, iy), b = cnH(ix + 1, iy), c = cnH(ix, iy + 1), d = cnH(ix + 1, iy + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
const cnF = (x, y, o) => { let s = 0, a = 0.5, n = 0; for (let i = 0; i < o; i++) { s += a * cnN(x, y); n += a; x = x * 2.03 + 17.1; y = y * 2.03 + 9.7; a *= 0.5; } return s / n; };
const CITY_MAP_U = { value: null }, CN_RHO = { data: null, S: 1 };
function bakeCityMap() {
  const S = 2048, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d', { willReadFrequently: true });
  const px = x => (x / CITY_HALF * 0.5 + 0.5) * S, py = z => (z / CITY_HALF * 0.5 + 0.5) * S;
  const im = SV_TEX.patchImg, W = im.width, H = im.height;
  // the patch covers lon 118..136, lat 28..44
  const lon0 = lonOf(-CITY_HALF), lon1 = lonOf(CITY_HALF), lat0 = latOf(-CITY_HALF), lat1 = latOf(CITY_HALF);
  const sx = (lon0 - 118) / 18 * W, sw = (lon1 - lon0) / 18 * W, sy = (44 - lat0) / 16 * H, sh = (lat0 - lat1) / 16 * H;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.filter = 'blur(30px)';
  g.drawImage(im, sx, sy, sw, sh, 0, 0, S, S); g.filter = 'none';
  const d0 = g.getImageData(0, 0, S, S).data;
  // brighter districts (only masses of light)
  g.globalCompositeOperation = 'lighter';
  const blob = (x, z, r, a) => { const gr = g.createRadialGradient(px(x), py(z), 0, px(x), py(z), r / CITY_HALF * S * 0.5); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.45, `rgba(255,255,255,${a * 0.42})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); };
  blob(-1200, -900, 3200, 0.30);          // the old centre around Gwanghwamun
  blob(4200, 7200, 4200, 0.28); blob(-8500, 5200, 2600, 0.26); blob(9500, 6300, 3000, 0.2); blob(-14000, 9000, 5000, 0.14);
  // dark mountains and parks
  g.globalCompositeOperation = 'multiply';
  const hole = (x, z, r, a) => { const gr = g.createRadialGradient(px(x), py(z), r * 0.1 / CITY_HALF * S, px(x), py(z), r / CITY_HALF * S * 0.5); gr.addColorStop(0, `rgba(${(1 - a) * 255},${(1 - a) * 255},${(1 - a) * 255},1)`); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); };
  hole(-1500, -9500, 11000, 0.85); hole(700, 3900, 2400, 0.34); hole(-9000, -4000, 3600, 0.7); hole(16000, -9000, 9000, 0.7); hole(-1000, 15000, 7500, 0.72);
  g.globalCompositeOperation = 'source-over';
  const d = g.getImageData(0, 0, S, S).data, out = new Uint8Array(S * S * 4);
  for (let i = 0, N = S * S * 4; i < N; i += 4) { const lum = 0.3 * d[i] + 0.55 * d[i + 1] + 0.15 * d[i + 2]; out[i] = Math.min(255, lum * 1.05); const l0 = 0.3 * d0[i] + 0.55 * d0[i + 1] + 0.15 * d0[i + 2]; out[i + 1] = Math.min(255, 110 * (lum + 2) / (l0 + 2)); out[i + 3] = 255; }
  CN_RHO.data = out; CN_RHO.S = S;
  const t = new THREE.DataTexture(out, S, S, THREE.RGBAFormat); t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}
// the Han as one seamless ribbon: a distance field baked once from a smooth spline. R = signed distance across the river, G = distance along it from Seoul / 2, B = unsigned distance (all metres)
const HAN_BR_N = 20, HAN_BR = [], RIVER_DE = new Float32Array(1024 * 1024);                                // the bridges: segments across the water
const RIVER_S = 1024, RIVER_TEX = (() => {
  const S = RIVER_S, P = HAN_RIVER.map(([lo, la]) => [xOfLon(lo), zOfLat(la)]), L = [];
  for (let i = 1; i < P.length - 1; i++) { const a = [(P[i - 1][0] + P[i][0]) / 2, (P[i - 1][1] + P[i][1]) / 2], b = P[i], c = [(P[i + 1][0] + P[i][0]) / 2, (P[i + 1][1] + P[i][1]) / 2];
    for (let k = 0; k < 10; k++) { const u = k / 10, v = 1 - u; L.push([v * v * a[0] + 2 * v * u * b[0] + u * u * c[0], v * v * a[1] + 2 * v * u * b[1] + u * u * c[1]]); } }
  L.unshift(P[0]); L.push(P[P.length - 1]);
  const N = L.length - 1, A = new Float64Array(N + 1); for (let i = 0; i < N; i++) A[i + 1] = A[i] + Math.hypot(L[i + 1][0] - L[i][0], L[i + 1][1] - L[i][1]);
  let i0 = 0, b0 = 1e18; for (let i = 0; i <= N; i++) { const q = L[i][0] * L[i][0] + L[i][1] * L[i][1]; if (q < b0) { b0 = q; i0 = i; } } const A0 = A[i0];
  const hf = THREE.DataUtils.toHalfFloat, out = new Uint16Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const wx = ((x + 0.5) / S * 2 - 1) * CITY_HALF, wz = ((y + 0.5) / S * 2 - 1) * CITY_HALF;
    let ci = 0, cb = 1e18; for (let i = 0; i <= N; i += 8) { const dx = wx - L[i][0], dz = wz - L[i][1], q = dx * dx + dz * dz; if (q < cb) { cb = q; ci = i; } }
    let best = 1e18, lat = 0, along = 0;
    for (let i = Math.max(0, ci - 16), e = Math.min(N, ci + 16); i < e; i++) { const ax = L[i][0], az = L[i][1], ex = L[i + 1][0] - ax, ez = L[i + 1][1] - az, l2 = ex * ex + ez * ez, u = Math.max(0, Math.min(1, ((wx - ax) * ex + (wz - az) * ez) / l2)), px = wx - ax - ex * u, pz = wz - az - ez * u, q = px * px + pz * pz;
      if (q < best) { best = q; along = A[i] + u * (A[i + 1] - A[i]) - A0; lat = (ex * pz - ez * px) / Math.sqrt(l2); } }
    const i = (y * S + x) * 4, D = Math.min(Math.sqrt(best), 60000), sst = (a, b, v) => { const u = Math.max(0, Math.min(1, (v - a) / (b - a))); return u * u * (3 - 2 * u); }, hwR = 350 + 300 * cnN(along / 6800, 3.5) + 70 * cnN(along / 2300, 8.5) + 900 * sst(-24000, -70000, along) - 170 * sst(28000, 60000, along);
    out[i] = hf(Math.max(-60000, Math.min(60000, lat))); out[i + 1] = hf(Math.max(-60000, Math.min(60000, along / 2))); out[i + 2] = hf(D); out[i + 3] = hf(hwR); RIVER_DE[y * S + x] = D - hwR;
  }
  // a few bridges at uneven spacing, each square to the water within a few degrees
  const rb = mulberry32(1188); let s = -21000 + rb() * 1200;
  while (HAN_BR.length < HAN_BR_N) { let i = 0; while (i < N - 1 && A[i] - A0 < s) i++;
    const ex = L[i + 1][0] - L[i][0], ez = L[i + 1][1] - L[i][1], l = Math.hypot(ex, ez), tw = (rb() - 0.5) * 0.22, c = Math.cos(tw), n = Math.sin(tw), nx = (-ez * c - ex * n) / l, nz = (ex * c - ez * n) / l, h = 1250;
    HAN_BR.push(new THREE.Vector4(L[i][0] - nx * h, L[i][1] - nz * h, L[i][0] + nx * h, L[i][1] + nz * h)); s += 1800 + rb() * 1500; }
  const t = new THREE.DataTexture(out, S, S, THREE.RGBAFormat, THREE.HalfFloatType); t.flipY = false; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
})();
// ---- SEOUL'S NIGHT MAP, baked once. Not any real street: a generated network of districts (each with its own street direction and block size), long winding expressways and rings,
// dark hills, parks and tributaries; lights stand along the streets, with a heavy-tailed spread of size and colour. Three levels of one and the same map: ±90 km, ±14 km, ±3.2 km.
// Mip-mapped in linear light, so it holds still under the moving camera and keeps its mean at every height. The 3D buildings stand on the same blocks.
const CN_S = 2800, CN_N = [4096, 4096, 2048];
const CN = (() => {
  const S = CN_S, NC = 33, ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const CORES = [[-1200, -900, 3000, 1], [4200, 7200, 3800, 1], [-8500, 5200, 2200, 0.9], [14000, 8500, 2800, 0.8], [-12500, 11500, 2600, 0.6], [-6000, 1500, 2200, 0.6], [8200, -3000, 2000, 0.55], [-38000, 6500, 5500, 0.8], [14000, 25000, 4000, 0.75], [3000, 41000, 5500, 0.8], [-24000, -16000, 4500, 0.65], [-8000, 22000, 3200, 0.6], [-24000, 7000, 3200, 0.6], [4000, -25000, 3000, 0.5], [19500, -3500, 2200, 0.45], [12500, 17000, 2600, 0.5], [-22000, 35000, 4500, 0.55]];
  const core = (x, z) => { let c = 0; for (let i = 0; i < CORES.length; i++) { const k = CORES[i], dx = x - k[0], dz = z - k[1], q = (dx * dx + dz * dz) / (k[2] * k[2]); if (q < 5) c = Math.max(c, k[3] * Math.exp(-q)); } return c; };
  const MTS = [[-2500, -15500, 6000], [-3400, -4300, 1300], [700, 3400, 900], [-5000, 19000, 3400], [9000, 28000, 4800], [15500, -3800, 2300], [11500, -17500, 4300], [33000, 8000, 6500], [-32000, -7000, 2800], [24000, -27000, 7000], [-19000, 27000, 4200], [-26000, -33000, 5500], [30000, 35000, 7500], [47000, -5000, 9000], [-2000, -42000, 8500], [-56000, 28000, 9000], [62000, 40000, 14000], [58000, -48000, 15000], [10000, 60000, 7000]];
  const darkRaw = (x, z) => {
    const wx = x + 5200 * (cnN(x / 9100 + 3.1, z / 9100 + 1.7) - 0.5) + 2200 * (cnN(x / 2900 + 8.1, z / 2900 + 4.2) - 0.5) + 700 * (cnN(x / 900 + 1.4, z / 900 + 6.2) - 0.5), wz = z + 5200 * (cnN(x / 9100 + 6.4, z / 9100 + 9.2) - 0.5) + 2200 * (cnN(x / 2900 + 2.7, z / 2900 + 7.9) - 0.5) + 700 * (cnN(x / 900 + 9.4, z / 900 + 3.2) - 0.5);
    let m = 0; for (let i = 0; i < MTS.length; i++) { const k = MTS[i], dx = wx - k[0], dz = wz - k[1], rn = k[2] * 2.2, ang = i * 2.399, ca = Math.cos(ang), sa = Math.sin(ang), u = (dx * ca + dz * sa) / (k[2] * 1.75), v = (-dx * sa + dz * ca) / (k[2] * 0.62), q = u * u + v * v; if (q < 4) m = Math.max(m, Math.exp(-q)); }
    const g = cnF(x / 2500 + 11.3, z / 2500 + 5.1, 3), edge = cnF(x / 620 + 3.3, z / 620 + 8.8, 3), c = core(x, z);
    const v = m * 1.25 + ss(0.63, 0.77, g) * 0.62 + (edge - 0.5) * 0.62 - 0.42 * c;
    return ss(0.44, 0.56, v) * ss(1300, 2600, Math.hypot(x, z));
  };
  // tributaries: dark threads that run into the Han
  const TRIB = [[[4400, 3900], [6600, 800], [8200, -4200], [10500, -9500], [11000, -15000], [13500, -24000]], [[-10600, 1100], [-11600, 6200], [-9800, 11500], [-8400, 17500], [-9200, 25000]], [[7900, 5500], [9100, 10500], [12200, 15500], [12800, 21500], [14500, 31000]], [[-25600, -3200], [-27000, 2500], [-26000, 9000], [-29500, 16000]], [[19000, 1500], [24000, -4000], [31000, -7000], [37000, -16000]]];
  // the dark land on two grids: quick lookups for every light and every piece of road
  const grid = (H, n, tribPx) => { const m = new Float32Array(n * n); for (let j = 0; j < n; j++) { const z = ((j + 0.5) / n * 2 - 1) * H; for (let i = 0; i < n; i++) m[j * n + i] = darkRaw(((i + 0.5) / n * 2 - 1) * H, z); }
    const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d', { willReadFrequently: true }); g.lineCap = g.lineJoin = 'round'; g.lineWidth = tribPx; g.strokeStyle = '#fff'; g.fillStyle = '#000'; g.fillRect(0, 0, n, n);
    for (const t of TRIB) { g.beginPath(); t.forEach((p, i) => { const x = (p[0] / H * 0.5 + 0.5) * n, y = (p[1] / H * 0.5 + 0.5) * n; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
    const d = g.getImageData(0, 0, n, n).data; for (let i = 0; i < n * n; i++) if (d[i * 4] > 40) m[i] = 1; return m; };
  const M0 = grid(CN_H[0], 512, 120 / (2 * CN_H[0] / 512)), MH1 = 15000, M1 = grid(MH1, 600, 120 / (2 * MH1 / 600));
  const dk = (x, z) => { if (x > -MH1 && x < MH1 && z > -MH1 && z < MH1) return M1[((z / MH1 * 0.5 + 0.5) * 600 | 0) * 600 + ((x / MH1 * 0.5 + 0.5) * 600 | 0)]; const u = (x / CN_H[0] * 0.5 + 0.5) * 512 | 0, v = (z / CN_H[0] * 0.5 + 0.5) * 512 | 0; return u < 0 || v < 0 || u > 511 || v > 511 ? 1 : M0[v * 512 + u]; };
  const riv = (x, z) => { const u = (x / CITY_HALF * 0.5 + 0.5) * 1024 | 0, v = (z / CITY_HALF * 0.5 + 0.5) * 1024 | 0; return u < 0 || v < 0 || u > 1023 || v > 1023 ? 9e4 : RIVER_DE[v * 1024 + u]; };
  const rho = (x, z) => { const R = CN_RHO; if (!R.data) return 1; const u = (x / CITY_HALF * 0.5 + 0.5) * R.S | 0, v = (z / CITY_HALF * 0.5 + 0.5) * R.S | 0; return u < 0 || v < 0 || u >= R.S || v >= R.S ? 0 : R.data[(v * R.S + u) * 4] / 255; };
  // districts: a jittered Voronoi diagram. Each has its street direction, block size, kind (0 commercial, 1 low-rise, 2 apartments, 3 industrial, 4 mostly green) and power
  const seeds = []; for (let iz = -NC; iz <= NC; iz++) for (let ix = -NC; ix <= NC; ix++) { const c = ix === 0 && iz === 0; seeds.push({ ix, iz, x: c ? 0 : ix * S + (cnH(ix, iz) - 0.5) * S * 0.8, z: c ? 0 : iz * S + (cnH(ix + 91, iz + 37) - 0.5) * S * 0.8 }); }
  const at = (ix, iz) => (ix < -NC || iz < -NC || ix > NC || iz > NC) ? null : seeds[(iz + NC) * (2 * NC + 1) + ix + NC];
  const D = seeds.map((q, id) => {
    let P = [[q.x - 2.6 * S, q.z - 2.6 * S], [q.x + 2.6 * S, q.z - 2.6 * S], [q.x + 2.6 * S, q.z + 2.6 * S], [q.x - 2.6 * S, q.z + 2.6 * S]], C = [];
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { if (!dx && !dz) continue; const o = at(q.ix + dx, q.iz + dz); if (!o) continue; const nx = o.x - q.x, nz = o.z - q.z, c = nx * (q.x + o.x) / 2 + nz * (q.z + o.z) / 2, out = []; let hit = false;
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], da = nx * a[0] + nz * a[1] - c, db = nx * b[0] + nz * b[1] - c; if (da <= 0) out.push(a); else hit = true; if ((da < 0 && db > 0) || (da > 0 && db < 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
      if (hit) { P = out; C.push([nx, nz, c]); } }
    const r0 = Math.hypot(q.x, q.z), cc = core(q.x, q.z), t = cnH(q.ix + 501, q.iz + 77), center = q.ix === 0 && q.iz === 0;
    const th = center ? 0 : (2.4 * (cnN(q.x / 15000 + 5.2, q.z / 15000 + 2.6) - 0.5) + 0.55 * (cnH(q.ix + 211, q.iz + 19) - 0.5)) * ss(1800, 6500, r0);
    const kind = center ? 0 : cc > 0.42 ? 0 : t < 0.46 ? 1 : t < 0.84 ? 2 : t < 0.92 ? 3 : 4;
    const ra = cnH(q.ix + 17, q.iz + 311), rb = cnH(q.ix + 43, q.iz + 197), a = center ? 135 : [[120, 190], [72, 118], [190, 300], [240, 400], [320, 480]][kind][0] + ra * ([[120, 190], [72, 118], [190, 300], [240, 400], [320, 480]][kind][1] - [[120, 190], [72, 118], [190, 300], [240, 400], [320, 480]][kind][0]), b = center ? 118 : a * (0.72 + 0.5 * rb);
    let xs = P.map(p => p[0]), zs = P.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs); let A = 0; for (let i = 0; i < P.length; i++) { const u = P[i], v = P[(i + 1) % P.length]; A += u[0] * v[1] - v[0] * u[1]; }
    const hv = cnH(q.ix + 7, q.iz + 901);
    return { id, x: q.x, z: q.z, P, C, x0, x1, z0, z1, area: Math.abs(A) / 2e6, th, c: Math.cos(th), s: Math.sin(th), a, b, kind, center, core: cc, m: center ? 4 : 3 + (ra * 3 | 0), ox: center ? 67.5 : q.x, oz: center ? 23 : q.z, pow: (kind === 0 ? 1.05 : kind === 1 ? 0.95 : kind === 2 ? 0.75 : kind === 3 ? 0.7 : 0.35) * (0.85 + 0.3 * hv), warm: cnH(q.ix + 3, q.iz + 701) };
  });
  const inD = (d, x, z) => { const C = d.C; for (let i = 0; i < C.length; i++) { const c = C[i]; if (c[0] * x + c[1] * z > c[2]) return false; } return true; };
  // the long roads: expressways leaving the centre, winding round the hills, and rings. Smoothed polylines in metres
  const smooth = (L, n) => { for (let r = 0; r < n; r++) { const o = [L[0]]; for (let i = 0; i + 1 < L.length; i++) { const a = L[i], b = L[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(L[L.length - 1]); L = o; } return L; };
  const MAJ = []; { const rr = mulberry32(4242);
    for (let k = 0; k < 9; k++) { let a = (k + 0.1 + rr() * 0.8) / 9 * Math.PI * 2, r1 = 2600 + rr() * 5200, sk = a + (rr() - 0.5) * 2.2, x = Math.cos(sk) * r1, z = Math.sin(sk) * r1; const L = [[x, z]], a0 = a;
      for (let st = 0; st < 260 && Math.abs(x) < 90000 && Math.abs(z) < 90000; st++) { let best = 1e9, ba = a; for (const da of [-0.32, -0.16, 0, 0.16, 0.32]) { const tx = x + Math.cos(a + da) * 900, tz = z + Math.sin(a + da) * 900, cost = dk(tx, tz) * 3 + Math.abs(da) * 0.5 + Math.abs(a + da - a0) * 0.35 + rr() * 0.12 + (riv(tx, tz) < 300 ? 0.5 : 0); if (cost < best) { best = cost; ba = a + da; } } a = ba; x += Math.cos(a) * 500; z += Math.sin(a) * 500; L.push([x, z]); }
      MAJ.push({ L: smooth(L, 2), col: k % 3 === 0 ? 1 : 0, w: 14, v: 0.66 }); }
    for (const R of [7800, 16500, 30000, 52000]) { let L = []; const flush = () => { if (L.length > 6) MAJ.push({ L: smooth(L, 2), col: 0, w: R > 20000 ? 16 : 13, v: R > 20000 ? 0.62 : 0.54 }); L = []; }; for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2 + R, ca = Math.cos(a), sa = Math.sin(a), r = R * (1 + 0.62 * (cnN(ca * 1.9 + 5.1, sa * 1.9 + R / 1000) - 0.5) + 0.22 * (cnN(ca * 6.3 + 2.2, sa * 6.3 + R / 700) - 0.5)); if (cnN(i / 16 + 3.3, R / 900) < 0.3) flush(); else L.push([ca * r + 900 * (cnN(i / 5, R / 500) - 0.5), sa * r * 0.92 + 900 * (cnN(i / 5 + 9, R / 500) - 0.5)]); } flush(); }
    // long boulevards through the middle of the city, straighter than the rest, each its own colour
    for (let k = 0; k < 11; k++) { const a = rr() * Math.PI, ox = (rr() - 0.5) * 36000, oz = (rr() - 0.5) * 36000, L = []; const n = 13 + (rr() * 14 | 0); for (let i = -n; i <= n; i++) { const t = i * 500; L.push([ox + Math.cos(a) * t + 2600 * (cnN(i / 11 + k * 3.3, 1.5) - 0.5), oz + Math.sin(a) * t + 2600 * (cnN(i / 11 + k * 5.1, 7.5) - 0.5)]); } MAJ.push({ L: smooth(L, 2), col: k % 3 === 2 ? 2 : 1, w: 10, v: 0.42 }); }
    MAJ.push({ L: [[-6800, 23.15], [-3000, 23.15], [0, 23.15], [3000, 23.15], [6800, 23.15]], col: 0, w: 26, v: 0.42, av: true });
  }
  const FN = 400, FP = new Float32Array(FN * FN), FC = new Float32Array(FN * FN);
  for (let j = 0; j < FN; j++) for (let i = 0; i < FN; i++) { const x = ((i + 0.5) / FN * 2 - 1) * 90000, z = ((j + 0.5) / FN * 2 - 1) * 90000, c = core(x, z), n = cnF(x / 5200 + 2.3, z / 5200 + 8.1, 3), n3 = cnF(x / 1500 + 5.1, z / 1500 + 2.9, 2), w = cnF(x / 7600 + 7.7, z / 7600 + 3.9, 2);
    FP[j * FN + i] = ((0.34 + 2.3 * n * n * n * 2.2) * 0.72 + 2.6 * c * c) * (0.22 + 7.0 * n3 * n3 * n3); FC[j * FN + i] = ss(0.5, 0.72, w) * 0.42 + 0.5 * c; }
  const fld = (A, x, z) => { const u = Math.max(0, Math.min(FN - 1.001, (x / 90000 * 0.5 + 0.5) * FN - 0.5)), v = Math.max(0, Math.min(FN - 1.001, (z / 90000 * 0.5 + 0.5) * FN - 0.5)), iu = u | 0, iv = v | 0, a = u - iu, b = v - iv, o = iv * FN + iu; return (A[o] * (1 - a) + A[o + 1] * a) * (1 - b) + (A[o + FN] * (1 - a) + A[o + FN + 1] * a) * b; };
  return { D, MAJ, TRIB, dk, riv, rho, inD, ss, core, smooth, center: D.find(d => d.center), pwr: (x, z) => fld(FP, x, z), cold: (x, z) => fld(FC, x, z) };
})();
// the lights of a district: fixed places along its streets, the same at every level
const CN_COL = [[1.0, 0.50, 0.17], [1.0, 0.69, 0.36], [1.0, 0.88, 0.70], [0.78, 0.90, 1.0], [0.52, 1.0, 0.84], [1.0, 0.27, 0.17], [1.0, 0.42, 0.66]];
function cnDots(d, level, cb) {
  const r = mulberry32(d.id * 7919 + 13), dens = [2200, 1700, 1100, 700, 220][d.kind], kk = level === 0 ? 0.07 * (0.15 + 0.85 * CN.ss(0.02, 0.3, CN.rho(d.x, d.z))) : 1, n = Math.round(dens * d.area * kk), a = d.a, b = d.b, ex = d.c, ez = d.s, nx = -d.s, nz = d.c, pw = d.pow;
  for (let i = 0; i < n; i++) {
    const u0 = r(), v0 = r(), f0 = r(), f1 = r(), m0 = level === 0 ? Math.max(0, 1 - (1 - r()) * 5) : r(), c0 = r(), l0 = r();
    const wx = d.x0 + u0 * (d.x1 - d.x0), wz = d.z0 + v0 * (d.z1 - d.z0), lx = (wx - d.ox) * ex + (wz - d.oz) * ez, lz = (wx - d.ox) * nx + (wz - d.oz) * nz, bi = Math.floor(lx / a), bj = Math.floor(lz / b);
    let U = lx, V = lz;
    if (f0 < 0.72) { const off = 7 + f1 * f1 * 14; if (f1 * 7 % 1 < 0.5) V = bj * b + (l0 < 0.5 ? off : b - off); else U = bi * a + (l0 < 0.5 ? off : a - off); }
    const x = d.ox + U * ex + V * nx, z = d.oz + U * ez + V * nz;
    const hb = cnH(bi + d.id * 13, bj + 5), blk = hb < 0.36 ? 0.06 : hb < 0.82 ? 0.7 : 2.6, cold = CN.cold(x, z);   // whole blocks dark, whole blocks bright
    let E = 46 * pw * CN.pwr(x, z) * blk * (0.45 + 0.8 * l0), R = 2.2, ci;
    if (m0 > 0.9975) { E *= 70; R = 26; } else if (m0 > 0.985) { E *= 20; R = 11; } else if (m0 > 0.90) { E *= 5; R = 4.5; }
    if (c0 < cold) ci = c0 < cold * 0.72 ? (m0 > 0.97 ? 3 : 2) : 3; else { const c1 = (c0 - cold) / (1 - cold); ci = c1 < 0.5 ? 0 : c1 < 0.9 ? 1 : c1 < 0.985 ? 2 : c1 < 0.994 ? 4 : c1 < 0.998 ? 5 : 6; }
    cb(x, z, m0 > 0.985 ? E : E / kk, R, ci);
  }
}
function cnBakeLevel(level) {
  const H = CN_H[level], N = CN_N[level], T = 2 * H / N, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#000'; g.fillRect(0, 0, N, N); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
  const toX = x => (x / H * 0.5 + 0.5) * N, toY = z => (z / H * 0.5 + 0.5) * N, { dk, riv, rho, ss } = CN;
  const buckets = new Map(); const seg = (key, x0, z0, x1, z1) => { let b = buckets.get(key); if (!b) { b = []; buckets.set(key, b); } b.push(toX(x0), toY(z0), toX(x1), toY(z1)); };
  const flush = () => { for (const [key, b] of buckets) { const [ci, v, w, dash] = key.split('|').map(Number), cc = CN_COL[ci]; g.strokeStyle = `rgb(${Math.min(255, cc[0] * v * 255)},${Math.min(255, cc[1] * v * 255)},${Math.min(255, cc[2] * v * 255)})`; g.lineWidth = Math.max(w / T, 0.02); if (dash && level > 0) g.setLineDash([Math.max(1.0, 7 / T), dash / T]); else g.setLineDash([]);
      for (let i = 0; i < b.length;) { g.beginPath(); for (const e = Math.min(b.length, i + 8000); i < e; i += 4) { g.moveTo(b[i], b[i + 1]); g.lineTo(b[i + 2], b[i + 3]); } g.stroke(); } } buckets.clear(); };
  const vq = v => v < 0.07 ? 0.05 : v < 0.13 ? 0.1 : v < 0.25 ? 0.18 : v < 0.45 ? 0.33 : v < 0.8 ? 0.6 : 1.0;
  const pad = 2.8 * CN_S;
  for (const d of CN.D) {
    if (Math.abs(d.x) > H + pad || Math.abs(d.z) > H + pad) continue;
    const r0 = Math.hypot(d.x, d.z), rmean = rho(d.x, d.z); if (level === 0 && rmean < 0.012 && !d.center) continue;
    const ex = d.c, ez = d.s, nx = -d.s, nz = d.c, RR = 2.7 * CN_S;
    for (let fam = 0; fam < 2; fam++) {
      const sp = fam ? d.a : d.b, K = Math.ceil(RR / sp) + 1, cx = (d.x - d.ox) * (fam ? ex : nx) + (d.z - d.oz) * (fam ? ez : nz), k0 = Math.floor(cx / sp);
      for (let k = k0 - K; k <= k0 + K; k++) {
        const coll = (k % d.m + d.m) % d.m === 0, hl = cnH(k + d.id * 3, fam + 11); if (!coll && level === 0 && (r0 > 26000 || hl < 0.5)) continue; if (!coll && hl < (d.kind === 2 ? 0.38 : 0.1)) continue; if (d.kind === 4 && !coll) continue;
        const ofs = (k + (d.center ? 0 : (hl - 0.5) * 0.3)) * sp, px = d.ox + (fam ? ex : nx) * ofs, pz = d.oz + (fam ? ez : nz) * ofs, dx = fam ? nx : ex, dz = fam ? nz : ez; let t0 = -1e9, t1 = 1e9, ok = true;
        for (const c of d.C) { const den = c[0] * dx + c[1] * dz, num = c[2] - c[0] * px - c[1] * pz; if (Math.abs(den) < 1e-9) { if (num < 0) { ok = false; break; } } else { const t = num / den; if (den > 0) t1 = Math.min(t1, t); else t0 = Math.max(t0, t); } } t0 = Math.max(t0, -RR * 1.5); t1 = Math.min(t1, RR * 1.5);
        if (!ok || t1 <= t0) continue;
        const step = level === 0 ? 260 : 130, ns = Math.max(1, Math.ceil((t1 - t0) / step)), dt = (t1 - t0) / ns, c0d = CN.cold(px + dx * (t0 + t1) / 2, pz + dz * (t0 + t1) / 2), hc = hl * 9.7 % 1, ci = hc < c0d ? (hc < c0d * 0.5 ? 2 : 3) : hc < 0.75 ? 0 : 1;
        for (let i = 0; i < ns; i++) { const ta = t0 + i * dt, tb = ta + dt, tm = (ta + tb) / 2, xm = px + dx * tm, zm = pz + dz * tm;
          if (Math.abs(xm) > H + 200 || Math.abs(zm) > H + 200) continue; if (dk(xm, zm) > 0.45 || riv(xm, zm) < 70) continue; const rr = level === 0 ? ss(0.02, 0.2, rho(xm, zm)) : 1; if (rr < 1 && cnH(i * 3 + d.id, k * 5 + fam) > rr) continue; if (!coll && cnH(i + k * 17, d.id + fam * 7) < 0.14) continue;
          const sb = (0.25 + 3.0 * Math.pow(cnN(xm / 700 + 3.1, zm / 700 + 7.3), 2.4)) * CN.pwr(xm, zm), v = d.pow * sb * (coll ? 0.30 : 0.10) * (0.55 + 0.9 * hl), xa = px + dx * ta, za = pz + dz * ta, xb = px + dx * tb, zb = pz + dz * tb;
          seg(`${ci}|${vq(level === 2 ? v * 0.3 : v)}|${coll ? 10 : 4}|0`, xa, za, xb, zb); if (coll && level > 0) seg(`${ci}|${vq(v * 2.2)}|5|${28}`, xa, za, xb, zb); } } }
    flush();
    // floodlit lots, depots, stadiums: the few brightest things in the city
    const rs = mulberry32(d.id * 131 + 7), ns = d.kind === 0 ? 1.1 : d.kind === 3 ? 2.0 : d.kind === 1 ? 0.3 : 0.2, ct = Math.floor(ns * d.area * 0.4 + rs());
    for (let i = 0; i < ct; i++) { const x = d.x0 + rs() * (d.x1 - d.x0), z = d.z0 + rs() * (d.z1 - d.z0), w = 50 + rs() * 170, h = 40 + rs() * 120, k = rs(), ci = k < 0.5 ? 3 : k < 0.96 ? 2 : 4; if (!CN.inD(d, x, z) || dk(x, z) > 0.4 || riv(x, z) < 200 || (level === 0 && rho(x, z) < 0.03)) continue; const cc = CN_COL[ci], px = toX(x), py = toY(z), rw = Math.max(w / T, 0.7), rh = Math.max(h / T, 0.7);
      g.save(); g.translate(px, py); g.rotate(d.th); g.scale(rw, rh); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 0.8); gr.addColorStop(0, `rgb(${cc[0] * 110},${cc[1] * 110},${cc[2] * 110})`); gr.addColorStop(0.5, `rgb(${cc[0] * 44},${cc[1] * 44},${cc[2] * 44})`); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(-0.8, -0.8, 1.6, 1.6); g.restore(); }
  }
  // the long roads: a faint halo, the carriageway with its brightness changing along it, a string of lamps once resolved
  CN.MAJ.forEach((m, mi) => { const L = m.L, ci = m.col, nL = L.length; let along = 0;
    for (let i = 0; i + 1 < nL; i++) { const [x0, z0] = L[i], [x1, z1] = L[i + 1], xm = (x0 + x1) / 2, zm = (z0 + z1) / 2, sl = Math.hypot(x1 - x0, z1 - z0); along += sl; if (Math.abs(xm) > H + 400 || Math.abs(zm) > H + 400) continue; if ((dk(xm, zm) > 0.85 && !m.av) || riv(xm, zm) < 50) continue;
      const lev = level === 0 ? 0.3 + 0.7 * ss(0.03, 0.3, rho(xm, zm)) : 1, vv = 1.55 * m.v * lev * (0.42 + 1.15 * cnN(along / 2300 + mi * 3.7, 2.5)) * (0.62 + 0.26 * Math.min(2.6, CN.pwr(xm, zm)));
      if (level === 0) seg(`${ci}|${vq(vv * 0.09)}|110|0`, x0, z0, x1, z1); seg(`${ci}|${vq(level === 2 ? vv * 0.26 : vv)}|${level === 0 ? Math.max(m.w * 2, 30) : m.w}|0`, x0, z0, x1, z1); if (level > 0) seg(`${ci}|1|6|${34}`, x0, z0, x1, z1); } });
  flush();
  // tributaries' banks
  g.globalCompositeOperation = 'source-over'; g.strokeStyle = '#000'; g.lineWidth = Math.max(70 / T, 1); for (const t of CN.TRIB) { const L = CN.smooth(t, 3); g.beginPath(); L.forEach((p, i) => { const x = toX(p[0]), y = toY(p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
  const id = g.getImageData(0, 0, N, N), px = id.data;
  // the lights, written straight into the map, each with the energy it has at every level
  const t2 = T * T, rq = mulberry32(99 + level); let q = 0;
  const add = (ix, iy, v, cc) => { if (ix < 0 || iy < 0 || ix >= N || iy >= N) return; const o = (iy * N + ix) * 4; for (let k = 0; k < 3; k++) { const w = v * cc[k]; let z = px[o + k] + w; const fl = Math.floor(z), fr = z - fl; z = fl + (fr > (q = (q * 1664525 + 1013904223) >>> 0) / 4294967296 ? 1 : 0); px[o + k] = z > 255 ? 255 : z; } };
  for (const d of CN.D) { if (Math.abs(d.x) > H + pad || Math.abs(d.z) > H + pad) continue; if (level === 0 && rho(d.x, d.z) < 0.012 && !d.center) continue;
    cnDots(d, level, (x, z, E, R, ci) => { if (x < -H || z < -H || x >= H || z >= H || !CN.inD(d, x, z) || (dk(x, z) > 0.32 + 0.25 * ((x * 0.37 + z * 0.91) % 1 + 1) % 1 && ((x * 0.53 + z * 0.17) % 1 + 1) % 1 > 0.035) || riv(x, z) < 90 + 50 * (((x * 0.13 + z * 0.77) % 1 + 1) % 1)) return; if (level === 0) { const rr = ss(0.02, 0.22, rho(x, z)); if (rr < 1 && ((x * 0.71 + z * 0.29) % 1 + 1) % 1 > rr) return; }
      const cc = CN_COL[ci], fx = (x / H * 0.5 + 0.5) * N - 0.5, fy = (z / H * 0.5 + 0.5) * N - 0.5, Rt = (level === 2 ? 3.0 : R) / T; if (level === 2) E *= R > 4 ? 0.012 : 0.09;
      if (Rt < 0.72) { const ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy, v = E / t2 * 255; add(ix, iy, v * (1 - ax) * (1 - ay), cc); add(ix + 1, iy, v * ax * (1 - ay), cc); add(ix, iy + 1, v * (1 - ax) * ay, cc); add(ix + 1, iy + 1, v * ax * ay, cc); }
      else { const Rn = Math.min(Rt, 24), rad = Math.ceil(Rn * 2.2), v = E / (t2 * Math.PI * Rn * Rn) * 255, cx = Math.round(fx), cy = Math.round(fy); for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) { const dx = cx + i - fx, dy = cy + j - fy, e = (dx * dx + dy * dy) / (Rn * Rn); if (e < 5) add(cx + i, cy + j, v * Math.exp(-e), cc); } } }); }
  // to sRGB, so the card samples it and mip-maps it in linear light
  const LUT = new Uint8Array(256); for (let i = 0; i < 256; i++) { const l = i / 255; LUT[i] = Math.round(255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055)); }
  let sum45 = 0, n45 = 0; if (level === 0) { const a = Math.round(N * (0.5 - 45000 / (2 * H))), b = N - a; for (let j = a; j < b; j += 2) for (let i = a; i < b; i += 2) { const o = (j * N + i) * 4; sum45 += (0.3 * px[o] + 0.55 * px[o + 1] + 0.15 * px[o + 2]) / 255; n45++; } }
  const out = new Uint8Array(px.length); for (let i = 0, e = px.length; i < e; i += 4) { out[i] = LUT[px[i]]; out[i + 1] = LUT[px[i + 1]]; out[i + 2] = LUT[px[i + 2]]; out[i + 3] = 255; }
  const t = new THREE.DataTexture(out, N, N, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = MAX_ANISO; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; if (level === 0) t.__mean45 = sum45 / Math.max(1, n45);
  t.onUpdate = () => { t.image = { data: null, width: N, height: N }; t.onUpdate = null; };
  return t;
}
// the same treatment for all of the 3 km map around Korea: each of its texels resolved into its own lights, gathered along a web of threads, with the texel's energy. Seen closer than the map's resolution this is sharp lights where the map alone gave swollen spots
function cnBakeRegion(L0tex) {
  const im = SV_TEX.patchImg, W = im.width, HH = im.height, c = document.createElement('canvas'); c.width = W; c.height = HH; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0); const src = g.getImageData(0, 0, W, HH).data;
  const NW = 3072, NH = 2730, px = new Float32Array(NW * NH * 3), sx = NW / W, sy = NH / HH, r = mulberry32(8821);
  const lon = i => 118 + (i + 0.5) / W * 18, lat = j => 44 - (j + 0.5) / HH * 16;   // the image's top row is 44 N
  const segD = (x, y, a, b, c2, d) => { const ex = c2 - a, ey = d - b, u = Math.max(0, Math.min(1, ((x - a) * ex + (y - b) * ey) / (ex * ex + ey * ey))); return Math.hypot(x - a - ex * u, y - b - ey * u); };
  const { ss } = CN, ridge = (x, z) => { const a = 1 - Math.abs(2 * cnN(x / 15000 + 3.1, z / 15000 + 1.3) - 1), b = 1 - Math.abs(2 * cnN(x / 5800 + 7.2, z / 5800 + 9.9) - 1), c3 = 1 - Math.abs(2 * cnN(x / 2300 + 5.5, z / 2300 + 4.4) - 1); return a * 0.42 + b * 0.36 + c3 * 0.22; };
  let sumMap = 0, nMap = 0;
  for (let j = 0; j < HH; j++) for (let i = 0; i < W; i++) { const o = (j * W + i) * 4, L = (0.3 * src[o] + 0.55 * src[o + 1] + 0.15 * src[o + 2]) / 255 - 0.055; if (L <= 0) continue; const lo = lon(i), la = lat(j), xm = (lo - SV_LON) * 88000, zm = (SV_LAT - la) * 111000;
    if (Math.abs(xm) < 45000 && Math.abs(zm) < 45000) { sumMap += L; nMap++; }
    const dmz = segD(lo, la, 126.45, 37.70, 128.5, 38.66), co = Math.min(segD(lo, la, 128.5, 38.66, 129.0, 37.72), segD(lo, la, 129.0, 37.72, 129.46, 36.95), segD(lo, la, 129.46, 36.95, 129.5, 35.75));
    const edge = (0.03 + 0.97 * ss(0.05, 0.3, dmz)) * (0.04 + 0.96 * ss(0.08, 0.62, co)), Et = Math.pow(L, 1.55) * sx * sy * edge * 1.5, n = Math.min(150, 3 + Math.round(L * L * 340));
    const warmth = L > 0.6 ? 0.22 : 0.06;
    for (let k = 0; k < n; k++) { let gx = 0, gy = 0, best = -1; for (let t = 0; t < 2; t++) { const ax = (r() + r() - 1) * 1.25, ay = (r() + r() - 1) * 1.25, wx = xm + ax * 2347, wz = zm + ay * 2960, v = ridge(wx, wz); if (v > best) { best = v; gx = ax; gy = ay; } }
      const m0 = r(), b = (m0 > 0.975 ? 6 : m0 > 0.85 ? 2.4 : 0.55) * (0.5 + best * best * 1.4), e = Et / n * b, fx = (i + 0.5 + gx) * sx - 0.5, fy = (HH - j - 0.5 - gy) * sy - 0.5, ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy, c0 = r(), tn = c0 < warmth ? CN_COL[c0 < warmth * 0.5 ? 2 : 3] : c0 < 0.7 ? CN_COL[0] : CN_COL[1];
      if (m0 < 0.85) { for (let q = 0; q < 4; q++) { const tx = ix + (q & 1), ty = iy + (q >> 1); if (tx < 0 || ty < 0 || tx >= NW || ty >= NH) continue; const w = (q & 1 ? ax : 1 - ax) * (q >> 1 ? ay : 1 - ay), o2 = (ty * NW + tx) * 3; px[o2] += e * w * tn[0]; px[o2 + 1] += e * w * tn[1]; px[o2 + 2] += e * w * tn[2]; } continue; }
      for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) { const tx = ix + dx, ty = iy + dy; if (tx < 0 || ty < 0 || tx >= NW || ty >= NH) continue; const qx = dx - ax, qy = dy - ay, w = Math.exp(-(qx * qx + qy * qy) * 1.05) * 0.335, o2 = (ty * NW + tx) * 3; px[o2] += e * w * tn[0]; px[o2 + 1] += e * w * tn[1]; px[o2 + 2] += e * w * tn[2]; } } }
  // set to the same mean as the finer map around Seoul
  let sK = 0, nK = 0; { const a0 = Math.floor(((SV_LON - 0.511 - 118) / 18) * NW), a1 = Math.ceil(((SV_LON + 0.511 - 118) / 18) * NW), b0 = Math.floor(((SV_LAT - 0.405 - 28) / 16) * NH), b1 = Math.ceil(((SV_LAT + 0.405 - 28) / 16) * NH); for (let j = b0; j < b1; j++) for (let i = a0; i < a1; i++) { const o = (j * NW + i) * 3; sK += 0.3 * px[o] + 0.55 * px[o + 1] + 0.15 * px[o + 2]; nK++; } }
  const mean0 = L0tex.__mean45 || 0.05, kk = (mean0 * CN_GAIN) / Math.max(1e-5, sK / Math.max(1, nK));
  const out = new Uint8Array(NW * NH * 4), sr = l => l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  // stored divided by 4, so its range holds the brightest
  for (let i = 0, o = 0, e = NW * NH; i < e; i++, o += 4) { for (let k = 0; k < 3; k++) out[o + k] = 255 * sr(Math.min(1, px[i * 3 + k] * kk / 4)); out[o + 3] = 255; }
  const t = new THREE.DataTexture(out, NW, NH, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = MAX_ANISO; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; t.onUpdate = () => { t.image = { data: null, width: NW, height: NH }; t.onUpdate = null; };
  return t;
}
// the city's large-scale light as seen from the air, shared by the field and by far buildings so the two are the same light. Rotated off the map axes.
const CITY_MEAN_GLSL = `
    float cmH(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float cmN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(cmH(i), cmH(i + vec2(1, 0)), f.x), mix(cmH(i + vec2(0, 1)), cmH(i + vec2(1, 1)), f.x), f.y); }
    float cityMacro(vec2 p){ vec2 a = mat2(0.81, -0.59, 0.59, 0.81) * p, b = mat2(0.57, 0.82, -0.82, 0.57) * p; return (0.50 + 1.0 * cmN(a / 3300.0 + 11.3)) * (0.62 + 0.76 * cmN(b / 1050.0 + 7.4)); }   // the offsets matter: this noise is exactly 0 at the map's origin, the cafe, which was the dark disc around it
    float cityDens(float rho, vec2 p){ return pow(rho, 1.18) * 1.5 * cityMacro(p); }
    // the mean colour a stretch of city has once its lights are smaller than a pixel
    vec3 cityMean(float d){ vec3 c = vec3(1.0, 0.70, 0.42) * (0.20 * d + 0.012 * sqrt(d)); return c * c / (c + 0.10) * 1.05; }`;
const CITY_U = { tMap: CITY_MAP_U, tRiver: { value: RIVER_TEX }, tCN0: CN_T[0], tCN1: CN_T[1], tCN2: CN_T[2], uBr: { value: HAN_BR }, uFade: { value: 1 }, uEyeW: { value: new THREE.Vector3() }, uHalf: { value: CITY_HALF } };
const CITY_MAT = new THREE.ShaderMaterial({ uniforms: CITY_U, transparent: true, depthWrite: false,
  vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tMap, tRiver, tCN0, tCN1, tCN2; uniform vec4 uBr[${HAN_BR_N}]; uniform float uFade, uHalf; uniform vec3 uEyeW; varying vec2 vP; float gSky = 0.0, gFlat = 1.0, gBoost = 1.0;
    ${NIGHT_GLSL}
    ${CITY_MEAN_GLSL}
    float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    vec3 lampCol(float k){ vec3 c = k < 0.5 ? vec3(1.0, 0.62, 0.30) : k < 0.86 ? vec3(1.0, 0.80, 0.56) : k < 0.97 ? vec3(0.88, 0.92, 1.0) : vec3(0.70, 0.95, 0.88); return mix(c, k < 0.5 ? vec3(1.0, 0.64, 0.34) : vec3(1.0, 0.78, 0.54), gSky); }
    // one layer of lights: energy-conserving while small, capped when near so a lamp stays a lamp; melts into its mean when a cell gets smaller than a few pixels
    vec3 oct(vec2 p, float cell, float r, float fw, float seed, float gain, float keep){
      vec2 g = p / cell, id = floor(g), f = fract(g) - 0.5;
      float k = smoothstep(3.0, 6.0, cell / fw);
      vec3 mean = vec3(1.0, 0.72, 0.46) * gain * keep;
      if (k <= 0.0) return mean;
      vec2 o = (vec2(h21(id + seed), h21(id + seed + 7.7)) - 0.5) * 0.72, dv = (f - o) * cell;
      float win = smoothstep(0.5, 0.42, max(abs(f.x), abs(f.y))), w = min(max(r * mix(1.0, 0.4, gSky), fw * 0.8), cell * 0.12), amp = min(gain * cell * cell / (3.14159 * w * w), mix(2.6, 1.05, gSky));
      float on = step(1.0 - keep, h21(id + seed + 3.3));
      float bv = h21(id + seed + 5.5), clu = smoothstep(0.22, 0.72, n2(p / (cell * 6.3) + seed));
      vec3 b = lampCol(h21(id + seed + 11.1)) * amp * exp(-dot(dv, dv) / (w * w)) * on * win * mix(0.45 + 1.1 * bv, (0.3 + 2.8 * bv * bv * bv) * mix(1.0, clu, 0.6), gSky);
      return mix(mean, b, k * (1.0 - 0.12 * gSky));
    }
    // a lit road: a soft line while thin on screen; two rows of lamps on dark asphalt when it is wide on screen
    float road(float x, float y, float cell, float hw, float fw){
      float d = abs(fract(x / cell + 0.5) - 0.5) * cell, w = max(hw, fw * 0.7), far = (hw / w) * exp(-d * d / (w * w));
      float kn = smoothstep(hw * 0.9, hw * 0.22, fw); if (kn <= 0.0) return far;
      float lw = max(hw * 0.06, fw * 0.8), e = abs(d - hw * 0.8), a = abs(fract(y / 26.0 + 0.5) - 0.5) * 26.0;
      float dash = mix(0.38, exp(-a * a / max(lw * lw * 1.4, 0.5)) * 1.6 + 0.05, smoothstep(9.0, 3.0, fw));
      return mix(far, exp(-e * e / (lw * lw)) * dash * min(1.0, hw * 0.12 / lw + 0.25) + 0.012 * exp(-d * d / (hw * hw)), kn);
    }
    void main(){
      vec2 uv = vP / uHalf * 0.5 + 0.5;
      float rho = texture2D(tMap, uv).r;
      vec2 Dx = dFdx(vP), Dy = dFdy(vP);
      float fw = length(vec2(length(Dx), length(Dy))) * 0.75, len = length(vP);
      // streets: a slightly bent grid, rotated by district. Around the cafe it runs square with the street row (the avenue is at z = 23)
      float nf = smoothstep(1500.0, 4200.0, len);
      float ang = (0.32 + 0.8 * (n2(vP / 9000.0) - 0.5)) * nf;
      float ca = cos(ang), sa = sin(ang);
      vec2 q = mat2(ca, -sa, sa, ca) * vP + nf * 60.0 * vec2(n2(vP / 700.0), n2(vP / 700.0 + 9.0)) + vec2(67.5, -23.0);
      // from the air (never at street level, so everything below stays exactly as it was there)
      float sky = smoothstep(90.0, 420.0, uEyeW.y); gSky = sky;
      float eLog = log(max(uEyeW.y, 1.0)), riverK = smoothstep(11.9, 10.6, eLog);
      float dist = length(uEyeW - vec3(vP.x, 0.0, vP.y));
      float nearFade = smoothstep(70.0, 450.0, dist);          // close up the lamps are the 3D lights, not spots on the ground
      // the Han's distance field: one tap away from it, a smooth cubic near it, so its edge has no facets
      vec4 rv = texture2D(tRiver, uv); float hwR = rv.a;
      if (rv.b < 4000.0) rv.rgb = cubicTex(tRiver, uv, vec2(${RIVER_S.toFixed(1)}));
      float along = rv.g * 2.0;
      float dE = max(abs(rv.r), rv.b) - hwR, wm = smoothstep(fw * 0.5 + 0.5, -fw * 0.5 - 0.5, dE);
      float park = mix(0.0, 1.0, smoothstep(30.0, 110.0 + 150.0 * n2(vec2(along / 3100.0, 6.0)), dE));   // riverside parks of changing width: the lights stop before the water
      vec3 col = vec3(0.0), colAir = vec3(0.0), ground = vec3(0.0), roadc = vec3(1.0, 0.66, 0.34);
      vec2 p1 = mat2(0.94, -0.34, 0.34, 0.94) * vP, p2 = mat2(0.82, 0.57, -0.57, 0.82) * vP;
      if (sky < 1.0) {
        // density: the map, broken up by a multiplicative cascade that goes all the way down to the pixel, so distance gives grain and not fog
        float m = 1.0;
        m *= mix(1.0, 0.2 + 1.6 * n2(vP / 2300.0), smoothstep(1.0, 3.0, 2300.0 / fw));
        m *= mix(1.0, 0.2 + 1.6 * n2(vP / 640.0 + 7.0), smoothstep(1.0, 3.0, 640.0 / fw));
        m *= mix(1.0, 0.15 + 1.7 * n2(vP / 170.0 + 3.0), smoothstep(1.0, 3.0, 170.0 / fw));
        m *= mix(1.0, 0.15 + 1.7 * n2(vP / 44.0 + 5.0), smoothstep(1.0, 3.0, 44.0 / fw));
        float dens = clamp(pow(rho, 1.18) * 1.5 * m * mix(0.16, 1.0, park), 0.0, 1.8);
        float rA = max(road(q.x, q.y, 2600.0, 19.0, fw), road(q.y, q.x, 2900.0, 19.0, fw));
        float rB = max(road(q.x, q.y, 620.0, 11.0, fw), road(q.y, q.x, 540.0, 11.0, fw));
        float rC = max(road(q.x, q.y, 135.0, 5.0, fw), road(q.y, q.x, 118.0, 5.0, fw));
        col += oct(vP, 880.0, 11.0, fw, 1.0, 0.040, 0.8) * dens;
        col += oct(p1, 230.0, 4.0, fw, 21.0, 0.060, 0.75) * dens;
        col += oct(p2, 62.0, 1.6, fw, 41.0, 0.075, 0.7) * dens * nearFade; col += oct(p1 * 0.7 + p2 * 0.3, 21.0, 0.9, fw, 61.0, 0.060, 0.55) * dens * nearFade;
        col += roadc * (rA * 0.5 + rB * 0.2 + rC * 0.11 * smoothstep(0.0, 0.3, dens)) * sqrt(dens + 0.03) * mix(0.45, 1.0, nearFade);
        // ground: asphalt faintly lit by the city, never a flat black
        ground = mix(vec3(0.010, 0.010, 0.012), vec3(0.016, 0.012, 0.010), clamp(dens, 0.0, 1.0));
        ground *= 0.75 + 0.5 * n2(vP / 37.0);
        // the avenue in front of the cafe: pavement, kerb, six lanes, pavement. Lamps stand staggered along both kerbs, their pools wide and soft
        float sk = (1.0 - smoothstep(260.0, 700.0, len)) * step(2.6, vP.y) * step(vP.y, 46.5) * (1.0 - smoothstep(120.0, 480.0, uEyeW.y));
        if (sk > 0.0) {
          float x = vP.x, z = vP.y, rz = z - 8.3, il = floor(x / 26.0 + 0.5), dn = x - il * 26.0, ds = (fract(x / 26.0) - 0.5) * 26.0, zn = z - 9.2, zs = z - 37.1;
          float pn = 1.0 / (1.0 + dn * dn * 0.022 + zn * zn * 0.034), ps = 1.0 / (1.0 + ds * ds * 0.022 + zs * zs * 0.034), pool = (il == 0.0 ? 0.0 : pn * pn) + ps * ps;
          float walk = 1.0 - step(0.0, rz) * step(rz, 29.7), kerb = smoothstep(0.14, 0.04, abs(rz)) + smoothstep(0.14, 0.04, abs(rz - 29.7));
          vec2 jt = abs(fract(vP / 1.25 + 0.5) - 0.5) * 1.25; float joint = (1.0 - smoothstep(0.012, 0.04, min(jt.x, jt.y))) * smoothstep(0.25, 0.06, fw);
          // lane marks: white dashes between lanes, a double centre line, a zebra crossing, all worn
          float mk = smoothstep(0.5, 0.1, fw), wear = 0.55 + 0.45 * n2(vP * vec2(0.9, 2.2) + 3.0);
          float dashL = (smoothstep(0.09, 0.05, abs(rz - 4.95)) + smoothstep(0.09, 0.05, abs(rz - 9.9)) + smoothstep(0.09, 0.05, abs(rz - 19.8)) + smoothstep(0.09, 0.05, abs(rz - 24.75))) * step(0.55, fract(x / 9.0)) * mk;
          float laneL = (smoothstep(0.08, 0.05, abs(rz - 14.65)) + smoothstep(0.08, 0.05, abs(rz - 15.05))) * mk;
          float zeb = step(0.5, fract(rz / 1.5)) * step(2.0, rz) * step(rz, 27.7) * smoothstep(3.2, 3.0, abs(x - 33.0)) * smoothstep(0.8, 0.2, fw);
          // asphalt: fine grain, lighter tyre tracks in each lane, darker repair patches, no blotches of lamp and shadow
          vec2 pId = floor(vP / vec2(17.0, 4.95) + vec2(0.3, 0.0)); float patchA = step(0.86, h21(pId + 3.3)) * step(0.0, rz) * step(rz, 29.7);
          float lane = fract(rz / 4.95), track = smoothstep(0.34, 0.18, abs(lane - 0.27)) + smoothstep(0.34, 0.18, abs(lane - 0.73));
          float grain = 0.74 + 0.40 * n2(vP * 2.1) * (0.6 + 0.8 * n2(vP * 9.0)) + 0.14 * (n2(vP / 11.0 + 4.0) - 0.5);
          vec3 asph = vec3(0.112, 0.110, 0.116) * grain * (1.0 + 0.16 * track) * (1.0 - 0.28 * patchA);
          vec3 alb = walk > 0.5 ? vec3(0.34, 0.31, 0.28) * (1.0 - 0.45 * joint) * (0.86 + 0.28 * n2(vP * 0.7)) : asph;
          alb = mix(alb, vec3(0.5, 0.48, 0.45), clamp(kerb, 0.0, 1.0) * 0.8); alb = mix(alb, vec3(0.5, 0.49, 0.44) * wear, clamp(dashL + zeb, 0.0, 1.0) * 0.75); alb = mix(alb, vec3(0.56, 0.42, 0.14) * wear, clamp(laneL, 0.0, 1.0) * 0.8);
          float shop = exp(-max(z - 2.6, 0.0) / 3.2) * (0.62 + 0.38 * n2(vec2(x / 6.0, 3.0)));
          vec3 sl = alb * (vec3(0.125, 0.108, 0.100) + vec3(1.0, 0.70, 0.42) * (pool * 0.78 * (1.0 - smoothstep(55.0, 210.0, uEyeW.y)) + shop * 0.34));
          ground = mix(ground, sl, sk);
          col *= mix(1.0, 0.25, sk);
        }
        // light spilling on the pavement from the cafe's window
        float spill = exp(-pow((vP.x) / 4.0, 2.0)) * exp(-max(vP.y - 2.5, 0.0) / 3.5) * step(2.5, vP.y);
        ground += vec3(0.95, 0.56, 0.26) * spill * 0.15 * (0.6 + 0.8 * n2(vP * 2.3)) * (0.75 + 0.5 * n2(vP * 13.0));
        col = col + ground;
        col = col * col / (col + 0.10) * 1.05 + ground * 0.55;  // deep blacks between the lights
      }
      if (sky > 0.0) {
        vec3 cn = cityNight(vP, fw, tCN0, tCN1, tCN2) * ${(CN_GAIN * 0.75).toFixed(3)};
        colAir = cn * park * mix(0.30, 1.0, smoothstep(320.0, 4600.0, uEyeW.y)) + vec3(0.0030, 0.0028, 0.0032);
        col = mix(col, colAir, sky);
      }
      // the Han: dark water with one soft line of reflected glow along each bank, a lit embankment road on each side, bridges with their strings of lamps. No streaks: a clean edge at every height
      if (riverK > 0.0) {
        float glow = sqrt(rho + 0.02), bankN = exp(min(dE, 0.0) / 120.0);
        vec3 water = vec3(0.0020, 0.0032, 0.0066) + vec3(1.0, 0.62, 0.34) * glow * bankN * bankN * 0.014;
        col = mix(col, water, wm * riverK);
        float lwE = max(9.0, fw * 0.7), eR = dE - 42.0, rn = 0.55 + 0.75 * n2(vec2(along / 2100.0, rv.r > 0.0 ? 2.0 : 5.0)), lq = (fract(along / 36.0) - 0.5) * 36.0, lamp = mix(1.0, 0.35 + 1.5 * exp(-lq * lq / max(fw * fw, 9.0)), smoothstep(12.0, 5.0, fw));
        col += riverK * vec3(1.0, 0.66, 0.34) * (9.0 / lwE) * exp(-eR * eR / (lwE * lwE)) * 1.15 * rn * lamp * step(0.0, dE);
        if (dE < 240.0) { float bd = 1e12, bt = 0.0;
          for (int i = 0; i < ${HAN_BR_N}; i++) { vec2 a = uBr[i].xy, e = uBr[i].zw - a; float u = clamp(dot(vP - a, e) / dot(e, e), 0.0, 1.0); vec2 dd = vP - a - e * u; float qq = dot(dd, dd); if (qq < bd) { bd = qq; bt = u * length(e); } }
          float wb = max(10.0, fw * 0.8), bq = (fract(bt / 42.0) - 0.5) * 42.0, lampB = mix(1.0, 0.25 + 1.5 * exp(-bq * bq / max(fw * fw, 16.0)), smoothstep(16.0, 6.0, fw));
          col += riverK * vec3(1.0, 0.80, 0.56) * (10.0 / wb) * exp(-bd / (wb * wb)) * lampB * mix(0.52, 1.25, smoothstep(50.0, 18.0, fw)) * smoothstep(240.0, 60.0, dE); }
      }
      float r = (len + 9000.0 * (n2(vP / 11000.0) - 0.5)) / uHalf;
      float a = uFade * (1.0 - smoothstep(0.55, 0.96, r));
      gl_FragColor = vec4(col, a);
    }` });
// the ground's mesh: cells that grow with the distance from the cafe (3 m near it, 30% of the distance further out), never two huge triangles. A 180 km triangle under an eye 2 m above it reaches the
// rasteriser with a depth plane that is off by metres, and by a different amount each frame: the ground behind the far wall then passes the depth test over the wall, the tables and the chairs for single frames (11.18–11.52 s and on the way back out)
const CITY_GEOM = (() => {
  const side = [0]; for (let c = 3; c < CITY_HALF * 0.8; c *= 1.3) side.push(c); side.push(CITY_HALF);
  const xs = [...side.slice(1).reverse().map(c => -c), ...side], n = xs.length, pos = new Float32Array(n * n * 3), idx = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { pos[(j * n + i) * 3] = xs[i]; pos[(j * n + i) * 3 + 2] = xs[j]; }
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i, b = a + 1, d = a + n, c = d + 1; idx.push(a, d, c, a, c, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); return g;
})();
const CITY_MESH = noDepth(new THREE.Mesh(CITY_GEOM, CITY_MAT));
CITY_MESH.position.y = -0.03; CITY_MESH.renderOrder = 1; CITY_MESH.frustumCulled = false; CITY_MESH.name = 'CityField'; CITY_MESH.userData.passable = true; universe.add(CITY_MESH);
SV_READY.then(() => { CITY_MAP_U.value = bakeCityMap(); CN_T[0].value = cnBakeLevel(0); CN_TK.value = cnBakeRegion(CN_T[0].value); CN_T[1].value = cnBakeLevel(1); CN_T[2].value = cnBakeLevel(2); });

// 3D lights. The first BOKEH_N are the lights seen through the far windows; these are the only ones drawn once the lens is close (bokeh)
const BOKEH_N = 520;
// the avenue's lamps, staggered along its two kerbs. None where the camera comes down in front of the cafe
const LAMP_XZ = []; for (let i = -24; i <= 24; i++) { if (i !== 0) LAMP_XZ.push([i * 26, 9.2]); LAMP_XZ.push([(i + 0.5) * 26, 37.1]); }
const CITY_LIGHTS_U = { uPx: { value: 1500 }, uD: { value: 1 }, uCoc: { value: 0 }, uGain: { value: 1 }, uFar: { value: 1 } };
// every block of the city, [x, y, z, w, h, d, angle, onGround]. Nothing stands in the camera's corridor (it comes in from the south, above about 26 degrees)
const CITY_BLOCKS = [];
const hanDist = (() => { const P = HAN_RIVER.map(([lo, la]) => [xOfLon(lo), zOfLat(la)]); return (x, z) => { let b = 1e18; for (let i = 0; i + 1 < P.length; i++) { const ax = P[i][0], az = P[i][1], ex = P[i + 1][0] - ax, ez = P[i + 1][1] - az, u = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez))), dx = x - ax - ex * u, dz = z - az - ez * u; b = Math.min(b, dx * dx + dz * dz); } return Math.sqrt(b); }; })();
function clearH(x, z, h) { if (z <= 0) return h; return Math.abs(x - z * 0.2) > 50 + z * 0.25 ? h : Math.min(h, z * 0.42 - 6); }
const CITY_POINTS = (() => {
  const rnd = mulberry32(2026), P = [], C = [], S = [], Q = [];
  const warm = [[1, 0.62, 0.30], [1, 0.76, 0.46], [1, 0.84, 0.62], [0.78, 0.86, 1], [1, 0.50, 0.22]];
  const add = (x, y, z, c, s, b) => { const r = Math.hypot(x, z); P.push(x, y, z); C.push(c[0] * b, c[1] * b, c[2] * b); S.push(s); Q.push(s === 0.7 ? -1 : P.length / 3 <= BOKEH_N ? 0 : Math.min(1, r * r / (2600 * 2600))); };
  for (let i = 0; i < BOKEH_N; i++) {                          // north of the cafe: what the back windows look at
    const zz = -6 - Math.pow(rnd(), 1.4) * 260, x = (rnd() - 0.5) * (14 + Math.abs(zz) * 1.9), y = rnd() < 0.3 ? 2 + rnd() * 5 : 2 + Math.pow(rnd(), 1.5) * (10 + Math.abs(zz) * 0.34);
    add(x, y, zz - 3.6, warm[Math.floor(rnd() * warm.length)], 0.6 + 2.4 * rnd() * rnd(), 0.25 + 2.4 * Math.pow(rnd(), 3));
  }
  const towers = 3400;
  for (let t = 0; t < towers; t++) {
    const r = 1250 * Math.exp(rnd() * Math.log(9000 / 1250)), a = rnd() * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (hanDist(x, z) < 760 || (Math.abs(x) < 2800 && z > -8 && z < 54)) continue;
    const hRaw = 14 + Math.pow(rnd(), 2.6) * 74, h = clearH(x, z, hRaw), wid = 10 + rnd() * 18, dep = wid * (0.7 + rnd() * 0.5), c0 = warm[Math.floor(rnd() * 3)], ang = r < 2400 ? 0 : 0.32 + (rnd() - 0.5) * 0.8;
    if (h < 8) continue;
    CITY_BLOCKS.push([x, h / 2, z, wid, h, dep, ang, 1]);
    if (h > 42 && rnd() < 0.4) CITY_BLOCKS.push([x, h + h * 0.09, z, wid * 0.62, h * 0.18, dep * 0.62, ang, 0]);
    const n = 6 + Math.floor(h / 6), cs = Math.cos(ang), sn = Math.sin(ang);
    for (let k = 0; k < n; k++) {
      const face = Math.floor(rnd() * 4), u = rnd() - 0.5, lx = face < 2 ? u * wid : (face === 2 ? 1 : -1) * (wid / 2 + 0.4), lz = face < 2 ? (face === 0 ? 1 : -1) * (dep / 2 + 0.4) : u * dep;
      add(x + lx * cs + lz * sn, 3 + Math.floor(rnd() * h / 3.4) * 3.4, z - lx * sn + lz * cs, rnd() < 0.2 ? warm[3] : c0, 1.2, 0.35 + 0.9 * rnd() * rnd());
    }
  }
  for (const [x, z] of LAMP_XZ) add(x, 8.05, z + (z < 20 ? 1.5 : -1.5), warm[1], 0.7, 2.0);   // street lamps along the avenue, none in the camera's way
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('sz', new THREE.Float32BufferAttribute(S, 1)); g.setAttribute('aer', new THREE.Float32BufferAttribute(Q, 1));
  const m = new THREE.ShaderMaterial({ uniforms: CITY_LIGHTS_U, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float sz, aer; attribute vec3 color; uniform float uPx, uD, uCoc, uFar; varying vec3 vC; varying float vDisc;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float z = -mv.z; gl_Position = projectionMatrix * mv;
        float base = clamp(sz / uD / max(z, 1e-4) * uPx, 1.35, 13.0);
        float coc = uCoc * abs(1.0 - 1.0 / max(z, 1e-3));
        float size = sqrt(base * base + 4.0 * coc * coc);
        float glim = 1.0 / (1.0 + z * uD / 2500.0);             // haze: far lights are dimmer
        float tr = sz / uD / max(z, 1e-4) * uPx, sub = clamp(tr * tr / (1.35 * 1.35), 0.015, 1.0);   // smaller than a pixel: less energy, or they make a starfield
        vDisc = smoothstep(2.0, 8.0, coc);
        float e = (base * base) / (size * size);
        vC = color * mix(sub, 1.0, vDisc) * (0.28 + 0.72 * glim) * mix(0.72, clamp(12.0 * e, 0.13, 0.5), vDisc) * uFar;
        // from the air the lights are spread evenly over the city: the extra density around the cafe and its street lamps belong to street level
        if (aer >= 0.0 && aer < 0.001) vC *= 1.0 - smoothstep(8.5, 12.0, uD); float air = smoothstep(90.0, 420.0, uD); vC *= aer < -1.5 ? 1.0 - smoothstep(110.0, 300.0, uD) : aer < 0.0 ? 1.0 - smoothstep(240.0, 620.0, uD) : mix(1.0, aer, air); if (air > 0.0) { float gy = dot(vC, vec3(0.3, 0.55, 0.15)); vC = mix(vC, gy * vec3(1.25, 0.92, 0.6), air * 0.35) * (1.0 - 0.3 * air); }
        // the towers' own lights belong to street level: from the air the night map and the buildings carry the city, and nothing floats
        if (aer >= 0.001) vC *= 1.0 - smoothstep(12.0, 60.0, uD);
        vC *= 1.0 - vDisc; if (vDisc > 0.999) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = aer >= 0.001 && uD > 60.0 ? 1.0 : min(size, 240.0); }`,
    fragmentShader: `varying vec3 vC; varying float vDisc; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
        float spot = exp(-r * r * 4.2);
        float disc = smoothstep(1.0, 0.93, r) * (0.74 + 0.26 * smoothstep(0.45, 0.95, r));
        gl_FragColor = vec4(vC * mix(spot, disc, vDisc), 1.0); }` });
  const pts = noDepth(new THREE.Points(g, m)); pts.frustumCulled = false; pts.renderOrder = 2; pts.name = 'CityLights'; universe.add(pts);
  return pts;
})();
const CITY_POINT_COUNT = CITY_POINTS.geometry.attributes.position.count;

// the generic city the cafe stands in: closed boxes around the same lights, aligned with the street grid. Facades are computed per pixel: floors, piers, recessed windows
// with a room behind the glass (interior mapping), shopfronts at street level. Not any real building.
// a building stands at its full height from the moment it is drawn: far off it is simply part of the city's light, and the camera's descent is what brings out its roof and walls
const ROW_MAT = new THREE.ShaderMaterial({ uniforms: { uFade: { value: 1 }, uEye: CITY_U.uEyeW, tMap: CITY_MAP_U, uHalf: CITY_U.uHalf },
  vertexShader: `varying vec3 vL, vV, vNl, vHalf; varying float vS, vY, vRise; varying vec2 vC0; uniform vec3 uEye;
    void main(){ vec3 i0 = instanceMatrix[0].xyz, i1 = instanceMatrix[1].xyz, i2 = instanceMatrix[2].xyz, s = vec3(length(i0), length(i1), length(i2));
      vec4 lp = instanceMatrix * vec4(position, 1.0); mat3 R = mat3(i0 / s.x, i1 / s.y, i2 / s.z);
      vRise = 1.0 - smoothstep(700.0, 2600.0, length(instanceMatrix[3].xyz - uEye));   // 1 near; 0 when it is only a few pixels
      vL = position * s; vHalf = s * 0.5; vNl = normal; vV = (lp.xyz - uEye) * R; vY = lp.y;
      vC0 = instanceMatrix[3].xz; vS = fract(instanceMatrix[3].x * 0.137 + instanceMatrix[3].z * 0.071) * 37.0; gl_Position = projectionMatrix * modelViewMatrix * lp; }`,
  fragmentShader: `varying vec3 vL, vV, vNl, vHalf; varying float vS, vY, vRise; varying vec2 vC0; uniform float uFade, uHalf; uniform sampler2D tMap;
    ${CITY_MEAN_GLSL}
    float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    float rectA(vec2 f, vec4 r, vec2 aa){ vec2 a = smoothstep(r.xy - aa, r.xy + aa, f) * smoothstep(r.zw + aa, r.zw - aa, f); return a.x * a.y; }
    vec3 roomAt(vec2 q, vec2 hw, vec3 d, float deep, vec3 tint, float seed){
      vec3 id = 1.0 / max(abs(d), vec3(1e-4));
      float tx = (hw.x - q.x * sign(d.x)) * id.x, ty = (hw.y - q.y * sign(d.y)) * id.y, tz = deep * id.z, t = max(min(min(tx, ty), tz), 0.0);
      vec3 p = vec3(q, 0.0) + d * t; vec3 c;
      if (t >= tz) { c = tint * (0.42 + 0.42 * smoothstep(-hw.y, hw.y, p.y)); float fur = step(p.y, -hw.y + 0.9) * step(0.3, n2(vec2(p.x * 0.7 + seed, 2.0))); c *= 1.0 - 0.55 * fur; }
      else if (t >= ty) { c = d.y > 0.0 ? tint * (0.62 + 0.8 * exp(-dot(p.xz - vec2(0.0, deep * 0.5), p.xz - vec2(0.0, deep * 0.5)) * 0.45)) : tint * 0.22; }
      else c = tint * (0.30 + 0.22 * (p.z / deep));
      return clamp(c, vec3(0.0), vec3(3.0));
    }
    void main(){
      if (uFade < 0.999 && h21(gl_FragCoord.xy) > uFade) discard;
      vec3 N = vNl; float s = vS, tA = h21(vec2(s, 1.7)), tB = h21(vec2(s, 5.3)), tC = h21(vec2(s, 9.1));
      // far off a building is simply part of the city's light: the same colour as the ground around it, a little brighter or darker than its neighbours
      float farL = 1.0 - smoothstep(0.0, 0.5, vRise); vec3 farC = vec3(0.0);
      if (farL > 0.0) { farC = vec3(0.0065, 0.0058, 0.0060) * (0.7 + 0.7 * tC); if (N.y < 0.5) farC *= 0.75; }
      if (farL >= 0.999) { vec2 fp = (N.y > 0.5 ? vL.xz : vec2(abs(N.z) > 0.5 ? vL.x : vL.z, vY)) / vec2(3.1, 3.5), fi = floor(fp), ff = fract(fp) - 0.5; float pxF = max(length(dFdx(fp)), length(dFdy(fp))), sl = (N.y > 0.5 ? 0.0 : 1.0) * step(0.80, h21(fi + s)) * (1.0 - smoothstep(0.16 + pxF, 0.3 + pxF, max(abs(ff.x), abs(ff.y)))) * (1.0 - smoothstep(0.4, 0.9, pxF));
        gl_FragColor = vec4(min(farC + vec3(1.0, 0.70, 0.42) * sl * (0.12 + 0.45 * h21(fi + s + 3.3)), vec3(2.0)), 1.0); return; }
      // every building has its own kind of front
      float st = h21(vec2(s, 13.7)), fhU = mix(2.95, 4.2, h21(vec2(s, 21.1)) * h21(vec2(s, 27.3)));
      bool glassy = st > 0.80 && vHalf.y > 12.0, ribbon = st < 0.20, slit = st >= 0.20 && st < 0.36, balc = st >= 0.36 && st < 0.56;
      vec3 palA = tC < 0.33 ? vec3(0.30, 0.16, 0.12) : tC < 0.66 ? vec3(0.34, 0.31, 0.27) : vec3(0.46, 0.43, 0.38);
      vec3 alb = glassy ? vec3(0.07, 0.08, 0.095) : mix(palA, vec3(0.24, 0.22, 0.20), tA * 0.7);
      float top = vY - vL.y + vHalf.y;
      if (N.y > 0.5) { float e = min(vHalf.x - abs(vL.x), vHalf.z - abs(vL.z)), par = smoothstep(0.62, 0.44, e), pxR = max(length(dFdx(vL.xz)), length(dFdy(vL.xz))), dk = smoothstep(1.6, 0.35, pxR), rk = h21(vec2(s, 31.7));
        // each roof its own: bare concrete, the green waterproof paint of the city's flat roofs, tar felt, dark membrane; stains, panel seams, plant, tanks, a stair house with a lamp
        vec3 mem = rk < 0.40 ? vec3(0.30, 0.30, 0.31) : rk < 0.72 ? vec3(0.17, 0.31, 0.25) : rk < 0.88 ? vec3(0.34, 0.29, 0.25) : vec3(0.15, 0.15, 0.17);
        mem *= 0.62 + 0.76 * n2(vL.xz * 0.14 + s) * (0.7 + 0.6 * n2(vL.xz * 0.9 + s * 3.0));
        vec2 sz = vec2(mix(3.5, 8.0, tA), mix(3.5, 8.0, tB)), sg = abs(fract(vL.xz / sz + s) - 0.5) * sz; mem *= 1.0 - 0.28 * dk * smoothstep(0.09, 0.03, min(sg.x, sg.y));
        vec2 cf = vL.xz / vec2(8.3, 7.1) + s, cid = floor(cf), cr = (fract(cf) - 0.5) * vec2(8.3, 7.1); float in0 = smoothstep(1.2, 2.2, e), on = step(0.50, h21(cid + s)) * in0, kd = h21(cid + s + 4.4);
        vec2 bh = vec2(0.8, 0.7) + vec2(h21(cid + 1.1), h21(cid + 2.2)) * vec2(1.9, 1.5);
        float aaR = max(pxR, 0.03), box = on * (1.0 - smoothstep(0.0, aaR, max(abs(cr.x) - bh.x, abs(cr.y) - bh.y))), sha = on * (1.0 - smoothstep(0.0, 0.5, max(abs(cr.x - 0.55) - bh.x, abs(cr.y - 0.75) - bh.y))), tank = on * step(kd, 0.3) * (1.0 - smoothstep(0.0, aaR, length(cr) - 1.25));
        vec3 amb = vec3(0.044, 0.047, 0.060) + vec3(0.030, 0.021, 0.014) * smoothstep(0.3, 4.0, 5.0 - e);
        vec3 c = mem * amb * (1.0 - 0.55 * sha * dk);
        c = mix(c, mix(vec3(0.42, 0.42, 0.43), vec3(0.20, 0.21, 0.24), kd) * amb * 1.35 * (0.84 + 0.3 * smoothstep(-1.0, 1.0, cr.x - cr.y)), box * dk * (1.0 - tank));
        c = mix(c, vec3(0.34, 0.36, 0.40) * amb * (0.65 + 0.55 * smoothstep(-1.2, 1.2, cr.x + cr.y)), tank * dk);
        c = mix(c, alb * vec3(0.11, 0.11, 0.125), par);
        vec2 rid = floor(vL.xz / 6.0); vec2 rf0 = abs(fract(vL.xz / 6.0) - 0.5) * 6.0; float rl = step(0.985, h21(rid + s)) * smoothstep(0.42, 0.28, max(rf0.x, rf0.y)) * in0;
        c += vec3(1.0, 0.76, 0.48) * rl * 0.42 + vec3(0.0052, 0.0048, 0.0050);
        gl_FragColor = vec4(mix(c, farC, farL), 1.0); return; }
      bool zF = abs(N.z) > 0.5;
      float a = zF ? vL.x : vL.z, W = zF ? vHalf.x : vHalf.z, Y = vY, vin = max(-dot(vV, N), 1e-3), va = zF ? vV.x : vV.z, vLen = max(length(vV), 1e-3);
      vec3 ray = vec3(clamp(vec2(va, vV.y) / max(vin, vLen * 0.04), vec2(-25.0), vec2(25.0)), 1.0);
      float px = max(max(length(vec2(dFdx(a), dFdy(a))), length(vec2(dFdx(Y), dFdy(Y)))), 1e-4);
      float up = exp(-Y / 7.0), face = zF ? (N.z > 0.0 ? 1.0 : 0.7) : 0.55;
      vec3 light = (vec3(0.020, 0.024, 0.036) + vec3(1.0, 0.63, 0.34) * (0.30 * up + 0.007)) * face;
      float grime = 0.82 + 0.34 * n2(vec2(a * 0.35 + s * 7.0, Y * 0.11));
      vec3 wall = alb * light * grime;
      const float GF = 3.0;
      bool isGF = Y < GF;
      float bw = isGF ? mix(4.6, 6.8, tB) : (glassy ? mix(1.5, 2.4, tC) : ribbon ? mix(1.7, 2.4, tC) : slit ? mix(1.3, 1.9, tC) : balc ? mix(3.8, 5.4, tC) : mix(2.5, 3.6, tC));
      float nB = max(1.0, floor(2.0 * W / bw + 0.5)), BW = 2.0 * W / nB, ax = (a + W) / BW, idx = floor(ax), fx = ax - idx;
      float fh = isGF ? GF : fhU, fyy = isGF ? Y / GF : (Y - GF) / fh, idy = floor(fyy), fy = fyy - idy;
      vec2 aa = px * 0.7 / vec2(BW, fh);
      float mx = isGF ? 0.06 : (glassy ? 0.05 : ribbon ? 0.012 : slit ? 0.30 : balc ? 0.07 : mix(0.15, 0.24, tA)), y0 = isGF ? 0.03 : (glassy ? 0.05 : ribbon ? 0.34 : slit ? 0.08 : balc ? 0.10 : 0.23), y1 = isGF ? 0.74 : (glassy ? 0.93 : ribbon ? 0.80 : slit ? 0.92 : balc ? 0.88 : 0.82), dep = isGF ? 0.14 : (glassy ? 0.05 : balc ? 0.5 : 0.24);
      vec4 R = vec4(mx, y0, 1.0 - mx, y1);
      float op = rectA(vec2(fx, fy), R, aa);
      vec2 f2 = vec2(fx, fy) + ray.xy * dep / vec2(BW, fh);
      float inG = rectA(f2, R, aa);
      // about half the buildings have blank side walls with a window here and there: not every face is a grid of windows
      bool party = !zF && !isGF && h21(vec2(s, 41.1)) < 0.55; float keepW = party ? step(0.88, h21(vec2(idx + s, floor(idy * 0.5)))) : 1.0; op *= keepW; inG *= keepW;
      // piers every few bays, a slab edge at each floor with its shadow under it, a cornice at the top, a darker fascia over the shops
      float pierEvery = isGF ? 1.0 : 3.0;
      float pier = glassy ? 0.0 : (1.0 - step(0.5, mod(idx, pierEvery))) * (smoothstep(0.13, 0.09, fx)) + smoothstep(0.42, 0.30, W - abs(a));
      float slab = isGF ? 0.0 : smoothstep(0.075, 0.055, fy), shade = isGF ? 0.0 : smoothstep(0.075, 0.09, fy) * smoothstep(0.125, 0.09, fy);
      wall *= (1.0 + (ribbon ? 0.08 : 0.2) * clamp(pier, 0.0, 1.0)) * (1.0 + (ribbon ? 0.45 : 0.22) * slab) * (1.0 - 0.32 * shade);
      // the wall takes the sky's glow near the top and the street's near the foot; towers carry a line of light at the crown or up a corner
      wall *= 0.86 + 0.34 * smoothstep(top * 0.35, top, Y);
      if (top > 26.0) { float cw = h21(vec2(s, 51.3)), cc0 = h21(vec2(s, 53.9)); vec3 cl = cc0 < 0.55 ? vec3(1.0, 0.78, 0.50) : cc0 < 0.85 ? vec3(0.76, 0.88, 1.0) : vec3(0.42, 1.0, 0.8); if (cw < 0.30) wall += cl * 0.85 * smoothstep(top - 1.25, top - 1.05, Y) * smoothstep(top - 0.62, top - 0.8, Y); else if (cw < 0.42) wall += cl * 0.55 * smoothstep(0.26, 0.13, W - abs(a)) * smoothstep(top * 0.25, top * 0.7, Y); }
      float crn = smoothstep(top - 0.55, top - 0.5, Y); wall *= 1.0 + 0.6 * crn; wall *= 1.0 - 0.5 * smoothstep(top - 0.55, top - 0.62, Y) * smoothstep(top - 0.72, top - 0.62, Y);
      // over each shop: a band of awning, then a blank sign board with no lettering
      vec3 shopTint = vec3(0.0); float shopSign = 0.0, shopAwn = 0.0;
      if (isGF) { float hs = h21(vec2(idx + 0.5, s + 9.0)); shopSign = smoothstep(0.86, 0.865, fy) * smoothstep(0.985, 0.98, fy) * smoothstep(0.05, 0.07, fx) * smoothstep(0.95, 0.93, fx); shopAwn = smoothstep(0.745, 0.75, fy) * smoothstep(0.86, 0.855, fy) * step(0.3, hs);
        vec3 awn = hs < 0.5 ? vec3(0.20, 0.05, 0.04) : hs < 0.75 ? vec3(0.05, 0.14, 0.09) : vec3(0.28, 0.24, 0.17); awn *= 0.7 + 0.3 * step(0.5, fract(a / 0.7));
        wall = mix(wall, awn * light * 2.6, shopAwn);
        // the board above each shop: a dark panel washed by a line of light along its lower edge, each shop its own colour. No lettering
        float hc = fract(hs * 7.3); vec3 sc = hc < 0.42 ? vec3(1.0, 0.82, 0.58) : hc < 0.60 ? vec3(0.72, 0.88, 1.0) : hc < 0.74 ? vec3(1.0, 0.36, 0.26) : hc < 0.88 ? vec3(0.42, 1.0, 0.72) : vec3(1.0, 0.56, 0.20);
        float wash = exp(-(fy - 0.87) * 26.0); wall = mix(wall, vec3(0.014, 0.014, 0.016) + sc * 0.44 * wash, shopSign); wall += sc * 1.5 * smoothstep(0.012, 0.004, abs(fy - 0.868)) * smoothstep(0.05, 0.07, fx) * smoothstep(0.95, 0.93, fx); }
      if (Y > GF - 0.02 && Y < GF + 0.09) wall *= 1.5;
      // what shows in the window
      vec2 cid = vec2(idx + floor(s * 3.0) * 13.0, idy + (isGF ? 40.0 : 0.0));
      // what is lit comes in clusters, by floors and by columns, never an even salt and pepper
      float litF = isGF ? 0.86 : (glassy ? step(0.62, h21(vec2(idy, s * 2.1))) * 0.8 + 0.05 : mix(0.10, 0.44, tC) * (0.25 + 1.5 * n2(vec2(idx * 0.42 + s * 5.0, idy * 0.66 + s * 3.0))));
      float lit = step(1.0 - litF, h21(cid + vec2(s * 3.1, 0.0)));
      float lev = (isGF ? 1.5 : 0.22) + (isGF ? 1.4 : 0.8) * pow(h21(cid + 7.7 + s), 2.0), tk = h21(cid + 3.3 + s);
      vec3 tint = (tk < 0.52 ? vec3(1.0, 0.68, 0.38) : tk < 0.82 ? vec3(1.0, 0.84, 0.62) : tk < 0.96 ? vec3(0.84, 0.92, 1.0) : vec3(0.52, 0.66, 1.0)) * lev;
      vec2 q = (f2 - 0.5) * vec2(BW, fh), hw = vec2(BW, fh) * 0.5;
      vec3 inner = lit > 0.5 ? roomAt(q, hw, ray, isGF ? 6.0 : 4.0, tint, s + idx) : roomAt(q, hw, ray, 4.0, vec3(0.012, 0.012, 0.015), s + idx);
      // a shop's window: goods on shelves against the light, or a closed shutter with its ribs
      if (isGF) { if (lit > 0.5) { float sv = fract(f2.y * 4.0), su = f2.x * BW * 3.6 + h21(cid + 8.8) * 9.0, cv = h21(vec2(floor(su), floor(f2.y * 4.0)) + s); vec3 gd = mix(vec3(0.72, 0.62, 0.50), cv < 0.3 ? vec3(0.46, 0.55, 0.8) : cv < 0.55 ? vec3(0.8, 0.42, 0.34) : vec3(0.5, 0.7, 0.52), 0.32) * (0.22 + 0.68 * cv);
          float shelf = smoothstep(0.34, 0.40, sv) * smoothstep(0.96, 0.9, sv), gap = smoothstep(0.08, 0.18, fract(su)) * smoothstep(1.0, 0.92, fract(su)); inner *= mix(vec3(0.8), 0.30 + 0.9 * gd, shelf * gap * step(f2.y, 0.74) * smoothstep(0.14, 0.2, f2.y)); inner += tint * 0.42 * exp(-max(0.74 - f2.y, 0.0) * 12.0); }
        else inner = vec3(0.022, 0.022, 0.025) * (0.55 + 0.45 * smoothstep(0.25, 0.5, fract(f2.y * 26.0))) * (0.8 + 2.4 * up); }      float bl = h21(cid + 2.3 + s), blindY = mix(0.86, 0.34, h21(cid + 4.4 + s));
      if (!isGF && bl > 0.42) { float bm = smoothstep(blindY - 0.01, blindY + 0.01, f2.y); float slats = 0.82 + 0.18 * sin(fract(f2.y) * fh * 62.0) * smoothstep(0.05, 0.015, px); inner = mix(inner, (lit > 0.5 ? tint * 0.34 : vec3(0.014, 0.014, 0.016)) * slats, bm); }
      float fb0 = clamp(1.0 - vin / vLen, 0.0, 1.0), F = 0.05 + 0.65 * fb0 * fb0 * fb0;
      vec3 refl = vec3(0.030, 0.038, 0.058) * (0.55 + 0.9 * n2(vec2(a * 0.09 + s, Y * 0.04))) + vec3(1.0, 0.65, 0.36) * 0.05 * up;
      vec3 glass = mix(inner, refl, F);
      float mull = isGF ? smoothstep(0.012, 0.006, abs(fract(f2.x * 2.0 + 0.5) - 0.5) / 2.0 - 0.0) : smoothstep(0.012 + aa.x, 0.012, abs(f2.x - 0.5)) ;
      if (isGF) mull = smoothstep(0.012 + aa.x, 0.012, abs(f2.x - 0.5));
      float rim = 1.0 - rectA(f2, vec4(R.x + 0.018, R.y + 0.018, R.z - 0.018, R.w - 0.018), aa);
      glass = mix(glass, vec3(0.012, 0.012, 0.014), clamp(mull + rim, 0.0, 1.0) * 0.85);
      vec3 reveal = alb * light * 0.42 + (lit > 0.5 ? tint * 0.05 : vec3(0.0));
      vec3 c = mix(mix(wall, reveal, op), glass, op * inG);
      // a shop's door: a narrow glazed leaf in some bays, its frame and a pull. Balconies: a rail across the lower part of the opening
      if (isGF && h21(vec2(idx + 0.5, s + 2.0)) < 0.55) { float dw = 0.25, dc = 0.16 + 0.68 * h21(vec2(idx + 0.5, s + 4.0)), dd = abs(fx - dc), fr = smoothstep(dw * 0.5 + 0.01, dw * 0.5, dd) * step(fy, 0.74); float inn = smoothstep(dw * 0.5 - 0.022, dw * 0.5 - 0.03, dd) * smoothstep(0.03, 0.05, fy) * smoothstep(0.72, 0.70, fy);
        c = mix(c, vec3(0.008, 0.008, 0.009) + reveal * 0.3, fr); c = mix(c, glass * 0.75 + vec3(0.02, 0.015, 0.01) * lit, inn); c += vec3(1.0, 0.8, 0.5) * 0.10 * smoothstep(0.012, 0.004, abs(fx - dc - dw * 0.28)) * smoothstep(0.26, 0.30, fy) * smoothstep(0.48, 0.44, fy); }
      if (balc && !isGF) { float rl = smoothstep(y0 + 0.30, y0 + 0.29, fy) * op, rt = smoothstep(0.012, 0.004, abs(fy - y0 - 0.30)) * op; c = mix(c, alb * light * 0.55, rl * 0.86); c = mix(c, alb * light * 1.5, rt); }
      // far away: the average of all that, so distance does not shimmer
      float k = smoothstep(0.62, 0.26, px * 2.0 / min(BW, fh));
      float gfrac = (1.0 - 2.0 * mx) * (y1 - y0);
      // far: small separate lights on a dark wall, each smaller than its bay, so a front never turns into a wall of pixels
      vec2 pW = vec2(a + W, Y) / vec2(BW, fh), pC = floor(pW), pf = fract(pW) - 0.5; float pH = h21(pC + s), pR = max(0.34, px * 0.8 / min(BW, fh)), patchLit = step(1.0 - litF * 0.75, pH) * (0.35 + 0.8 * h21(pC + s + 3.3)) * (1.0 - smoothstep(pR * 0.6, pR, max(abs(pf.x), abs(pf.y)))) * min(1.0, 0.116 / (pR * pR));
      vec3 cFar = wall * vec3(1.0, 0.9, 0.75) * (1.0 - gfrac) + gfrac * vec3(0.009, 0.0085, 0.0085) + vec3(1.0, 0.70, 0.40) * patchLit * (isGF ? 0.5 : 0.30) * mix(gfrac, 1.0, 0.25);
      if (isGF) cFar = mix(cFar, wall * 0.6 + (lit > 0.5 ? tint * 0.42 : vec3(0.02)), rectA(vec2(fx, fy), vec4(0.05, 0.05, 0.95, 0.74), aa)) + (shopSign > 0.5 ? vec3(0.03) : vec3(0.0));
      vec3 oc = mix(mix(cFar, c, k), farC + cFar * 0.5, farL); if (!(oc.r + oc.g + oc.b < 12.0)) oc = wall; gl_FragColor = vec4(clamp(oc, vec3(0.0), vec3(3.0)), 1.0);
    }` });
// the cafe's own shopfront and the buildings' soft feet on the pavement live in their own group: the row of buildings switches off on the approach once it has left the frame, these stay until the eye is through the window (they hold no lights back)
const CAFE_FRONT = new THREE.Group(); CAFE_FRONT.name = 'CafeFront'; universe.add(CAFE_FRONT);
const ROW_BUILDINGS = (() => {
  const rnd = mulberry32(44), list = [];
  for (let side of [-1, 1]) { let x = 3.85; for (let i = 0; i < 9; i++) { const w = 9 + rnd() * 12, h = 11 + rnd() * 28, d = 14 + rnd() * 10; list.push([side * (x + w / 2), h / 2, 2.6 - d / 2, w, h, d, 0, 1]); x += w + 0.02; } }
  list.push([0, 3.0 + 4.5, (2.65 - 3.85) / 2, 7.7, 9, 6.5, 0, 0]);   // the floors above the cafe
  { const rf = mulberry32(77), n0 = list.length; for (let k = 0; k < n0; k++) { const [x, y, z, w, h, d] = list[k]; if (y > h / 2 + 0.01) continue; const t = rf(); if (t < 0.45) { const u = 0.5 + rf() * 0.28, b = rf() < 0.5 ? 0 : 1; list.push([x, h + 1.4, z - d * 0.1, w * u, 2.8, d * 0.5, 0, 0]); } else if (t < 0.8) list.push([x + (rf() - 0.5) * w * 0.3, h + 1.1, z - d * 0.2, w * 0.3, 2.2, d * 0.3, 0, 0]); } }
  // blocks of ordinary buildings on the street grid around the cafe: this is what makes it a city and not a row of boxes on a dark plain
  const rb = mulberry32(55), rj = mulberry32(909);
  const hsh = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const vn = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z); let fx = x - ix, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz); const A = hsh(ix, iz), B = hsh(ix + 1, iz), C = hsh(ix, iz + 1), D = hsh(ix + 1, iz + 1); return A + (B - A) * fx + (C - A) * fz + (A - B - C + D) * fx * fz; };
  const listFar = [], rt = mulberry32(3131);
  for (let ix = -42; ix <= 42; ix++) for (let iz = -50; iz <= 14; iz++) {
    const bx = ix * 135, bz = -36 + iz * 118, nx = 2 + Math.floor(rb() * 3), nz = 2, lw = 117 / nx, ld = 100 / nz;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      const empty = rb(), hr = rb(), ww = rb(), dd = rb(), r0 = Math.hypot(bx, bz);
      let x = bx - 58.5 + (a + 0.5) * lw, z = bz - 50 + (b + 0.5) * ld, w = lw - 2 - ww * 5, d = ld - 2 - dd * 8;
      const ba = 0, hk = 1;
      if (empty < 0.07 || !CN.inD(CN.center, bx, bz)) continue;
      // the avenue and the cafe's own block stay clear; the far side of the avenue is built up, low enough for the camera's way down
      if (Math.abs(x) < 3200 && Math.abs(ba) < 2 && z + d / 2 > -2 && z - d / 2 < 47) { const back = z + d / 2; if (back < 62) continue; if (Math.abs(ba) > 0.05) continue; d = back - 47.5; z = 47.5 + d / 2; }
      if (Math.abs(x) < 200 && z > -30 && z < 47) continue;
      if (hanDist(x, z) < 620) continue;
      const hb = (9 + Math.pow(hr, 2.3) * (r0 < 900 ? 58 : 36)) * hk, h = clearH(x, z, hb);
      if (h < 7) continue;
      const to = r0 > 2500 ? listFar : list;
      if (r0 > 2500) { to.push([x, h / 2, z, w, h, d, ba, 1]); continue; }
      // the form of a building: a plain block, a podium with a tower set back on it, two wings of different height, plant on the roof
      const t = rt(), cs = Math.cos(ba), sn = Math.sin(ba), out = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
      if (t < 0.28 && h > 16) { const hp = h * (0.35 + 0.3 * rt()), u = 0.58 + 0.24 * rt(), [ox, oz] = out((rt() - 0.5) * w * (1 - u), (rt() - 0.5) * d * (1 - u)); to.push([x, hp / 2, z, w, hp, d, ba, 1]); to.push([ox, hp + (h - hp) / 2, oz, w * u, h - hp, d * u, ba, 0]); }
      else if (t < 0.46 && h > 12) { const hw = h * (0.5 + 0.3 * rt()), [a1, c1] = out(-w * 0.27, 0), [a2, c2] = out(w * 0.23, 0); to.push([a1, h / 2, c1, w * 0.46, h, d, ba, 1]); to.push([a2, hw / 2, c2, w * 0.54, hw, d, ba, 1]); }
      else to.push([x, h / 2, z, w, h, d, ba, 1]);
      if (rt() < 0.55 && h > 12) { const hm = 1.8 + rt() * 2.4, [ox, oz] = out((rt() - 0.5) * w * 0.4, (rt() - 0.5) * d * 0.4); if (clearH(ox, oz, h + hm) >= h + hm) to.push([ox, h + hm / 2, oz, w * (0.18 + 0.2 * rt()), hm, d * (0.18 + 0.2 * rt()), ba, 0]); }
    }
  }
  // every other district within reach: buildings on the very blocks of the night map, so its streets stay open between them. Each kind of district has its own kind of building
  { const line = (d, fam, k) => (k + (d.center ? 0 : (cnH(k + d.id * 3, fam + 11) - 0.5) * 0.3)) * (fam ? d.a : d.b), { ss } = CN;
    for (const d of CN.D) { const rd = Math.hypot(d.x, d.z); if (d.center || rd > 7500 + 2.2 * CN_S) continue;
      const rl = mulberry32(d.id * 977 + 3), ex = d.c, ez = d.s, nx = -d.s, nz = d.c, ba = -d.th, cs = [[d.x0, d.z0], [d.x1, d.z0], [d.x0, d.z1], [d.x1, d.z1]].map(([x, z]) => [(x - d.ox) * ex + (z - d.oz) * ez, (x - d.ox) * nx + (z - d.oz) * nz]), i0 = Math.floor(Math.min(...cs.map(c => c[0])) / d.a), i1 = Math.ceil(Math.max(...cs.map(c => c[0])) / d.a), j0 = Math.floor(Math.min(...cs.map(c => c[1])) / d.b), j1 = Math.ceil(Math.max(...cs.map(c => c[1])) / d.b);
      const put = (u, v, w, h, dp, y0 = 0, foot = 1) => { const x = d.ox + u * ex + v * nx, z = d.oz + u * ez + v * nz, r0 = Math.hypot(x, z), hh = y0 ? h : clearH(x, z, h); if (hh < (y0 ? 1.5 : 6)) return; if (y0 && clearH(x, z, y0 + h) < y0 + h) return; (r0 < 1900 ? list : listFar).push([x, y0 + hh / 2, z, w, hh, dp, ba, foot]); };
      for (let bi = i0; bi < i1; bi++) for (let bj = j0; bj < j1; bj++) {
        const U0 = line(d, 1, bi), U1 = line(d, 1, bi + 1), V0 = line(d, 0, bj), V1 = line(d, 0, bj + 1), cu = (U0 + U1) / 2, cv = (V0 + V1) / 2, x = d.ox + cu * ex + cv * nx, z = d.oz + cu * ez + cv * nz, r0 = Math.hypot(x, z), q0 = rl(), q1 = rl(), q2 = rl(), q3 = rl(), q4 = rl();
        if (!CN.inD(d, x, z) || r0 > 7500 || (r0 > 4600 && q0 < ss(4600, 7500, r0)) || CN.dk(x, z) > 0.36 || CN.riv(x, z) < 110) continue;
        const bw = U1 - U0 - 15, bd = V1 - V0 - 15; if (bw < 14 || bd < 14) continue; if (Math.abs(x) < 7000 && Math.abs(z - 23) < Math.hypot(bw, bd) / 2 + 34) continue;
        if (d.kind === 0) { const n = 1 + (q1 * 2.6 | 0), cw = bw / n; for (let i = 0; i < n; i++) { const ra = rl(), rb = rl(), rc = rl(), w = cw * (0.72 + 0.24 * ra), dp = bd * (0.6 + 0.36 * rb), u = U0 + 7.5 + cw * (i + 0.5), v = cv + (rb - 0.5) * (bd - dp) * 0.8, h = (16 + Math.pow(rc, 2.0) * (46 + 110 * d.core)); if (h > 30 && ra < 0.45) { const hp = 10 + rb * 8; put(u, v, w, hp, dp); put(u, v, w * 0.62, h - hp, dp * 0.62, hp, 0); } else put(u, v, w, h, dp); } }
        else if (d.kind === 1) { const nu = Math.max(1, Math.round(bw / (18 + q1 * 14))), nv = Math.max(1, Math.round(bd / (18 + q2 * 14))), cw = bw / nu, cd = bd / nv; for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const ra = rl(), rb = rl(), rc = rl(); if (ra < 0.08 || (nu > 2 && nv > 2 && i > 0 && i < nu - 1 && j > 0 && j < nv - 1 && rb < 0.6)) continue; put(U0 + 7.5 + cw * (i + 0.5), V0 + 7.5 + cd * (j + 0.5), cw * (0.74 + 0.2 * rb), 7 + rc * rc * 16 + (rc > 0.94 ? 16 : 0), cd * (0.74 + 0.2 * ra)); } }
        else if (d.kind === 2) { const n = Math.max(1, Math.floor(bd / 34)), cd = bd / n, h0 = 30 + q1 * 42; for (let j = 0; j < n; j++) { const ra = rl(), rb = rl(); put(cu + (ra - 0.5) * bw * 0.1, V0 + 7.5 + cd * (j + 0.5), bw * (0.62 + 0.3 * rb), h0 * (0.92 + 0.16 * ra), 13 + ra * 3); } }
        else if (d.kind === 3) { const w = bw * (0.5 + 0.4 * q1), dp = bd * (0.5 + 0.4 * q2); put(cu, cv, w, 8 + q3 * 7, dp); if (q4 < 0.3) put(U0 + 7.5 + bw * 0.14, V0 + 7.5 + bd * 0.8, 7 + q1 * 8, 16 + q2 * 18, 7 + q1 * 8); }
        else if (q1 < 0.08) put(cu, cv, Math.min(bw, 30), 6 + q3 * 7, Math.min(bd, 24));
      } } }
  const Q = new THREE.Quaternion(), YAX = new THREE.Vector3(0, 1, 0), Pz = new THREE.Vector3(), Sz = new THREE.Vector3(), M = new THREE.Matrix4();
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), ROW_MAT, list.length);
  list.forEach(([x, y, z, w, h, d, a], i) => { M.compose(Pz.set(x, y, z), Q.setFromAxisAngle(YAX, a), Sz.set(w, h, d)); m.setMatrixAt(i, M); });
  m.frustumCulled = false; m.name = 'StreetRow'; universe.add(m);
  // the wider city in its own mesh, a child of the row so it shares its visibility. It is seen only from high above: the camera's way down never comes near it
  { const fm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), ROW_MAT, listFar.length); listFar.forEach(([x, y, z, w, h, d, a], i) => { M.compose(Pz.set(x, y, z), Q.setFromAxisAngle(YAX, a), Sz.set(w, h, d)); fm.setMatrixAt(i, M); }); fm.frustumCulled = false; fm.userData.passable = true; fm.name = 'CityBlocksFar'; m.add(fm); }
  // at every foot: a soft contact shadow and the pool of street light around it, so nothing floats. Children of the row, so they share its visibility
  const feet = list.filter(b => b[7] === 1 && Math.hypot(b[0], b[2]) < 1900);
  const gm = new THREE.ShaderMaterial({ uniforms: { uFade: ROW_MAT.uniforms.uFade, uEye: CITY_U.uEyeW }, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    vertexShader: `varying vec2 vQ, vH; varying float vR, vRise; uniform vec3 uEye; const float MG = 11.0; void main(){ vRise = 1.0 - smoothstep(240.0, 720.0, length(instanceMatrix[3].xyz - uEye)); if (vRise <= 0.0) { vQ = vH = vec2(0.0); vR = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; } vec3 i0 = instanceMatrix[0].xyz, i2 = instanceMatrix[2].xyz; vec2 s = vec2(length(i0), length(i2)); vQ = position.xz * (s + 2.0 * MG); vH = s * 0.5;
      vR = fract(instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.17);
      vec3 w = instanceMatrix[3].xyz + i0 / s.x * vQ.x + i2 / s.y * vQ.y; w.y = 0.02; gl_Position = projectionMatrix * modelViewMatrix * vec4(w, 1.0); }`,
    fragmentShader: `varying vec2 vQ, vH; varying float vR, vRise; uniform float uFade; void main(){ if (vRise <= 0.0) discard; float d = length(max(abs(vQ) - vH, 0.0));
      float a = 0.86 * exp(-d / 2.2) * smoothstep(11.0, 5.0, d); vec3 g = vec3(1.0, 0.62, 0.32) * (0.018 + 0.032 * vR) * exp(-d / 5.5) * smoothstep(11.0, 6.0, d);
      gl_FragColor = vec4(g * uFade * vRise, a * uFade * vRise); }` });
  const pg = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), gi = new THREE.InstancedMesh(pg, gm, feet.length);
  feet.forEach(([x, y, z, w, h, d, a], i) => { M.compose(Pz.set(x, y, z), Q.setFromAxisAngle(YAX, a), Sz.set(w, 1, d)); gi.setMatrixAt(i, M); });
  gi.frustumCulled = false; gi.renderOrder = 1.5; gi.userData.passable = true; gi.name = 'BuildingFeet'; CAFE_FRONT.add(noDepth(gi));
  // the cafe's own shopfront, modelled: piers either side of the glass, frame, sill, fascia with no lettering, a shallow canopy with a line of light. Same proportions as the shops along the street
  const stone = new THREE.MeshStandardMaterial({ color: 0x4a423a, roughness: 0.82, envMapIntensity: 0.3 }), iron = new THREE.MeshStandardMaterial({ color: 0x101113, metalness: 0.6, roughness: 0.5, envMapIntensity: 0.4 }), strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 1.95, 1.1) });
  const fb = (w, h, d, mat, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); CAFE_FRONT.add(b); return b; };
  for (const sx of [-1, 1]) { fb(0.76, 3.0, 0.22, stone, sx * 3.47, 1.5, 2.76); fb(0.075, 2.3, 0.1, iron, sx * 3.05, 1.6, 2.69); fb(0.42, 0.14, 0.3, stone, sx * 3.47, 0.07, 2.8); }
  fb(7.7, 0.40, 0.25, iron, 0, 2.97, 2.775); fb(7.7, 0.004, 0.25, new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 1, envMapIntensity: 0 }), 0, 2.768, 2.775); /* the fascia's underside is matte: iron at a grazing angle, under a pixel wide, broke into bright dashes as the eye passed its height */ fb(7.9, 0.07, 0.34, stone, 0, 3.2, 2.82); fb(6.2, 0.075, 0.1, iron, 0, 2.735, 2.69); fb(6.2, 0.004, 0.1, new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 1, envMapIntensity: 0 }), 0, 2.6955, 2.69);
  fb(6.2, 0.07, 0.2, stone, 0, 0.42, 2.74); fb(6.2, 0.40, 0.05, new THREE.MeshStandardMaterial({ color: 0x1a1817, roughness: 0.6, envMapIntensity: 0.3 }), 0, 0.2, 2.675);
  fb(7.9, 0.05, 0.42, iron, 0, 3.27, 3.0); fb(6.8, 0.016, 0.02, strip, 0, 3.24, 3.14);   // a slim cornice over the sign, with its line of light
  // a blank sign board: no lettering, no mark
  { const signM = new THREE.MeshStandardMaterial({ color: 0x161a18, roughness: 0.7, envMapIntensity: 0.12, emissive: new THREE.Color(0.006, 0.0075, 0.006) }); fb(5.4, 0.30, 0.03, signM, 0, 2.985, 2.915); fb(5.48, 0.02, 0.04, iron, 0, 3.145, 2.915); fb(5.48, 0.02, 0.04, iron, 0, 2.825, 2.915); }
  // the door, in the right-hand bay: a glazed leaf in a dark frame with a kick plate and a long brass pull, on a stone step. The camera's way in is well to its left
  { const brass = new THREE.MeshStandardMaterial({ color: 0xa67c3a, metalness: 0.75, roughness: 0.38, envMapIntensity: 0.6, emissive: new THREE.Color(0.10, 0.065, 0.025) }), kick = new THREE.MeshStandardMaterial({ color: 0x2a2622, metalness: 0.5, roughness: 0.5, envMapIntensity: 0.4 });
    const X0 = 2.4, W0 = 0.98, Z0 = 2.80; fb(0.07, 2.22, 0.06, iron, X0 - W0 / 2, 1.11, Z0); fb(0.07, 2.22, 0.06, iron, X0 + W0 / 2, 1.11, Z0); fb(W0 + 0.07, 0.08, 0.06, iron, X0, 2.2, Z0); fb(W0, 0.44, 0.04, kick, X0, 0.27, Z0); fb(W0, 0.05, 0.06, iron, X0, 0.5, Z0);
    fb(0.024, 0.74, 0.024, brass, X0 - W0 / 2 + 0.13, 1.16, Z0 + 0.075); for (const y of [0.86, 1.46]) fb(0.016, 0.016, 0.06, brass, X0 - W0 / 2 + 0.13, y, Z0 + 0.045);
    fb(1.25, 0.05, 0.36, stone, X0, 0.025, 2.98); }
  // the awning: striped cloth on a slope over the window, a scalloped hem, dark frame. Plain stripes only
  { const NS = 18, W = 5.76, y0 = 2.76, z0 = 2.90, y1 = 2.47, z1 = 3.72, len = Math.hypot(y0 - y1, z1 - z0), ang = Math.atan2(y0 - y1, z1 - z0), mats = [new THREE.MeshStandardMaterial({ color: 0x25463a, roughness: 0.92, envMapIntensity: 0.15, emissive: new THREE.Color(0.012, 0.022, 0.017) }), new THREE.MeshStandardMaterial({ color: 0x9c9078, roughness: 0.92, envMapIntensity: 0.15, emissive: new THREE.Color(0.05, 0.045, 0.035) })];
    for (let i = 0; i < NS; i++) { const sw = W / NS, x = -W / 2 + (i + 0.5) * sw, mt = mats[i % 2], c = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.012, len), mt); c.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2); c.rotation.x = ang; CAFE_FRONT.add(c); const h = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.98, 0.13, 0.01), mt); h.position.set(x, y1 - 0.065, z1 + 0.002); CAFE_FRONT.add(h); }
    for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, len), iron); arm.position.set(sx * W / 2, (y0 + y1) / 2 - 0.016, (z0 + z1) / 2); arm.rotation.x = ang; CAFE_FRONT.add(arm); } }
  // lamp posts along the kerbs: a slim pole, an arm over the road, a head with its light. So a lamp stands on the pavement instead of hanging as a glowing dot over the asphalt
  { const NL = LAMP_XZ.length, poleG = new THREE.CylinderGeometry(0.055, 0.085, 8.1, 7), armG = new THREE.BoxGeometry(0.05, 0.05, 1.6), headG = new THREE.BoxGeometry(0.16, 0.05, 0.42), poleM = new THREE.MeshStandardMaterial({ color: 0x24262a, metalness: 0.6, roughness: 0.55, envMapIntensity: 0.4 }), headM = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 3.0, 1.9) });
    const mk = (g, mat, f) => { const o = new THREE.InstancedMesh(g, mat, NL); LAMP_XZ.forEach(([x, z], i) => { const [px, py, pz] = f(x, z); M.compose(Pz.set(px, py, pz), Q.identity(), Sz.set(1, 1, 1)); o.setMatrixAt(i, M); }); o.frustumCulled = false; o.userData.passable = true; o.name = 'LampPosts'; CAFE_FRONT.add(o); return o; };
    mk(poleG, poleM, (x, z) => [x, 4.05, z]); mk(armG, poleM, (x, z) => [x, 8.1, z + (z < 20 ? 0.75 : -0.75)]); mk(headG, headM, (x, z) => [x, 8.07, z + (z < 20 ? 1.5 : -1.5)]); }
  return m;
})();
// cars: dark bodies with head and tail lamps, moving by the film's time, on the avenue; from the air their lights run along the long roads and the avenue
const TRAFFIC_U = { uT: { value: 0 }, uPx: CITY_LIGHTS_U.uPx, uD: CITY_LIGHTS_U.uD, uAir: { value: 0 } };
const TRAFFIC = (() => {
  const rnd = mulberry32(6060), LX = 640, lanes = [10.8, 15.7, 20.6, 25.6, 30.5, 35.4], cars = [];
  lanes.forEach((z, li) => { const dir = li < 3 ? -1 : 1, n = 9; for (let i = 0; i < n; i++) cars.push([(i + 0.15 + rnd() * 0.7) / n * 2 * LX - LX, dir * (9.5 + rnd() * 4.5 + li * 0.3), z, rnd()]); });
  const N = cars.length, attr = new THREE.InstancedBufferAttribute(new Float32Array(cars.flat()), 4);
  const VS = `attribute vec4 aCar; uniform float uT, uD; varying vec3 vL, vNl; varying float vDir, vSeed, vLow; const float LX = ${LX.toFixed(1)};
    vec3 carPos(){ float x = mod(aCar.x + aCar.y * uT + LX, 2.0 * LX) - LX; return vec3(x, 0.0, aCar.z); }
    void main(){ vec3 c = carPos(); vDir = sign(aCar.y); vSeed = aCar.w; vec3 s = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz)); vLow = s.y > 0.6 ? 1.0 : 0.0; vec3 lp = position * s + (vLow > 0.5 ? vec3(0.0, 0.56, 0.0) : vec3(-0.2 * vDir, 1.17, 0.0)); vL = position; vNl = normal; float ew = smoothstep(0.0, 25.0, LX - abs(c.x)); gl_Position = uD < 9.0 || uD > 2600.0 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * modelViewMatrix * vec4(c + lp * ew, 1.0); }`;
  const m = new THREE.ShaderMaterial({ uniforms: TRAFFIC_U, vertexShader: VS, fragmentShader: `varying vec3 vL, vNl; varying float vDir, vSeed, vLow; void main(){ vec3 pa = vSeed < 0.35 ? vec3(0.015) : vSeed < 0.6 ? vec3(0.34) : vSeed < 0.8 ? vec3(0.05, 0.07, 0.12) : vec3(0.16, 0.03, 0.03);
      vec3 c = pa * (vNl.y > 0.5 ? vec3(0.13, 0.13, 0.16) : vec3(0.05, 0.05, 0.065)) + vec3(0.002);
      if (vLow > 0.5 && abs(vNl.x) > 0.5) { float lampM = smoothstep(0.13, 0.10, abs(abs(vL.z) - 0.36)) * smoothstep(0.12, 0.08, abs(vL.y - 0.12)); bool front = vNl.x * vDir > 0.0; c = mix(c, front ? vec3(6.0, 5.0, 3.6) : vec3(2.2, 0.16, 0.09), lampM); } if (vLow < 0.5 && abs(vNl.y) < 0.5) c = vec3(0.006, 0.007, 0.010);
      gl_FragColor = vec4(c, 1.0); }` });
  const add = (w, h, d, x, y) => { const o = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m, N), M = new THREE.Matrix4(); for (let i = 0; i < N; i++) { M.makeScale(w, h, d); M.setPosition(cars[i][0], y, cars[i][2]); o.setMatrixAt(i, M); } o.geometry.setAttribute('aCar', attr); o.frustumCulled = false; o.userData.passable = true; o.name = 'Traffic'; return o; };
  const g = new THREE.Group(); g.name = 'TrafficGroup'; g.add(add(4.4, 0.72, 1.82, 0, 0.56), add(2.3, 0.56, 1.58, -0.2, 1.17)); ROW_BUILDINGS.add(g);
  // the pool of light each car throws ahead of it, and its lamps as lights, so they read from high up too
  const poolM = new THREE.ShaderMaterial({ uniforms: TRAFFIC_U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: `attribute vec4 aCar; uniform float uT, uD; varying vec2 vQ; const float LX = ${LX.toFixed(1)}; void main(){ float x = mod(aCar.x + aCar.y * uT + LX, 2.0 * LX) - LX, dir = sign(aCar.y), ew = smoothstep(0.0, 25.0, LX - abs(x)); vQ = uv; vec3 p = vec3(x + dir * (2.2 + (position.x + 0.5) * 16.0) * ew, 0.035, aCar.z + position.y * 4.2 * ew); gl_Position = uD < 9.0 || uD > 2600.0 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `varying vec2 vQ; void main(){ /* MSAA extrapolates vQ past the quad's far edge: pow(negative) = NaN, which printed a broken black line across the road */ float qx = clamp(vQ.x, 0.0, 1.0); float a = pow(1.0 - qx, 1.7) * smoothstep(0.0, 0.05, qx) * exp(-(vQ.y - 0.5) * (vQ.y - 0.5) * 11.6); gl_FragColor = vec4(vec3(1.0, 0.86, 0.66) * a * 0.17, 1.0); }` });
  const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), poolM, N); pool.geometry.setAttribute('aCar', attr); pool.frustumCulled = false; pool.renderOrder = 1.6; pool.userData.passable = true; g.add(noDepth(pool));
  const P = [], Q = []; cars.forEach(c => { for (const f of [1, -1]) for (const l of [-0.6, 0.6]) { P.push(c[0], 0.75, c[2] + l); Q.push(c[1], f * 2.2, c[3], 0); } });
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); pg.setAttribute('aV', new THREE.Float32BufferAttribute(Q, 4));
  const ptsM = new THREE.ShaderMaterial({ uniforms: TRAFFIC_U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexShader: `attribute vec4 aV; uniform float uT, uPx, uD; varying vec3 vC; const float LX = ${LX.toFixed(1)}; void main(){ float x = mod(position.x + aV.x * uT + LX, 2.0 * LX) - LX, dir = sign(aV.x), front = aV.y * 1.0; vec4 mv = modelViewMatrix * vec4(x + dir * front, position.y, position.z, 1.0); gl_Position = uD < 9.0 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * mv; float z = -mv.z, sz = clamp(1.3 / uD / max(z, 1e-4) * uPx, 1.5, 11.0); gl_PointSize = sz; vC = (front > 0.0 ? vec3(1.0, 0.86, 0.62) * 1.8 : vec3(1.0, 0.09, 0.05) * 1.1) * smoothstep(0.0, 25.0, LX - abs(x)) * smoothstep(2600.0, 1400.0, uD); }`,
    fragmentShader: `varying vec3 vC; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(vC * exp(-r * r * 4.0) * smoothstep(1.0, 0.8, r), 1.0); }` });
  const pts = new THREE.Points(pg, ptsM); pts.frustumCulled = false; pts.renderOrder = 2.2; pts.userData.passable = true; g.add(noDepth(pts));
  g.children[0].onBeforeRender = () => { TRAFFIC_U.uT.value = TAU_NOW; }; noDepth(g);
  return g;
})();
