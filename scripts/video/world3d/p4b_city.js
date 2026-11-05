
/* =====================================================================================
   4b. SEOUL AS A FIELD OF LIGHT — no building models. The large-scale density comes from the NASA Black Marble 3 km patch itself, so the
   field continues what the Earth map shows; the Han river is a dark curve; Gwanghwamun is only a mass of brighter light.
   The 3D lights (towers of lit windows, street lamps) are one point field whose disc grows with the lens's circle of confusion,
   so the same lights become the bokeh behind the phone.
   ===================================================================================== */
const CITY_HALF = 90000;
const lonOf = x => SV_LON + x / 88000, latOf = z => SV_LAT - z / 111000, xOfLon = l => (l - SV_LON) * 88000, zOfLat = l => (SV_LAT - l) * 111000;
const HAN_RIVER = [[126.72, 37.63], [126.78, 37.60], [126.84, 37.575], [126.90, 37.545], [126.93, 37.533], [126.945, 37.530], [126.96, 37.515], [126.995, 37.513], [127.01, 37.525], [127.02, 37.535], [127.04, 37.535], [127.08, 37.52], [127.115, 37.545], [127.18, 37.56], [127.28, 37.52], [127.40, 37.54]];
const CITY_MAP_U = { value: null };
function bakeCityMap() {
  const S = 2048, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d', { willReadFrequently: true });
  const px = x => (x / CITY_HALF * 0.5 + 0.5) * S, py = z => (z / CITY_HALF * 0.5 + 0.5) * S;
  const im = SV_TEX.patchImg, W = im.width, H = im.height;
  // the patch covers lon 118..136, lat 28..44
  const lon0 = lonOf(-CITY_HALF), lon1 = lonOf(CITY_HALF), lat0 = latOf(-CITY_HALF), lat1 = latOf(CITY_HALF);
  const sx = (lon0 - 118) / 18 * W, sw = (lon1 - lon0) / 18 * W, sy = (44 - lat0) / 16 * H, sh = (lat0 - lat1) / 16 * H;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.filter = 'blur(30px)';
  g.drawImage(im, sx, sy, sw, sh, 0, 0, S, S); g.filter = 'none';
  // brighter districts (only masses of light)
  g.globalCompositeOperation = 'lighter';
  const blob = (x, z, r, a) => { const gr = g.createRadialGradient(px(x), py(z), 0, px(x), py(z), r / CITY_HALF * S * 0.5); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.45, `rgba(255,255,255,${a * 0.42})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); };
  blob(-1200, -900, 3200, 0.30);          // the old centre around Gwanghwamun
  blob(4200, 7200, 4200, 0.28); blob(-8500, 5200, 2600, 0.26); blob(9500, 6300, 3000, 0.2); blob(-14000, 9000, 5000, 0.14);
  // dark mountains and parks
  g.globalCompositeOperation = 'multiply';
  const hole = (x, z, r, a) => { const gr = g.createRadialGradient(px(x), py(z), r * 0.1 / CITY_HALF * S, px(x), py(z), r / CITY_HALF * S * 0.5); gr.addColorStop(0, `rgba(${(1 - a) * 255},${(1 - a) * 255},${(1 - a) * 255},1)`); gr.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); };
  hole(-1500, -9500, 11000, 0.85); hole(700, 3900, 2400, 0.72); hole(-9000, -4000, 3600, 0.7); hole(16000, -9000, 9000, 0.7); hole(-1000, 15000, 7500, 0.72);
  g.globalCompositeOperation = 'source-over';
  const d = g.getImageData(0, 0, S, S).data, out = new Uint8Array(S * S * 4);
  for (let i = 0, N = S * S * 4; i < N; i += 4) { const lum = 0.3 * d[i] + 0.55 * d[i + 1] + 0.15 * d[i + 2]; out[i] = Math.min(255, lum * 1.05); out[i + 3] = 255; }
  const t = new THREE.DataTexture(out, S, S, THREE.RGBAFormat); t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}
// the Han as one seamless ribbon: a distance field baked once from a smooth spline. R = signed distance across the river, G = distance along it / 4, B = unsigned distance (all metres).
const RIVER_TEX = (() => {
  const S = 768, P = HAN_RIVER.map(([lo, la]) => [xOfLon(lo), zOfLat(la)]), L = [];
  for (let i = 1; i < P.length - 1; i++) { const a = [(P[i - 1][0] + P[i][0]) / 2, (P[i - 1][1] + P[i][1]) / 2], b = P[i], c = [(P[i + 1][0] + P[i][0]) / 2, (P[i + 1][1] + P[i][1]) / 2];
    for (let k = 0; k < 10; k++) { const u = k / 10, v = 1 - u; L.push([v * v * a[0] + 2 * v * u * b[0] + u * u * c[0], v * v * a[1] + 2 * v * u * b[1] + u * u * c[1]]); } }
  L.unshift(P[0]); L.push(P[P.length - 1]);
  const N = L.length - 1, A = new Float64Array(N + 1); for (let i = 0; i < N; i++) A[i + 1] = A[i] + Math.hypot(L[i + 1][0] - L[i][0], L[i + 1][1] - L[i][1]);
  const hf = THREE.DataUtils.toHalfFloat, out = new Uint16Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const wx = ((x + 0.5) / S * 2 - 1) * CITY_HALF, wz = ((y + 0.5) / S * 2 - 1) * CITY_HALF;
    let best = 1e18, lat = 0, along = 0;
    for (let i = 0; i < N; i++) { const ax = L[i][0], az = L[i][1], ex = L[i + 1][0] - ax, ez = L[i + 1][1] - az, l2 = ex * ex + ez * ez, u = Math.max(0, Math.min(1, ((wx - ax) * ex + (wz - az) * ez) / l2)), px = wx - ax - ex * u, pz = wz - az - ez * u, q = px * px + pz * pz;
      if (q < best) { best = q; along = A[i] + u * (A[i + 1] - A[i]); lat = (ex * pz - ez * px) / Math.sqrt(l2); } }
    const i = (y * S + x) * 4, D = Math.min(Math.sqrt(best), 60000); out[i] = hf(Math.max(-60000, Math.min(60000, lat))); out[i + 1] = hf(along / 4); out[i + 2] = hf(D); out[i + 3] = hf(1);
  }
  const t = new THREE.DataTexture(out, S, S, THREE.RGBAFormat, THREE.HalfFloatType); t.flipY = false; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
})();
const CITY_U = { tMap: CITY_MAP_U, tRiver: { value: RIVER_TEX }, uFade: { value: 1 }, uEyeW: { value: new THREE.Vector3() }, uHalf: { value: CITY_HALF } };
const CITY_MAT = new THREE.ShaderMaterial({ uniforms: CITY_U, transparent: true, depthWrite: false,
  vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tMap, tRiver; uniform float uFade, uHalf; uniform vec3 uEyeW; varying vec2 vP;
    float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    vec3 lampCol(float k){ return k < 0.5 ? vec3(1.0, 0.62, 0.30) : k < 0.86 ? vec3(1.0, 0.80, 0.56) : k < 0.97 ? vec3(0.88, 0.92, 1.0) : vec3(0.70, 0.95, 0.88); }
    // one layer of lights: energy-conserving while small, capped when near so a lamp stays a lamp; melts into its mean when a cell gets smaller than a few pixels
    vec3 oct(vec2 p, float cell, float r, float fw, float seed, float gain, float keep){
      vec2 g = p / cell, id = floor(g), f = fract(g) - 0.5;
      float k = smoothstep(3.0, 6.0, cell / fw);
      vec3 mean = vec3(1.0, 0.72, 0.46) * gain * keep;
      if (k <= 0.0) return mean;
      vec2 o = (vec2(h21(id + seed), h21(id + seed + 7.7)) - 0.5) * 0.72, dv = (f - o) * cell;
      float win = smoothstep(0.5, 0.42, max(abs(f.x), abs(f.y))), w = min(max(r, fw * 0.8), cell * 0.12), amp = min(gain * cell * cell / (3.14159 * w * w), 2.6);
      float on = step(1.0 - keep, h21(id + seed + 3.3));
      vec3 b = lampCol(h21(id + seed + 11.1)) * amp * exp(-dot(dv, dv) / (w * w)) * on * win * (0.45 + 1.1 * h21(id + seed + 5.5));
      return mix(mean, b, k);
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
      float rA = max(road(q.x, q.y, 2600.0, 19.0, fw), road(q.y, q.x, 2900.0, 19.0, fw));
      float rB = max(road(q.x, q.y, 620.0, 11.0, fw), road(q.y, q.x, 540.0, 11.0, fw));
      float rC = max(road(q.x, q.y, 135.0, 5.0, fw), road(q.y, q.x, 118.0, 5.0, fw));
      float dist = length(uEyeW - vec3(vP.x, 0.0, vP.y));
      float nearFade = smoothstep(70.0, 450.0, dist);          // close up the lamps are the 3D lights, not spots on the ground
      // density: the map, broken up by a multiplicative cascade that goes all the way down to the pixel, so distance gives grain and not fog
      float m = 1.0;
      m *= mix(1.0, 0.2 + 1.6 * n2(vP / 2300.0), smoothstep(1.0, 3.0, 2300.0 / fw));
      m *= mix(1.0, 0.2 + 1.6 * n2(vP / 640.0 + 7.0), smoothstep(1.0, 3.0, 640.0 / fw));
      m *= mix(1.0, 0.15 + 1.7 * n2(vP / 170.0 + 3.0), smoothstep(1.0, 3.0, 170.0 / fw));
      m *= mix(1.0, 0.15 + 1.7 * n2(vP / 44.0 + 5.0), smoothstep(1.0, 3.0, 44.0 / fw));
      // the Han's distance field
      vec4 rv = texture2D(tRiver, uv);
      float along = rv.g * 4.0, hwR = 330.0 + 240.0 * n2(vec2(along / 5200.0, 3.0)) + 46.0 * n2(vec2(along / 760.0, 8.0)) + 12.0 * n2(vec2(along / 140.0, 1.0));
      float dE = max(abs(rv.r), rv.b) - hwR, wm = smoothstep(fw * 0.7 + 1.0, -fw * 0.7 - 1.0, dE);
      float park = mix(0.22, 1.0, smoothstep(40.0, 300.0, dE));   // riverside parks: the lights stop before the water
      float dens = clamp(pow(rho, 1.18) * 1.5 * m * park, 0.0, 1.8);
      vec3 col = vec3(0.0);
      vec2 p1 = mat2(0.94, -0.34, 0.34, 0.94) * vP, p2 = mat2(0.82, 0.57, -0.57, 0.82) * vP;
      col += oct(vP, 880.0, 11.0, fw, 1.0, 0.040, 0.8) * dens;
      col += oct(p1, 230.0, 4.0, fw, 21.0, 0.060, 0.75) * dens;
      col += oct(p2, 62.0, 1.6, fw, 41.0, 0.075, 0.7) * dens * nearFade;
      col += oct(vP, 17.0, 0.8, fw, 61.0, 0.060, 0.55) * dens * nearFade;
      vec3 roadc = vec3(1.0, 0.66, 0.34);
      col += roadc * (rA * 0.5 + rB * 0.2 + rC * 0.11 * smoothstep(0.0, 0.3, dens)) * sqrt(dens + 0.03) * mix(0.45, 1.0, nearFade);
      // ground: asphalt faintly lit by the city, never a flat black
      vec3 ground = mix(vec3(0.010, 0.010, 0.012), vec3(0.016, 0.012, 0.010), clamp(dens, 0.0, 1.0));
      ground *= 0.75 + 0.5 * n2(vP / 37.0);
      // the street in front of the cafe: pavement, kerb, carriageway, pools of light under the lamps
      float sk = (1.0 - smoothstep(260.0, 700.0, len)) * step(2.6, vP.y) * step(vP.y, 116.3);
      if (sk > 0.0) {
        float x = vP.x, z = vP.y, dxl = (fract(x / 26.0 + 0.5) - 0.5) * 26.0;
        float rz = mod(z - 8.3, 36.0);                    // a wide boulevard: 29.6 m of carriageway, 6.4 m of pavement, repeated
        float pool = exp(-(dxl * dxl + (rz - 3.7) * (rz - 3.7)) / 62.0) + exp(-(dxl * dxl + (rz - 25.7) * (rz - 25.7)) / 62.0);
        float walkN = smoothstep(8.3, 8.2, z), walkS = smoothstep(29.6, 29.7, rz), kerb = smoothstep(0.14, 0.04, abs(z - 8.3)) + smoothstep(0.14, 0.04, abs(rz - 29.6));
        vec2 jt = abs(fract(vP / 1.25 + 0.5) - 0.5) * 1.25; float joint = (1.0 - smoothstep(0.012, 0.04, min(jt.x, jt.y))) * smoothstep(0.25, 0.06, fw);
        float dashL = smoothstep(0.1, 0.06, abs(rz - 14.7)) * step(0.42, fract(x / 8.0)) * smoothstep(0.5, 0.1, fw);
        float laneL = (smoothstep(0.09, 0.05, abs(rz - 2.7)) + smoothstep(0.09, 0.05, abs(rz - 26.7))) * smoothstep(0.5, 0.1, fw);
        vec3 alb = (walkN + walkS > 0.5) ? vec3(0.34, 0.31, 0.28) * (1.0 - 0.45 * joint) : vec3(0.075, 0.075, 0.08) * (0.72 + 0.56 * n2(vP * 2.1) * (0.6 + 0.8 * n2(vP * 9.0)));
        alb = mix(alb, vec3(0.5, 0.48, 0.45), clamp(kerb, 0.0, 1.0) * 0.8); alb = mix(alb, vec3(0.5, 0.48, 0.42), clamp(dashL + laneL, 0.0, 1.0) * 0.75);
        vec3 sl = alb * (vec3(0.05, 0.043, 0.042) + vec3(1.0, 0.70, 0.40) * pool * 0.75);
        ground = mix(ground, sl, sk);
        col *= mix(1.0, 0.25, sk);
      }
      // light spilling on the pavement from the cafe's window
      float spill = exp(-pow((vP.x) / 4.0, 2.0)) * exp(-max(vP.y - 2.5, 0.0) / 3.5) * step(2.5, vP.y);
      ground += vec3(0.95, 0.56, 0.26) * spill * 0.15 * (0.6 + 0.8 * n2(vP * 2.3)) * (0.75 + 0.5 * n2(vP * 13.0));
      col = col + ground;
      col = col * col / (col + 0.10) * 1.05 + ground * 0.55;  // deep blacks between the lights
      // the Han: dark blue water, a soft sheen of the banks' lights broken along the current, bright lines of the embankment roads, a few thin bridges
      float rip = mix(0.5, n2(vec2(along / 480.0, rv.r / 34.0)) * 0.6 + n2(vec2(along / 95.0, rv.r / 11.0)) * 0.4, smoothstep(1.0, 3.0, 34.0 / fw));
      float bank = exp(min(dE, 0.0) / 120.0), glow = sqrt(rho + 0.02);
      float cols = pow(n2(vec2(along / 330.0, 5.0)), 3.0);
      vec3 water = vec3(0.0035, 0.0062, 0.0125) * (0.7 + 0.8 * rip) + vec3(1.0, 0.62, 0.32) * glow * (0.0035 + bank * (0.012 + 0.10 * cols)) * (0.3 + 1.4 * rip);
      float idb = floor(along / 3000.0), sb = (idb + 0.2 + 0.6 * h21(vec2(idb, 4.0))) * 3000.0, db = abs(along - sb), wb = max(13.0, fw * 0.7);
      water += roadc * step(0.35, h21(vec2(idb, 9.0))) * (13.0 / wb) * exp(-db * db / (wb * wb)) * (0.08 + 0.2 * h21(vec2(idb, 2.0)));
      col = mix(col, water, wm);
      float lwE = max(7.0, fw * 0.7), eR = dE - 34.0, eB = dE - 1.0, lwB = max(2.5, fw * 0.7);
      col += vec3(1.0, 0.70, 0.40) * sqrt(rho + 0.03) * ((7.0 / lwE) * exp(-eR * eR / (lwE * lwE)) * 0.6 + (2.5 / lwB) * exp(-eB * eB / (lwB * lwB)) * 0.3);
      float r = (len + 9000.0 * (n2(vP / 11000.0) - 0.5)) / uHalf;
      float a = uFade * (1.0 - smoothstep(0.55, 0.96, r));
      gl_FragColor = vec4(col, a);
    }` });
const CITY_MESH = noDepth(new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2, CITY_HALF * 2).rotateX(-Math.PI / 2), CITY_MAT));
CITY_MESH.position.y = -0.03; CITY_MESH.renderOrder = 1; CITY_MESH.frustumCulled = false; CITY_MESH.name = 'CityField'; CITY_MESH.userData.passable = true; universe.add(CITY_MESH);
SV_READY.then(() => { CITY_MAP_U.value = bakeCityMap(); });

// 3D lights. The first BOKEH_N are the lights seen through the far windows; these are the only ones drawn once the lens is close (bokeh)
const BOKEH_N = 520;
const CITY_LIGHTS_U = { uPx: { value: 1500 }, uD: { value: 1 }, uCoc: { value: 0 }, uGain: { value: 1 }, uFar: { value: 1 } };
// every block of the city, [x, y, z, w, h, d, angle, onGround]. Nothing stands in the camera's corridor (it comes in from the south, above about 26 degrees)
const CITY_BLOCKS = [];
function clearH(x, z, h) { if (z <= 0) return h; return Math.abs(x - z * 0.2) > 50 + z * 0.25 ? h : Math.min(h, z * 0.42 - 6); }
const CITY_POINTS = (() => {
  const rnd = mulberry32(2026), P = [], C = [], S = [];
  const warm = [[1, 0.62, 0.30], [1, 0.76, 0.46], [1, 0.84, 0.62], [0.78, 0.86, 1], [1, 0.50, 0.22]];
  const add = (x, y, z, c, s, b) => { P.push(x, y, z); C.push(c[0] * b, c[1] * b, c[2] * b); S.push(s); };
  for (let i = 0; i < BOKEH_N; i++) {                          // north of the cafe: what the back windows look at
    const zz = -6 - Math.pow(rnd(), 1.4) * 260, x = (rnd() - 0.5) * (14 + Math.abs(zz) * 1.9), y = rnd() < 0.3 ? 2 + rnd() * 5 : 2 + Math.pow(rnd(), 1.5) * (10 + Math.abs(zz) * 0.34);
    add(x, y, zz - 3.6, warm[Math.floor(rnd() * warm.length)], 0.6 + 2.4 * rnd() * rnd(), 0.25 + 2.4 * Math.pow(rnd(), 3));
  }
  const towers = 7600;
  for (let t = 0; t < towers; t++) {
    const r = 45 * Math.exp(rnd() * Math.log(9000 / 45)), a = rnd() * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 178 && z > -62 && z < 118) continue;
    const hRaw = 12 + Math.pow(rnd(), 2.2) * (r < 1500 ? 150 : 70), h = clearH(x, z, hRaw), wid = 10 + rnd() * 18, dep = wid * (0.7 + rnd() * 0.5), c0 = warm[Math.floor(rnd() * 3)], ang = r < 2400 ? 0 : 0.32 + (rnd() - 0.5) * 0.8;
    if (h < 8) continue;
    CITY_BLOCKS.push([x, h / 2, z, wid, h, dep, ang, 1]);
    if (h > 42 && rnd() < 0.4) CITY_BLOCKS.push([x, h + h * 0.09, z, wid * 0.62, h * 0.18, dep * 0.62, ang, 0]);
    const n = 6 + Math.floor(h / 6), cs = Math.cos(ang), sn = Math.sin(ang);
    for (let k = 0; k < n; k++) {
      const face = Math.floor(rnd() * 4), u = rnd() - 0.5, lx = face < 2 ? u * wid : (face === 2 ? 1 : -1) * (wid / 2 + 0.4), lz = face < 2 ? (face === 0 ? 1 : -1) * (dep / 2 + 0.4) : u * dep;
      add(x + lx * cs + lz * sn, 3 + Math.floor(rnd() * h / 3.4) * 3.4, z - lx * sn + lz * cs, rnd() < 0.2 ? warm[3] : c0, 1.2, 0.35 + 0.9 * rnd() * rnd());
    }
  }
  for (let i = -24; i <= 24; i++) for (const z of [12, 34, 48, 70, 84, 106]) { const x = i * 26; if (Math.abs(x - z * 0.15) < 18) continue; add(x, 8.5, z, warm[0], 2.4, 2.4); }   // street lamps in front of the cafe, none in the camera's way
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setAttribute('sz', new THREE.Float32BufferAttribute(S, 1));
  const m = new THREE.ShaderMaterial({ uniforms: CITY_LIGHTS_U, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float sz; attribute vec3 color; uniform float uPx, uD, uCoc, uFar; varying vec3 vC; varying float vDisc;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float z = -mv.z; gl_Position = projectionMatrix * mv;
        float base = clamp(sz / uD / max(z, 1e-4) * uPx, 1.35, 13.0);
        float coc = uCoc * abs(1.0 - 1.0 / max(z, 1e-3));
        float size = sqrt(base * base + 4.0 * coc * coc);
        float glim = 1.0 / (1.0 + z * uD / 2500.0);             // haze: far lights are dimmer
        float tr = sz / uD / max(z, 1e-4) * uPx, sub = clamp(tr * tr / (1.35 * 1.35), mix(0.35, 0.06, smoothstep(2500.0, 40000.0, uD)), 1.0);   // smaller than a pixel: less energy, or they make a starfield
        vDisc = smoothstep(2.0, 8.0, coc);
        float e = (base * base) / (size * size);
        vC = color * mix(sub, 1.0, vDisc) * (0.28 + 0.72 * glim) * mix(0.72, clamp(12.0 * e, 0.13, 0.5), vDisc) * uFar;
        gl_PointSize = min(size, 240.0); }`,
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
const ROW_MAT = new THREE.ShaderMaterial({ uniforms: { uFade: { value: 1 }, uEye: CITY_U.uEyeW },
  vertexShader: `varying vec3 vL, vV, vNl, vHalf; varying float vS, vY; uniform vec3 uEye;
    void main(){ vec3 i0 = instanceMatrix[0].xyz, i1 = instanceMatrix[1].xyz, i2 = instanceMatrix[2].xyz, s = vec3(length(i0), length(i1), length(i2));
      vec4 lp = instanceMatrix * vec4(position, 1.0); mat3 R = mat3(i0 / s.x, i1 / s.y, i2 / s.z);
      vL = position * s; vHalf = s * 0.5; vNl = normal; vV = (lp.xyz - uEye) * R; vY = lp.y;
      vS = fract(instanceMatrix[3].x * 0.137 + instanceMatrix[3].z * 0.071) * 37.0; gl_Position = projectionMatrix * modelViewMatrix * lp; }`,
  fragmentShader: `varying vec3 vL, vV, vNl, vHalf; varying float vS, vY; uniform float uFade;
    float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    float rectA(vec2 f, vec4 r, vec2 aa){ vec2 a = smoothstep(r.xy - aa, r.xy + aa, f) * smoothstep(r.zw + aa, r.zw - aa, f); return a.x * a.y; }
    vec3 roomAt(vec2 q, vec2 hw, vec3 d, float deep, vec3 tint, float seed){
      vec3 id = 1.0 / max(abs(d), vec3(1e-4));
      float tx = (hw.x - q.x * sign(d.x)) * id.x, ty = (hw.y - q.y * sign(d.y)) * id.y, tz = deep * id.z, t = min(min(tx, ty), tz);
      vec3 p = vec3(q, 0.0) + d * t; vec3 c;
      if (t == tz) { c = tint * (0.42 + 0.42 * smoothstep(-hw.y, hw.y, p.y)); float fur = step(p.y, -hw.y + 0.9) * step(0.3, n2(vec2(p.x * 0.7 + seed, 2.0))); c *= 1.0 - 0.55 * fur; }
      else if (t == ty) { c = d.y > 0.0 ? tint * (0.62 + 0.8 * exp(-dot(p.xz - vec2(0.0, deep * 0.5), p.xz - vec2(0.0, deep * 0.5)) * 0.45)) : tint * 0.22; }
      else c = tint * (0.30 + 0.22 * (p.z / deep));
      return c;
    }
    void main(){
      if (uFade < 0.999 && h21(gl_FragCoord.xy) > uFade) discard;
      vec3 N = vNl; float s = vS, tA = h21(vec2(s, 1.7)), tB = h21(vec2(s, 5.3)), tC = h21(vec2(s, 9.1));
      bool glassy = tB > 0.72 && vHalf.y > 16.0;
      vec3 alb = glassy ? vec3(0.07, 0.08, 0.095) : mix(vec3(0.20, 0.185, 0.17), vec3(0.42, 0.37, 0.32), tA);
      float top = vY - vL.y + vHalf.y;
      if (N.y > 0.5) { float e = min(vHalf.x - abs(vL.x), vHalf.z - abs(vL.z)), par = smoothstep(0.5, 0.42, e);
        vec2 rid = floor(vL.xz / 6.0); float rl = step(0.955, h21(rid + s)) * smoothstep(1.1, 0.5, length(fract(vL.xz / 6.0) - 0.5) * 6.0);
        vec3 c = mix(vec3(0.0042, 0.0042, 0.005) * (0.55 + 0.9 * n2(vL.xz * 0.35 + s)), alb * vec3(0.022, 0.024, 0.03), par) + vec3(1.0, 0.72, 0.42) * rl * 0.5;
        gl_FragColor = vec4(c, 1.0); return; }
      bool zF = abs(N.z) > 0.5;
      float a = zF ? vL.x : vL.z, W = zF ? vHalf.x : vHalf.z, Y = vY, vin = max(-dot(vV, N), 1e-3), va = zF ? vV.x : vV.z;
      vec3 ray = vec3(va, vV.y, vin) / vin;
      float px = max(max(length(vec2(dFdx(a), dFdy(a))), length(vec2(dFdx(Y), dFdy(Y)))), 1e-4);
      float up = exp(-Y / 7.0), face = zF ? (N.z > 0.0 ? 1.0 : 0.7) : 0.55;
      vec3 light = (vec3(0.020, 0.024, 0.036) + vec3(1.0, 0.63, 0.34) * (0.30 * up + 0.007)) * face;
      float grime = 0.82 + 0.34 * n2(vec2(a * 0.35 + s * 7.0, Y * 0.11));
      vec3 wall = alb * light * grime;
      const float GF = 3.0;
      bool isGF = Y < GF;
      float bw = isGF ? 5.8 : (glassy ? mix(1.6, 2.3, tC) : mix(2.6, 3.5, tC));
      float nB = max(1.0, floor(2.0 * W / bw + 0.5)), BW = 2.0 * W / nB, ax = (a + W) / BW, idx = floor(ax), fx = ax - idx;
      float fh = isGF ? GF : 3.4, fyy = isGF ? Y / GF : (Y - GF) / fh, idy = floor(fyy), fy = fyy - idy;
      vec2 aa = px * 0.7 / vec2(BW, fh);
      float mx = isGF ? 0.075 : (glassy ? 0.05 : mix(0.15, 0.24, tA)), y0 = isGF ? 0.15 : (glassy ? 0.05 : 0.23), y1 = isGF ? 0.86 : (glassy ? 0.93 : 0.82), dep = isGF ? 0.14 : (glassy ? 0.05 : 0.24);
      vec4 R = vec4(mx, y0, 1.0 - mx, y1);
      float op = rectA(vec2(fx, fy), R, aa);
      vec2 f2 = vec2(fx, fy) + ray.xy * dep / vec2(BW, fh);
      float inG = rectA(f2, R, aa);
      // piers every few bays, a slab edge at each floor with its shadow under it, a cornice at the top, a darker fascia over the shops
      float pierEvery = isGF ? 1.0 : 3.0;
      float pier = glassy ? 0.0 : (1.0 - step(0.5, mod(idx, pierEvery))) * (smoothstep(0.13, 0.09, fx)) + smoothstep(0.42, 0.30, W - abs(a));
      float slab = isGF ? 0.0 : smoothstep(0.075, 0.055, fy), shade = isGF ? 0.0 : smoothstep(0.075, 0.09, fy) * smoothstep(0.125, 0.09, fy);
      wall *= (1.0 + 0.55 * clamp(pier, 0.0, 1.0)) * (1.0 + 0.5 * slab) * (1.0 - 0.45 * shade);
      float crn = smoothstep(top - 0.55, top - 0.5, Y); wall *= 1.0 + 0.6 * crn; wall *= 1.0 - 0.5 * smoothstep(top - 0.55, top - 0.62, Y) * smoothstep(top - 0.72, top - 0.62, Y);
      if (isGF) wall *= fy > 0.86 ? 0.55 : 1.0;
      if (Y > GF - 0.02 && Y < GF + 0.09) wall *= 1.5;
      // what shows in the window
      vec2 cid = vec2(idx + floor(s * 3.0) * 13.0, idy + (isGF ? 40.0 : 0.0));
      float litF = isGF ? 0.70 : (glassy ? 0.26 : mix(0.16, 0.42, tC));
      float lit = step(1.0 - litF, h21(cid + vec2(s * 3.1, 0.0)));
      float lev = (isGF ? 0.75 : 0.26) + (isGF ? 0.5 : 0.9) * pow(h21(cid + 7.7 + s), 2.0);
      vec3 tint = mix(vec3(1.0, 0.70, 0.40), vec3(0.86, 0.92, 1.0), step(0.82, h21(cid + 3.3 + s))) * lev;
      vec2 q = (f2 - 0.5) * vec2(BW, fh), hw = vec2(BW, fh) * 0.5;
      vec3 inner = lit > 0.5 ? roomAt(q, hw, ray, isGF ? 6.0 : 4.0, tint, s + idx) : roomAt(q, hw, ray, 4.0, vec3(0.012, 0.012, 0.015), s + idx);
      float bl = h21(cid + 2.3 + s), blindY = mix(0.86, 0.34, h21(cid + 4.4 + s));
      if (!isGF && bl > 0.42) { float bm = smoothstep(blindY - 0.01, blindY + 0.01, f2.y); float slats = 0.82 + 0.18 * sin(f2.y * fh * 62.0) * smoothstep(0.05, 0.015, px); inner = mix(inner, (lit > 0.5 ? tint * 0.34 : vec3(0.014, 0.014, 0.016)) * slats, bm); }
      float F = 0.05 + 0.65 * pow(1.0 - vin / length(vV), 3.0);
      vec3 refl = vec3(0.030, 0.038, 0.058) * (0.55 + 0.9 * n2(vec2(a * 0.09 + s, Y * 0.04))) + vec3(1.0, 0.65, 0.36) * 0.05 * up;
      vec3 glass = mix(inner, refl, F);
      float mull = isGF ? smoothstep(0.012, 0.006, abs(fract(f2.x * 2.0 + 0.5) - 0.5) / 2.0 - 0.0) : smoothstep(0.012 + aa.x, 0.012, abs(f2.x - 0.5)) ;
      if (isGF) mull = smoothstep(0.012 + aa.x, 0.012, abs(f2.x - 0.5));
      float rim = 1.0 - rectA(f2, vec4(R.x + 0.018, R.y + 0.018, R.z - 0.018, R.w - 0.018), aa);
      glass = mix(glass, vec3(0.012, 0.012, 0.014), clamp(mull + rim, 0.0, 1.0) * 0.85);
      vec3 reveal = alb * light * 0.42 + (lit > 0.5 ? tint * 0.05 : vec3(0.0));
      vec3 c = mix(mix(wall, reveal, op), glass, op * inG);
      // far away: the average of all that, so distance does not shimmer
      float k = smoothstep(0.62, 0.26, px * 2.0 / min(BW, fh));
      float gfrac = (1.0 - 2.0 * mx) * (y1 - y0);
      float patchLit = litF * 3.2 * pow(h21(floor(vec2(a, Y) / vec2(7.0, 6.8)) + s), 3.0);
      vec3 cFar = wall * (1.0 - gfrac) + gfrac * (vec3(0.010, 0.012, 0.018) + vec3(1.0, 0.72, 0.44) * patchLit * (isGF ? 0.42 : 0.2));
      gl_FragColor = vec4(mix(cFar, c, k), 1.0);
    }` });
const ROW_BUILDINGS = (() => {
  const rnd = mulberry32(44), list = [];
  for (let side of [-1, 1]) { let x = 3.85; for (let i = 0; i < 9; i++) { const w = 9 + rnd() * 12, h = 11 + rnd() * 28, d = 14 + rnd() * 10; list.push([side * (x + w / 2), h / 2, 2.6 - d / 2, w, h, d, 0, 1]); x += w + 0.02; } }
  list.push([0, 3.0 + 4.5, (2.65 - 3.85) / 2, 7.7, 9, 6.5, 0, 0]);   // the floors above the cafe
  // blocks of ordinary buildings on the street grid around the cafe: this is what makes it a city and not a row of boxes on a dark plain
  const rb = mulberry32(55);
  for (let ix = -18; ix <= 18; ix++) for (let iz = -21; iz <= 21; iz++) {
    const bx = ix * 135, bz = -36 + iz * 118, nx = 2 + Math.floor(rb() * 3), nz = 2, lw = 117 / nx, ld = 100 / nz;
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      const empty = rb(), hr = rb(), ww = rb(), dd = rb(), r0 = Math.hypot(bx, bz);
      const x = bx - 58.5 + (a + 0.5) * lw, z = bz - 50 + (b + 0.5) * ld, w = lw - 2 - ww * 5, d = ld - 2 - dd * 8;
      if (empty < 0.07 || r0 > 2500 || (Math.abs(x + (b === 0 ? 0 : 0)) < 200 && z > -70 && z < 128)) continue;
      const h = clearH(x, z, 9 + Math.pow(hr, 2.3) * (r0 < 900 ? 62 : 34));
      if (h < 7) continue;
      list.push([x, h / 2, z - (b === 0 ? 0 : 0), w, h, d, 0, 1]);
    }
  }
  for (const b of CITY_BLOCKS) list.push(b);
  const Q = new THREE.Quaternion(), YAX = new THREE.Vector3(0, 1, 0), Pz = new THREE.Vector3(), Sz = new THREE.Vector3(), M = new THREE.Matrix4();
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), ROW_MAT, list.length);
  list.forEach(([x, y, z, w, h, d, a], i) => { M.compose(Pz.set(x, y, z), Q.setFromAxisAngle(YAX, a), Sz.set(w, h, d)); m.setMatrixAt(i, M); });
  m.frustumCulled = false; m.name = 'StreetRow'; universe.add(m);
  // at every foot: a soft contact shadow and the pool of street light around it, so nothing floats. Children of the row, so they share its visibility
  const feet = list.filter(b => b[7] === 1);
  const gm = new THREE.ShaderMaterial({ uniforms: { uFade: ROW_MAT.uniforms.uFade }, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    vertexShader: `varying vec2 vQ, vH; varying float vR; const float MG = 11.0; void main(){ vec3 i0 = instanceMatrix[0].xyz, i2 = instanceMatrix[2].xyz; vec2 s = vec2(length(i0), length(i2)); vQ = position.xz * (s + 2.0 * MG); vH = s * 0.5;
      vR = fract(instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.17);
      vec3 w = instanceMatrix[3].xyz + i0 / s.x * vQ.x + i2 / s.y * vQ.y; w.y = 0.02; gl_Position = projectionMatrix * modelViewMatrix * vec4(w, 1.0); }`,
    fragmentShader: `varying vec2 vQ, vH; varying float vR; uniform float uFade; void main(){ float d = length(max(abs(vQ) - vH, 0.0));
      float a = 0.86 * exp(-d / 2.2) * smoothstep(11.0, 5.0, d); vec3 g = vec3(1.0, 0.62, 0.32) * (0.018 + 0.032 * vR) * exp(-d / 5.5) * smoothstep(11.0, 6.0, d);
      gl_FragColor = vec4(g * uFade, a * uFade); }` });
  const pg = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), gi = new THREE.InstancedMesh(pg, gm, feet.length);
  feet.forEach(([x, y, z, w, h, d, a], i) => { M.compose(Pz.set(x, y, z), Q.setFromAxisAngle(YAX, a), Sz.set(w, 1, d)); gi.setMatrixAt(i, M); });
  gi.frustumCulled = false; gi.renderOrder = 1.5; gi.userData.passable = true; gi.name = 'BuildingFeet'; m.add(noDepth(gi));
  // the cafe's own shopfront, modelled: piers either side of the glass, frame, sill, fascia with no lettering, a shallow canopy with a line of light. Same proportions as the shops along the street
  const stone = new THREE.MeshStandardMaterial({ color: 0x4a423a, roughness: 0.82, envMapIntensity: 0.3 }), iron = new THREE.MeshStandardMaterial({ color: 0x101113, metalness: 0.6, roughness: 0.5, envMapIntensity: 0.4 }), strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 1.95, 1.1) });
  const fb = (w, h, d, mat, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y, z); m.add(b); return b; };
  for (const sx of [-1, 1]) { fb(0.76, 3.0, 0.22, stone, sx * 3.47, 1.5, 2.76); fb(0.075, 2.3, 0.1, iron, sx * 3.05, 1.6, 2.69); fb(0.42, 0.14, 0.3, stone, sx * 3.47, 0.07, 2.8); }
  fb(7.7, 0.40, 0.25, iron, 0, 2.97, 2.775); fb(7.9, 0.07, 0.34, stone, 0, 3.2, 2.82); fb(6.2, 0.075, 0.1, iron, 0, 2.735, 2.69);
  fb(6.2, 0.07, 0.2, stone, 0, 0.42, 2.74); fb(6.2, 0.40, 0.05, new THREE.MeshStandardMaterial({ color: 0x1a1817, roughness: 0.6, envMapIntensity: 0.3 }), 0, 0.2, 2.675);
  fb(7.0, 0.05, 0.85, iron, 0, 3.28, 3.3); fb(6.8, 0.016, 0.02, strip, 0, 3.25, 3.7);
  return m;
})();
