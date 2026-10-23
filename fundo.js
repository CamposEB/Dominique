/* ============================================================
   FUNDO.JS — Shader WebGL do hero (versão otimizada)
   ------------------------------------------------------------
   Mudanças para performance:
   - Desliga em mobile, prefers-reduced-motion e hardware fraco.
   - 24fps em vez de 30fps.
   - DPR máximo 1.0 (era 1.5).
   - Resolução interna reduzida a 60% do tamanho real.
   - Pausa quando fora da tela ou aba oculta (já tinha).
   - Fallback CSS automático via .no-silk no <body>.
   ------------------------------------------------------------
   Ajuste rápido em SILK_CONFIG.
   ============================================================ */

const SILK_CONFIG = {
  intensity: 0.85,        // 0.5 = dobras suaves · 1.5 = mais dramático
  speed: 1.0,            // 0.5 = muito lento · 2 = rápido
  mouseResponse: 0.18,   // 0 = ignora mouse · 0.4 = segue bastante
  fps: 24,               // 24 / 30 / 60
  maxDpr: 1.0,           // 1.0 = leve · 2.0 = retina (pesado)
  resolutionScale: 0.6,  // 0.4 = muito leve · 1.0 = resolução total
  minWidthForSilk: 900,  // telas menores usam fallback CSS
};

(function initSilk() {
  'use strict';

  function boot() {
    const canvas = document.getElementById('silk-canvas');
    if (!canvas) return;

    // 1. Desligar em mobile e telas pequenas
    if (window.innerWidth < SILK_CONFIG.minWidthForSilk) {
      document.body.classList.add('no-silk');
      return;
    }
    // 2. Respeitar prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.classList.add('no-silk');
      return;
    }
    // 3. Desligar em hardware fraco (pouca RAM ou poucos cores)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      document.body.classList.add('no-silk');
      return;
    }
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
      document.body.classList.add('no-silk');
      return;
    }

    let gl = null;
    try {
      gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: true,
      });
    } catch (e) { gl = null; }

    if (!gl) { document.body.classList.add('no-silk'); return; }

    /* -------- Shaders -------- */
    const VERT = `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    const FRAG = `
      precision highp float;
      uniform float uTime;
      uniform vec2  uMouse;
      uniform vec3  uColorA;
      uniform vec3  uColorB;
      uniform vec3  uColorC;
      uniform float uIntensity;
      varying vec2  vUv;

      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 3; i++) {
          v += a * snoise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        vec2 mouse = uMouse * 0.15;
        float t = uTime * 0.06;

        float n = fbm(uv * 2.5 + mouse + vec2(t, t * 0.7));
        n += 0.4 * fbm(uv * 5.0 - mouse + vec2(-t * 0.8, t * 0.5));
        n = n * 0.5 + 0.5;
        n = mix(0.5, n, uIntensity);

        float eps = 0.012;
        float nx = fbm((uv + vec2(eps, 0.0)) * 2.5 + mouse + vec2(t, t * 0.7))
                 - fbm((uv - vec2(eps, 0.0)) * 2.5 + mouse + vec2(t, t * 0.7));
        float ny = fbm((uv + vec2(0.0, eps)) * 2.5 + mouse + vec2(t, t * 0.7))
                 - fbm((uv - vec2(0.0, eps)) * 2.5 + mouse + vec2(t, t * 0.7));
        vec2 grad = normalize(vec2(nx, ny) + 0.0001);

        vec2 light = normalize(vec2(-0.6, -0.8));
        float diff = max(dot(grad, -light), 0.0);
        float spec = pow(diff, 14.0) * 0.55;

        vec3 col = mix(uColorA, uColorB, smoothstep(0.2, 0.7, n));
        col = mix(col, uColorC, smoothstep(0.7, 1.0, n) * 0.75);
        col += spec * vec3(1.0, 0.92, 0.82);

        float valley = smoothstep(0.4, 0.0, n);
        col = mix(col, uColorA * 0.55, valley * 0.35);

        float vig = smoothstep(1.15, 0.25, length(uv - 0.5));
        col *= mix(0.82, 1.0, vig);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        return null;
      }
      return s;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { document.body.classList.add('no-silk'); return; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      document.body.classList.add('no-silk');
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime      = gl.getUniformLocation(prog, 'uTime');
    const uMouse     = gl.getUniformLocation(prog, 'uMouse');
    const uColorA    = gl.getUniformLocation(prog, 'uColorA');
    const uColorB    = gl.getUniformLocation(prog, 'uColorB');
    const uColorC    = gl.getUniformLocation(prog, 'uColorC');
    const uIntensity = gl.getUniformLocation(prog, 'uIntensity');

    gl.uniform1f(uIntensity, SILK_CONFIG.intensity);

    const PALETTES = {
      light: {
        // Terracota → areia → creme (mantém a identidade clara)
        a: [0.851, 0.765, 0.647], // areia
        b: [0.980, 0.965, 0.945], // creme
        c: [0.890, 0.780, 0.620], // champanhe
      },
      dark: {
        // Carvão profundo com toques vinho e champagne
        // (sem chocolate/marrom — mais sofisticado)
        a: [0.055, 0.045, 0.045], // #0e0b0b carvão quase preto
        b: [0.110, 0.075, 0.070], // #1c1312 carvão quente
        c: [0.560, 0.360, 0.320], // #8f5c51 terracota suave
      },
    };
    function setPalette(name) {
      const p = PALETTES[name] || PALETTES.light;
      gl.uniform3fv(uColorA, p.a);
      gl.uniform3fv(uColorB, p.b);
      gl.uniform3fv(uColorC, p.c);
    }
    setPalette(document.documentElement.getAttribute('data-theme') || 'light');
    window.addEventListener('dm:theme', (e) => setPalette(e.detail));

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, SILK_CONFIG.maxDpr);
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      // resolução interna reduzida (performance)
      const scale = SILK_CONFIG.resolutionScale;
      canvas.width  = Math.max(1, Math.floor(w * dpr * scale));
      canvas.height = Math.max(1, Math.floor(h * dpr * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(resize, 200);
    });

    let targetX = 0.5, targetY = 0.5;
    let curX = 0.5, curY = 0.5;
    const hero = canvas.closest('.hero') || document.body;
    hero.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      targetX = (e.clientX - r.left) / r.width;
      targetY = 1.0 - (e.clientY - r.top) / r.height;
    }, { passive: true });
    hero.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const r = canvas.getBoundingClientRect();
      targetX = (t.clientX - r.left) / r.width;
      targetY = 1.0 - (t.clientY - r.top) / r.height;
    }, { passive: true });

    const frameInterval = 1000 / SILK_CONFIG.fps;
    let lastTime = 0;
    let accum = 0;
    let rafId = null;
    let visible = true;

    function frame(now) {
      rafId = null;
      if (!visible) return;
      if (now - lastTime < frameInterval) {
        rafId = requestAnimationFrame(frame);
        return;
      }
      lastTime = now;

      accum += (frameInterval / 1000) * SILK_CONFIG.speed;
      curX += (targetX - curX) * SILK_CONFIG.mouseResponse;
      curY += (targetY - curY) * SILK_CONFIG.mouseResponse;

      gl.uniform1f(uTime, accum);
      gl.uniform2f(uMouse, curX, curY);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      rafId = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
      if (visible && rafId === null) rafId = requestAnimationFrame(frame);
    }, { threshold: 0 });
    io.observe(canvas);

    document.addEventListener('visibilitychange', () => {
      visible = !document.hidden;
      if (visible && rafId === null) rafId = requestAnimationFrame(frame);
    });

    rafId = requestAnimationFrame(frame);
    document.body.classList.add('has-silk');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();