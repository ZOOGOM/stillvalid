
/* =====================================================================================
   7. FINISHING (film's own copy) — HDR render -> depth of field -> motion blur + exposure -> restrained bloom
   -> neutral tone curve (identity below 0.85, so unlit recorded images keep their colours) + sRGB -> fine grain
   -> vignette and the exact IN-pose composite (display space, last).
   ===================================================================================== */
const composerTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, composerTarget);
const renderPass = new RenderPass(scene, camera);
renderPass.clearColor = new THREE.Color(0x000000); renderPass.clearAlpha = 1;
composer.addPass(renderPass);
// depth of field: golden-angle gather with the thin-lens circle of confusion. Target distance = 1 (floating origin). Pixels with no opaque
// geometry behind them (depth = 1) stay sharp, so the light field's own discs stay crisp discs.
const DOF_DEPTH = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const DOF_DEPTH_MAT = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, blending: THREE.NoBlending });
const DOF = {
  uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, uA: { value: 0 }, uPx: { value: new THREE.Vector2(1 / 1920, 1 / 1080) }, uNear: { value: 1e-3 }, uFar: { value: 1e4 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `#include <packing>
    uniform sampler2D tDiffuse, tDepth; uniform float uA, uNear, uFar; uniform vec2 uPx; varying vec2 vUv;
    float zAt(vec2 uv){ float d = unpackRGBAToDepth(texture2D(tDepth, uv)); if (d >= 0.99999) return -1.0; return -perspectiveDepthToViewZ(d, uNear, uFar); }
    float cocOf(float z){ return z < 0.0 ? 0.0 : uA * abs(1.0 - 1.0 / max(z, 1e-3)); }
    void main(){
      float zc = zAt(vUv), cc = cocOf(zc);
      vec3 col = texture2D(tDiffuse, vUv).rgb; float tot = 1.0, rad = 1.6;
      float maxR = uA * 1.15; float rot = 6.2832 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      for (int i = 0; i < 110; i++) {
        if (rad >= maxR) break;
        float ang = float(i) * 2.39996 + rot;
        vec2 tc = vUv + vec2(cos(ang), sin(ang)) * uPx * rad;
        float zs = zAt(tc), cs = cocOf(zs);
        bool behind = zs < 0.0 || (zc > 0.0 && zs > zc);
        if (behind) cs = min(cs, cc * 2.0);
        float m = smoothstep(rad - 0.7, rad + 0.7, cs);
        col += mix(col / tot, texture2D(tDiffuse, tc).rgb, m); tot += 1.0;
        rad += 1.5 / rad + 0.008 * uA;
      }
      gl_FragColor = vec4(col / tot, 1.0);
    }` };
const dofPass = new ShaderPass(DOF);
composer.addPass(dofPass);
const bokehPass = null;
const MBLUR = {
  uniforms: { tDiffuse: { value: null }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uZoom: { value: 0 }, uShift: { value: new THREE.Vector2() }, uAmt: { value: 0 }, uExposure: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uC; uniform float uZoom; uniform vec2 uShift; uniform float uAmt; uniform float uExposure; varying vec2 vUv;
    vec3 fix(vec3 c) { return (any(isnan(c)) || any(isinf(c))) ? vec3(0.0) : clamp(c, 0.0, 2.0e4); }
    void main() {
      vec4 base = texture2D(tDiffuse, vUv); base.rgb = fix(base.rgb) * uExposure;
      if (uAmt < 0.001) { gl_FragColor = base; return; }
      vec2 v = (vUv - uC) * uZoom + uShift;
      float L = length(v); if (L < 0.0003) { gl_FragColor = base; return; }
      v *= min(1.0, 0.022 / L);
      vec3 acc = vec3(0.0); float wsum = 0.0;
      for (int i = 0; i < 12; i++) { float f = (float(i) + 0.5) / 12.0 - 0.5; float w = 1.0 - abs(f) * 1.2;
        acc += fix(texture2D(tDiffuse, vUv - v * f).rgb) * uExposure * w; wsum += w; }
      gl_FragColor = vec4(mix(base.rgb, acc / wsum, uAmt), base.a);
    }`,
};
const mblurPass = new ShaderPass(MBLUR);
composer.addPass(mblurPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.6, 3.0);
composer.addPass(bloom);
const OUT_TONE = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    vec3 tone(vec3 c){ const float st = 0.85, d = 1.0 - st; float peak = max(c.r, max(c.g, c.b)); if (peak < st) return c;
      float np = 1.0 - d * d / (peak + d - st); vec3 o = c * (np / peak); float g = 1.0 - 1.0 / (0.15 * (peak - np) + 1.0); return mix(o, vec3(np), g); }
    vec3 srgb(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){ gl_FragColor = vec4(srgb(tone(texture2D(tDiffuse, vUv).rgb)), 1.0); }` };
composer.addPass(new ShaderPass(OUT_TONE));
const GRAIN = {
  uniforms: { tDiffuse: { value: null }, uSeed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uSeed; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float g = h(gl_FragCoord.xy) - 0.5; gl_FragColor = vec4(c.rgb + g * 0.010, c.a); }`,
};
const grainPass = new ShaderPass(GRAIN);
composer.addPass(grainPass);
// last, in display space: a faint vignette, the planned dark areas, and the exact recorded still over the screen rectangle at the IN pose
const EXACT = {
  uniforms: { tDiffuse: { value: null }, tExact: { value: null }, uExact: { value: 0 }, uHold: { value: 0 }, uH: { value: new THREE.Matrix3() }, uDarkR: { value: 0 }, uDarkTop: { value: 0 }, uVig: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse, tExact; uniform float uExact, uHold, uDarkR, uDarkTop, uVig; uniform mat3 uH; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 q = (vUv - vec2(0.5, 0.48)) * vec2(1.0, 0.72);
      c *= 1.0 - 0.34 * uVig * smoothstep(0.30, 0.74, length(q));
      c *= 1.0 - uDarkR * 0.72 * smoothstep(0.325, 0.385, vUv.x);
      c *= 1.0 - uDarkTop * 0.55 * smoothstep(0.86, 0.93, vUv.y);
      if (uExact > 0.0005) {
        vec3 h = uH * vec3(vUv, 1.0); vec2 uv = h.xy / h.z; vec2 fw = max(fwidth(uv), vec2(1e-6));
        vec2 d = min(uv, 1.0 - uv) / fw; float m = clamp(d.x + 0.5, 0.0, 1.0) * clamp(d.y + 0.5, 0.0, 1.0);
        vec3 s = uHold > 0.5 ? texelFetch(tExact, clamp(ivec2(gl_FragCoord.xy) - ivec2(96, 0), ivec2(0), ivec2(499, 1079)), 0).rgb : texture2D(tExact, uv).rgb;
        c = mix(c, s, m * uExact);
      }
      gl_FragColor = vec4(c, 1.0); }` };
const exactPass = new ShaderPass(EXACT);
composer.addPass(exactPass);
const RESIZE_HOOKS = [];
function resizePost(W, H, pr) {
  composer.setPixelRatio(pr);
  composer.setSize(W, H);
  bloom.resolution.set(W * pr / 2, H * pr / 2);
  DOF_DEPTH.setSize(Math.round(W * pr), Math.round(H * pr));
  dofPass.uniforms.uPx.value.set(1 / (W * pr), 1 / (H * pr));
  dofPass.uniforms.tDepth.value = DOF_DEPTH.texture;
  RESIZE_HOOKS.forEach(f => f(W, H, pr));
}
