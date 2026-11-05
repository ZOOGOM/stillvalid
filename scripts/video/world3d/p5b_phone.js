
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
    void main(){ vec3 c = texture2D(tA, vUv).rgb * uGain;
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
// a small stand of brushed metal and wood, under and behind the phone
{
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.096, 0.016, 0.07, 3, 0.004), WOOD_MAT); base.position.set(0, TABLE_Y + 0.008, -0.012); base.castShadow = base.receiveShadow = true; base.name = 'StandBase'; CAFE.add(base);
  const lip = new THREE.Mesh(new RoundedBoxGeometry(0.094, 0.0042, 0.005, 2, 0.0016), STEEL_MAT); lip.position.set(0, TABLE_Y + 0.0176, 0.0192); lip.castShadow = true; CAFE.add(lip);
  const backPlate = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.09, 0.005, 2, 0.002), STEEL_MAT); backPlate.position.copy(PHONE_C).addScaledVector(PHONE_N, -PHONE_THICK - 0.003).addScaledVector(PHONE_U, -0.038); backPlate.quaternion.copy(PHONE.quaternion); backPlate.castShadow = true; CAFE.add(backPlate);
  const leg = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.075, 0.004, 2, 0.0015), STEEL_MAT); leg.position.set(0, TABLE_Y + 0.040, -0.040); leg.rotation.x = 0.55; leg.castShadow = true; CAFE.add(leg);
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
STEAM.material.userData.thin = true; STEAM.material.userData.passable = true; STEAM.userData.passable = true; STEAM.renderOrder = 9; STEAM.name = 'Steam'; STEAM.position.copy(CUP_POS).add(V3(0, 0.215, 0)); CAFE.add(STEAM);

// the cards. slot = where it floats, facing the orbit's path. pxW = its width on screen at its stop, at = its centre there (px)
const ORBIT_C = V3(0.22, 1.02, -0.90), ORBIT_R = 0.95;
const CARD_DEF = [
  { asp: 2100 / 1762, W: 0.30, th: -44, pi: 7, r: 0.95, pxW: 860, at: [960, 490], up: 0.0 },
  { asp: 2100 / 1446, W: 0.30, th: -24, pi: 7, r: 0.95, pxW: 540, at: [345, 470], up: 0.01 },
  { asp: 1980 / 635, W: 0.42, th: -2, pi: 7, r: 0.93, pxW: 1160, at: [800, 390], up: 0.015 },
  { asp: 1980 / 635, W: 0.42, th: 26, pi: 7, r: 0.97, pxW: 1500, at: [960, 500], up: -0.012 },
  { asp: 2100 / 2031, W: 0.27, th: 49, pi: 7, r: 0.95, pxW: 810, at: [960, 478], up: 0.0 },
];
CARD_DEF.forEach((c, i) => {
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
const CARD_TIMES = [ { r0: 2.4, r1: 4.2, b0: 34.4, b1: 36.0 }, { r0: 7.0, r1: 8.45, b0: 33.6, b1: 35.2 }, { r0: 14.4, r1: 15.3, b0: 32.8, b1: 34.4 }, { r0: 14.45, r1: 15.5, b0: 32.5, b1: 34.1 }, { r0: 24.8, r1: 26.2, b0: 32.0, b1: 33.6 } ];
const CARD_SLAB_MAT = new THREE.MeshPhysicalMaterial({ color: 0xdfe4ea, metalness: 0, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.5 });
const CARDS = CARD_DEF.map((c, i) => {
  const g = new THREE.Group(); g.name = 'Card' + (i + 1); CAFE.add(g);
  const r = c.W * (20 / 350);
  const slabG = new THREE.ExtrudeGeometry(rrShape(c.W * 0.9985, c.H * 0.9985, r), { depth: 0.0026, bevelEnabled: true, bevelSize: 0.0002, bevelThickness: 0.0005, bevelSegments: 2, curveSegments: 10 }); slabG.translate(0, 0, -0.0034);
  const slab = new THREE.Mesh(slabG, CARD_SLAB_MAT.clone()); slab.castShadow = true; g.add(slab);
  const mat = new THREE.ShaderMaterial({ uniforms: { tA: { value: null }, uO: { value: 1 }, uSheen: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tA; uniform float uO, uSheen; varying vec2 vUv; void main(){ vec4 c = texture2D(tA, vUv);
      float s = uSheen * smoothstep(0.3, 0.0, abs(vUv.x + vUv.y - 1.0 - uSheen * 0.4)) * 0.05;
      gl_FragColor = vec4((c.rgb * 0.97 + s * c.a) * uO, c.a * uO); }` });
  const face = noDepth(new THREE.Mesh(new THREE.PlaneGeometry(c.W, c.H), mat)); face.name = 'CardFace'; face.position.z = 0.0004; face.material.userData.thin = true; g.add(face);
  const pool = decal(c.W * 2.3, c.W * 1.7, c.pos.x, c.pos.z, 0.0, true); pool.material.color.setRGB(1.0, 0.84, 0.74);
  const shade = decal(c.W * 1.45, c.W * 1.05, c.pos.x, c.pos.z, 0.0, false);
  g.visible = false;
  return { g, slab, face, mat, pool, shade };
});
SV_READY.then(() => CARDS.forEach((c, i) => { c.mat.uniforms.tA.value = SV_TEX['card' + (i + 1)]; }));
function cardState(i, a, out) {                                // a = time inside ACT2 (s). Writes out.pos, out.q, out.s (scale), out.o (opacity); false when not there
  const c = CARD_DEF[i], t = CARD_TIMES[i];
  if (a <= t.r0 || a >= t.b1) return false;
  const u = a < t.b0 ? smoother(range(a, t.r0, t.r1)) : smoother(1 - range(a, t.b0, t.b1));
  const e = u * u * (3 - 2 * u) * 0.25 + u * 0.75;
  // from flat on the screen, out along the screen's normal, up to its slot
  const p0 = PHONE_C.clone().addScaledVector(PHONE_N, 0.0022), p1 = PHONE_C.clone().addScaledVector(PHONE_N, 0.20).addScaledVector(PHONE_U, 0.13).lerp(c.pos, 0.28), p2 = c.pos;
  const w = 1 - e; out.pos.set(0, 0, 0).addScaledVector(p0, w * w).addScaledVector(p1, 2 * w * e).addScaledVector(p2, e * e);
  out.q.copy(PHONE.quaternion).slerp(c.q, smoother(clamp01(e * 1.15)));
  const s0 = SCR_W * 0.92 / c.W; out.s = s0 + (1 - s0) * e;
  out.o = smoother(clamp01(u / 0.1));
  const f = smoother(clamp01((u - 0.9) / 0.1));                 // slow float once it has arrived
  out.pos.y += f * 0.0016 * Math.sin(a * 2 * Math.PI / 6.1 + i * 1.7);
  out.pos.x += f * 0.0010 * Math.sin(a * 2 * Math.PI / 7.9 + i * 2.9);
  return true;
}
// the light that joins card 3 and card 4 (no lettering)
const LINK_U = { uProg: { value: 0 }, uT: { value: 0 }, uA: { value: 0 } };
const LINK = (() => {
  const a = CARD_DEF[2], b = CARD_DEF[3];
  const A = a.pos.clone().addScaledVector(a.right, a.W / 2 - 0.006), B = b.pos.clone().addScaledVector(b.right, -b.W / 2 + 0.006);
  const M1 = A.clone().lerp(B, 0.33).add(V3(0, -0.03, 0.05)), M2 = A.clone().lerp(B, 0.68).add(V3(0, 0.022, 0.05));
  const curve = new THREE.CatmullRomCurve3([A, M1, M2, B]);
  const mk = (radius, core) => noDepth(new THREE.Mesh(new THREE.TubeGeometry(curve, 96, radius, 12), new THREE.ShaderMaterial({ uniforms: LINK_U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uProg, uT, uA; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float u = vUv.x;
      float on = smoothstep(uProg, uProg - 0.04, u);
      float pul = 0.72 + 0.28 * sin(u * 16.0 - uT * 3.2);
      float ndv = abs(dot(normalize(vN), normalize(vV)));
      float prof = ${core ? '1.0' : 'pow(ndv, 3.0) * 0.32'};
      vec3 col = mix(vec3(1.0, 0.82, 0.62), vec3(0.72, 0.92, 1.0), u);
      gl_FragColor = vec4(col * prof * pul * on * uA * ${core ? '3.2' : '1.1'}, 1.0); }` })));
  const g = new THREE.Group(); g.name = 'CardLink'; const core = mk(0.00075, true), halo = mk(0.0065, false); core.renderOrder = 12; halo.renderOrder = 11; g.add(core, halo); core.material.userData.thin = halo.material.userData.thin = true; CAFE.add(g); g.visible = false;
  return g;
})();
