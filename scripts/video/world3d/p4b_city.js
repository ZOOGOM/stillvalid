
/* =====================================================================================
   4b. SEOUL AS A FIELD OF LIGHT — no building models. The large-scale density comes from the NASA Black Marble 3 km patch itself, so the
   field continues what the Earth map shows; the Han river is a dark curve; Gwanghwamun is only a mass of brighter light.
   The 3D lights (towers of lit windows, street lamps) are one point field whose disc grows with the lens's circle of confusion,
   so the same lights become the bokeh behind the phone.
   ===================================================================================== */
const CITY_HALF = 90000;
const lonOf = x => SV_LON + x / 88000, latOf = z => SV_LAT - z / 111000, xOfLon = l => (l - SV_LON) * 88000, zOfLat = l => (SV_LAT - l) * 111000;
const HAN_RIVER = [[125.70, 37.50], [126.05, 37.60], [126.32, 37.69], [126.52, 37.74], [126.64, 37.68], [126.72, 37.63], [126.78, 37.60], [126.84, 37.575], [126.90, 37.545], [126.93, 37.533], [126.945, 37.530], [126.96, 37.515], [126.995, 37.513], [127.01, 37.525], [127.02, 37.535], [127.04, 37.535], [127.08, 37.52], [127.115, 37.545], [127.18, 37.56], [127.28, 37.52], [127.40, 37.54], [127.55, 37.51], [127.74, 37.49], [127.98, 37.40], [128.35, 37.30]];
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
  const t = new THREE.DataTexture(out, S, S, THREE.RGBAFormat); t.flipY = false; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}
// the Han as one seamless ribbon: a distance field baked once from a smooth spline. R = signed distance across the river, G = distance along it from Seoul / 2, B = unsigned distance (all metres)
const HAN_BR_N = 10, HAN_BR = [];                                // the bridges: segments across the water
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
    const i = (y * S + x) * 4, D = Math.min(Math.sqrt(best), 60000); out[i] = hf(Math.max(-60000, Math.min(60000, lat))); out[i + 1] = hf(Math.max(-60000, Math.min(60000, along / 2))); out[i + 2] = hf(D); out[i + 3] = hf(1);
  }
  // a few bridges at uneven spacing, each square to the water within a few degrees
  const rb = mulberry32(1188); let s = -21000 + rb() * 2000;
  while (HAN_BR.length < HAN_BR_N) { let i = 0; while (i < N - 1 && A[i] - A0 < s) i++;
    const ex = L[i + 1][0] - L[i][0], ez = L[i + 1][1] - L[i][1], l = Math.hypot(ex, ez), tw = (rb() - 0.5) * 0.22, c = Math.cos(tw), n = Math.sin(tw), nx = (-ez * c - ex * n) / l, nz = (ex * c - ez * n) / l, h = 1250;
    HAN_BR.push(new THREE.Vector4(L[i][0] - nx * h, L[i][1] - nz * h, L[i][0] + nx * h, L[i][1] + nz * h)); s += 3100 + rb() * 3900; }
  const t = new THREE.DataTexture(out, S, S, THREE.RGBAFormat, THREE.HalfFloatType); t.flipY = false; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
})();
// the city's large-scale light as seen from the air, shared by the field and by far buildings so the two are the same light. Rotated off the map axes.
const CITY_MEAN_GLSL = `
    float cmH(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float cmN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(cmH(i), cmH(i + vec2(1, 0)), f.x), mix(cmH(i + vec2(0, 1)), cmH(i + vec2(1, 1)), f.x), f.y); }
    float cityMacro(vec2 p){ vec2 a = mat2(0.81, -0.59, 0.59, 0.81) * p, b = mat2(0.57, 0.82, -0.82, 0.57) * p; return (0.50 + 1.0 * cmN(a / 3300.0 + 11.3)) * (0.62 + 0.76 * cmN(b / 1050.0 + 7.4)); }   // the offsets matter: this noise is exactly 0 at the map's origin, the cafe, which was the dark disc around it
    float cityDens(float rho, vec2 p){ return pow(rho, 1.18) * 1.5 * cityMacro(p); }
    // the mean colour a stretch of city has once its lights are smaller than a pixel
    vec3 cityMean(float d){ vec3 c = vec3(1.0, 0.70, 0.42) * (0.20 * d + 0.012 * sqrt(d)); return c * c / (c + 0.10) * 1.05; }`;
const CITY_U = { tMap: CITY_MAP_U, tRiver: { value: RIVER_TEX }, tPatch: { value: null }, uPS: { value: new THREE.Vector2(675, 600) }, uBr: { value: HAN_BR }, uFade: { value: 1 }, uEyeW: { value: new THREE.Vector3() }, uHalf: { value: CITY_HALF } };
const CITY_MAT = new THREE.ShaderMaterial({ uniforms: CITY_U, transparent: true, depthWrite: false,
  vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tMap, tRiver, tPatch; uniform vec2 uPS; uniform vec4 uBr[${HAN_BR_N}]; uniform float uFade, uHalf; uniform vec3 uEyeW; varying vec2 vP; float gSky = 0.0, gFlat = 1.0, gBoost = 1.0;
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
    // from the air: one layer of real lights at fixed places on the ground. Mean colour LMC while a cell is smaller than a few pixels; once resolved, each light has its own size, brightness and kind of lamp
    const vec3 LMC = vec3(1.0, 0.72, 0.46);
    vec3 airLamp(float k){ return k < 0.46 ? vec3(1.0, 0.56, 0.24) : k < 0.78 ? vec3(1.0, 0.78, 0.52) : k < 0.94 ? vec3(0.84, 0.92, 1.0) : vec3(0.66, 1.0, 0.88); }
    vec3 lights(vec2 p, float cell, float fw, float seed, float keep){
      float k = smoothstep(2.6, 6.0, cell / fw); if (k <= 0.0) return LMC * gFlat;
      vec2 g = p / cell, id = floor(g), f = fract(g) - 0.5, o = (vec2(h21(id + seed), h21(id + seed + 7.7)) - 0.5) * 0.7, dv = (f - o) * cell;
      float bv = h21(id + seed + 5.5), t = bv * bv * bv * bv, w = min(fw * (0.52 + 0.85 * t), cell * 0.13);
      float clu = 0.25 + 1.5 * n2(p / (cell * 5.3) + seed), on = step(1.0 - keep, h21(id + seed + 3.3)), E = (0.28 + 3.6 * t) * clu / keep;
      vec3 b = airLamp(h21(id + seed + 11.1)) * min(E * cell * cell / (3.14159 * w * w), 3.0 + 16.0 * t) * exp(-dot(dv, dv) / (w * w)) * on * smoothstep(0.5, 0.42, max(abs(f.x), abs(f.y)));
      return mix(LMC * gFlat, b * gBoost, k);
    }
    // a lit road: a soft line while thin on screen; two rows of lamps on dark asphalt when it is wide on screen
    float road(float x, float y, float cell, float hw, float fw){
      float d = abs(fract(x / cell + 0.5) - 0.5) * cell, w = max(hw, fw * 0.7), far = (hw / w) * exp(-d * d / (w * w));
      float kn = smoothstep(hw * 0.9, hw * 0.22, fw); if (kn <= 0.0) return far;
      float lw = max(hw * 0.06, fw * 0.8), e = abs(d - hw * 0.8), a = abs(fract(y / 26.0 + 0.5) - 0.5) * 26.0;
      float dash = mix(0.38, exp(-a * a / max(lw * lw * 1.4, 0.5)) * 1.6 + 0.05, smoothstep(9.0, 3.0, fw));
      return mix(far, exp(-e * e / (lw * lw)) * dash * min(1.0, hw * 0.12 / lw + 0.25) + 0.012 * exp(-d * d / (hw * hw)), kn);
    }
    // irregular blocks: distance (m) to the nearest edge of a Voronoi diagram, and the id of the cell. From the air streets are this, never a repeating grid
    float vor(vec2 p, float cell, out vec2 id){
      vec2 g = p / cell, i = floor(g), f = g - i; float F1 = 9.0, F2 = 9.0; id = i;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 b = vec2(float(x), float(y)), o = vec2(h21(i + b + 0.5), h21(i + b + 7.7)), r = b + o - f; float d = dot(r, r);
        if (d < F1) { F2 = F1; F1 = d; id = i + b; } else if (d < F2) F2 = d; }
      return (sqrt(F2) - sqrt(F1)) * 0.5 * cell;
    }
    float aLine(float d, float hw, float fw){ float w = max(hw, fw * 0.75), far = (hw / w) * exp(-d * d / (w * w)), kn = smoothstep(hw * 0.9, hw * 0.25, fw); if (kn <= 0.0) return far;
      float lw = max(hw * 0.07, fw * 0.8), e = abs(d - hw * 0.8); return mix(far, exp(-e * e / (lw * lw)) * 0.8 + 0.03 * exp(-d * d / (hw * hw)), kn); }
    float tMapG(vec2 uv){ return texture2D(tMap, uv).g * 2.318; }
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
      // from the air (never at street level, so everything below stays exactly as it was there)
      float sky = smoothstep(90.0, 420.0, uEyeW.y), aGap = 1.0, aVar = 1.0, aRoad = 0.0, aPark = 1.0; gSky = sky;
      // how much of the Earth's own picture is still on the ground: the field starts as exactly that picture and resolves into its own lights over about 2.5 s of the descent
      float eLog = log(max(uEyeW.y, 1.0)), earthK = smoothstep(9.3, 12.05, eLog), riverK = smoothstep(0.0, 0.75, 1.0 - earthK);
      vec3 earthCol = vec3(0.0), cNight = vec3(0.0); float Lm = 0.0;
      if (sky > 0.0) {
        vec2 pu = vec2((${SV_LON.toFixed(3)} + vP.x / 88000.0 - 118.0) / 18.0, (${SV_LAT.toFixed(3)} - vP.y / 111000.0 - 28.0) / 16.0);
        cNight = nightSharp(cubicTex(tPatch, pu, uPS), textureLod(tPatch, pu, 1.5).rgb);
        Lm = dot(cNight, vec3(0.3, 0.55, 0.15)); Lm /= 1.0 + 0.8 * Lm;
        if (earthK > 0.0) earthCol = max(nightGrain(cNight, vP, fw) - vec3(0.004, 0.006, 0.012), vec3(0.0)) * 0.75 * mix(1.0, (0.45 + 0.55 * cityMacro(vP)) * clamp(tMapG(uv), 0.0, 2.2) * 0.62, smoothstep(1.0, 0.4, earthK));
      }
      if (sky > 0.0 && earthK < 1.0) {
        vec2 wL = 300.0 * vec2(n2(vP / 1500.0 + 4.0), n2(vP / 1500.0 + 23.0)) + 90.0 * vec2(n2(vP / 480.0 + 31.0), n2(vP / 480.0 + 37.0));
        vec2 idB, pB = vP + wL;
        float dB = vor(pB, 1500.0, idB);
        float brk1 = smoothstep(0.30, 0.44, n2(q.yx / 3100.0 + 3.0)), brk2 = smoothstep(0.30, 0.44, n2(q / 3500.0 + 13.0));
        vec2 qL = q + vec2(1150.0, 830.0) + 380.0 * vec2(n2(vP / 4300.0 + 61.0), n2(vP / 4300.0 + 67.0));
        float lA = max(aLine(abs(fract(qL.x / 2600.0 + 0.5) - 0.5) * 2600.0, 10.0, fw) * brk1, aLine(abs(fract(qL.y / 2900.0 + 0.5) - 0.5) * 2900.0, 10.0, fw) * brk2);
        float lB = aLine(dB, 6.0, fw) * smoothstep(0.46, 0.62, n2(pB / 1300.0 + 13.0));
        // each district has its own direction and size of street, cut into pieces: T junctions and dead ends, no weave across the city
        float th = h21(idB + 3.1) * 3.14159, S0 = mix(130.0, 250.0, h21(idB + 1.1)), cT = cos(th), sT = sin(th);
        vec2 qd = mat2(cT, -sT, sT, cT) * (vP + wL * 0.35) + 300.0 * vec2(h21(idB + 2.2), h21(idB + 4.4));
        float cut1 = smoothstep(0.34, 0.5, n2(qd / (S0 * 2.3) + 19.0)), cut2 = smoothstep(0.34, 0.5, n2(qd.yx / (S0 * 2.7) + 29.0));
        float lC = max(road(qd.x, qd.y, S0, 3.0, fw) * cut1, road(qd.y, qd.x, S0 * 1.37, 3.0, fw) * cut2);
        // the avenue the cafe stands on is a lit road like the others, never a dark trench
        float av = aLine(abs(vP.y - 23.15), 15.0, fw) * (1.0 - smoothstep(2600.0, 6500.0, abs(vP.x)));
        aRoad = (lA * 0.30 + lB * 0.08 + lC * 0.03) * (0.45 + 1.1 * n2(vP / 1400.0 + 71.0)) + av * 0.42;
        // a block's own brightness, along its district's streets. Parks are soft gaps with no outline
        vec2 idC = floor(qd / vec2(S0, S0 * 1.37));
        float vC = h21(idC + 1.7), lodC = smoothstep(2.0, 6.0, S0 / fw);
        aVar = mix(1.0, 0.72 + 0.56 * vC, lodC) * (0.90 + 0.20 * h21(idB + 5.1));
        vec2 mPk = mat2(0.81, -0.59, 0.59, 0.81) * vP;
        aPark = 0.20 + 0.80 * smoothstep(0.16, 0.50, n2(mPk / 1500.0 + 41.0) * 0.72 + n2(mPk / 410.0 + 51.0) * 0.28);
        aGap = mix(aPark, 1.0, exp(-len * len / (1500.0 * 1500.0)));   // no park gap under the cafe's neighbourhood: the camera stays centred on it
      }
      float dist = length(uEyeW - vec3(vP.x, 0.0, vP.y));
      float nearFade = smoothstep(70.0, 450.0, dist);          // close up the lamps are the 3D lights, not spots on the ground
      // the Han's distance field: one tap away from it, a smooth cubic near it, so its edge has no facets
      vec4 rv = texture2D(tRiver, uv);
      if (rv.b < 4000.0) rv.rgb = cubicTex(tRiver, uv, vec2(${RIVER_S.toFixed(1)}));
      float along = rv.g * 2.0;
      float hwR = 350.0 + 300.0 * n2(vec2(along / 6800.0, 3.0)) + 70.0 * n2(vec2(along / 2300.0, 8.0)) + 900.0 * smoothstep(-24000.0, -70000.0, along) - 170.0 * smoothstep(28000.0, 60000.0, along);
      float dE = max(abs(rv.r), rv.b) - hwR, wm = smoothstep(fw * 0.7 + 1.0, -fw * 0.7 - 1.0, dE);
      float park = mix(0.16, 1.0, smoothstep(30.0, 180.0 + 240.0 * n2(vec2(along / 3100.0, 6.0)), dE));   // riverside parks of changing width: the lights stop before the water
      vec3 col = vec3(0.0), colAir = vec3(0.0), ground = vec3(0.0), roadc = vec3(1.0, 0.66, 0.34);
      vec2 p1 = mat2(0.94, -0.34, 0.34, 0.94) * vP, p2 = mat2(0.82, 0.57, -0.57, 0.82) * vP;
      if (sky < 1.0) {
        // density: the map, broken up by a multiplicative cascade that goes all the way down to the pixel, so distance gives grain and not fog
        float m = 1.0;
        m *= mix(1.0, 0.2 + 1.6 * n2(vP / 2300.0), smoothstep(1.0, 3.0, 2300.0 / fw));
        m *= mix(1.0, 0.2 + 1.6 * n2(vP / 640.0 + 7.0), smoothstep(1.0, 3.0, 640.0 / fw));
        m *= mix(1.0, 0.15 + 1.7 * n2(vP / 170.0 + 3.0), smoothstep(1.0, 3.0, 170.0 / fw));
        m *= mix(1.0, 0.15 + 1.7 * n2(vP / 44.0 + 5.0), smoothstep(1.0, 3.0, 44.0 / fw));
        float dens = clamp(pow(rho, 1.18) * 1.5 * m * park, 0.0, 1.8);
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
        if (earthK < 1.0) {
          // the same light as the map, its mean kept at every height: masses of the map, then districts, then single lights
          float mass = clamp(tMapG(uv), 0.0, 2.2), cs = cityMacro(vP) * mix(1.0, mass, 0.9) * aVar * aGap * park;
          gFlat = 0.10 + 0.9 * earthK * earthK * earthK; gBoost = mix(1.6, 1.0, earthK);
          vec3 li = LMC * 0.05 * mix(0.45, 1.0, earthK) + 0.31 * lights(vP, 880.0, fw, 1.0, 0.8) + 0.26 * lights(p1, 230.0, fw, 21.0, 0.8) + 0.20 * lights(p2, 62.0, fw, 41.0, 0.75) + 0.14 * lights(p1 * 0.7 + p2 * 0.3, 21.0, fw, 61.0, 0.6);
          colAir = Lm * 0.675 * cs * li / 0.75 + vec3(1.0, 0.68, 0.38) * aRoad * sqrt(Lm + 0.02) * 0.8 + vec3(0.0035, 0.003, 0.0032);
        }
        colAir = mix(colAir, earthCol, earthK);
        col = mix(col, colAir, sky);
      }
      // the Han: dark water with a soft sheen, the banks' lights lying on it as broken streaks toward the eye, lit embankment roads with gaps, a few thin bridges. It comes out of the picture as the Earth's map gives way
      if (riverK > 0.0) {
        float rip = mix(0.5, n2(p1 / vec2(150.0, 42.0)) * 0.6 + n2(p2 / vec2(70.0, 19.0)) * 0.4, smoothstep(1.0, 3.0, 34.0 / fw));
        float glow = sqrt(rho + 0.02);
        vec2 vd = normalize(vP - uEyeW.xz + vec2(1e-3)), vs = vec2(-vd.y, vd.x);
        float streak = n2(vec2(dot(vP, vs) / (38.0 + fw * 1.4), dot(vP, vd) / 900.0 + 3.0)), st3 = streak * streak * streak;
        float bankN = exp(min(dE, 0.0) / 95.0);
        vec3 water = vec3(0.0022, 0.0036, 0.0072) * (0.7 + 0.8 * rip) + vec3(1.0, 0.62, 0.32) * glow * (0.0012 + bankN * (0.008 + 0.20 * st3)) * (0.5 + 1.0 * rip);
        col = mix(col, water, wm * riverK);
        float lwE = max(7.0, fw * 0.7), eR = dE - 34.0, eB = dE - 1.0, lwB = max(2.5, fw * 0.7), rn = 0.22 + 1.1 * n2(vec2(along / 1300.0, 2.0)), rb = smoothstep(0.34, 0.6, n2(vec2(along / 620.0, rv.r > 0.0 ? 7.0 : 11.0)));
        col += riverK * vec3(1.0, 0.70, 0.40) * sqrt(rho + 0.03) * ((7.0 / lwE) * exp(-eR * eR / (lwE * lwE)) * 0.30 * rn + (2.5 / lwB) * exp(-eB * eB / (lwB * lwB)) * 0.05 * rb);
        if (dE < 260.0) { float bd = 1e12, bt = 0.0;
          for (int i = 0; i < ${HAN_BR_N}; i++) { vec2 a = uBr[i].xy, e = uBr[i].zw - a; float u = clamp(dot(vP - a, e) / dot(e, e), 0.0, 1.0); vec2 dd = vP - a - e * u; float qq = dot(dd, dd); if (qq < bd) { bd = qq; bt = u * length(e); } }
          float wb = max(15.0, fw * 0.72), lampB = mix(0.72, 0.30 + 1.3 * exp(-pow(abs(fract(bt / 42.0) - 0.5) * 42.0, 2.0) / max(fw * fw, 16.0)), smoothstep(16.0, 6.0, fw));
          col += riverK * vec3(1.0, 0.72, 0.44) * (15.0 / wb) * exp(-bd / (wb * wb)) * lampB * 0.42 * smoothstep(260.0, 30.0, dE); }
      }
      col *= mix(1.0, 0.5, smoothstep(5200.0, 900.0, uEyeW.y));   // as the buildings rise out of it the ground gives up the light they now carry
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
SV_READY.then(() => { CITY_MAP_U.value = bakeCityMap(); CITY_U.tPatch.value = SV_TEX.patch; CITY_U.uPS.value.set(SV_TEX.patch.image.width, SV_TEX.patch.image.height); });

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
      if (farL > 0.0) { farC = cityMean(cityDens(texture2D(tMap, vC0 / uHalf * 0.5 + 0.5).r, vC0)) * (0.022 + 0.04 * tC); if (N.y < 0.5) farC *= 0.8; }
      if (farL >= 0.999) { vec2 fp = (N.y > 0.5 ? vL.xz : vec2(abs(N.z) > 0.5 ? vL.x : vL.z, vY)) / vec2(3.1, 3.5), fi = floor(fp), ff = fract(fp) - 0.5; float pxF = max(length(dFdx(fp)), length(dFdy(fp))), sl = step(0.84, h21(fi + s)) * (1.0 - smoothstep(0.16 + pxF, 0.3 + pxF, max(abs(ff.x), abs(ff.y)))) * (1.0 - smoothstep(0.4, 0.9, pxF));
        gl_FragColor = vec4(min(farC + vec3(1.0, 0.70, 0.42) * sl * (0.12 + 0.45 * h21(fi + s + 3.3)), vec3(2.0)), 1.0); return; }
      // every building has its own kind of front
      float st = h21(vec2(s, 13.7)), fhU = mix(2.95, 4.2, h21(vec2(s, 21.1)) * h21(vec2(s, 27.3)));
      bool glassy = st > 0.80 && vHalf.y > 12.0, ribbon = st < 0.20, slit = st >= 0.20 && st < 0.36, balc = st >= 0.36 && st < 0.56;
      vec3 palA = tC < 0.33 ? vec3(0.30, 0.16, 0.12) : tC < 0.66 ? vec3(0.34, 0.31, 0.27) : vec3(0.46, 0.43, 0.38);
      vec3 alb = glassy ? vec3(0.07, 0.08, 0.095) : mix(palA, vec3(0.24, 0.22, 0.20), tA * 0.7);
      float top = vY - vL.y + vHalf.y;
      if (N.y > 0.5) { float e = min(vHalf.x - abs(vL.x), vHalf.z - abs(vL.z)), par = smoothstep(0.5, 0.42, e);
        vec2 rid = floor(vL.xz / 6.0); vec2 rf0 = abs(fract(vL.xz / 6.0) - 0.5) * 6.0; float rl = step(0.97, h21(rid + s)) * smoothstep(0.75, 0.68, max(rf0.x, rf0.y));
        vec3 c = mix(vec3(0.0060, 0.0058, 0.0062) * (0.55 + 0.9 * n2(vL.xz * 0.35 + s)) * (0.7 + 0.8 * tA), alb * vec3(0.040, 0.042, 0.048), par) + vec3(1.0, 0.72, 0.42) * rl * 0.10 + vec3(0.011, 0.0085, 0.0065) * smoothstep(220.0, 800.0, length(vV));
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
      // piers every few bays, a slab edge at each floor with its shadow under it, a cornice at the top, a darker fascia over the shops
      float pierEvery = isGF ? 1.0 : 3.0;
      float pier = glassy ? 0.0 : (1.0 - step(0.5, mod(idx, pierEvery))) * (smoothstep(0.13, 0.09, fx)) + smoothstep(0.42, 0.30, W - abs(a));
      float slab = isGF ? 0.0 : smoothstep(0.075, 0.055, fy), shade = isGF ? 0.0 : smoothstep(0.075, 0.09, fy) * smoothstep(0.125, 0.09, fy);
      wall *= (1.0 + (ribbon ? 0.08 : 0.2) * clamp(pier, 0.0, 1.0)) * (1.0 + (ribbon ? 0.45 : 0.22) * slab) * (1.0 - 0.32 * shade);
      float crn = smoothstep(top - 0.55, top - 0.5, Y); wall *= 1.0 + 0.6 * crn; wall *= 1.0 - 0.5 * smoothstep(top - 0.55, top - 0.62, Y) * smoothstep(top - 0.72, top - 0.62, Y);
      // over each shop: a band of awning, then a blank sign board with no lettering
      vec3 shopTint = vec3(0.0); float shopSign = 0.0, shopAwn = 0.0;
      if (isGF) { float hs = h21(vec2(idx + 0.5, s + 9.0)); shopSign = smoothstep(0.86, 0.865, fy) * smoothstep(0.985, 0.98, fy) * smoothstep(0.0, 0.03, fx) * smoothstep(1.0, 0.97, fx); shopAwn = smoothstep(0.745, 0.75, fy) * smoothstep(0.86, 0.855, fy) * step(0.3, hs);
        vec3 awn = hs < 0.5 ? vec3(0.20, 0.05, 0.04) : hs < 0.75 ? vec3(0.05, 0.14, 0.09) : vec3(0.28, 0.24, 0.17); awn *= 0.7 + 0.3 * step(0.5, fract(a / 0.7));
        wall = mix(wall, awn * light * 2.6, shopAwn); wall = mix(wall, mix(vec3(0.20, 0.17, 0.13), vec3(0.34, 0.30, 0.24), hs) * (0.35 + 0.65 * step(0.35, fract(hs * 7.3))), shopSign); }
      if (Y > GF - 0.02 && Y < GF + 0.09) wall *= 1.5;
      // what shows in the window
      vec2 cid = vec2(idx + floor(s * 3.0) * 13.0, idy + (isGF ? 40.0 : 0.0));
      // what is lit comes in clusters, by floors and by columns, never an even salt and pepper
      float litF = isGF ? 0.78 : (glassy ? step(0.62, h21(vec2(idy, s * 2.1))) * 0.8 + 0.05 : mix(0.10, 0.44, tC) * (0.25 + 1.5 * n2(vec2(idx * 0.42 + s * 5.0, idy * 0.66 + s * 3.0))));
      float lit = step(1.0 - litF, h21(cid + vec2(s * 3.1, 0.0)));
      float lev = (isGF ? 0.75 : 0.22) + (isGF ? 0.5 : 0.8) * pow(h21(cid + 7.7 + s), 2.0), tk = h21(cid + 3.3 + s);
      vec3 tint = (tk < 0.52 ? vec3(1.0, 0.68, 0.38) : tk < 0.82 ? vec3(1.0, 0.84, 0.62) : tk < 0.96 ? vec3(0.84, 0.92, 1.0) : vec3(0.52, 0.66, 1.0)) * lev;
      vec2 q = (f2 - 0.5) * vec2(BW, fh), hw = vec2(BW, fh) * 0.5;
      vec3 inner = lit > 0.5 ? roomAt(q, hw, ray, isGF ? 6.0 : 4.0, tint, s + idx) : roomAt(q, hw, ray, 4.0, vec3(0.012, 0.012, 0.015), s + idx);
      float bl = h21(cid + 2.3 + s), blindY = mix(0.86, 0.34, h21(cid + 4.4 + s));
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
      const bf = Math.min(1, Math.max(0, (r0 - 420) / 400)), j1 = rj(), j2 = rj(), j3 = rj(), j4 = rj(), j5 = rj(), j6 = rj(), j7 = rj(); let ba = 0, hk = 1;
      if (bf > 0) { const ox = x, oz = z; x += bf * (320 * (vn(ox / 860, oz / 860) - 0.5) + 64 * (j1 - 0.5)); z += bf * (320 * (vn(ox / 860 + 9, oz / 860 + 4) - 0.5) + 64 * (j2 - 0.5));
        ba = bf * (1.7 * (vn(x / 1300 + 5, z / 1300) - 0.5) + 0.5 * (j3 - 0.5)); w *= 1 + bf * (0.85 * j4 - 0.42); d *= 1 + bf * (0.85 * j5 - 0.42); hk = 1 + bf * (2.1 * j6 * j6 - 0.42);
        if (bf > 0.4 && (vn(x / 640 + 31, z / 640 + 7) < 0.33 || j7 < 0.12)) continue; }
      if (empty < 0.07) continue;
      // the avenue and the cafe's own block stay clear; the far side of the avenue is built up, low enough for the camera's way down
      if (Math.abs(x) < 3200 && Math.abs(ba) < 2 && z + d / 2 > -2 && z - d / 2 < 47) { const back = z + d / 2; if (back < 62) continue; if (Math.abs(ba) > 0.05) continue; d = back - 47.5; z = 47.5 + d / 2; }
      if (Math.abs(x) < 200 && z > -30 && z < 47) continue;
      if (r0 > 2500 && (r0 > 5800 || j7 < 0.3)) continue;
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
  for (const b of CITY_BLOCKS) listFar.push(b);
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
  { const signM = new THREE.MeshStandardMaterial({ color: 0x3b4a3f, roughness: 0.55, envMapIntensity: 0.25, emissive: new THREE.Color(0.05, 0.062, 0.05) }); fb(5.4, 0.30, 0.03, signM, 0, 2.985, 2.915); fb(5.48, 0.02, 0.04, iron, 0, 3.145, 2.915); fb(5.48, 0.02, 0.04, iron, 0, 2.825, 2.915); }
  // the door, in the right-hand bay: a glazed leaf in a dark frame with a kick plate and a long brass pull, on a stone step. The camera's way in is well to its left
  { const brass = new THREE.MeshStandardMaterial({ color: 0xa67c3a, metalness: 0.75, roughness: 0.38, envMapIntensity: 0.6, emissive: new THREE.Color(0.10, 0.065, 0.025) }), kick = new THREE.MeshStandardMaterial({ color: 0x2a2622, metalness: 0.5, roughness: 0.5, envMapIntensity: 0.4 });
    const X0 = 2.0, W0 = 0.98, Z0 = 2.80; fb(0.07, 2.22, 0.06, iron, X0 - W0 / 2, 1.11, Z0); fb(0.07, 2.22, 0.06, iron, X0 + W0 / 2, 1.11, Z0); fb(W0 + 0.07, 0.08, 0.06, iron, X0, 2.2, Z0); fb(W0, 0.44, 0.04, kick, X0, 0.27, Z0); fb(W0, 0.05, 0.06, iron, X0, 0.5, Z0);
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
