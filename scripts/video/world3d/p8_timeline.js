
/* =====================================================================================
   8. TIMELINE — one continuous camera, 74 s of real playback time (every beat plays at speed 1, so τ = playback seconds).
   ACT1 0–16 Earth → Seoul → window → phone. ACT2 16–56 phone → five cards → phone. ACT3 56–74 phone → table → window → Seoul → Earth.
   ACT3 walks ACT1's path backwards (same poses), at a rate that never passes 3 e-folds/s. Last frame = first frame.
   ===================================================================================== */
/* =====================================================================================
   7b. FILM'S FINISHING, on top of the engine's p7 (which stays word for word): depth of field after the scene render; bloom threshold 3.0;
   a neutral tone curve (identity below 0.85, so unlit recorded images keep their colours) + sRGB in place of the engine's output pass;
   grain 0.010; last, in display space, the vignette, the planned dark areas and the exact IN-pose composite.
   ===================================================================================== */
// depth of field: golden-angle gather with the thin-lens circle of confusion. Target distance = 1 (floating origin). Pixels with no opaque
// geometry behind them (depth = 1) stay sharp, so the light field's own discs stay crisp discs.
const DOF_DEPTH = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const DOF_DEPTH_MAT = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, blending: THREE.NoBlending });
// The colour is multisampled and the depth is not, so the anti-aliased rim of anything in focus has the depth of what lies behind it: a far pixel's gather took those bright rim
// pixels as far samples, one disc in a noise pattern, which printed a hatched fringe around every card, cup and glass. The gather therefore reads the nearest depth of each 3 x 3.
const DOF_NEAR = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
const DOF_NEAR_PASS = new ShaderPass({
  uniforms: { tDepth: { value: null }, uPx: { value: new THREE.Vector2(1 / 1920, 1 / 1080) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `#include <packing>
    uniform sampler2D tDepth; uniform vec2 uPx; varying vec2 vUv;
    void main(){ float d = 1.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) d = min(d, unpackRGBAToDepth(texture2D(tDepth, vUv + vec2(float(x), float(y)) * uPx)));
      gl_FragColor = d >= 0.99999 ? vec4(1.0) : packDepthToRGBA(d); }` }, 'tNotUsed');
DOF_NEAR_PASS.material.blending = THREE.NoBlending;
const DOF = {
  uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, uA: { value: 0 }, uF: { value: 1 }, uPx: { value: new THREE.Vector2(1 / 1920, 1 / 1080) }, uNear: { value: 1e-3 }, uFar: { value: 1e4 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `#include <packing>
    uniform sampler2D tDiffuse, tDepth; uniform float uA, uF, uNear, uFar; uniform vec2 uPx; varying vec2 vUv;
    float zAt(vec2 uv){ float d = unpackRGBAToDepth(texture2D(tDepth, uv)); if (d >= 0.99999) return -1.0; return -perspectiveDepthToViewZ(d, uNear, uFar); }
    float cocOf(float z){ return z < 0.0 ? 0.0 : uA * abs(1.0 - uF / max(z, 1e-3)); }
    vec3 tame(vec3 c){ float l = max(c.r, max(c.g, c.b)); return l > 1.6 ? c * (1.6 / l) : c; }   // a thin hot edge would otherwise print as single bright samples
    void main(){
      float zc = zAt(vUv), cc = cocOf(zc);
      vec3 col = texture2D(tDiffuse, vUv).rgb; if (cc > 0.9) col = tame(col); float tot = 1.0, rad = 1.6;
      float maxR = uA * 1.15; float rot = 6.2832 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      for (int i = 0; i < 72; i++) {
        if (rad >= maxR) break;
        float ang = float(i) * 2.39996 + rot;
        vec2 tc = vUv + vec2(cos(ang), sin(ang)) * uPx * rad;
        float zs = zAt(tc), cs = cocOf(zs);
        bool behind = zs < 0.0 || (zc > 0.0 && zs > zc);
        if (behind) cs = min(cs, cc * 2.0);
        float m = smoothstep(rad - 0.7, rad + 0.7, cs);
        col += mix(col / tot, tame(texture2D(tDiffuse, tc).rgb), m); tot += 1.0;
        rad += 2.2 / rad + 0.016 * uA;
      }
      gl_FragColor = vec4(col / tot, 1.0);
    }` };
const dofPass = new ShaderPass(DOF);
// a small tent over what the gather blurred, which takes its noise pattern away. Nothing in focus goes in or comes out.
const DOF_TENT = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, uA: { value: 0 }, uF: { value: 1 }, uPx: { value: new THREE.Vector2(1 / 1920, 1 / 1080) }, uNear: { value: 1e-3 }, uFar: { value: 1e4 } },
  vertexShader: DOF.vertexShader,
  fragmentShader: `#include <packing>
    uniform sampler2D tDiffuse, tDepth; uniform float uA, uF, uNear, uFar; uniform vec2 uPx; varying vec2 vUv;
    float cocAt(vec2 uv){ float d = unpackRGBAToDepth(texture2D(tDepth, uv)); if (d >= 0.99999) return 0.0; return uA * abs(1.0 - uF / max(-perspectiveDepthToViewZ(d, uNear, uFar), 1e-3)); }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float cc = cocAt(vUv); if (cc < 1.2) { gl_FragColor = vec4(c, 1.0); return; }
      float r = clamp(cc * 0.2, 1.0, 3.2); vec3 sum = c * 2.0; float w = 2.0;
      for (int i = 0; i < 8; i++) { float a = float(i) * 0.7854 + 0.3927; vec2 tc = vUv + vec2(cos(a), sin(a)) * r * uPx * (i % 2 == 0 ? 1.0 : 1.5);
        float k = smoothstep(0.6, 1.4, cocAt(tc)); sum += texture2D(tDiffuse, tc).rgb * k; w += k; }
      gl_FragColor = vec4(sum / w, 1.0); }` });
const OUT_TONE = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    vec3 tone(vec3 c){ const float st = 0.85, d = 1.0 - st; float peak = max(c.r, max(c.g, c.b)); if (peak < st) return c;
      float np = 1.0 - d * d / (peak + d - st); vec3 o = c * (np / peak); float g = 1.0 - 1.0 / (0.15 * (peak - np) + 1.0); return mix(o, vec3(np), g); }
    vec3 srgb(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){ gl_FragColor = vec4(srgb(tone(texture2D(tDiffuse, vUv).rgb)), 1.0); }` };
// last, in display space: a faint vignette, the planned dark areas, and the exact recorded still over the screen rectangle at the IN pose
const EXACT = {
  uniforms: { tDiffuse: { value: null }, tExact: { value: null }, uExact: { value: 0 }, uHold: { value: 0 }, uH: { value: new THREE.Matrix3() }, uScr: { value: new THREE.Vector2(SCR_W, SCR_H) }, uCorner: { value: 0 }, uDarkR: { value: 0 }, uDQ: { value: new THREE.Matrix3() }, uDS: { value: new THREE.Vector2(CARD_DEF[1].W, CARD_DEF[1].H) }, uDC: { value: CARD_DEF[1].W * CARD_DEF[1].rc }, uDarkTop: { value: 0 }, uVig: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse, tExact; uniform float uExact, uHold, uCorner, uDarkR, uDC, uDarkTop, uVig; uniform mat3 uH, uDQ; uniform vec2 uScr, uDS; varying vec2 vUv;
    float rr(vec2 uv, vec2 size, float r){ vec2 q = abs(uv - 0.5) * size - (size * 0.5 - r); float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; return clamp(0.5 - sd / max(length(fwidth(uv) * size) * 0.7071, 1e-7), 0.0, 1.0); }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 q = (vUv - vec2(0.5, 0.48)) * vec2(1.0, 0.72);
      c *= 1.0 - 0.34 * uVig * smoothstep(0.30, 0.74, length(q));
      if (uDarkR > 0.0005) { vec3 hd = uDQ * vec3(vUv, 1.0); c *= 1.0 - uDarkR * 0.72 * (1.0 - rr(hd.xy / hd.z, uDS, uDC)); }   // the whole frame dims, all but the card: no edge of its own
      c *= 1.0 - uDarkTop * 0.55 * smoothstep(0.885, 0.945, vUv.y);
      if (uExact > 0.0005) {
        vec3 h = uH * vec3(vUv, 1.0); vec2 uv = h.xy / h.z; vec2 fw = max(fwidth(uv), vec2(1e-6));
        vec2 d = min(uv, 1.0 - uv) / fw; float m = clamp(d.x + 0.5, 0.0, 1.0) * clamp(d.y + 0.5, 0.0, 1.0);
        if (uCorner > 1e-5) m *= rr(uv, uScr, uCorner);                                         // the still's corners stay inside the phone's body until the very frame it fills the frame
        vec3 s = uHold > 0.5 ? texelFetch(tExact, clamp(ivec2(gl_FragCoord.xy) - ivec2(96, 0), ivec2(0), ivec2(499, 1079)), 0).rgb : texture2D(tExact, uv).rgb;
        c = mix(c, s, m * uExact);
      }
      gl_FragColor = vec4(c, 1.0); }` };
const exactPass = new ShaderPass(EXACT);
composer.insertPass(dofPass, composer.passes.indexOf(renderPass) + 1);
composer.insertPass(DOF_TENT, composer.passes.indexOf(dofPass) + 1);
composer.passes[composer.passes.findIndex(p => p instanceof OutputPass)] = new ShaderPass(OUT_TONE);
composer.addPass(exactPass);
bloom.threshold = 3.0; bloom.highPassUniforms.luminosityThreshold.value = 3.0;
grainPass.material.fragmentShader = grainPass.material.fragmentShader.replace('g * 0.012', 'g * 0.010'); grainPass.material.needsUpdate = true;
RESIZE_HOOKS.push((W, H, pr) => {
  DOF_DEPTH.setSize(Math.round(W * pr), Math.round(H * pr)); DOF_NEAR.setSize(Math.round(W * pr), Math.round(H * pr));
  dofPass.uniforms.uPx.value.set(1 / (W * pr), 1 / (H * pr)); DOF_TENT.uniforms.uPx.value.copy(dofPass.uniforms.uPx.value); DOF_NEAR_PASS.uniforms.uPx.value.copy(dofPass.uniforms.uPx.value);
  dofPass.uniforms.tDepth.value = DOF_NEAR.texture; DOF_TENT.uniforms.tDepth.value = DOF_NEAR.texture; DOF_NEAR_PASS.uniforms.tDepth.value = DOF_DEPTH.texture;
  if (LIVE.rt) { const w = Math.round(W * pr), h = Math.round(H * pr); LIVE.rt.scene.setSize(w, h); LIVE.rt.a.setSize(w, h); LIVE.rt.b.setSize(w, h); }
});
/* ---------- REAL-TIME PLAYBACK ONLY. A frame drawn on request (seek, ?freeze, a render, a pause) takes none of this and stays the frame the MP4 is made of.
   What the slow frames spent their time on, measured per stretch at 1920x1080: the composer keeps every full-screen pass on a 4x multisampled HDR target,
   which adds about 10 ms in every stretch and changes no pixel (a full-screen quad covers all samples); the depth of field adds 5-11 ms wherever it is on.
   So in playback: the scene alone is multisampled and the passes after it run on plain targets; the gather takes fewer samples on the same disc; the key
   light's shadow map (static casters, and cards that move slowly) is redrawn every other frame. ---------- */
const LIVE = { rt: null, tick: 0, keyWas: false };
const LIVE_ON = () => playing && !HOST_DRAWS;
function liveTargets() {
  if (LIVE.rt) return LIVE.rt;
  const w = DOF_DEPTH.width, h = DOF_DEPTH.height;
  const flat = () => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
  return LIVE.rt = { scene: new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 }), a: flat(), b: flat() };
}
function liveComposite() {
  const T = liveTargets(), P = composer.passes;
  let read = T.scene, write = T.a, last = P.length - 1;
  while (last > 0 && !P[last].enabled) last--;
  for (let i = 0; i <= last; i++) {
    const p = P[i];
    if (!p.enabled) continue;
    p.renderToScreen = i === last;
    p.render(renderer, write, read, 0, false);
    if (p.needsSwap) { const was = read; read = write; write = was === T.scene ? T.b : was; }
  }
  renderer.setRenderTarget(null);
}
const DOF_FULL_MAT = dofPass.material;
const DOF_LIVE_MAT = new THREE.ShaderMaterial({ name: 'DOF_live', uniforms: dofPass.uniforms, vertexShader: DOF.vertexShader,
  fragmentShader: DOF.fragmentShader.replace('rad += 2.2 / rad + 0.016 * uA;', 'rad += (2.2 / rad + 0.016 * uA) * 1.7;') });
function liveShadows(live) {
  const sm = renderer.shadowMap;
  if (!live) { sm.autoUpdate = true; LIVE.keyWas = false; return; }
  const on = KEY_LIGHT.visible, due = (LIVE.tick++ & 1) === 0 || !LIVE.keyWas || !KEY_LIGHT.shadow.map;
  LIVE.keyWas = on; sm.autoUpdate = false; sm.needsUpdate = due;
  if (on && !due) KEY_LIGHT.shadow.updateMatrices(KEY_LIGHT);   // the floating origin moved the light: the map still holds, its matrix must follow
}
const FILM_SPEED = { hook: 1, key: 1, normal: 1, transit: 1, return: 1 };
const LOOP_T = 74.0;
const IN_HOLD = 0.15;                       // seconds the camera rests exactly at the IN pose on each side of a join
const D_E0 = (SV_R * 1080 / 300) / (2 * Math.tan(IN_HFOV * deg / 2));   // Earth radius ≈ 300 px at the wide end
const EARTH_AT = [1650, 920];               // where Earth's centre sits at the wide end (film's first and last frame), clear of the ending card's lettering

// ---- ACT 1 ----
const A1_END = 16 - IN_HOLD;
const A1_LND = monoTrack([[0, D_E0], [1.2, 2.9e7], [2.4, 1.1e7], [3.4, 2.4e6], [4.4, 3.6e5], [5.6, 6.0e4], [6.8, 1.4e4], [8.0, 3.0e3], [9.2, 500], [10.2, 90], [11.2, 14], [12.0, 2.5], [13.0, 1.1], [14.0, 0.55], [15.0, 0.29], [A1_END, IN_D]].map(([t, d]) => [t, Math.log(d)]));
const A1_H = monoTrack([[0, -60], [2.4, -52], [4.4, -38], [6.0, -28], [8.0, -18], [10.2, -8], [12.0, 0], [A1_END, IN_H]]);
const A1_P = monoTrack([[0, 65], [2.4, 62], [4.4, 58], [6.0, 52], [7.5, 46], [9.0, 38], [10.2, 26], [11.2, 14], [12.0, 9], [A1_END, IN_P]]);
const A1_ROLL = monoTrack([[0, 0], [3, 0], [6, 5], [9, 3], [12, 0], [A1_END, 0]]);
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qc = new THREE.Quaternion();
const AX_X = V3(1, 0, 0), AX_Y = V3(0, 1, 0), AX_Z = V3(0, 0, 1), _vr = new THREE.Vector3(), _vu = new THREE.Vector3(), _vt = new THREE.Vector3();
function setOri(out, H, P, roll) { out.q.setFromAxisAngle(AX_Y, -H * deg).multiply(_qa.setFromAxisAngle(AX_X, -P * deg)); if (roll) out.q.multiply(_qb.setFromAxisAngle(AX_Z, roll * deg)); }
function poseA1(t, out, lowOverride) {                    // t in ACT1 time; the same path serves ACT3, walked backwards
  const D = Math.exp(A1_LND(t)); out.D = D; out.hfov = IN_HFOV;
  setOri(out, A1_H(t), A1_P(t), A1_ROLL(t));
  _vr.set(1, 0, 0).applyQuaternion(out.q); _vu.set(0, 1, 0).applyQuaternion(out.q);
  const field = 2 * D * Math.tan(IN_HFOV * deg / 2);
  // Earth stage: the frame centre sits off Earth's centre so that Earth lies low on the right at the wide end (EARTH_AT)
  const lowRight = lowOverride !== undefined ? lowOverride : 1 - smoother(range(t, 0.25, 2.4));
  _vt.copy(EARTH_C).addScaledVector(_vr, -(EARTH_AT[0] - 960) / 1080 * field * lowRight).addScaledVector(_vu, (EARTH_AT[1] - 540) / 1080 * field * lowRight);
  // near end: the phone, then the IN pose's aim point
  const nearT = PHONE_C.clone().lerp(IN_T, smoother(range(t, 12.4, A1_END)));
  const s = clamp01((D - 1.0e6) / (3.0e7 - 1.0e6)), g = s * s * (3 - 2 * s);   // spread over the whole descent: the frame's centre travels at most ~0.5 view per e-fold of zoom
  out.T.copy(nearT).lerp(_vt, g);
}
// The pace is written as zoom rates: [t, ln D, rate(, ramp)] — a stretch with a low rate is a stop (≤ 0.8 e-folds/s, the picture can be taken in); a
// stretch given a ramp is a move, which eases in and out and runs at the constant rate that reaches the next key. The path itself (poseA1) is one
// function of its own time: ACT1 walks it forwards, ACT3 backwards, at these rates, so no pose changes with the pace.
function hermTrack(k) {
  const n = k.length - 1;
  return t => { if (t <= k[0][0]) return k[0][1]; if (t >= k[n][0]) return k[n][1];
    let i = 0; while (i < n - 1 && t >= k[i + 1][0]) i++;
    const [t0, v0, m0] = k[i], [t1, v1, m1] = k[i + 1], dt = t1 - t0, u = (t - t0) / dt, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 * dt + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1 * dt; };
}
function paceTrack(w) {
  const k = [];
  w.forEach((a, i) => { k.push(a.slice(0, 3)); const b = w[i + 1], r = a[3];
    if (b && r) { const p = (b[1] - a[1] - (a[2] + b[2]) * r / 2) / (b[0] - a[0] - r); k.push([a[0] + r, a[1] + (a[2] + p) * r / 2, p], [b[0] - r, b[1] - (p + b[2]) * r / 2, p]); } });
  return hermTrack(k);
}
const A1_INV = ln => { let a = 0, b = A1_END; for (let k = 0; k < 44; k++) { const m = (a + b) / 2; if (A1_LND(m) > ln) a = m; else b = m; } return (a + b) / 2; };
const _ln = Math.log;
// stops: Earth 0–2.3, Seoul 5.0–6.9, the cafe 10.25–12.6, the phone from 14.05
const A1_L = paceTrack([[0, _ln(D_E0), 0], [2.3, _ln(2.75e7), -0.18, 0.6], [5.0, _ln(7e4), -0.66], [6.9, _ln(7e4) - 0.66 * 1.9, -0.66, 0.6], [10.25, _ln(8), -0.5], [12.6, _ln(8) - 0.5 * 2.35, -0.5, 0.5], [14.05, _ln(0.52), -0.55], [A1_END, _ln(IN_D), 0]]);
const A1_WARP = t => A1_INV(A1_L(t));
// ---- ACT 3: the same path backwards. Stops: the phone to 3.0, Seoul 7.85–9.75, Earth from 12.6, still for the last 3 s ----
const A3_L = paceTrack([[IN_HOLD, _ln(IN_D), 0], [3.0, _ln(0.52), 0.5, 0.6], [7.85, _ln(2.6e4), 0.66], [9.75, _ln(2.6e4) + 0.66 * 1.9, 0.66, 0.6], [12.6, _ln(2.75e7), 0.18], [15, _ln(D_E0), 0]]);
const A3 = { t1: u => A1_INV(A3_L(u)) };
// ---- ACT 2: stops on each card ----
// a stop is a true stop: all tracks flat between its two keys, so no frame inside it carries motion blur
const HOLD = (t0, t1, s) => [[t0, s.stopT, s.d, s.stopH, s.stopP], [t1, s.stopT, s.d, s.stopH, s.stopP]];
const STOP = (i, t0, t1) => HOLD(t0, t1, CARD_DEF[i]);
// a framing that holds the given cards whole: their corners' bounding box lands inside x0..x1 with its vertical centre at yc (px)
function frameCards(ids, H, P, x0, x1, yc) {
  const f = 540 / Math.tan(19 * deg), q = new THREE.Quaternion().setFromAxisAngle(AX_Y, -H * deg).multiply(new THREE.Quaternion().setFromAxisAngle(AX_X, -P * deg));
  const qi = q.clone().invert(), pts = [];
  ids.forEach(i => { const c = CARD_DEF[i]; for (const a of [-1, 1]) for (const b of [-1, 1]) pts.push(c.pos.clone().addScaledVector(c.right, a * c.W / 2).addScaledVector(c.upv, b * c.H / 2)); });
  const T = pts.reduce((s, p) => s.add(p), V3(0, 0, 0)).multiplyScalar(1 / pts.length); let D = 1;
  const box = () => { let a = 1e9, b = -1e9, u = 1e9, v = -1e9; const eye = T.clone().add(V3(0, 0, D).applyQuaternion(q));
    pts.forEach(p => { const l = p.clone().sub(eye).applyQuaternion(qi), x = 960 + l.x / -l.z * f, y = 540 - l.y / -l.z * f; a = Math.min(a, x); b = Math.max(b, x); u = Math.min(u, y); v = Math.max(v, y); }); return [a, b, u, v]; };
  const rx = V3(1, 0, 0).applyQuaternion(q), ry = V3(0, 1, 0).applyQuaternion(q);
  for (let k = 0; k < 40; k++) { const [a, b, u, v] = box(); D *= (b - a) / (x1 - x0); const m = D / f; T.addScaledVector(rx, ((a + b) / 2 - (x0 + x1) / 2) * m).addScaledVector(ry, -((u + v) / 2 - yc) * m); }
  return { stopT: T, d: D, stopH: H, stopP: P };
}
const A2_PAIR = frameCards([2, 3], -12, 7, 70, 1850, 525);                  // card 3 and card 4 both whole, the light between them, the phone and the glass wholly below the frame
// card 5, nearer than its slot's default so its body lettering is at least 26 px; its lettering stays above y 880
const A2_C5 = (() => { const c = CARD_DEF[4], pxW = 860, at = [960, 480], d = c.W * 1080 / (2 * Math.tan(19 * deg) * pxW), field = 2 * Math.tan(19 * deg) * d;
  return { stopT: c.pos.clone().addScaledVector(c.right, -(at[0] - 960) / 1080 * field).addScaledVector(c.upv, -(540 - at[1]) / 1080 * field), d, stopH: c.stopH, stopP: c.stopP }; })();
const A2_E = 40 - IN_HOLD;
const A2_KEYS = [
  [IN_HOLD, IN_T, IN_D, IN_H, IN_P],
  [1.1, V3(0.055, 0.845, 0.0), 0.33, 2, 13],
  [2.15, V3(0.085, 0.90, -0.02), 0.57, 14, 14],
  ...STOP(0, 4.2, 6.9), ...STOP(1, 8.5, 14.0), ...HOLD(15.6, 18.7, A2_PAIR), ...STOP(3, 20.2, 24.7), ...HOLD(26.2, 31.4, A2_C5),
  [33.3, V3(0.27, 1.0, -0.05), 1.28, -10, 12],
  [36.0, V3(0.05, 0.86, 0.0), 0.52, -4, 13],
  [38.6, V3(0.07, 0.835, 0.0), 0.262, -0.8, 12.2],
  [A2_E, IN_T, IN_D, IN_H, IN_P],
];
const A2_TX = monoTrack(A2_KEYS.map(k => [k[0], k[1].x])), A2_TY = monoTrack(A2_KEYS.map(k => [k[0], k[1].y])), A2_TZ = monoTrack(A2_KEYS.map(k => [k[0], k[1].z]));
const A2_LD = monoTrack(A2_KEYS.map(k => [k[0], Math.log(k[2])])), A2_H = monoTrack(A2_KEYS.map(k => [k[0], k[3]])), A2_P = monoTrack(A2_KEYS.map(k => [k[0], k[4]]));
// hand-held: about a pixel, none at the IN pose, none in the last seconds
const shakeEnv = t => pulse(t, 0.6, 2.0, 14.3, 15.4) + pulse(t, 16.5, 18.0, 53.5, 55.3) + pulse(t, 56.5, 57.0, 60.5, 62.0);
function FILM_CAM(tau, out) {
  const t = clamp(tau, 0, LOOP_T);
  if (t < 16) { poseA1(A1_WARP(Math.min(t, A1_END)), out, 1 - smoother(range(t, 0.2, 5.0))); }   // Earth glides out of the lower right slowly enough to stay a stop
  else if (t < 56) {
    const a = t - 16; out.hfov = IN_HFOV;
    if (a <= IN_HOLD || a >= A2_E) { out.T.copy(IN_T); out.D = IN_D; setOri(out, IN_H, IN_P, 0); }
    else { out.T.set(A2_TX(a), A2_TY(a), A2_TZ(a)); out.D = Math.exp(A2_LD(a)); setOri(out, A2_H(a), A2_P(a), 0); }
  } else {
    const u = t - 56;
    if (u <= IN_HOLD) poseA1(A1_END, out); else poseA1(A3.t1(u), out, smoother(range(u, 10.8, 15)));   // the glide to the lower right has its own pace on the way out
  }
  if (t >= 15.85 && t < 16.15 || t >= 55.85 && t < 56.15) { out.T.copy(IN_T); out.D = IN_D; setOri(out, IN_H, IN_P, 0); out.hfov = IN_HFOV; }
  const e = shakeEnv(t);
  if (e > 1e-4) {
    const a = 0.00055 * e;
    _qc.setFromEuler(new THREE.Euler(a * (Math.sin(t * 4.1) * 0.6 + Math.sin(t * 9.3 + 1.0) * 0.25 + Math.sin(t * 1.7) * 0.7), a * (Math.sin(t * 3.3 + 2.0) * 0.6 + Math.sin(t * 7.7) * 0.25 + Math.sin(t * 1.3 + 1.0) * 0.7), 0));
    out.q.multiply(_qc);
  }
  return out;
}
// the path expressed as keys too, for the QA tools that read them (the camera itself comes from FILM_CAM)
for (let i = 0; i <= 148; i++) { const t = i * 0.5, c = { T: new THREE.Vector3(), D: 1, q: new THREE.Quaternion(), hfov: IN_HFOV }; FILM_CAM(t, c); KEYS.push({ t, T: c.T.clone(), D: c.D, q: c.q.clone(), hfov: c.hfov, flow: true, ease: null }); }

// the camera is this pure function, not the engine's key interpolation (function bindings can be replaced from a part: the engine stays word for word)
evalCamera = tau => FILM_CAM(tau, CAM);

beat(0, 12, 'normal', 'Earth to Seoul', 1);
beat(12, 16, 'normal', 'Window to phone', 1);
beat(16, 20, 'normal', 'Phone to table', 1);
beat(20, 24.5, 'key', 'Card 1', 1);
beat(24.5, 30.5, 'key', 'Card 2', 1);
beat(30.5, 36, 'key', 'Card 3', 1);
beat(36, 42, 'key', 'Card 4', 1);
beat(42, 48, 'key', 'Card 5', 1);
beat(48, 56, 'normal', 'Cards go home', 1);
beat(56, 68.5, 'normal', 'Back out to Earth', 1);
beat(68.5, 74, 'key', 'Earth rests', 1);

// Captions: QA 'read' and the visual review measure and see them; their words are fragments of the film's real subtitles (final/subs/captions_T2.ass). The final
// picture leaves them out with ?text=0 (render.mjs --text0), since the subtitles are burned in at compositing.
EARTH_MESH.name = 'Earth'; ATM_MESH.name = 'Atmosphere'; CITY_MESH.name = 'Seoul'; const SV_EARTH_BODY = [EARTH_MESH, ATM_MESH];   // the planet's shell of air is drawn over its surface CARDS.forEach((c, i) => { c.g.name = 'Card ' + (i + 1); });
caption(0.0, 2.4, "Alex is staying in Seoul.", '', '', SV_EARTH_BODY);
caption(5.0, 6.95, "Details change.", '', '', CITY_MESH);
caption(10.25, 12.6, "Is that photo still right?", '', '', CAFE);
caption(14.0, 17.3, "Alex sets English as the display language.", '', '', PHONE);
caption(20.2, 22.9, "The deadline moved,", '', '', CARDS[0].g);
caption(24.5, 30.0, "We altered the card's date for this demo, and StillValid caught it.", '', '', CARDS[1].g);
caption(31.6, 34.7, "Both exact lines appear side by side,", '', '', [CARDS[2].g, CARDS[3].g]);
caption(36.2, 40.7, "Our own code re-checks that each quote really appears there,", '', '', CARDS[3].g);
caption(42.2, 47.4, "And it only vouches for what it checked, right now.", '', '', CARDS[4].g);
caption(52.2, 55.9, "Cards lifted from the live result screen", '', '', PHONE);
caption(56.1, 59.0, "Built on Meta's Muse Spark,", '', '', PHONE);
caption(63.9, 65.75, "StillValid:", '', '', CITY_MESH);
caption(68.6, 73.0, "before you act on a saved notice, check that it's still valid.", '', '', SV_EARTH_BODY);

const RULER = null;
const WARMUP_TAUS = [0, 5, 9.5, 12.5, 15.9, 30, 42, 56.05, 60];
const READY = SV_READY.then(() => {});

const _cs = { pos: new THREE.Vector3(), q: new THREE.Quaternion(), s: 1, o: 1, v: 1 };
const _corners = [V3(-SCR_W / 2, -SCR_H / 2, 0), V3(SCR_W / 2, -SCR_H / 2, 0), V3(SCR_W / 2, SCR_H / 2, 0), V3(-SCR_W / 2, SCR_H / 2, 0)];
// homography: frame uv → screen uv, from the four projected corners (Heckbert)
function quadH(p, M) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3, det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / det, h = (dx1 * sy - sx * dy1) / det;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  // the inverse of [[a b c][d e f][g h 1]]
  M.set(a, b, c, d, e, f, g, h, 1).invert();
}
function setExactHomography(hold) {
  let p;
  if (hold) p = [[96 / 1920, 0], [596 / 1920, 0], [596 / 1920, 1], [96 / 1920, 1]];
  else p = _corners.map(c => { _cv.copy(c).applyMatrix4(PHONE.matrixWorld).project(camera); return [_cv.x * 0.5 + 0.5, _cv.y * 0.5 + 0.5]; });
  quadH(p, exactPass.uniforms.uH.value);
}
// the corner the still's rectangle is cut to: the screen's own far from the IN pose, none in it
function exactCorner(t) {
  const near = j => { const dA = j - 0.15 - t, dB = t - j - 0.15; if (dA <= 0 && dB <= 0) return 0; const d = Math.max(dA, dB); return d >= 0.3 ? 1 : d <= 0.05 ? 0.416 * smoother(d / 0.05) : lerp(0.416, 1, smoother((d - 0.05) / 0.25)); };
  return 0.0072 * (t < 36 ? near(16) : near(56));
}
function exactAmount(t) { return Math.max(pulse(t, 15.55, 15.85, 16.15, 16.42), pulse(t, 55.55, 55.85, 56.15, 56.42)); }
let SV_STATE = { dof: 0, mbAmt: 1 };
const ROW_OFF_D = 8.5;                      // the row's last visible part (above the cafe) has left the top of the frame by here
function applyScene(tau, tp, field) {
  const D = CAM.D, t = tau;
  const eyeY = CAM_POS.y, eyeZ = CAM_POS.z, alt = Math.max(eyeY, 0.5);
  // layers by what the camera can see
  const inRoom = eyeZ < ROOM.zf && eyeZ > ROOM.zb && eyeY > 0 && eyeY < ROOM.h && Math.abs(CAM_POS.x) < ROOM.x;
  EARTH_MESH.visible = field > 30000;
  ATM_MESH.visible = alt > 6e4;
  ATM_MAT.uniforms.uA.value = smoother(range(Math.log(alt), Math.log(6e4), Math.log(5e5)));
  EARTH_U.uEye.value.copy(CAM_POS).sub(EARTH_C).multiplyScalar(1 / SV_R);
  const px = (frameEl.__H || 1080) * (frameEl.__pr || 1);
  STAR_GROUP.children[0].material.uniforms.uA.value = smoother(range(Math.log(alt), Math.log(2e4), Math.log(1.5e6))) * 0.9;
  STAR_GROUP.children[0].material.uniforms.uPx.value = px / 1080;
  STAR_GROUP.visible = alt > 2e4;
  SKY_MAT.uniforms.uA.value = (1 - smoother(range(Math.log(alt), Math.log(3e4), Math.log(3e5)))) * lerp(0.6, 1, smoother(range(Math.log(D), Math.log(2.2), Math.log(3.2))));
  SKY_MESH.visible = SKY_MAT.uniforms.uA.value > 0.001;
  CITY_MESH.visible = field < 2.8e5 && !inRoom;
  CITY_U.uFade.value = 1 - smoother(range(Math.log(field), Math.log(7e4), Math.log(2.6e5)));
  CITY_U.uEyeW.value.copy(CAM_POS);
  CAFE_FRONT.visible = field < 9000 && !inRoom;
  ROW_BUILDINGS.visible = field < 9000 && D > ROW_OFF_D;   // off once the facade fills the frame; their depth would hold back the lights behind them until the eye crosses the window
  ROW_MAT.uniforms.uFade.value = 1 - smoother(range(Math.log(field), Math.log(3500), Math.log(9000)));
  CAFE.visible = field < 6000;
  // earth a little darker at the wide end (the ending card sits over it)
  EARTH_U.uNight.value = 0.75 + 1.05 * smoother(range(Math.log(field), Math.log(7e5), Math.log(6e6)));
  EARTH_U.uExp.value = 0.62 + 0.38 * smoother(range(Math.log(D), Math.log(D_E0), Math.log(1.6e7)));
  // the light field: its disc grows as the lens focuses close
  const A = D < 40 ? 10.5 / Math.sqrt(D) * smoother(range(Math.log(D), Math.log(40), Math.log(12))) * (px / 1080) : 0;
  SV_STATE.dof = A;
  CITY_POINTS.visible = field < 3e5;
  const pu = CITY_POINTS.material.uniforms;
  pu.uPx.value = (px / 2) / Math.tan(camera.fov * deg / 2); pu.uD.value = D; pu.uCoc.value = A; pu.uFar.value = smoother(range(Math.log(field), Math.log(3e5), Math.log(1e5))) * (D < ROW_OFF_D ? smoother(range(Math.log(D), Math.log(ROW_OFF_D), Math.log(3.2))) : smoother(range(Math.log(D), Math.log(ROW_OFF_D), Math.log(t > 56 ? 40 : 16))));   // the lights pass through zero where the rows switch off and how many are drawn changes, so nothing appears at once; the window's bokeh then comes up as the lens focuses close
  // playback: from high up the city's lights are thousands of dim points at the smallest size, which cost more than the rest of the frame on the multisampled target (13 ms at 66.5 s). Fewer of them, each brighter by as much, make the same glow
  const liveDust = LIVE_ON() ? lerp(1, 0.35, smoother(range(Math.log(field), Math.log(2e4), Math.log(1e5)))) : 1;
  if (liveDust < 1) { pu.uFar.value /= liveDust; CITY_POINTS.geometry.setDrawRange(0, BOKEH_N + Math.round((CITY_POINT_COUNT - BOKEH_N) * liveDust)); }
  else CITY_POINTS.geometry.setDrawRange(0, Math.round(300 * Math.pow(CITY_POINT_COUNT / 300, smoother(range(Math.log(D), Math.log(4), Math.log(60))))));
  // lights in floating-origin units: point lights keep their real falloff
  for (const l of LAMP_LIGHTS) { l.L.intensity = l.I / (D * D); }
  const room = CAFE.visible;
  KEY_LIGHT.visible = RIM_LIGHT.visible = FILL_LIGHT.visible = room;
  LAMP_LIGHTS.forEach(l => { l.L.visible = room; });
  if (room) {
    const sc = KEY_LIGHT.shadow.camera, R = 1.5 / D;
    sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 0.5 / D; sc.far = 7 / D; sc.updateProjectionMatrix();
    KEY_LIGHT.shadow.bias = -0.0006; KEY_LIGHT.shadow.normalBias = 0.0015 / D;
  }
  // which recorded still the phone shows
  const key = t < 15.999 ? 'S0' : t < 55.999 ? 'S6' : 'S10';
  SCREEN_U.tA.value = SV_TEX[key];
  exactPass.uniforms.tExact.value = SV_TEX[key + 'X'];
  const ex = exactAmount(t), hold = (t >= 15.85 && t < 16.15) || (t >= 55.85 && t < 56.15);
  exactPass.uniforms.uExact.value = ex; exactPass.uniforms.uCorner.value = exactCorner(t);
  exactPass.uniforms.uHold.value = hold && (frameEl.__H * frameEl.__pr) === 1080 ? 1 : 0;
  scene.updateMatrixWorld(true);
  if (ex > 0.0005) setExactHomography(hold);
  // reflections on the screen die away before the IN pose
  SCREEN_U.uReflect.value = (1 - pulse(t, 14.6, 15.5, 16.5, 17.4)) * (1 - pulse(t, 54.6, 55.5, 56.5, 57.4));
  SCREEN_U.uGain.value = 0.94 + 0.06 * Math.max(pulse(t, 14.6, 15.5, 16.5, 17.4), pulse(t, 54.6, 55.5, 56.5, 57.4));
  { const m = new THREE.Matrix4().copy(PHONE.matrixWorld).invert(); SCREEN_U.uEyeL.value.copy(camera.position).applyMatrix4(m); }
  SCREEN_POOL.material.opacity = 0.11;
  // steam
  STEAM_U.uT.value = tp; STEAM.quaternion.copy(CAM.q); STEAM.visible = room && field < 8;
  // the cards (ACT2 only)
  const a = t - 16; let drawn = [];
  CARDS.forEach((c, i) => {
    const on = a > 0 && a < 40 && cardState(i, a, _cs);
    c.g.visible = !!on;
    if (!on) { c.pool.visible = c.shade.visible = false; return; }
    c.pool.visible = c.shade.visible = true;
    c.g.position.copy(_cs.pos); c.g.quaternion.copy(_cs.q); c.g.scale.setScalar(_cs.s);
    c.mat.uniforms.uO.value = _cs.o;
    c.slab.material.opacity = _cs.o; c.slab.material.depthWrite = _cs.o > 0.98; c.slab.visible = _cs.o > 0.01;
    const lift = clamp01((_cs.pos.y - TABLE_Y - 0.06) / 0.4);
    c.pool.material.opacity = 0.16 * _cs.o * _cs.s * _cs.v * (1 - 0.55 * lift);
    c.shade.material.opacity = 0.42 * _cs.o * _cs.s * _cs.v * (1 - 0.6 * lift);
    const clx = (v, w) => clamp(v, -0.53 + w / 2, 0.97 - w / 2), clz = (v, d) => clamp(v, -0.39 + d / 2, 0.43 - d / 2), cw = CARD_DEF[i].W;
    c.pool.position.x = clx(_cs.pos.x, cw * 2.3); c.pool.position.z = clz(_cs.pos.z + 0.02, cw * 1.7);
    c.shade.position.x = clx(_cs.pos.x + 0.05 + 0.2 * lift, cw * 1.45); c.shade.position.z = clz(_cs.pos.z - 0.06 - 0.22 * lift, cw * 1.05);
    drawn.push(c);
  });
  // far to near, by distance from the eye (alpha faces)
  drawn.sort((p, q) => q.g.position.distanceToSquared(CAM_POS) - p.g.position.distanceToSquared(CAM_POS)).forEach((c, k) => { c.face.renderOrder = 20 + k; });
  // the light belongs to the framing that holds both cards: it starts once they have stopped and is gone before they leave
  const lp = smoother(range(a, 15.7, 16.7));
  LINK.visible = a > 15.7 && a < 18.95;
  { const [fx, fy] = cardFloat(a, 2); LINK.position.set(fx, fy, 0); }
  LINK_U.uProg.value = lp * 1.03; LINK_U.uT.value = tp; LINK_U.uA.value = smoother(range(a, 15.7, 15.85)) * (1 - smoother(range(a, 18.45, 18.95)));
  // where the lens is: on the phone while the phone is the subject, on a card while it rises; at a stop the card is the camera's own target
  { const vd = _vt.set(0, 0, -1).applyQuaternion(CAM.q), zOf = P => Math.max(P.clone().sub(CAM_POS).dot(vd) / D, 0.05);
    let ln = 0;
    if (a > 0 && a < 40) {
      for (let i = 0; i < 5; i++) { const T = CARD_TIMES[i], w = pulse(a, T.r0 + 0.35 * (T.r1 - T.r0), T.r0 + 0.6 * (T.r1 - T.r0), T.r1 - 0.2, T.r1 + 0.1);
        if (w > 0.001 && CARDS[i].g.visible) { _cv.copy(CARDS[i].g.position).applyMatrix4(universe.matrixWorld).project(camera); ln = lerp(ln, Math.log(zOf(CARDS[i].g.position)), w * (1 - smoother(range(Math.max(Math.abs(_cv.x), Math.abs(_cv.y)), 0.7, 1.1)))); } }
      const wp = Math.max(1 - smoother(range(a, 1.0, 2.8)), smoother(range(a, 32.4, 33.8)));
      if (wp > 0) ln = lerp(ln, Math.log(zOf(PHONE_C)), wp);
    }
    dofPass.uniforms.uF.value = DOF_TENT.uniforms.uF.value = Math.exp(clamp(ln, -0.2, 0.2)); }   // a limited pull: the whole picture's blur follows it
  // less bloom over the light field (thousands of small lights would otherwise fog the frame)
  bloom.strength = lerp(0.42, 0.13, smoother(range(Math.log(field), Math.log(9e5), Math.log(2e5))) * (1 - smoother(range(Math.log(field), Math.log(30), Math.log(8)))));
  // the planned dark zones
  const dark = a > 0 ? pulse(a, 7.3, 8.5, 14.0, 15.2) : 0;           // the frame's dark stretch for the callouts over x 660-1860: 1.2 s in and out
  exactPass.uniforms.uDarkR.value = dark;
  if (dark > 0.0005 && CARDS[1].g.visible) {
    const c2 = CARD_DEF[1]; CARDS[1].g.updateMatrixWorld(true);
    quadH([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => { _cv.set(x * c2.W / 2, y * c2.H / 2, 0.0004).applyMatrix4(CARDS[1].g.matrixWorld).project(camera); return [_cv.x * 0.5 + 0.5, _cv.y * 0.5 + 0.5]; }), exactPass.uniforms.uDQ.value);
  }
  exactPass.uniforms.uDarkTop.value = pulse(a, 3.9, 4.7, 37, 38.5) * (1 - pulse(a, 25.4, 26.2, 31.4, 32.2));   // none over card 5, which reaches the top of the frame
  SV_STATE.mbAmt = filmMbAmt(t, D);
}
const EXPOSURE = () => 1;
// less motion blur over the city, whose fine detail smears under it: half at 5–8.5 s and 57.5–61.5 s, and wherever else the city fills the frame (ACT1 and ACT3 hold stops there)
// and almost none while the phone's or a card's lettering is what the frame is about
function filmMbAmt(t, D) { const city = 1 - Math.max(0.5 * pulse(t, 57.2, 57.5, 61.5, 61.8), 0.8 * pulse(t, 3.0, 3.4, 9.7, 10.1), 0.8 * pulse(t, 60.7, 61.1, 67.4, 67.8));
  const phone = Math.max(pulse(t, 13.6, 14.0, 18.6, 19.0), pulse(t, 51.6, 52.0, 59.0, 59.4)), act2 = pulse(t, 16.3, 16.8, 51.6, 52.0); return city * (1 - 0.85 * phone) * (1 - 0.45 * act2); }
// drawn right before the composer: the depth the depth-of-field pass reads, without the see-through things
function FILM_PREPASS() {
  const A = SV_STATE.dof;
  dofPass.enabled = DOF_TENT.enabled = A > 0.25;
  dofPass.uniforms.uA.value = DOF_TENT.uniforms.uA.value = A;
  if (!dofPass.enabled) return;
  const bg = scene.background, om = scene.overrideMaterial;
  scene.overrideMaterial = DOF_DEPTH_MAT; camera.layers.disable(NO_DEPTH_LAYER);
  const au = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(DOF_DEPTH); renderer.setClearColor(0xffffff, 1); renderer.clear(); renderer.render(scene, camera);
  renderer.setRenderTarget(DOF_NEAR); DOF_NEAR_PASS.fsQuad.material = DOF_NEAR_PASS.material; DOF_NEAR_PASS.fsQuad.render(renderer);
  renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1);
  renderer.shadowMap.autoUpdate = au; camera.layers.enable(NO_DEPTH_LAYER); scene.overrideMaterial = om; scene.background = bg;
  renderer.shadowMap.needsUpdate = true;
}
// the engine calls composer.render() last in its frame: the film's two steps right before the composer go here
const _composerRender = composer.render.bind(composer);
composer.render = dt => {
  const live = LIVE_ON();
  dofPass.material = live ? DOF_LIVE_MAT : DOF_FULL_MAT;
  FILM_PREPASS(); liveShadows(live);
  mblurPass.uniforms.uAmt.value *= SV_STATE.mbAmt;
  if (live) liveComposite(); else _composerRender(dt);
};
