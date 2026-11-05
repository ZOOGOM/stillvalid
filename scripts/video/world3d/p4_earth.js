
/* =====================================================================================
   4. EARTH — NASA Blue Marble (day) and Black Marble 2016 (night), one key light from the set sun, an analytic atmosphere, stars.
   Drawn first, without depth; everything nearer draws over it.
   ===================================================================================== */
const STAR_GROUP = new THREE.Group(); scene.add(STAR_GROUP);
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
const EARTH_U = { tDay: { value: null }, tNight: { value: null }, tPatch: { value: null }, uSun: { value: SUN_DIR.clone() }, uEye: { value: new THREE.Vector3() }, uExp: { value: 1 }, uNight: { value: 1.8 },
  uNS: { value: new THREE.Vector2(8192, 4096) }, uPS: { value: new THREE.Vector2(675, 600) },
  uP0: { value: new THREE.Vector2((118 + 180) / 360, (28 + 90) / 180) }, uP1: { value: new THREE.Vector2((136 + 180) / 360, (44 + 90) / 180) } };
const EARTH_MAT = new THREE.ShaderMaterial({ uniforms: EARTH_U, depthTest: false, depthWrite: false,
  vertexShader: `varying vec3 vN; varying vec3 vL; void main(){ vL = position; vN = normalize(mat3(modelMatrix) * position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDay, tNight, tPatch; uniform vec3 uSun, uEye; uniform vec2 uP0, uP1, uNS, uPS; uniform float uExp, uNight; varying vec3 vN; varying vec3 vL;
    ${NOISE_GLSL}
    // cubic B-spline from four bilinear taps: magnified map texels melt into smooth gradients, with no square texels and no bilinear diamonds
    vec3 cubicTex(sampler2D t, vec2 uv, vec2 sz){
      vec2 st = uv * sz - 0.5, i = floor(st), f = st - i, f2 = f * f, f3 = f2 * f;
      vec2 w0 = (1.0 - f) * (1.0 - f) * (1.0 - f) / 6.0, w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0, w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0, w3 = f3 / 6.0;
      vec2 g0 = w0 + w1, g1 = w2 + w3, h0 = (i - 1.0 + w1 / g0 + 0.5) / sz, h1 = (i + 1.0 + w3 / g1 + 0.5) / sz;
      return mix(mix(textureLod(t, vec2(h0.x, h0.y), 0.0).rgb, textureLod(t, vec2(h1.x, h0.y), 0.0).rgb, g1.x / (g0.x + g1.x)),
                 mix(textureLod(t, vec2(h0.x, h1.y), 0.0).rgb, textureLod(t, vec2(h1.x, h1.y), 0.0).rgb, g1.x / (g0.x + g1.x)), g1.y / (g0.y + g1.y));
    }
    float eh(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
    // one octave of point lights in map metres, mean 1 at every scale: it is flat 1 while a cell is smaller than a few pixels, so nothing pops
    float speck(vec2 p, float cell, float fw, float seed){
      float k = smoothstep(2.2, 6.0, cell / fw); if (k <= 0.0) return 1.0;
      vec2 g = p / cell, id = floor(g), f = fract(g) - 0.5, o = (vec2(eh(id + seed), eh(id + seed + 7.7)) - 0.5) * 0.5;
      float r = clamp(fw / cell * 0.8, 0.05, 0.16), d = dot(f - o, f - o);
      float a = min(exp(-d / (r * r)) / (3.14159 * r * r), 9.0) * (0.35 + 1.3 * eh(id + seed + 5.5));
      return mix(1.0, a, k);
    }
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
        if (pm > 0.0) nc = mix(nc, cubicTex(tPatch, pu, uPS), pm);
        // map metres of the same tangent frame as the Seoul field, so the lights seen here are in the same places there
        vec2 mp = vec2((uv.x * 360.0 - 180.0 - ${SV_LON.toFixed(3)}) * 88000.0, (${SV_LAT.toFixed(3)} - (uv.y * 180.0 - 90.0)) * 111000.0);
        float mfw = length(vec2(length(dFdx(mp)), length(dFdy(mp)))) * 0.75;
        float s1 = speck(mp, 7000.0, mfw, 2.0), s2 = speck(mp * mat2(0.94, -0.34, 0.34, 0.94), 3100.0, mfw, 13.0), s3 = speck(mp * mat2(0.82, 0.57, -0.57, 0.82), 1300.0, mfw, 29.0);
        float sp = 0.16 + 0.84 * (0.22 * s1 + 0.33 * s2 + 0.45 * s3);
        vec3 grain = nc * sp + 0.55 * nc * nc * (sp - 1.0);
        nl = mix(nl, max(grain, vec3(0.0)), mag);
      }
      nl = max(nl - vec3(0.004, 0.006, 0.012), 0.0);
      float night = 1.0 - smoothstep(-0.10, 0.10, ndl);
      vec3 col = lit + nl * uNight * night + surf * 0.0075;
      float f = pow(1.0 - max(dot(N, V), 0.0), 4.0);
      col += mix(vec3(0.010, 0.022, 0.05), vec3(0.22, 0.45, 0.95), smoothstep(-0.25, 0.3, ndl)) * f * 0.9;
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
