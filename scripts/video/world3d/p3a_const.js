
/* =====================================================================================
   3a. CONSTANTS. World unit: metres. Frame: tangent plane at the cafe. +x east, +y up, -z north. Origin on the ground at the table.
   Earth's centre sits at (0, -R, 0). All keys are plain functions of time: nothing accumulates between frames.
   ===================================================================================== */
const SV_R = 6371000, SV_LAT = 37.57, SV_LON = 126.98;
const EARTH_C = V3(0, -SV_R, 0);
const SUN_DIR = V3(-0.85, -0.42, 0.30).normalize();          // evening in Seoul: the sun has just set to the west
const TABLE_Y = 0.74;
const SCR_H = 0.14, SCR_W = SCR_H * 500 / 1080;              // the screen has exactly the 2D clip's aspect (500 x 1080)
const PHONE_TILT = 12 * deg, BEZEL = 0.0022, PHONE_THICK = 0.0078;
const PHONE_C = V3(0, TABLE_Y + 0.0175 + (SCR_H / 2 + BEZEL) * Math.cos(PHONE_TILT), 0);
const PHONE_N = V3(0, Math.sin(PHONE_TILT), Math.cos(PHONE_TILT));
const PHONE_U = V3(0, Math.cos(PHONE_TILT), -Math.sin(PHONE_TILT));
const PHONE_X = V3(1, 0, 0);
// IN pose: screen rectangle = x 96..596, y 0..1080 of a 1920 x 1080 frame. Fronto-parallel, so the projection is a pure rectangle.
const IN_HFOV = 38;
const IN_D = SCR_H / (2 * Math.tan(IN_HFOV * deg / 2));
const IN_T = PHONE_C.clone().addScaledVector(PHONE_X, (960 - 346) / 1080 * SCR_H);
const IN_H = 0, IN_P = 12;
// monotone cubic through [t, v] points (zero slope at the ends and at turning points)
function monoTrack(pts) {
  const n = pts.length, ts = pts.map(p => p[0]), vs = pts.map(p => p[1]), m = new Float64Array(n);
  for (let i = 1; i < n - 1; i++) { const d0 = (vs[i] - vs[i - 1]) / (ts[i] - ts[i - 1]), d1 = (vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]); m[i] = d0 * d1 <= 0 ? 0 : 2 / (1 / d0 + 1 / d1); }
  return t => {
    if (t <= ts[0]) return vs[0]; if (t >= ts[n - 1]) return vs[n - 1];
    let i = 0; while (i < n - 2 && t >= ts[i + 1]) i++;
    const dt = ts[i + 1] - ts[i], u = (t - ts[i]) / dt, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * m[i] * dt + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * m[i + 1] * dt;
  };
}
const NO_DEPTH_LAYER = 1;                                     // see-through things (glass, steam, sprites, light fields): not in the depth-of-field depth pass
function noDepth(o) { o.traverse(c => c.layers.set(NO_DEPTH_LAYER)); return o; }
camera.layers.enable(NO_DEPTH_LAYER);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
const texOf = (asset, srgb = true, mip = true) => loadTextureData(asset, srgb).then(t => {
  t.anisotropy = mip ? MAX_ANISO : 1; t.generateMipmaps = mip; t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t; });
const SV_TEX = {};                                            // filled by SV_READY
const SV_READY = Promise.all([
  texOf(ASSET_EARTH_DAY).then(t => { SV_TEX.day = t; t.wrapS = THREE.RepeatWrapping; }),
  texOf(ASSET_EARTH_NIGHT).then(t => { SV_TEX.night = t; t.wrapS = THREE.RepeatWrapping; }),
  texOf(ASSET_KOREA_PATCH).then(t => { SV_TEX.patch = t; }),
  new Promise((res, rej) => { const im = new Image(); im.onload = () => { SV_TEX.patchImg = im; res(); }; im.onerror = rej; im.src = ASSET_KOREA_PATCH; }),
  ...['S0', 'S6', 'S10'].map(k => texOf({ S0: ASSET_S0, S6: ASSET_S6, S10: ASSET_S10 }[k]).then(t => { SV_TEX[k] = t; })),
  ...['S0', 'S6', 'S10'].map(k => loadTextureData({ S0: ASSET_S0X, S6: ASSET_S6X, S10: ASSET_S10X }[k], false).then(t => { t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; SV_TEX[k + 'X'] = t; })),
  ...[ASSET_CARD1, ASSET_CARD2, ASSET_CARD3, ASSET_CARD4, ASSET_CARD5].map((a, i) => texOf(a).then(t => { t.premultiplyAlpha = true; t.needsUpdate = true; SV_TEX['card' + (i + 1)] = t; })),
]);
