/* The roof that builds itself: a lit, textured 3D house in WebGL2 (no libraries).
   RoofScene(canvas).draw(p)  with p from 0 (bare framing) to 1 (finished).
   All textures are painted here at load, so there is nothing to download. */
(() => {
  'use strict';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const out = t => 1 - Math.pow(1 - t, 3);
  const inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rnd = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ---------- vectors and matrices ---------- */
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(...a) || 1; return mul(a, 1 / l); };
  function mat(a, b) {                         // column-major a * b
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  }
  function look(eye, at) {
    const z = norm(sub(eye, at)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
  }
  const persp = (fy, asp, n, f) => { const t = 1 / Math.tan(fy / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]); };
  const ortho = (s, n, f) => new Float32Array([1 / s, 0, 0, 0, 0, 1 / s, 0, 0, 0, 0, -2 / (f - n), 0, 0, 0, -(f + n) / (f - n), 1]);

  /* ---------- the house, in its own units ---------- */
  const W = 440, HD = 130, H = 130, R = 118, EO = 24, GO = 24;
  const XL = -W / 2 - GO, XR = W / 2 + GO, ZE = HD + EO, YE = H - EO * R / HD, YR = H + R;
  const NL = Math.hypot(ZE, YR - YE), N = [0, ZE / NL, (YR - YE) / NL];      // front slope normal
  const S = (u, v, lift = 0) => [lerp(XL, XR, u), lerp(YE, YR, v) + N[1] * lift, lerp(ZE, 0, v) + N[2] * lift];
  const slopeY = z => YE + (YR - YE) * (1 - z / ZE);

  const START = 0.03, SPAN = 0.18, RUN = 0.165;
  const phase = (p, k) => clamp((p - (START + k * SPAN)) / RUN);

  /* ---------- painted textures ---------- */
  function paint(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
  function speckle(g, w, h, n, size, lo, hi, a = 1, seed = 1) {
    for (let i = 0; i < n; i++) {
      const v = Math.round(lerp(lo, hi, rnd(i * 1.37 + seed)));
      g.fillStyle = `rgba(${v},${v},${v},${a})`;
      g.fillRect(rnd(i * 2.11 + seed) * w, rnd(i * 3.73 + seed) * h, size * (0.5 + rnd(i + seed)), size * (0.5 + rnd(i * 5 + seed)));
    }
  }
  const TEX = {
    white: () => paint(4, 4, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 4, 4); }),
    granule: () => paint(256, 256, (g, w, h) => {
      g.fillStyle = '#b4b4b4'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 9000, 2.4, 70, 245, 0.85, 3); speckle(g, w, h, 2200, 1.6, 10, 70, 0.8, 9);
    }),
    osb: () => paint(512, 512, (g, w, h) => {
      g.fillStyle = '#c2935c'; g.fillRect(0, 0, w, h);
      const tones = ['#d9b27c', '#a87a45', '#e2c08e', '#8f6434', '#c99c64', '#b5854e'];
      for (let i = 0; i < 2600; i++) {
        g.save(); g.translate(rnd(i) * w, rnd(i * 7.7) * h); g.rotate(rnd(i * 3.1) * 3.14);
        g.fillStyle = tones[(rnd(i * 9.2) * tones.length) | 0]; g.globalAlpha = 0.8;
        g.fillRect(-14, -3, 12 + rnd(i * 4) * 22, 3 + rnd(i * 6) * 5); g.restore();
      }
    }),
    wood: () => paint(256, 256, (g, w, h) => {
      g.fillStyle = '#c59a68'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(110,72,36,${0.1 + rnd(i) * 0.3})`; g.lineWidth = 0.5 + rnd(i * 2) * 2; const y = rnd(i * 5) * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + rnd(i * 3) * 8 - 4, w * 0.7, y + rnd(i * 8) * 8 - 4, w, y); g.stroke(); }
    }),
    rubber: () => paint(256, 256, (g, w, h) => { g.fillStyle = '#2a2d30'; g.fillRect(0, 0, w, h); speckle(g, w, h, 2600, 2, 20, 90, 0.6, 4); }),
    felt: () => paint(512, 256, (g, w, h) => {
      g.fillStyle = '#8f979d'; g.fillRect(0, 0, w, h); speckle(g, w, h, 6000, 1.6, 90, 190, 0.45, 6);
      g.fillStyle = 'rgba(196,115,63,.9)'; g.fillRect(0, 26, w, 3); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(0, 128, w, 2); g.fillRect(0, 214, w, 2);
      g.fillStyle = 'rgba(40,48,56,.55)'; g.font = '600 22px sans-serif'; g.fillText('SYNTHETIC UNDERLAYMENT', 40, 80); g.fillText('NAIL LINE', 330, 180);
    }),
    siding: () => paint(256, 256, (g, w, h) => {
      for (let i = 0; i < 8; i++) {
        const y = i * 32, gr = g.createLinearGradient(0, y, 0, y + 32);
        gr.addColorStop(0, '#6d7f8d'); gr.addColorStop(0.12, '#97a8b5'); gr.addColorStop(0.9, '#8799a7'); gr.addColorStop(1, '#39454f');
        g.fillStyle = gr; g.fillRect(0, y, w, 32);
      }
      speckle(g, w, h, 3000, 1.5, 60, 220, 0.14, 8);
    }),
    brick: () => paint(256, 256, (g, w, h) => {
      g.fillStyle = '#b9aea2'; g.fillRect(0, 0, w, h);
      for (let r = 0; r < 12; r++) for (let c = -1; c < 5; c++) {
        const n = r * 11 + ((c + 4) % 4), x = c * 64 + (r % 2 ? 32 : 0), y = r * (h / 12);
        g.fillStyle = `hsl(${10 + rnd(n) * 10} ${36 + rnd(n * 3) * 18}% ${28 + rnd(n * 5) * 18}%)`;
        g.fillRect(x + 2, y + 2, 60, h / 12 - 4);
      }
      speckle(g, w, h, 3500, 1.8, 30, 200, 0.22, 2);
    }),
    stone: () => paint(512, 128, (g, w, h) => {
      g.fillStyle = '#4a4a47'; g.fillRect(0, 0, w, h);
      let n = 0;
      for (let r = 0; r < 3; r++) for (let x = -20; x < w;) {
        const wd = 38 + rnd(++n) * 56, l = 38 + rnd(n * 3) * 26;
        g.fillStyle = `hsl(${30 + rnd(n * 7) * 20} 8% ${l}%)`;
        g.beginPath(); g.rect(x + 2, r * 43 + 2, wd - 4, 39); g.fill(); x += wd;
      }
      speckle(g, w, h, 4000, 2, 40, 220, 0.2, 5);
    }),
    copper: () => paint(256, 256, (g, w, h) => {
      g.fillStyle = '#c9794a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { const x = rnd(i) * w, y = rnd(i * 3) * h, r = 12 + rnd(i * 7) * 46; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rnd(i * 5) > 0.5 ? 'rgba(240,170,120,.35)' : 'rgba(120,60,30,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      speckle(g, w, h, 900, 1.2, 80, 255, 0.18, 7);
    }),
    grass: () => paint(512, 512, (g, w, h) => {
      g.fillStyle = '#3f5530'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 14000; i++) { g.strokeStyle = `hsl(${78 + rnd(i) * 34} ${26 + rnd(i * 2) * 24}% ${17 + rnd(i * 3) * 24}%)`; g.lineWidth = 1.2; const x = rnd(i * 5) * w, y = rnd(i * 7) * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(i * 9) * 5 - 2.5, y - 3 - rnd(i * 11) * 6); g.stroke(); }
    }),
    leaf: () => paint(256, 256, (g, w, h) => {
      g.fillStyle = '#2f4527'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1500; i++) { g.save(); g.translate(rnd(i) * w, rnd(i * 3) * h); g.rotate(rnd(i * 7) * 6.3); g.fillStyle = `hsl(${85 + rnd(i * 5) * 35} ${28 + rnd(i * 9) * 20}% ${18 + rnd(i * 11) * 26}%)`; g.beginPath(); g.ellipse(0, 0, 8, 4, 0, 0, 7); g.fill(); g.restore(); }
    }),
    door: () => paint(128, 256, (g, w, h) => {
      g.fillStyle = '#8c4f28'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(40,18,6,${rnd(x) * 0.35})`; g.fillRect(x, 0, 2, h); }
      g.strokeStyle = 'rgba(30,12,4,.75)'; g.lineWidth = 5;
      g.strokeRect(18, 20, 92, 70); g.strokeRect(18, 108, 92, 124);
    }),
    window: () => paint(256, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd9a0'); gr.addColorStop(0.55, '#f2ab5e'); gr.addColorStop(1, '#8a4f2a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(120,64,30,.55)'; for (const x of [0, 200]) for (let i = 0; i < 4; i++) g.fillRect(x + i * 15, 0, 8, h);       // curtains
      g.fillStyle = 'rgba(80,40,20,.55)'; g.fillRect(70, 180, 120, 76); g.fillRect(120, 120, 6, 60);                                        // furniture + lamp
      const l = g.createRadialGradient(123, 112, 4, 123, 112, 60); l.addColorStop(0, '#fff6dc'); l.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = l; g.fillRect(60, 50, 130, 130);
      const sky = g.createLinearGradient(0, 0, w, h); sky.addColorStop(0, 'rgba(150,190,230,.42)'); sky.addColorStop(0.45, 'rgba(150,190,230,0)'); g.fillStyle = sky; g.fillRect(0, 0, w, h);   // glass reflection
    })
  };

  /* ---------- shaders ---------- */
  const VS = `#version 300 es
  layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aUV;
  uniform mat4 uVP, uLight; uniform vec3 uOff;
  out vec3 vP, vN; out vec2 vUV; out vec4 vL;
  void main(){ vec3 p = aP + uOff; vP = p; vN = aN; vUV = aUV; vL = uLight * vec4(p + aN*1.1, 1.); gl_Position = uVP * vec4(p, 1.); }`;
  const FS = `#version 300 es
  precision highp float; precision highp sampler2DShadow;
  in vec3 vP, vN; in vec2 vUV; in vec4 vL;
  uniform sampler2D uTex; uniform sampler2DShadow uShadow;
  uniform vec3 uTint, uEye, uSun; uniform float uAlpha, uSpec, uShine, uEmit, uClip, uFade, uGlint, uBump;
  out vec4 o;
  float shadow(){
    vec3 q = vL.xyz / vL.w * .5 + .5;
    if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z>1.) return 1.;
    float s = 0., t = 1.4/2048.;
    for(int x=-2;x<=2;x++) for(int y=-2;y<=2;y++) s += texture(uShadow, vec3(q.xy + vec2(x,y)*t, q.z - .0012));
    return s/25.;
  }
  void main(){
    vec4 tx = texture(uTex, vUV);
    if(vP.x > uClip) discard;
    vec3 base = pow(tx.rgb * uTint, vec3(2.2));
    vec3 n = normalize(vN);
    float h = dot(tx.rgb, vec3(.333));
    vec3 px = dFdx(vP), py = dFdy(vP);
    n = normalize(n - uBump * (dFdx(h)*px/max(length(px),1e-4) + dFdy(h)*py/max(length(py),1e-4)));
    vec3 V = normalize(uEye - vP);
    float sh = shadow();
    float dif = max(dot(n, uSun), 0.) * sh;
    vec3 sky = mix(vec3(.10,.085,.07), vec3(.30,.40,.56), n.y*.5+.5);
    float ao = mix(.62, 1., smoothstep(0., 55., vP.y));
    vec3 c = base * (sky*ao*1.15 + vec3(1.0,.84,.64)*dif*2.1);
    vec3 Hh = normalize(uSun + V);
    float metal = step(.5, uSpec);
    c += uSpec * pow(max(dot(n,Hh),0.), uShine) * sh * mix(vec3(1.), base*2.6, metal);
    vec3 r = reflect(-V, n);
    c += metal * base * mix(vec3(.12,.07,.04), vec3(.5,.62,.85), smoothstep(-.2,.8,r.y)) * .75;
    c += uEmit * pow(tx.rgb, vec3(2.2));
    float band = exp(-pow((vP.x + vP.y*.6 - uGlint)/40., 2.));
    c += band * vec3(.11,.07,.045);
    c = c / (1. + c*.22);
    float a = uAlpha;
    if(uFade > 0.) a *= 1. - smoothstep(uFade*.5, uFade, length(vP.xz * vec2(.8, 1.15)));
    o = vec4(pow(c, vec3(1./2.2)) * a, a);
  }`;
  const DVS = `#version 300 es
  layout(location=0) in vec3 aP; uniform mat4 uLight; uniform vec3 uOff; out float vX;
  void main(){ vX = aP.x + uOff.x; gl_Position = uLight * vec4(aP + uOff, 1.); }`;
  const DFS = `#version 300 es
  precision highp float; in float vX; uniform float uClip; void main(){ if(vX > uClip) discard; }`;

  window.RoofScene = function (canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: true, alpha: true });
    if (!gl) return { draw() {}, resize() {} };

    function program(v, f) {
      const p = gl.createProgram();
      [[gl.VERTEX_SHADER, v], [gl.FRAGMENT_SHADER, f]].forEach(([t, src]) => {
        const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
        gl.attachShader(p, s);
      });
      gl.linkProgram(p);
      const u = {};
      for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
      return { p, u };
    }
    const main = program(VS, FS), depth = program(DVS, DFS);

    const textures = {};
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    for (const k in TEX) {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, TEX[k]());
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
      textures[k] = t;
    }

    const SM = 2048;
    const shadowTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, shadowTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, SM, SM, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE]].forEach(([a, b]) => gl.texParameteri(gl.TEXTURE_2D, a, b));
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, shadowTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    /* ---------- mesh building ---------- */
    function Mesh() { this.d = []; }
    // a flat polygon facing roughly toward `hint`; texture is projected on its own plane, `s` units per tile
    Mesh.prototype.poly = function (pts, hint, s = 100, uvs) {
      let n = [0, 0, 0];
      for (let i = 1; i < pts.length - 1; i++) { const c = cross(sub(pts[i], pts[0]), sub(pts[i + 1], pts[0])); if (Math.hypot(...c) > Math.hypot(...n)) n = c; }
      n = norm(n);
      if (dot(n, hint) < 0) n = mul(n, -1);
      const t = Math.abs(n[1]) > 0.99 ? [1, 0, 0] : norm(cross([0, 1, 0], n));
      const b = cross(n, t);
      for (let i = 1; i < pts.length - 1; i++) for (const j of [0, i, i + 1]) {
        const q = pts[j], uv = uvs ? uvs[j] : [dot(q, t) / s, -dot(q, b) / s];
        this.d.push(...q, ...n, ...uv);
      }
      return this;
    };
    // a slab: a face (list of points) pushed back by vector `th`
    Mesh.prototype.slab = function (pts, th, s = 100, uvs) {
      const back = pts.map(q => sub(q, th)), mid = mul(pts.concat(back).reduce(add, [0, 0, 0]), 1 / (pts.length * 2));
      this.poly(pts, th, s, uvs).poly(back, mul(th, -1), s, uvs);
      pts.forEach((q, i) => {
        const j = (i + 1) % pts.length, quad = [q, pts[j], back[j], back[i]];
        this.poly(quad, sub(mul(quad.reduce(add, [0, 0, 0]), 0.25), mid), s);
      });
      return this;
    };
    Mesh.prototype.box = function (x0, y0, z0, x1, y1, z1, s = 100) {
      return this.slab([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, z1 - z0], s);
    };
    // a round bar between two points
    Mesh.prototype.tube = function (a, b, r, sides = 10, s = 60) {
      const d = norm(sub(b, a)), t = norm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), k = cross(d, t);
      const ring = (c, i) => add(c, add(mul(t, Math.cos(i / sides * 6.2832) * r), mul(k, Math.sin(i / sides * 6.2832) * r)));
      for (let i = 0; i < sides; i++) {
        const q = [ring(a, i), ring(a, i + 1), ring(b, i + 1), ring(b, i)];
        this.poly(q, sub(mul(add(q[0], q[1]), 0.5), a), s);
      }
      return this;
    };
    Mesh.prototype.done = function () {
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.d), gl.STATIC_DRAW);
      [[0, 3, 0], [1, 3, 12], [2, 2, 24]].forEach(([i, n, o]) => { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, n, gl.FLOAT, false, 32, o); });
      gl.bindVertexArray(null);
      return { vao, n: this.d.length / 8 };
    };

    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
    const M = (tex, color = '#ffffff', extra = {}) => Object.assign({ tex, tint: hex(color), spec: 0.06, shine: 18, emit: 0, bump: 0 }, extra);
    const MAT = {
      siding: M('siding', '#8fa0ae'), trim: M('white', '#ece6da', { spec: 0.12 }), stone: M('stone', '#ffffff', { bump: 0.7 }),
      brick: M('brick', '#ffffff', { bump: 0.6 }), cap: M('stone', '#d0d0cc'), soffit: M('white', '#4a4f55'), dark: M('white', '#15181b'),
      glass: M('window', '#2a2e36', { emit: 0.9, spec: 0.35, shine: 90 }), door: M('door', '#ffffff', { spec: 0.18, shine: 40 }),
      wood: M('wood', '#ffffff'), osb: M('osb', '#ffffff', { bump: 0.25 }), ice: M('rubber', '#ffffff', { spec: 0.2, shine: 12 }),
      felt: M('felt', '#ffffff', { spec: 0.14, shine: 20 }), roll: M('felt', '#d5dade'), rollDark: M('rubber', '#8a9096'),
      copper: M('copper', '#ffffff', { spec: 0.9, shine: 46 }), grass: M('grass', '#d0d8bc', { spec: 0 }), path: M('stone', '#a9a49a'),
      leaf: M('leaf', '#ffffff', { bump: 1.2 }), metal: M('white', '#9aa0a6', { spec: 0.35 })
    };

    /* ---------- the parts that are always there ---------- */
    const fixed = {};
    const F = k => fixed[k] || (fixed[k] = new Mesh());
    const front = [0, 0, 1], side = [1, 0, 0];
    // walls and gable ends
    F('siding').poly([[-W / 2, 0, HD], [W / 2, 0, HD], [W / 2, H, HD], [-W / 2, H, HD]], front, 96);
    F('siding').poly([[-W / 2, 0, -HD], [W / 2, 0, -HD], [W / 2, H, -HD], [-W / 2, H, -HD]], [0, 0, -1], 96);
    for (const x of [W / 2, -W / 2]) F('siding').poly([[x, 0, HD], [x, 0, -HD], [x, H, -HD], [x, YR - 4, 0], [x, H, HD]], [x, 0, 0], 96);
    // stone footing, corner boards
    F('stone').box(-W / 2 - 3, 0, -HD - 3, W / 2 + 3, 17, HD + 3, 120);
    for (const x of [-W / 2, W / 2]) for (const z of [-HD, HD]) F('trim').box(x - 4, 17, z - 4, x + 4, H - 2, z + 4);
    // windows with real depth: glass, frame, bars and sill
    function windowAt(u0, u1, y0, y1, at, gable) {
      const P = (u, y, d) => (gable ? [at + d, y, u] : [u, y, at + d]);
      const q = (a, b, c, e, d) => [P(a, c, d), P(b, c, d), P(b, e, d), P(a, e, d)];
      const n = gable ? side : front;
      F('glass').poly(q(u0, u1, y0, y1, 0.8), n, 1, [[0, 1], [1, 1], [1, 0], [0, 0]]);
      const bar = (a, b, c, e, d) => F('trim').slab(q(a, b, c, e, d), mul(n, d));
      bar(u0 - 5, u1 + 5, y1, y1 + 6, 5); bar(u0 - 8, u1 + 8, y0 - 6, y0, 9);
      bar(u0 - 5, u0, y0, y1, 4); bar(u1, u1 + 5, y0, y1, 4);
      bar((u0 + u1) / 2 - 1.4, (u0 + u1) / 2 + 1.4, y0, y1, 2.4); bar(u0, u1, (y0 + y1) / 2 - 1.2, (y0 + y1) / 2 + 1.2, 2.2);
    }
    windowAt(-180, -112, 44, 98, HD); windowAt(-86, -46, 44, 98, HD); windowAt(74, 168, 44, 98, HD);
    windowAt(20, 80, 44, 98, W / 2, true); windowAt(-84, -34, 44, 98, W / 2, true); windowAt(-24, 24, 150, 184, W / 2, true);
    // door, frame, step, handle, porch lamp
    F('door').poly([[-14, 17, HD + 2], [32, 17, HD + 2], [32, 96, HD + 2], [-14, 96, HD + 2]], front, 1, [[0, 1], [1, 1], [1, 0], [0, 0]]);
    F('trim').box(-20, 17, HD, -14, 102, HD + 5); F('trim').box(32, 17, HD, 38, 102, HD + 5); F('trim').box(-20, 96, HD, 38, 102, HD + 6);
    F('path').box(-30, 0, HD + 3, 48, 15, HD + 30, 80); F('path').box(-38, 0, HD + 30, 56, 7, HD + 48, 80);
    F('copper').box(24, 52, HD + 2, 27, 62, HD + 5);
    F('copper').box(47, 78, HD, 55, 82, HD + 9); F('glass').box(48, 66, HD + 2, 54, 78, HD + 8, 12);
    // back slope (it's behind the ridge, only its underside and edge show)
    F('soffit').slab([[XL, YR, 0], [XR, YR, 0], [XR, YE, -ZE], [XL, YE, -ZE]], [0, 4, -4]);
    // rafters, ridge board, wall plate and a dark attic underneath
    F('dark').poly([[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => S(u, v, -15)), N, 100);
    for (let i = 0; i <= 14; i++) { const u = clamp(i / 14, 0.008, 0.992); F('wood').slab([S(u - 0.0065, 0, -1), S(u + 0.0065, 0, -1), S(u + 0.0065, 1, -1), S(u - 0.0065, 1, -1)], mul(N, 11), 60); }
    F('wood').slab([S(0, 0.49, -9), S(1, 0.49, -9), S(1, 0.51, -9), S(0, 0.51, -9)], mul(N, 4), 60);
    F('wood').box(XL, YR - 12, -4, XR, YR - 1, 3, 60); F('wood').box(XL, YE - 9, ZE - 6, XR, YE, ZE - 1, 60);
    // lawn, walkway and a few shrubs
    F('grass').poly([[-620, -0.6, -460], [620, -0.6, -460], [620, -0.6, 520], [-620, -0.6, 520]], [0, 1, 0], 190);
    for (let i = 0; i < 5; i++) F('path').box(-14 + rnd(i) * 10, -1, HD + 56 + i * 30, 36 + rnd(i * 3) * 10, 1.6, HD + 80 + i * 30, 80);
    function shrub(cx, cz, r, seed) {
      const ny = 9, nx = 14;
      const p = (i, j) => {
        const th = j / ny * 3.14159, ph = (i % nx) / nx * 6.2832, k = j === 0 || j === ny ? r : r * (0.82 + rnd(seed + (i % nx) * 7 + j * 31) * 0.36);
        return [cx + Math.sin(th) * Math.cos(ph) * k, r * 0.65 + Math.cos(th) * k * 0.9, cz + Math.sin(th) * Math.sin(ph) * k];
      };
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const q = [p(i, j), p(i, j + 1), p(i + 1, j + 1), p(i + 1, j)], away = sub(mul(q.reduce(add, [0, 0, 0]), 0.25), [cx, r * 0.65, cz]);
        F('leaf').poly([q[0], q[1], q[2]], away, 34); F('leaf').poly([q[0], q[2], q[3]], away, 34);
      }
    }
    [[-196, 22], [-166, 17], [-136, 13], [-88, 15], [-56, 19], [78, 16], [110, 21], [146, 18], [182, 24]].forEach(([x, r], i) => shrub(x, HD + 17 + rnd(i) * 7, r, i * 97));
    shrub(W / 2 + 22, -104, 25, 800); shrub(-W / 2 - 62, 40, 36, 900);
    // chimney
    const CX0 = -150, CX1 = -98, ZF = 88, ZB = 46, TOP = YR + 30, YF = slopeY(ZF), YB = slopeY(ZB);
    F('brick').poly([[CX0, YF, ZF], [CX1, YF, ZF], [CX1, TOP, ZF], [CX0, TOP, ZF]], front, 70);
    F('brick').poly([[CX0, YB, ZB], [CX1, YB, ZB], [CX1, TOP, ZB], [CX0, TOP, ZB]], [0, 0, -1], 70);
    for (const x of [CX0, CX1]) F('brick').poly([[x, YF, ZF], [x, YB, ZB], [x, TOP, ZB], [x, TOP, ZF]], [x - (CX0 + CX1) / 2, 0, 0], 70);
    F('cap').box(CX0 - 6, TOP, ZB - 6, CX1 + 6, TOP + 9, ZF + 6, 70);
    F('metal').tube([-137, TOP + 9, 67], [-137, TOP + 24, 67], 7); F('metal').tube([-112, TOP + 9, 67], [-112, TOP + 24, 67], 7);

    const fixedMeshes = Object.entries(fixed).map(([k, m]) => [MAT[k], m.done()]);

    /* ---------- the pieces that arrive ---------- */
    // plywood sheets, staggered like a real deck
    const sheets = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c <= 6; c++) {
      const off = r % 2 ? -0.5 : 0, u0 = clamp((c + off) / 6), u1 = clamp((c + 1 + off) / 6);
      if (u1 - u0 < 0.01) continue;
      const n = sheets.length, a = u0 + 0.0022, b = u1 - 0.0022, v0 = r / 4 + 0.004, v1 = (r + 1) / 4 - 0.004, sh = 0.86 + rnd(n * 3.1) * 0.2;
      sheets.push({ mesh: new Mesh().slab([S(a, v0, 2), S(b, v0, 2), S(b, v1, 2), S(a, v1, 2)], mul(N, 3), 90).done(), mat: M('osb', '#ffffff', { tint: [sh, sh, sh], bump: 0.25 }), n });
    }
    const iceStrip = new Mesh().slab([S(0, 0, 3), S(1, 0, 3), S(1, 0.2, 3), S(0, 0.2, 3)], mul(N, 0.8), 110).done();
    const felts = [[0.17, 0.4], [0.38, 0.61], [0.59, 0.82], [0.8, 1]].map(([v0, v1], i) => ({
      mesh: new Mesh().slab([S(0, v0, 3.8 + i * 0.3), S(1, v0, 3.8 + i * 0.3), S(1, v1, 3.8 + i * 0.3), S(0, v1, 3.8 + i * 0.3)], mul(N, 0.7), 150,
        [[0, 1], [3.4, 1], [3.4, 0], [0, 0]]).done(), v0, v1
    }));
    // a roll built around x = 0, so sliding it along x is all it takes
    const rollFor = (v0, v1) => {
      const at0 = v => { const q = S(0, v, 11); return [0, q[1], q[2]]; };
      return new Mesh().tube(at0(v0), at0(v1), 8, 14, 60).tube(at0(v0 - 0.003), at0(v1 + 0.003), 3, 10).done();
    };
    const iceRoll = rollFor(0.005, 0.2);
    felts.forEach(f => { f.roll = rollFor(f.v0, f.v1); });

    // architectural shingles: thick, tilted, uneven widths, butts that cast their own shadow
    const ROWS = 14, shingles = [];
    const SHADES = ['#4a535d', '#3b434c', '#59626c', '#343b43', '#505a66', '#44505a'];
    for (let r = 0; r < ROWS; r++) {
      let u = -(rnd(r * 17) * 0.05);
      const row = [];
      while (u < 1) { const w = 0.036 + rnd(r * 53 + u * 997) * 0.036; row.push([clamp(u), clamp(u + w)]); u += w; }
      row.forEach(([u0, u1], c) => {
        if (u1 - u0 < 0.004) return;
        const n = shingles.length, v0 = r / ROWS - 0.004, v1 = Math.min(1, (r + 1.3) / ROWS);
        const tooth = rnd(n * 7.3) > 0.55;                       // the raised second layer
        const low = 8.4 + (tooth ? 1.3 : 0), high = 5.2;
        const a = u0 + 0.0007, b = u1 - 0.0007, jit = (rnd(n * 11) - 0.5) * 0.004;
        const mesh = new Mesh().slab([S(a, v0 + jit, low), S(b, v0 + jit, low), S(b, v1, high), S(a, v1, high)], mul(N, tooth ? 3.6 : 2.6), 62).done();
        const color = hex(SHADES[(rnd(n * 3.7) * SHADES.length) | 0]).map(x => x * (tooth ? 1.18 : 1));
        shingles.push({ mesh, mat: M('granule', '#ffffff', { tint: color, bump: 1.1, spec: 0.08, shine: 10 }), delay: (r + (c / row.length) * 0.8) / (ROWS + 0.8) });
      });
    }
    // copper ridge caps (both sides of the peak)
    const caps = [], CAPS = 18;
    for (let i = 0; i < CAPS; i++) {
      const x0 = lerp(XL, XR, i / CAPS), x1 = Math.min(XR, lerp(XL, XR, (i + 1.1) / CAPS));
      const p0 = S(0, 0.935, 10.5), top = YR + 13.5;
      caps.push(new Mesh()
        .slab([[x0, p0[1] + 0.8, p0[2] + 0.4], [x1, p0[1], p0[2]], [x1, top, 0], [x0, top + 0.8, 0]], [0, 1.6, 1.6], 90)
        .slab([[x0, p0[1] + 0.8, -p0[2]], [x1, p0[1], -p0[2]], [x1, top, 0], [x0, top + 0.8, 0]], [0, 1.6, -1.6], 90)
        .done());
    }
    const finial = (() => {                       // a little copper crown, built in pieces so it stays solid
      const x = XR - 18, y = YR + 13, m = new Mesh();
      m.box(x - 13, y, -2, x + 13, y + 8, 2, 40);
      for (const [a, b, tip, h] of [[-13, -4, -15, 22], [-5, 5, 0, 29], [4, 13, 15, 22]])
        m.slab([[x + a, y + 8, 2], [x + b, y + 8, 2], [x + tip, y + h, 2]], [0, 0, 4], 40);
      return m.done();
    })();
    const flashing = new Mesh()
      .box(CX0 - 4, YF - 3, ZF - 1, CX1 + 4, YF + 20, ZF + 2.5, 50)
      .slab([[CX1 + 2.5, YF - 3, ZF], [CX1 + 2.5, YB - 3, ZB], [CX1 + 2.5, YB + 20, ZB], [CX1 + 2.5, YF + 20, ZF]], [3, 0, 0], 50)
      .done();
    // fascia and rake boards start bare, then get painted trim
    const boards = new Mesh()
      .slab([S(0.994, 0, 4), S(1.006, 0, 4), S(1.006, 1, 4), S(0.994, 1, 4)], mul(N, 14), 80)
      .slab([S(-0.006, 0, 4), S(0.006, 0, 4), S(0.006, 1, 4), S(-0.006, 1, 4)], mul(N, 14), 80)
      .slab([[XR - 3, YR + 2, 0], [XR + 3, YR + 2, 0], [XR + 3, YE + 2, -ZE], [XR - 3, YE + 2, -ZE]], [0, 9, -9], 80)
      .box(XL, YE - 11, ZE - 2, XR, YE + 1, ZE + 2, 80)
      .done();
    // copper gutter (an open trough), drip edge, rake trim and downspout
    const gutter = new Mesh()
      .box(XL, YE - 12, ZE + 2, XR, YE - 9, ZE + 12, 80).box(XL, YE - 12, ZE + 10, XR, YE + 2, ZE + 12.5, 80)
      .tube([XL, YE + 2, ZE + 11.5], [XR, YE + 2, ZE + 11.5], 2, 8)
      .slab([S(0, 0, 11), S(1, 0, 11), S(1, 0.014, 10), S(0, 0.014, 10)], mul(N, 1.5), 80)
      .done();
    const rake = new Mesh().slab([S(0.992, 0, 10.5), S(1.01, 0, 10.5), S(1.01, 0.97, 10.5), S(0.992, 0.97, 10.5)], mul(N, 7), 70).done();
    const spoutX = -W / 2 + 14;
    const spout = new Mesh()
      .tube([spoutX, YE - 11, ZE + 7], [spoutX, YE - 30, HD + 8], 4.5).tube([spoutX, YE - 30, HD + 8], [spoutX, 10, HD + 8], 4.5)
      .tube([spoutX, 10, HD + 8], [spoutX, 4, HD + 26], 4.5).done();

    /* ---------- drawing ---------- */
    const SUN = norm([-0.42, 0.72, 0.55]);
    const light = mat(ortho(430, 100, 1900), look(add([0, 90, 0], mul(SUN, 900)), [0, 90, 0]));
    let list = [];
    const put = (mesh, m, o = {}) => list.push({ mesh, m, off: o.off || [0, 0, 0], alpha: o.alpha === undefined ? 1 : o.alpha, clip: o.clip === undefined ? 1e5 : o.clip, fade: o.fade || 0, glint: o.glint });

    function gather(p) {
      list = [];
      const d = phase(p, 0), i = phase(p, 1), u = phase(p, 2), sh = phase(p, 3), c = phase(p, 4);
      const g = clamp((p - 0.93) / 0.07), glint = g > 0 && g < 1 ? lerp(-380, 520, g) : -5000;
      fixedMeshes.forEach(([m, mesh]) => put(mesh, m, { fade: m === MAT.grass ? 400 : 0 }));

      const total = sheets.length;
      sheets.forEach(s => {
        const t = out(clamp((d - (s.n / total) * 0.72) / 0.28));
        if (t > 0) put(s.mesh, s.mat, { off: mul(N, (1 - t) * 80), alpha: clamp(t * 1.6) });
      });
      const across = t => lerp(XL, XR, t);
      if (i > 0) {
        put(iceStrip, MAT.ice, { clip: across(inOut(i)) + 0.1 });
        if (i < 1) put(iceRoll, MAT.rollDark, { off: [across(inOut(i)), 0, 0] });
      }
      felts.forEach((f, n) => {
        const raw = clamp((u - n * 0.17) / 0.49), t = inOut(raw);
        if (t <= 0) return;
        put(f.mesh, MAT.felt, { clip: across(t) + 0.1 });
        if (raw < 1) put(f.roll, MAT.roll, { off: [across(t), 0, 0] });
      });
      if (sh > 0) shingles.forEach(s => {
        const t = out(clamp((sh - s.delay * 0.82) / 0.18));
        if (t <= 0) return;
        const k = 1 - t;
        put(s.mesh, s.mat, { off: [0, N[1] * k * 34 + k * 8, N[2] * k * 34 - k * 6], alpha: clamp(t * 1.5), glint });
      });
      caps.forEach((mesh, n) => {
        const t = out(clamp((c - (n / CAPS) * 0.55) / 0.2));
        if (t > 0) put(mesh, MAT.copper, { off: [0, (1 - t) * 46, 0], alpha: clamp(t * 1.5), glint });
      });
      const f = out(clamp((c - 0.72) / 0.28));
      if (f > 0) put(finial, MAT.copper, { off: [0, (1 - f) * 30, 0], alpha: f, glint });
      const fl = clamp(c * 1.6 - 0.1);
      if (fl > 0) put(flashing, MAT.copper, { alpha: fl, glint });
      put(boards, d > 0.5 ? MAT.trim : MAT.wood);
      const gu = inOut(clamp((c - 0.12) / 0.5)), ra = inOut(clamp((c - 0.4) / 0.45)), sp = clamp((c - 0.6) / 0.35);
      if (gu > 0) put(gutter, MAT.copper, { clip: across(gu) + 0.1, glint });
      if (ra > 0) put(rake, MAT.copper, { off: mul(N, (1 - ra) * 24), alpha: ra, glint });
      if (sp > 0) put(spout, MAT.copper, { alpha: out(sp), glint });
    }

    function camera(p) {
      const yaw = lerp(0.68, 0.42, inOut(clamp(p))), pitch = lerp(0.36, 0.30, inOut(clamp(p)));
      const asp = canvas.width / Math.max(1, canvas.height), fy = 0.5, tan = Math.tan(fy / 2);
      const at = [0, 122, 0];
      const dir = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
      const right = norm(cross([0, 1, 0], dir)), up = cross(dir, right);
      // back away just far enough that the whole house fits
      let dist = 0;
      for (const x of [XL - 8, XR + 8]) for (const y of [0, YR + 52]) for (const z of [-ZE, ZE + 14]) {
        const q = sub([x, y, z], at);
        dist = Math.max(dist, dot(q, dir) + Math.abs(dot(q, right)) / (tan * asp * 0.96), dot(q, dir) + Math.abs(dot(q, up)) / (tan * 0.92));
      }
      const eye = add(at, mul(dir, dist));
      return { eye, vp: mat(persp(fy, asp, 50, 6000), look(eye, at)) };
    }

    function resize() {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    }

    function draw(p) {
      gather(p);
      // 1. what the sun sees
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, SM, SM);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(depth.p);
      gl.uniformMatrix4fv(depth.u.uLight, false, light);
      for (const it of list) {
        if (it.alpha < 0.5 || it.fade) continue;
        gl.uniform3fv(depth.u.uOff, it.off); gl.uniform1f(depth.u.uClip, it.clip);
        gl.bindVertexArray(it.mesh.vao); gl.drawArrays(gl.TRIANGLES, 0, it.mesh.n);
      }
      // 2. what we see
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(main.p);
      const cam = camera(p), U = main.u, dusk = 1 + clamp((p - 0.9) / 0.1) * 0.45;
      gl.uniformMatrix4fv(U.uVP, false, cam.vp); gl.uniformMatrix4fv(U.uLight, false, light);
      gl.uniform3fv(U.uEye, cam.eye); gl.uniform3fv(U.uSun, SUN);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shadowTex); gl.uniform1i(U.uShadow, 1);
      gl.activeTexture(gl.TEXTURE0); gl.uniform1i(U.uTex, 0);
      for (const it of list) {
        const m = it.m;
        gl.bindTexture(gl.TEXTURE_2D, textures[m.tex]);
        gl.uniform3fv(U.uTint, m.tint); gl.uniform1f(U.uSpec, m.spec); gl.uniform1f(U.uShine, m.shine);
        gl.uniform1f(U.uEmit, m === MAT.glass ? m.emit * dusk : m.emit);
        gl.uniform1f(U.uBump, m.bump);
        gl.uniform3fv(U.uOff, it.off); gl.uniform1f(U.uAlpha, it.alpha); gl.uniform1f(U.uClip, it.clip);
        gl.uniform1f(U.uFade, it.fade); gl.uniform1f(U.uGlint, it.glint === undefined ? -5000 : it.glint);
        gl.depthMask(!it.fade);
        gl.bindVertexArray(it.mesh.vao); gl.drawArrays(gl.TRIANGLES, 0, it.mesh.n);
        gl.depthMask(true);
      }
      gl.bindVertexArray(null);
    }

    return { draw, resize };
  };
  window.RoofScene.phase = phase;
})();
