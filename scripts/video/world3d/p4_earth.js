
/* =====================================================================================
   4. EARTH — NASA Blue Marble (day) and Black Marble 2016 (night), one key light from the set sun, an analytic atmosphere, stars.
   Drawn first, without depth; everything nearer draws over it.
   ===================================================================================== */
const STAR_GROUP = new THREE.Group(); scene.add(STAR_GROUP);
const STAR_MB_ZOOM = 0.009, STAR_MB_AMT = 0.55;
{
  const rnd = mulberry32(7), N = 7000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    pos.set([s * Math.cos(a) * 3000, u * 3000, s * Math.sin(a) * 3000], i * 3);
    const m = Math.pow(rnd(), 6), tint = rnd();
    const c = tint < 0.2 ? [1, 0.82, 0.68] : tint < 0.5 ? [0.78, 0.86, 1] : [1, 0.97, 0.93], b = 0.14 + m * 2.6;
    col.set(c.map(x => x * b), i * 3); sz[i] = 1.25 + m * 1.9;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('sz', new THREE.BufferAttribute(sz, 1));
  const m = new THREE.ShaderMaterial({ uniforms: { uA: { value: 1 }, uPx: { value: 1 } }, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: false,
    vertexShader: `attribute float sz; attribute vec3 color; varying vec3 vC; uniform float uPx; void main(){ vC = color; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); gl_PointSize = sz * uPx; }`,
    fragmentShader: `varying vec3 vC; uniform float uA; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = exp(-r * r * 3.2) * smoothstep(1.0, 0.7, r); gl_FragColor = vec4(vC * a * uA, 1.0); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -30; STAR_GROUP.add(p); STAR_GROUP.userData.mat = m;
  // the post's zoom streak drew the stars out into radial lines (up to 2.2% of the frame, 42 px) and softened the globe's rim. While stars are in the frame it is held to STAR_MB_ZOOM (0.6% at the corners, about 12 px) at STAR_MB_AMT of the mix. Idempotent within a frame; the engine sets both afresh each frame
  p.onBeforeRender = () => { const u = mblurPass.uniforms; u.uZoom.value = Math.max(-STAR_MB_ZOOM, Math.min(STAR_MB_ZOOM, u.uZoom.value)); u.uAmt.value = Math.min(u.uAmt.value, STAR_MB_AMT); };
  noDepth(STAR_GROUP);
}
// the low sky: city-lit haze seen when the camera is near the ground
const SKY_MAT = new THREE.ShaderMaterial({ uniforms: { uA: { value: 0 } }, side: THREE.BackSide, depthTest: false, depthWrite: false, transparent: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec3 vD; uniform float uA; void main(){ vec3 d = normalize(vD);
    vec3 col = mix(vec3(0.034, 0.027, 0.030), vec3(0.0065, 0.009, 0.020), smoothstep(-0.02, 0.32, d.y)); col *= smoothstep(-0.25, 0.0, d.y) * 0.8 + 0.2;
    gl_FragColor = vec4(col * uA, 1.0); }` });
const SKY_MESH = noDepth(new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 20), SKY_MAT)); SKY_MESH.renderOrder = -40; SKY_MESH.frustumCulled = false; SKY_MESH.material.userData.thin = true; scene.add(SKY_MESH);

const EARTH_ROT = (() => {                                     // Earth-local (SphereGeometry + an equirectangular map) → the tangent frame at the cafe
  const la = SV_LAT * deg, lo = SV_LON * deg;
  const n = V3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo));
  const e = V3(-Math.sin(lo), 0, -Math.cos(lo));
  const nn = V3(-Math.sin(la) * Math.cos(lo), Math.cos(la), Math.sin(la) * Math.sin(lo));
  const m = new THREE.Matrix4();
  m.set(e.x, e.y, e.z, 0, n.x, n.y, n.z, 0, -nn.x, -nn.y, -nn.z, 0, 0, 0, 0, 1);
  return m;
})();
const CN_H = [90000, 14000, 3200], CN_GAIN = 2.3, CN_T = [{ value: null }, { value: null }, { value: null }];   // Seoul's night map, baked in p4b_city: three levels of one map
const CN_TK = { value: null };
const EARTH_U = { tCNK: CN_TK, tCN0: CN_T[0], tCN1: CN_T[1], tCN2: CN_T[2], tDay: { value: null }, tNight: { value: null }, tPatch: { value: null }, uSun: { value: V3(-0.74, -0.60, 0.16).normalize() }, uEye: { value: new THREE.Vector3() }, uExp: { value: 1 }, uNight: { value: 1.8 },
  uNS: { value: new THREE.Vector2(8192, 4096) }, uPS: { value: new THREE.Vector2(675, 600) },
  uP0: { value: new THREE.Vector2((118 + 180) / 360, (28 + 90) / 180) }, uP1: { value: new THREE.Vector2((136 + 180) / 360, (44 + 90) / 180) } };
// the night lights of the map as the Earth shows them and as Seoul's field starts out: the same function in both, so the field takes over the Earth's picture with no change of look
const NIGHT_GLSL = `
    // cubic B-spline from four bilinear taps: magnified map texels melt into smooth gradients, with no square texels and no bilinear diamonds
    vec3 cubicTex(sampler2D t, vec2 uv, vec2 sz){
      vec2 st = uv * sz - 0.5, i = floor(st), f = st - i, f2 = f * f, f3 = f2 * f;
      vec2 w0 = (1.0 - f) * (1.0 - f) * (1.0 - f) / 6.0, w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0, w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0, w3 = f3 / 6.0;
      vec2 g0 = w0 + w1, g1 = w2 + w3, h0 = (i - 1.0 + w1 / g0 + 0.5) / sz, h1 = (i + 1.0 + w3 / g1 + 0.5) / sz;
      return mix(mix(textureLod(t, vec2(h0.x, h0.y), 0.0).rgb, textureLod(t, vec2(h1.x, h0.y), 0.0).rgb, g1.x / (g0.x + g1.x)),
                 mix(textureLod(t, vec2(h0.x, h1.y), 0.0).rgb, textureLod(t, vec2(h1.x, h1.y), 0.0).rgb, g1.x / (g0.x + g1.x)), g1.y / (g0.y + g1.y));
    }
    float eh(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    float wbN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(eh(i), eh(i + vec2(1, 0)), f.x), mix(eh(i + vec2(0, 1)), eh(i + vec2(1, 1)), f.x), f.y); }
    float wbR(vec2 p){ return 1.0 - abs(2.0 * wbN(p) - 1.0); }
    // the 3 km map sharpened against a wider blur of itself: clusters of light tighten and the fog between them goes dark
    vec3 nightSharp(vec3 nc, vec3 wide){ return max(nc + (nc - wide) * 0.6 - 0.008, vec3(0.0)); }
    // Seoul's night map at this place: the level that suits the pixel, and the air's glow over its bright districts
    vec3 cityNight(vec2 p, float fw, sampler2D t0, sampler2D t1, sampler2D t2){
      vec2 u0 = p / ${(2 * CN_H[0]).toFixed(1)} + 0.5; float m = max(abs(p.x), abs(p.y));
      vec3 c = texture(t0, u0).rgb, c1 = texture(t1, p / ${(2 * CN_H[1]).toFixed(1)} + 0.5).rgb, c2 = texture(t2, p / ${(2 * CN_H[2]).toFixed(1)} + 0.5).rgb;
      c = mix(c, c1, smoothstep(${CN_H[1].toFixed(1)}, ${(0.86 * CN_H[1]).toFixed(1)}, m) * smoothstep(80.0, 34.0, fw));
      c = mix(c, c2, smoothstep(${CN_H[2].toFixed(1)}, ${(0.86 * CN_H[2]).toFixed(1)}, m) * smoothstep(13.0, 6.0, fw));
      return c + textureLod(t0, u0, 4.0).rgb * 0.10;
    }`;
const EARTH_MAT = new THREE.ShaderMaterial({ uniforms: EARTH_U, depthTest: false, depthWrite: false,
  vertexShader: `varying vec3 vN; varying vec3 vL; void main(){ vL = position; vN = normalize(mat3(modelMatrix) * position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDay, tNight, tPatch, tCN0, tCN1, tCN2, tCNK; uniform vec3 uSun, uEye; uniform vec2 uP0, uP1, uNS, uPS; uniform float uExp, uNight; varying vec3 vN; varying vec3 vL;
    ${NOISE_GLSL}
    ${NIGHT_GLSL}
    void main(){
      vec3 N = normalize(vN), V = normalize(uEye - N), Ln = normalize(vL);
      float ndl = dot(N, uSun);
      // per-pixel map coordinates (not interpolated across the mesh's flat triangles, whose edges showed as diagonal lines)
      vec2 uv = vec2(atan(Ln.z, -Ln.x) / 6.283185307 + 0.5, 1.0 - acos(clamp(Ln.y, -1.0, 1.0)) / 3.141592654);
      uv.x = fract(uv.x + 0.5);
      vec2 dx = dFdx(uv), dy = dFdy(uv); dx.x = fract(dx.x + 0.5) - 0.5; dy.x = fract(dy.x + 0.5) - 0.5;
      vec3 dc = textureGrad(tDay, uv, dx, dy).rgb;
      float cl = smoothstep(0.50, 0.74, fbm(N * 5.5 + vec3(3.1, 1.7, 0.4) + 0.6 * vnoise(N * 14.0), 5));
      vec3 surf = mix(dc * 1.2, vec3(0.92), cl * 0.72);
      vec3 lit = surf * clamp(ndl * 1.05 + 0.04, 0.0, 1.0) * 1.9;
      vec3 Hh = normalize(V + uSun);
      float wet = smoothstep(0.02, 0.08, dc.b - dc.g) * (1.0 - cl);
      lit += vec3(1.0, 0.92, 0.8) * pow(max(dot(N, Hh), 0.0), 120.0) * 0.55 * wet;
      vec3 nl = textureGrad(tNight, uv, dx, dy).rgb;
      float lod = log2(max(length(dx * uNS), length(dy * uNS)) + 1e-6);
      float mag = smoothstep(0.2, -0.8, lod);
      if (mag > 0.0) {
        vec3 nc = cubicTex(tNight, uv, uNS);
        // the 3 km map over East Asia: finer than the world map, feathered at its edges
        vec2 pu = (uv - uP0) / (uP1 - uP0), pe = min(pu, 1.0 - pu);
        float pm = smoothstep(0.0, 0.05, min(pe.x, pe.y));
        if (pm > 0.0) { vec2 lp = pu * uPS; float lodP = log2(max(length(dFdx(lp)), length(dFdy(lp))) + 1e-6); nc = mix(nc, nightSharp(cubicTex(tPatch, pu, uPS), textureLod(tPatch, pu, max(lodP + 2.0, 1.5)).rgb), pm); }
        // map metres of the same tangent frame as the Seoul field, so the lights seen here are in the same places there
        vec2 mp = vec2((uv.x * 360.0 - 180.0 - ${SV_LON.toFixed(3)}) * 88000.0, (${SV_LAT.toFixed(3)} - (uv.y * 180.0 - 90.0)) * 111000.0);
        float mfw = length(vec2(length(dFdx(mp)), length(dFdy(mp)))) * 0.75;
        // past the map's resolution: the map's texels resolved into their own lights (baked in p4b_city). The lit fence along the demilitarised zone and the string of towns on the east coast are held far back there: as thin dotted lines at this size they read as the edge of a clipped shape
        vec3 web = texture(tCNK, pu).rgb * 4.0 * smoothstep(0.0, 0.02, min(pe.x, pe.y));
        nl = mix(max(nl - vec3(0.004, 0.006, 0.012), 0.0), mix(max(nc - vec3(0.004, 0.006, 0.012), 0.0), web, pm * smoothstep(-0.9, -2.0, lod)), mag);
        float kb = smoothstep(86000.0, 58000.0, length(mp)) * smoothstep(1500.0, 520.0, mfw);
        if (kb > 0.0) nl = mix(nl, cityNight(mp, mfw, tCN0, tCN1, tCN2) * ${CN_GAIN.toFixed(3)}, kb);
      } else nl = max(nl - vec3(0.004, 0.006, 0.012), 0.0);
      // the map has a hard-edged rectangle of fishing-fleet light in the East China Sea: that was the straight 'seam'. Open water here, feathered
      vec2 ll = vec2(uv.x * 360.0 - 180.0, uv.y * 180.0 - 90.0), sb = smoothstep(vec2(125.6, 29.8), vec2(125.95, 30.15), ll) * smoothstep(vec2(128.9, 33.05), vec2(128.55, 32.8), ll);
      nl *= 1.0 - sb.x * sb.y;
      float night = 1.0 - smoothstep(-0.10, 0.10, ndl);
      // the night side is never a black disc: a thin moon from above-left lights its clouds and seas, with a broad sheen, so the globe keeps its form
      float mn = max(dot(N, normalize(vec3(-0.25, 0.62, 0.74))), 0.0);
      vec3 moon = ((surf * vec3(0.62, 0.74, 1.0) * 0.058 + vec3(0.0035, 0.0065, 0.014)) * (0.25 + 0.75 * mn) + vec3(0.30, 0.42, 0.68) * pow(max(dot(N, normalize(V + vec3(-0.25, 0.62, 0.74))), 0.0), 26.0) * 0.012 * (1.0 - cl)) * smoothstep(-3.0, -0.6, lod);
      vec3 col = lit + nl * uNight * night + mix(surf * 0.0075, moon, night);
      float f = pow(1.0 - max(dot(N, V), 0.0), 4.0);
      col += mix(vec3(0.030, 0.062, 0.135), vec3(0.22, 0.45, 0.95), smoothstep(-0.25, 0.3, ndl)) * f * 0.9;
      gl_FragColor = vec4(col * uExp, 1.0);
    }` });
const EARTH_MESH = new THREE.Mesh(new THREE.SphereGeometry(SV_R, 256, 160), EARTH_MAT);
EARTH_MESH.applyMatrix4(EARTH_ROT); EARTH_MESH.position.copy(EARTH_C); EARTH_MESH.renderOrder = -20; EARTH_MESH.name = 'Earth';
universe.add(EARTH_MESH);
const ATM_MAT = new THREE.ShaderMaterial({ uniforms: { uSun: EARTH_U.uSun, uEye: EARTH_U.uEye, uA: { value: 1 } }, side: THREE.BackSide, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: false,
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(mat3(modelMatrix) * position) * 1.05; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec3 vP; uniform vec3 uEye, uSun; uniform float uA; void main(){
    vec3 d = normalize(vP - uEye); float tca = -dot(uEye, d); vec3 pc = uEye + d * max(tca, 0.0); float b = length(pc), H = 0.018;
    float a = b > 1.0 ? exp(-(b - 1.0) / H * 2.1) : exp(-(1.0 - b) / (H * 1.2)) * 0.8;
    float s = dot(pc / b, uSun);
    vec3 col = mix(vec3(0.010, 0.026, 0.064), vec3(0.26, 0.54, 1.15) * 1.45, smoothstep(-0.06, 0.34, s));
    col += vec3(1.0, 0.40, 0.15) * exp(-pow((s + 0.03) / 0.07, 2.0)) * 0.85;
    gl_FragColor = vec4(col * a * uA, 1.0); }` });
const ATM_MESH = noDepth(new THREE.Mesh(new THREE.SphereGeometry(SV_R * 1.05, 128, 80), ATM_MAT)); ATM_MESH.position.copy(EARTH_C); ATM_MESH.renderOrder = -19; ATM_MESH.material.userData.thin = true; universe.add(ATM_MESH);
SV_READY.then(() => { EARTH_U.tDay.value = SV_TEX.day; EARTH_U.tNight.value = SV_TEX.night; EARTH_U.tPatch.value = SV_TEX.patch; SV_TEX.patch.wrapS = SV_TEX.patch.wrapT = THREE.ClampToEdgeWrapping; EARTH_U.uNS.value.set(SV_TEX.night.image.width, SV_TEX.night.image.height); EARTH_U.uPS.value.set(SV_TEX.patch.image.width, SV_TEX.patch.image.height); });
