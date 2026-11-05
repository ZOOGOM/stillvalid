
/* =====================================================================================
   8. TIMELINE — one continuous camera, 74 s of real playback time (every beat plays at speed 1, so τ = playback seconds).
   ACT1 0–16 Earth → Seoul → window → phone. ACT2 16–56 phone → five cards → phone. ACT3 56–74 phone → table → window → Seoul → Earth.
   ACT3 walks ACT1's path backwards (same poses), at a rate that never passes 3 e-folds/s. Last frame = first frame.
   ===================================================================================== */
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
  const s = clamp01((D - 1.0e6) / (1.4e7 - 1.0e6)), g = s * s * (3 - 2 * s);
  out.T.copy(nearT).lerp(_vt, g);
}
// ACT1 plays the path through a time warp (playback t -> path t): identity to 5 s and from 12 s. Between, the city field gives up 0.7 s so the approach holds
// about 1.7 e-folds/s of the facade (ln of the eye's distance to the window wall), and the speed falls steadily from 5.6 to 2.6 m/s before the glass.
const A1_WARP = monoTrack([[0, 0], [4, 4], [5, 5], [5.2, 5.2043], [5.4, 5.4214], [5.6, 5.6583], [5.8, 5.9235], [6, 6.2104], [6.2, 6.5026], [6.4, 6.7862], [6.6, 7.0612], [6.8, 7.3346], [7, 7.6026], [7.2, 7.8619], [7.4, 8.1107], [7.6, 8.3507], [7.8, 8.5834], [8, 8.8097], [8.2, 9.0304], [8.4, 9.2461], [8.6, 9.4545], [8.8, 9.6563], [9, 9.8535], [9.2, 10.0475], [9.4, 10.2396], [9.6, 10.4305], [9.8, 10.6185], [10, 10.798], [10.2, 10.9661], [10.4, 11.1214], [10.6, 11.2605], [10.8, 11.3739], [11, 11.4703], [11.2, 11.5765], [11.4, 11.6592], [11.6, 11.7517], [11.8, 11.8596], [12, 12], [13, 13], [A1_END, A1_END]]);
// ---- ACT 3: lnD rises with a capped rate; the pose is ACT1's pose at the same distance ----
const A3 = (() => {
  const t7 = 0.5, lnEnd = A1_LND(t7), ln0 = Math.log(IN_D), TR = 7.45, N = 2980, dt = TR / N, tab = new Float64Array(N + 1);
  const rate = u => smoother(range(u, IN_HOLD, 0.8)) * (1 - smoother(range(u, 6.5, TR)));
  let acc = 0; for (let i = 1; i <= N; i++) { acc += rate((i - 0.5) * dt) * dt; tab[i] = acc; }
  const rmax = (lnEnd - ln0) / acc; for (let i = 0; i <= N; i++) tab[i] = ln0 + tab[i] * rmax;
  const inv = ln => { let a = 0, b = A1_END; for (let k = 0; k < 44; k++) { const m = (a + b) / 2; if (A1_LND(m) > ln) a = m; else b = m; } return (a + b) / 2; };
  const tail = monoTrack([[TR, t7], [15, 0]]);
  return { rmax, TR, t1(u) { if (u >= TR) return tail(u); const f = clamp(u / dt, 0, N - 1e-6), k = Math.floor(f); return inv(tab[k] + (tab[k + 1] - tab[k]) * (f - k)); } };
})();
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
const A2_PAIR = frameCards([2, 3], -12, 7, 70, 1850, 420);                  // card 3 and card 4 both whole, the light between them
// card 5, nearer than its slot's default so its body lettering is at least 26 px; its lettering stays above y 880
const A2_C5 = (() => { const c = CARD_DEF[4], pxW = 860, at = [960, 480], d = c.W * 1080 / (2 * Math.tan(19 * deg) * pxW), field = 2 * Math.tan(19 * deg) * d;
  return { stopT: c.pos.clone().addScaledVector(c.right, -(at[0] - 960) / 1080 * field).addScaledVector(c.upv, -(540 - at[1]) / 1080 * field), d, stopH: c.stopH, stopP: c.stopP }; })();
const A2_E = 40 - IN_HOLD;
const A2_KEYS = [
  [IN_HOLD, IN_T, IN_D, IN_H, IN_P],
  [1.1, V3(0.055, 0.845, 0.0), 0.33, 2, 13],
  [2.6, V3(0.09, 0.90, -0.02), 0.60, 16, 14],
  ...STOP(0, 4.2, 7.3), ...STOP(1, 8.5, 14.45), ...HOLD(15.6, 18.95, A2_PAIR), ...STOP(3, 20.2, 25.05), ...HOLD(26.2, 31.4, A2_C5),
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
  if (t < 16) { poseA1(A1_WARP(Math.min(t, A1_END)), out); }
  else if (t < 56) {
    const a = t - 16; out.hfov = IN_HFOV;
    if (a <= IN_HOLD || a >= A2_E) { out.T.copy(IN_T); out.D = IN_D; setOri(out, IN_H, IN_P, 0); }
    else { out.T.set(A2_TX(a), A2_TY(a), A2_TZ(a)); out.D = Math.exp(A2_LD(a)); setOri(out, A2_H(a), A2_P(a), 0); }
  } else {
    const u = t - 56;
    if (u <= IN_HOLD) poseA1(A1_END, out); else poseA1(A3.t1(u), out, smoother(range(u, 5.6, 8.0)));   // the glide to the lower right has its own pace on the way out
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

beat(0, 12, 'normal', 'Earth to Seoul', 1);
beat(12, 16, 'normal', 'Window to phone', 1);
beat(16, 20, 'normal', 'Phone to table', 1);
beat(20, 25, 'key', 'Card 1', 1);
beat(25, 30.5, 'key', 'Card 2', 1);
beat(30.5, 36, 'key', 'Card 3', 1);
beat(36, 42, 'key', 'Card 4', 1);
beat(42, 48, 'key', 'Card 5', 1);
beat(48, 56, 'normal', 'Cards go home', 1);
beat(56, 63, 'normal', 'Back out to Earth', 1);
beat(63, 74, 'key', 'Earth rests', 1);

const RULER = null;
const WARMUP_TAUS = [0, 5, 9.5, 12.5, 15.9, 30, 42, 56.05, 60];
const READY = SV_READY.then(() => {});

// cards that would hang cut off at the frame's edge slide out of the frame while the camera turns away from them (they are back in their slots before they fly home)
const CARD_ASIDE = [[0, 7.4, 8.4, 31.5, 32.0, -0.22], [1, 14.5, 15.5, 31.5, 32.4, -0.22], [2, 19.2, 20.1, 25.2, 26.1, -0.30], [3, 25.1, 26.1, 31.4, 32.0, -0.8]];
const _cs = { pos: new THREE.Vector3(), q: new THREE.Quaternion(), s: 1, o: 1 };
const _corners = [V3(-SCR_W / 2, -SCR_H / 2, 0), V3(SCR_W / 2, -SCR_H / 2, 0), V3(SCR_W / 2, SCR_H / 2, 0), V3(-SCR_W / 2, SCR_H / 2, 0)];
// homography: frame uv → screen uv, from the four projected corners (Heckbert)
function setExactHomography(hold) {
  const u = exactPass.uniforms;
  let p;
  if (hold) p = [[96 / 1920, 0], [596 / 1920, 0], [596 / 1920, 1], [96 / 1920, 1]];
  else p = _corners.map(c => { _cv.copy(c).applyMatrix4(PHONE.matrixWorld).project(camera); return [_cv.x * 0.5 + 0.5, _cv.y * 0.5 + 0.5]; });
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3, det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / det, h = (dx1 * sy - sx * dy1) / det;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  // the inverse of [[a b c][d e f][g h 1]]
  const M = new THREE.Matrix3().set(a, b, c, d, e, f, g, h, 1).invert();
  u.uH.value.copy(M);
}
function exactAmount(t) { return Math.max(pulse(t, 15.55, 15.85, 16.15, 16.42), pulse(t, 55.55, 55.85, 56.15, 56.42)); }
let SV_STATE = { dof: 0 };
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
  SKY_MAT.uniforms.uA.value = (1 - smoother(range(Math.log(alt), Math.log(3e4), Math.log(3e5)))) * (inRoom ? 0.6 : 1);
  SKY_MESH.visible = SKY_MAT.uniforms.uA.value > 0.001;
  CITY_MESH.visible = field < 2.8e5 && !inRoom;
  CITY_U.uFade.value = 1 - smoother(range(Math.log(field), Math.log(7e4), Math.log(2.6e5)));
  CITY_U.uEyeW.value.copy(CAM_POS);
  ROW_BUILDINGS.visible = field < 9000 && !inRoom;
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
  pu.uPx.value = (px / 2) / Math.tan(camera.fov * deg / 2); pu.uD.value = D; pu.uCoc.value = A; pu.uFar.value = smoother(range(Math.log(field), Math.log(3e5), Math.log(1e5))) * (t > 56 ? 1 - 0.94 * pulse(t - 56, 1.75, 2.15, 2.45, 3.6) : 1);   // ACT3: the city's lights come up gradually as the camera backs away from the facade
  CITY_POINTS.geometry.setDrawRange(0, Math.round(300 * Math.pow(CITY_POINT_COUNT / 300, smoother(range(Math.log(D), Math.log(4), Math.log(60))))));
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
  exactPass.uniforms.uExact.value = ex;
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
    for (const [ci, a0, a1, a2, a3, dx] of CARD_ASIDE) if (ci === i) _cs.pos.addScaledVector(CARD_DEF[i].right, dx * pulse(a, a0, a1, a2, a3));
    c.g.position.copy(_cs.pos); c.g.quaternion.copy(_cs.q); c.g.scale.setScalar(_cs.s);
    c.mat.uniforms.uO.value = _cs.o;
    c.slab.visible = _cs.o > 0.5;
    const lift = clamp01((_cs.pos.y - TABLE_Y - 0.06) / 0.4);
    c.pool.material.opacity = 0.16 * _cs.o * _cs.s * (1 - 0.55 * lift);
    c.shade.material.opacity = 0.42 * _cs.o * _cs.s * (1 - 0.6 * lift);
    const clx = (v, w) => clamp(v, -0.53 + w / 2, 0.97 - w / 2), clz = (v, d) => clamp(v, -0.39 + d / 2, 0.43 - d / 2), cw = CARD_DEF[i].W;
    c.pool.position.x = clx(_cs.pos.x, cw * 2.3); c.pool.position.z = clz(_cs.pos.z + 0.02, cw * 1.7);
    c.shade.position.x = clx(_cs.pos.x + 0.05 + 0.2 * lift, cw * 1.45); c.shade.position.z = clz(_cs.pos.z - 0.06 - 0.22 * lift, cw * 1.05);
    drawn.push(c);
  });
  // far to near, by distance from the eye (alpha faces)
  drawn.sort((p, q) => q.g.position.distanceToSquared(CAM_POS) - p.g.position.distanceToSquared(CAM_POS)).forEach((c, k) => { c.face.renderOrder = 20 + k; });
  const lp = smoother(range(a, 14.5, 15.3)) * (1 - smoother(range(a, 26.0, 26.7)));
  LINK.visible = lp > 0.002 && a > 0 && a < 40;
  LINK_U.uProg.value = lp * 1.06; LINK_U.uT.value = tp; LINK_U.uA.value = smoother(range(a, 14.5, 14.8)) * (1 - smoother(range(a, 18.95, 19.6)));   // the light belongs to the framing that holds both cards
  // less bloom over the light field (thousands of small lights would otherwise fog the frame)
  bloom.strength = lerp(0.42, 0.13, smoother(range(Math.log(field), Math.log(9e5), Math.log(2e5))) * (1 - smoother(range(Math.log(field), Math.log(30), Math.log(8)))));
  // the planned dark zones
  exactPass.uniforms.uDarkR.value = a > 0 ? pulse(a, 7.8, 8.5, 14.5, 15.0) : 0;
  exactPass.uniforms.uDarkTop.value = pulse(a, 1, 3, 37, 38.5) * (1 - pulse(a, 25.4, 26.2, 31.4, 32.2));   // none over card 5, which reaches the top of the frame
}
const EXPOSURE = () => 1;
// drawn right before the composer: the depth the depth-of-field pass reads, without the see-through things
function FILM_PREPASS(tau, tp, field) {
  const A = SV_STATE.dof;
  dofPass.enabled = A > 0.25;
  dofPass.uniforms.uA.value = A;
  if (!dofPass.enabled) return;
  const bg = scene.background, om = scene.overrideMaterial;
  scene.overrideMaterial = DOF_DEPTH_MAT; camera.layers.disable(NO_DEPTH_LAYER);
  const au = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(DOF_DEPTH); renderer.setClearColor(0xffffff, 1); renderer.clear(); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1);
  renderer.shadowMap.autoUpdate = au; camera.layers.enable(NO_DEPTH_LAYER); scene.overrideMaterial = om; scene.background = bg;
  renderer.shadowMap.needsUpdate = true;
}
