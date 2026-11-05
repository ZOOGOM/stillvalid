
/* =====================================================================================
   5b. THE PHONE (a generic rounded glass slab, no camera island, no logo), its stand, the steam, and the five cards.
   The screen shows the recorded still, unlit. Nothing on it is redrawn. Cards are the recorded PNGs, aspect kept.
   ===================================================================================== */
function rrShape(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0); s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2); s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI); s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5); return s; }
const PHONE = new THREE.Group(); PHONE.name = 'Phone'; PHONE.position.copy(PHONE_C);
PHONE.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(PHONE_X, PHONE_U, PHONE_N)); CAFE.add(PHONE);
const PHONE_W = SCR_W + 2 * BEZEL, PHONE_H = SCR_H + 2 * BEZEL;
{
  const bodyG = new THREE.ExtrudeGeometry(rrShape(PHONE_W - 0.0012, PHONE_H - 0.0012, 0.0105), { depth: PHONE_THICK - 0.0012, bevelEnabled: true, bevelSize: 0.0006, bevelThickness: 0.0006, bevelSegments: 4, curveSegments: 16 });
  bodyG.translate(0, 0, -PHONE_THICK + 0.0006 - 0.0017);
  const body = new THREE.Mesh(bodyG, new THREE.MeshStandardMaterial({ color: 0x1a1b1e, metalness: 0.92, roughness: 0.34, envMapIntensity: 1.3 })); body.castShadow = true; body.name = 'PhoneBody'; PHONE.add(body);
  const front = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(PHONE_W - 0.0009, PHONE_H - 0.0009, 0.0102), 16), new THREE.MeshPhysicalMaterial({ color: 0x020203, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.2 })); front.position.z = -0.0011; front.name = 'PhoneGlass'; PHONE.add(front);
}
const SCREEN_U = { tA: { value: null }, uGain: { value: 1 }, uReflect: { value: 1 }, uEyeL: { value: new THREE.Vector3() } };
const SCREEN_MAT = new THREE.ShaderMaterial({ uniforms: SCREEN_U, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  vertexShader: `varying vec2 vUv; varying vec3 vW; varying vec3 vL; void main(){ vUv = uv; vL = position; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tA; uniform float uGain, uReflect; uniform vec3 uEyeL; varying vec2 vUv; varying vec3 vL;
    void main(){ vec2 dx = dFdx(vUv), dy = dFdy(vUv);       // minified text: four rotated-grid taps a mip level sharper than trilinear would pick
      vec3 c = (texture2D(tA, vUv + 0.125 * dx + 0.375 * dy, -1.0).rgb + texture2D(tA, vUv - 0.125 * dx - 0.375 * dy, -1.0).rgb + texture2D(tA, vUv + 0.375 * dx - 0.125 * dy, -1.0).rgb + texture2D(tA, vUv - 0.375 * dx + 0.125 * dy, -1.0).rgb) * 0.25 * uGain;
      // analytic reflection on the glass: the lamp above and the far window glow, in phone-local coordinates. Goes to zero before the IN pose
      vec3 V = normalize(uEyeL - vL); vec3 R = reflect(-V, vec3(0.0, 0.0, 1.0));
      float F = 0.04 + 0.96 * pow(clamp(1.0 - V.z, 0.0, 1.0), 5.0);
      float lamp = smoothstep(0.985, 0.9985, dot(R, normalize(vec3(0.35, 0.86, 0.36))));
      float win = smoothstep(-0.25, 0.2, R.y) * smoothstep(0.75, 0.3, abs(R.x)) * 0.16;
      c += (vec3(1.0, 0.75, 0.48) * lamp * 6.0 + vec3(0.42, 0.34, 0.30) * win) * F * uReflect * 2.0;
      gl_FragColor = vec4(c, 1.0); }` });
const SCREEN_MESH = (() => {
  const g = new THREE.ShapeGeometry(rrShape(SCR_W, SCR_H, 0.0072), 16), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / SCR_W + 0.5, p.getY(i) / SCR_H + 0.5);
  const m = new THREE.Mesh(g, SCREEN_MAT); m.position.z = 0; m.name = 'PhoneScreen'; PHONE.add(m); return m;
})();
// a small stand of wood with a dark slot: the phone's lower edge goes down into the slot behind a raised lip, so neither its round lower edge nor any wood shows above the lip.
// The lip's top stays just below the screen's lower edge (at the IN pose it lies below the frame). What holds the phone up behind it is narrower than the phone, so the camera, which sits to the phone's right at the IN pose, never sees it past the phone's edge.
{
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.096, 0.016, 0.07, 3, 0.004), WOOD_MAT); base.position.set(0, TABLE_Y + 0.008, -0.012); base.castShadow = base.receiveShadow = true; base.name = 'StandBase'; CAFE.add(base);
  const lip = new THREE.Mesh(new RoundedBoxGeometry(0.088, 0.0072, 0.0045, 2, 0.0016), STEEL_MAT); lip.position.set(0, TABLE_Y + 0.0158, 0.01795); lip.castShadow = true; lip.name = 'StandLip'; CAFE.add(lip);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.0008, 0.0135), new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.72, metalness: 0.2, envMapIntensity: 0.15 })); slot.position.set(0, TABLE_Y + 0.0162, 0.0098); slot.receiveShadow = true; slot.name = 'StandSlot'; CAFE.add(slot);
  const backPlate = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.09, 0.005, 2, 0.002), STEEL_MAT); backPlate.position.copy(PHONE_C).addScaledVector(PHONE_N, -PHONE_THICK - 0.003).addScaledVector(PHONE_U, -0.038); backPlate.quaternion.copy(PHONE.quaternion); backPlate.castShadow = true; CAFE.add(backPlate);
  const leg = new THREE.Mesh(new RoundedBoxGeometry(0.016, 0.075, 0.004, 2, 0.0015), STEEL_MAT); leg.position.set(0, TABLE_Y + 0.040, -0.040); leg.rotation.x = 0.55; leg.castShadow = true; CAFE.add(leg);
}
// soft contact shadows and the screen's light on the table
const softTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 8, 128, 128, 126); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); return t; })();
const decal = (w, d, x, z, o, add, ry = 0) => { const m = noDepth(new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: softTex, color: add ? 0xffffff : 0x000000, transparent: true, opacity: o, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }))); m.material.userData.thin = true; m.position.set(x, TABLE_Y + 0.0007, z); m.rotation.y = ry; m.renderOrder = 3; m.userData.passable = true; CAFE.add(m); return m; };
decal(0.20, 0.13, 0, -0.012, 0.8); decal(0.24, 0.24, CUP_POS.x, CUP_POS.z, 0.6); decal(0.24, 0.30, 0.53, -0.1, 0.5, false, 0.28); decal(0.12, 0.12, -0.27, -0.13, 0.35);
const SCREEN_POOL = decal(0.62, 0.42, 0.0, 0.17, 0.11, true); SCREEN_POOL.material.color.setRGB(1.0, 0.86, 0.78);
// steam: a soft flowing sheet over the cup, always facing the camera
const STEAM_U = { uT: { value: 0 }, uA: { value: 1 } };
const STEAM = noDepth(new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.30), new THREE.ShaderMaterial({ uniforms: STEAM_U, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, side: THREE.DoubleSide,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uT, uA; varying vec2 vUv; ${NOISE_GLSL}
    void main(){ vec2 p = vec2((vUv.x - 0.5) * 2.0, clamp(vUv.y, 0.0, 1.0));   // MSAA extrapolates vUv past the quad's top edge: pow(negative) = NaN, which the DoF gather spread into a black bar
      float w = 0.13 + 0.42 * p.y;
      float bend = (fbm(vec3(p.y * 2.2 - uT * 0.32, uT * 0.11, 3.0), 3) - 0.47) * 1.5 * p.y;
      float x = (p.x - bend) / w;
      float tex = fbm(vec3(x * 1.7, p.y * 3.8 - uT * 0.62, uT * 0.17), 4);
      float strand = smoothstep(0.42, 0.72, tex);
      float a = strand * exp(-x * x * 2.2) * smoothstep(0.0, 0.08, p.y) * pow(1.0 - p.y, 1.8);
      gl_FragColor = vec4(vec3(0.62, 0.55, 0.50) * a * 0.62 * uA, 0.0); }` })));
STEAM.material.userData.thin = true; STEAM.material.userData.passable = true; STEAM.userData.passable = true; STEAM.renderOrder = 9; STEAM.name = 'Steam'; STEAM.position.copy(CUP_POS).add(V3(0, 0.215, 0)); CAFE.add(STEAM); STEAM.material.visible = false;   // the old wide shaft would lie over the cafe part's own steam

// the cards. slot = where it floats, facing the orbit's path. pxW = its width on screen at its stop, at = its centre there (px)
const ORBIT_C = V3(0.22, 1.14, -0.90), ORBIT_R = 0.95;      // high enough that the phone, the glass and the cup lie wholly below the frame at every card's stop
const CARD_DEF = [
  { asp: 2100 / 1762, W: 0.30, pad: 0.007, sz: [2100, 1762], th: -44, pi: 7, r: 0.95, pxW: 860, at: [960, 496], up: 0.0, rc: 155 / 2100 },   // pad: its lettering runs close to the recorded edge, so the card's own edge sits further out (the recorded pixels untouched)
  { asp: 2100 / 1446, W: 0.30, th: -24, pi: 7, r: 0.95, pxW: 584, at: [362, 470], up: 0.01, rc: 155 / 2100, sz: [2100, 1446], pad: 0.001, padY: 0.0125 },
  { asp: 1980 / 635, W: 0.42, th: -2, pi: 7, r: 0.93, pxW: 1160, at: [800, 390], up: 0.015, rc: 86 / 1980 },
  { asp: 1980 / 635, W: 0.42, th: 26, pi: 7, r: 0.97, pxW: 1500, at: [960, 500], up: -0.012, rc: 86 / 1980 },
  { asp: 2100 / 2031, W: 0.27, th: 49, pi: 7, r: 0.95, pxW: 810, at: [960, 478], up: 0.0, rc: 155 / 2100 },
];
CARD_DEF.forEach((c, i) => {
  c.W0 = c.W; c.H0 = c.W / c.asp;
  // card 2 keeps inside a narrow column (x 60..660, for the callouts) and still has to stand 40% of the frame's height: its recorded background continues a little further above and below (padY), no lettering touched
  if (c.pad) { const r0 = c.W0 * c.rc; c.W = c.W0 + 2 * c.pad; c.asp = c.W / (c.H0 + 2 * (c.padY || c.pad)); c.rc = (r0 + c.pad) / c.W; }
  const t = c.th * deg, p = c.pi * deg;
  c.nrm = V3(Math.sin(t) * Math.cos(p), Math.sin(p), Math.cos(t) * Math.cos(p));
  c.right = V3(Math.cos(t), 0, -Math.sin(t));
  c.upv = c.nrm.clone().cross(c.right).normalize();
  c.pos = ORBIT_C.clone().addScaledVector(c.nrm, c.r); c.pos.y += c.up;
  c.q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(c.right, c.upv, c.nrm));
  c.H = c.W / c.asp;
  // the stop: distance from the wanted width on screen; aim so that the card's centre lands at c.at
  c.d = c.W * 1080 / (2 * Math.tan(19 * deg) * c.pxW); const field = 2 * Math.tan(19 * deg) * c.d;
  c.stopT = c.pos.clone().addScaledVector(c.right, -(c.at[0] - 960) / 1080 * field).addScaledVector(c.upv, -(540 - c.at[1]) / 1080 * field);
  c.stopH = -c.th; c.stopP = c.pi;
});
// r0..r1 the rise out of the screen, x0..x1 the exit through the frame's edge (then hidden, off-frame), b0..b1 the way home: one card at a time
const CARD_TIMES = [
  { r0: 1.0, r1: 4.2, x0: 6.95, x1: 8.1, dx: -0.3, dy: 0, b0: 34.85, b1: 36.0, sb: 0.3 },
  { r0: 6.6, r1: 8.5, x0: 14.05, x1: 15.2, dx: -0.3, dy: 0, b0: 34.25, b1: 35.4, sb: 0.3 },
  { r0: 13.75, r1: 15.45, x0: 18.95, x1: 20.1, dx: -0.5, dy: 0, b0: 33.6, b1: 34.75, sb: 0.3 },
  { r0: 14.15, r1: 15.6, lead: 0.2, x0: 24.7, x1: 25.7, dx: -0.35, dy: 0.28, b0: 32.95, b1: 34.1, sb: 0.3 },
  { r0: 24.3, r1: 26.2, sr: 0.2, x0: 31.4, x1: 32.3, dx: -0.1, dy: 0.2, b0: 32.35, b1: 33.5, sb: 0.3 },
];
// where each card lies on the recorded result screen when it leaves and when it comes back: its centre's y and its width in px of the 500 x 1080 still. Cards 1 and 2 are that screen's own
// blocks (found by matching the card image against the still), so at these numbers each one covers its own copy exactly; cards 3-5 are further down the page, so they sink into the lower part of the screen.
const CARD_HOME = [[312, 448], [667, 448], [930, 448], [950, 448], [800, 448]].map(([y, w], i) => ({ u: (540 - y) / 1080 * SCR_H, s0: w / 500 * SCR_W / CARD_DEF[i].W0 }));
// the way in for cards 2-5: q = where in the rise it comes on, outside the frame, [dx, dy] = where that is, along the card's own axes (m). The camera turns to the right at these moments, so each comes in from the right with the
// turn while the last one leaves to the left. They keep above y 770, so none crosses the note band at y 770-860.
const CARD_IN = [null, { q: 0.34, d: [0.42, 0.03] }, { q: 0.36, d: [0.5, 0.03] }, { q: 0.3, d: [0.62, 0.0] }, { q: 0.3, d: [0.34, 0.015] }];
const CARD_SLAB_MAT = new THREE.MeshPhysicalMaterial({ color: 0xe8edf4, emissive: 0x9aa2ad, emissiveIntensity: 0.55, metalness: 0, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 1.0, transparent: true });
CARD_SLAB_MAT.userData.thin = true;                             // a closed thin solid: its two faces lie closer than the small QA scan's depth can tell apart
const CARD_DEPTH_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
const CARDS = CARD_DEF.map((c, i) => {
  const g = new THREE.Group(); g.name = 'Card' + (i + 1); CAFE.add(g);
  // the slab has the recorded PNG's own corner radius and sits just inside the face's outline: a larger corner on the PNG would leave the slab showing as a crescent
  const ins = 0.0009, r = c.W * c.rc - ins;
  const slabG = new THREE.ExtrudeGeometry(rrShape(c.W - 2 * ins, c.H - 2 * ins, r), { depth: 0.0026, bevelEnabled: true, bevelSize: 0.0002, bevelThickness: 0.0005, bevelSegments: 2, curveSegments: 14 }); slabG.translate(0, 0, -0.0034);
  const slab = new THREE.Mesh(slabG, CARD_SLAB_MAT.clone()); g.add(slab);
  const mat = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, uO: { value: 1 }, uSheen: { value: 0 }, uK: { value: new THREE.Vector2(c.W / c.W0, (c.W / c.asp) / c.H0) }, uS: { value: new THREE.Vector2(c.W, c.W / c.asp) }, uR: { value: c.W * c.rc } }, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tA; uniform float uO, uSheen, uR; uniform vec2 uK, uS; varying vec2 vUv; void main(){
      ${c.pad ? `const vec2 SZ = vec2(${c.sz[0].toFixed(1)}, ${c.sz[1].toFixed(1)}); const float RP = ${(c.sz[0] * 155 / 2100).toFixed(1)}, MP = 14.0;   // the margin continues the recorded background outwards from a line just inside its edge, never over the lettering
      vec2 uvP = (vUv - 0.5) * uK + 0.5, gx = dFdx(uvP), gy = dFdy(uvP), pp = (uvP - 0.5) * SZ, ap = abs(pp), q0 = ap - (SZ * 0.5 - RP);
      float sd = length(max(q0, 0.0)) + min(max(q0.x, q0.y), 0.0) - RP;
      if (sd > -MP) { vec2 nn = (q0.x > 0.0 && q0.y > 0.0) ? normalize(q0) : (q0.x > q0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0)); ap -= nn * (sd + MP); pp = ap * sign(pp); }
      vec4 tp = textureGrad(tA, pp / SZ + 0.5, gx, gy);
      vec2 qo = abs(vUv - 0.5) * uS - (uS * 0.5 - uR); float so = length(max(qo, 0.0)) + min(max(qo.x, qo.y), 0.0) - uR; float ao = clamp(0.5 - so / max(length(fwidth(vUv) * uS) * 0.7071, 1e-7), 0.0, 1.0);
      vec4 c = vec4(tp.rgb / max(tp.a, 0.001), 1.0) * ao;` : 'vec4 c = texture2D(tA, vUv);'}
      float s = uSheen * smoothstep(0.3, 0.0, abs(vUv.x + vUv.y - 1.0 - uSheen * 0.4)) * 0.05;
      gl_FragColor = vec4((c.rgb * 0.97 + s * c.a) * uO, c.a * uO); }` });
  // draws nothing in the picture: in the depth-of-field depth it is the face's exact outline, so no rim of the face counts as what lies behind it
  const outline = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(c.W, c.H, c.W * c.rc), 14), CARD_DEPTH_MAT); outline.position.z = 0.0004; outline.renderOrder = -1; g.add(outline);
  const face = noDepth(new THREE.Mesh(new THREE.PlaneGeometry(c.W, c.H), mat)); face.name = 'CardFace'; face.position.z = 0.0004; face.material.userData.thin = true; g.add(face);
  const shade = decal(c.W * 1.45, c.W * 1.05, c.pos.x, c.pos.z, 0.0, false);
  g.visible = false;
  return { g, slab, face, mat, shade };
});
SV_READY.then(() => CARDS.forEach((c, i) => { c.mat.uniforms.tA.value = SV_TEX['card' + (i + 1)]; }));
// the frame's top at the moment a card starts for home: it comes down from just above it, straight over the phone, facing the same way as the phone
const HOME_W = 0.17, HOME_S = i => HOME_W / CARD_DEF[i].W;     // its width (m) where a card starts for home: about 2.5 times the width it lands at, so it does not shrink to a slip
function cardOff(i) {
  const c = CARD_DEF[i], t = CARD_TIMES[i]; if (c.off) return c.off;
  const o = { T: new THREE.Vector3(), D: 1, q: new THREE.Quaternion(), hfov: IN_HFOV }; FILM_CAM(16 + t.b0, o);
  const up = V3(0, 1, 0).applyQuaternion(o.q), rt = V3(1, 0, 0).applyQuaternion(o.q), field = 2 * o.D * Math.tan(19 * deg);
  c.off = o.T.clone().addScaledVector(rt, PHONE_C.clone().sub(o.T).dot(rt)).addScaledVector(up, field / 2 + HOME_S(i) * c.H / 2 + 0.05);
  return c.off;
}
const _qFloat = i => (i === 3 ? 2 : i);                         // card 3 and card 4 float together: the light between them stays on both
const cardFloat = (a, i) => [0.0010 * Math.sin(a * 2 * Math.PI / 7.9 + _qFloat(i) * 2.9), 0.0016 * Math.sin(a * 2 * Math.PI / 6.1 + _qFloat(i) * 1.7)];
const _ca = new THREE.Vector3(), _cb = new THREE.Vector3();
function cardState(i, a, out) {                                // a = time inside ACT2 (s). Writes out.pos, out.q, out.s (scale), out.o (opacity), out.w (how far from the phone); false when not there
  const c = CARD_DEF[i], t = CARD_TIMES[i], hm = CARD_HOME[i];
  if (a <= t.r0 || a >= t.b1 || (a >= t.x1 && a <= t.b0)) return false;
  const back = a > t.b0, q = back ? 1 - range(a, t.b0, t.b1) : range(a, t.r0, t.r1);
  const home = back;                                            // every card starts home from above the frame
  const end = home ? cardOff(i) : c.pos, sEnd = home ? HOME_S(i) : 1, qEnd = home ? PHONE.quaternion : c.q, s0 = hm.s0, inn = CARD_IN[i];
  // at q = 0 it lies exactly over its own place on the screen, so it covers its own copy: it comes off towards the lens first, then leaves for where it goes
  const k = smoother(range(q, 0.01, back ? 0.3 : 0.24));
  _ca.copy(PHONE_C).addScaledVector(PHONE_U, hm.u).addScaledVector(PHONE_N, 0.0016 + 0.03 * k);
  let w, s;
  if (!back && inn) {
    // the phone is far below the frame by now: the card comes round with the camera's turn, at its full size and in its own plane, from outside the frame. Until then there is nothing to see
    if (q < inn.q) return false;
    w = smoother(range(q, inn.q, 1)); s = 1;
    out.pos.copy(c.pos).addScaledVector(c.right, inn.d[0] * (1 - w)).addScaledVector(c.upv, inn.d[1] * (1 - w));
    out.q.copy(c.q);
  } else {
    const wu = range(q, back ? 0.2 : 0.1, 1); w = back ? (home ? wu * wu * (3 - 2 * wu) : smoother(wu)) : smoother(Math.pow(wu, 1.3));
    s = lerp(s0, sEnd, back ? w : smoother(range(wu, 0.03, 0.9)));   // on the way home its size follows its fall, so it never hangs near the phone as a small slip
    out.pos.copy(_ca).lerp(end, w);
    if (!back && i === 0) { const wz = smoother(range(wu, 0.12, 1)); out.pos.z = lerp(_ca.z, end.z, wz); }   // the first card clears the phone sideways before it goes behind the phone's plane
    out.q.copy(PHONE.quaternion).slerp(qEnd, w);
  }
  out.s = s; out.w = w; out.o = smoother(range(q, 0, !back ? 0.03 : i < 2 ? 0.09 : 0.2));   // cards 1 and 2 go out over their own copy; the others are not on this part of the page, so they are gone as soon as they have sunk in
  const f = home ? 0 : smoother(range(w, 0.9, 1));              // slow float once it has arrived
  const [fx, fy] = cardFloat(a, i); out.pos.x += f * fx; out.pos.y += f * fy;
  const x = !back && a > t.x0 ? smoother(range(a, t.x0, t.x1)) : 0; if (x > 0) { out.pos.addScaledVector(c.right, t.dx * x); out.pos.y += t.dy * x; }
  out.v = (1 - x) * (home ? 1 - w : 1);                         // how much of its light and shade on the table is there: nothing while it is out of the frame
  return true;
}
// the light that joins the two cards' date lines: it underlines "접수기간" on card 3, crosses to card 4 and underlines the same line there (no lettering, the cards' pixels untouched)
const LINK_U = { uProg: { value: 0 }, uT: { value: 0 }, uA: { value: 0 } };
const LINK = (() => {
  const a = CARD_DEF[2], b = CARD_DEF[3];
  const on = (c, u, v, lift) => c.pos.clone().addScaledVector(c.right, (u - 0.5) * c.W).addScaledVector(c.upv, (0.5 - v) * c.H).addScaledVector(c.nrm, lift);
  const V = 0.608, pts = [];                                    // v of the line just under the date line, in the PNG (y 193 of 318); the line runs x 55..860 on card 3, x 55..842 on card 4 (of 990)
  for (let k = 0; k <= 8; k++) pts.push(on(a, lerp(0.056, 0.872, k / 8), V, 0.0016));
  const A = pts[pts.length - 1], B = on(b, 0.056, V, 0.0016);
  const gapA = on(a, 0.965, V + 0.02, 0.006), gapB = on(b, 0.012, V + 0.02, 0.006), mid = gapA.clone().lerp(gapB, 0.5); mid.y -= 0.006;
  pts.push(gapA, mid, gapB);
  for (let k = 0; k <= 8; k++) pts.push(on(b, lerp(0.056, 0.852, k / 8), V, 0.0016));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const mk = (radius, core) => { const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 320, radius, 10), new THREE.ShaderMaterial({ uniforms: LINK_U, transparent: true, depthWrite: false, blending: core ? THREE.CustomBlending : THREE.AdditiveBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uProg, uT, uA; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float u = vUv.x;
      float on = smoothstep(uProg, uProg - 0.015, u) * uA;
      float ndv = abs(dot(normalize(vN), normalize(vV)));
      ${core ? 'gl_FragColor = vec4(vec3(0.72, 0.24, 0.035) * on, on);' : 'gl_FragColor = vec4(vec3(1.0, 0.55, 0.22) * pow(ndv, 3.0) * 0.16 * on, 1.0);'} }` }));
    return core ? m : noDepth(m); };      // the core stays in the depth-of-field depth, so it is as sharp as the cards it joins; the faint halo is not
  const g = new THREE.Group(); g.name = 'CardLink'; const core = mk(0.00062, true), halo = mk(0.0048, false); core.renderOrder = 31; halo.renderOrder = 30; g.add(core, halo); core.material.userData.thin = halo.material.userData.thin = true; CAFE.add(g); g.visible = false;
  return g;
})();
