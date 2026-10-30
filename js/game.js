(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const $ = (id) => document.getElementById(id);
  const hud = $('hud'), menuEl = $('menu'), goEl = $('gameover'),
        scoreEl = $('score'), heartsEl = $('lives'), muteBtn = $('mute');

  let W = 0, H = 0, K = 1, LW = 0, LH = 0;
  let state = 'menu';
  let score = 0, best = +(localStorage.getItem('fruit_slicer_best') || 0), lives = 3;
  let combo = 0, comboTimer = 0, shake = 0, flash = 0, time = 0, nextSpawn = 0.6;
  let lastTS = performance.now();
  let lastSwoosh = 0;

  const fruits = [], halves = [], parts = [], popups = [];
  const pointers = new Map();

  const G = 1500, MAX_FRUITS = 26;

  const fa = (n) => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

  /* ---------- resize ---------- */
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    K = H / 800;
    LW = W / K;
    LH = H / K;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR * K, 0, 0, DPR * K, 0, 0);
  }

  const pxy = (e) => ({ x: e.clientX / K, y: e.clientY / K });

  /* ---------- helpers ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);

  function distToSegSq(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) {
      const t = px - ax, u = py - ay;
      return t * t + u * u;
    }
    let t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx, cy = ay + t * dy;
    const ex = px - cx, ey = py - cy;
    return ex * ex + ey * ey;
  }

  function addParts(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2);
      const sp = rnd(speed * 0.3, speed);
      parts.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 120,
        r: rnd(2.5, 7),
        color,
        life: rnd(0.4, 0.8),
        t: 0,
        rot: rnd(0, 6.28),
        vr: rnd(-6, 6)
      });
    }
  }

  function addPopup(text, x, y, big) {
    popups.push({ text, x, y, t: 0, life: big ? 1 : 0.8, big: !!big });
  }

  /* ---------- spawn ---------- */
  function pickType() {
    const weights = [0.14, 0.22, 0.23, 0.17, 0.13, 0.11];
    let sum = 0;
    weights.forEach(w => sum += w);
    let r = Math.random() * sum;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return FRUIT_TYPES[i];
    }
    return FRUIT_TYPES[0];
  }

  function spawnFruit() {
    const isBomb = state === 'play' && Math.random() < Math.min(0.13, 0.02 + score / 2600);
    let type = null;
    if (!isBomb) type = pickType();
    const r = isBomb ? 30 : type.r;
    const x = rnd(r + 30, LW - r - 30);
    fruits.push({
      bomb: isBomb,
      type,
      r,
      x,
      y: LH + r + 30,
      vx: rnd(-240, 240),
      vy: rnd(-1250, -900),
      rot: rnd(0, 6.28),
      vr: rnd(-2.5, 2.5),
      sliced: false
    });
    if (fruits.length > MAX_FRUITS) fruits.splice(0, fruits.length - MAX_FRUITS);
  }

  /* ---------- برش ---------- */
  function sliceFruit(f, sx, sy) {
    if (f.sliced) return;
    f.sliced = true;

    if (state === 'play') {
      if (comboTimer > 0) combo++;
      else combo = 1;
      comboTimer = 0.65;
      score += combo;
      if (combo >= 2) addPopup('×' + fa(combo), f.x, f.y - f.r - 12, true);
      addPopup('+' + fa(combo), f.x, f.y - f.r - 40, false);
      updateHUD();
    }

    if (f.bomb) {
      addParts(f.x, f.y, '#ffb347', 34, 620);
      addParts(f.x, f.y, '#ff5e3a', 26, 520);
      addParts(f.x, f.y, '#333', 16, 380);
      flash = 1;
      shake = Math.min(shake + 16, 20);
      SFX.bomb();
      try { if (navigator.vibrate) navigator.vibrate(80); } catch (e) {}
      if (state === 'play') gameOver('💥 منفجر شدی!');
      const idx = fruits.indexOf(f);
      if (idx >= 0) fruits.splice(idx, 1);
      return;
    }

    // دو نیمه جدا شونده
    const dx = sx - f.x, dy = sy - f.y;
    const ang = Math.atan2(dy, dx);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const sep = rnd(110, 190);

    halves.push({
      type: f.type, r: f.r,
      x: f.x + nx * f.r * 0.45,
      y: f.y + ny * f.r * 0.45,
      vx: f.vx + nx * sep,
      vy: f.vy + ny * sep + 60,
      rot: ang,
      vr: -rnd(2, 5)
    });
    halves.push({
      type: f.type, r: f.r,
      x: f.x - nx * f.r * 0.45,
      y: f.y - ny * f.r * 0.45,
      vx: f.vx - nx * sep,
      vy: f.vy - ny * sep + 60,
      rot: ang + Math.PI,
      vr: rnd(2, 5)
    });

    addParts(f.x, f.y, f.type.flesh, 16, 420);
    addParts(f.x, f.y, f.type.skin, 8, 300);
    addParts(f.x, f.y, '#fff', 6, 360);
    SFX.slice();
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
    shake = Math.min(shake + 1.2, 6);

    const idx = fruits.indexOf(f);
    if (idx >= 0) fruits.splice(idx, 1);
  }

  function checkSlice(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 36) return;
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      const d2 = distToSegSq(f.x, f.y, a.x, a.y, b.x, b.y);
      if (d2 < f.r * f.r) sliceFruit(f, b.x, b.y);
    }
  }

  /* ---------- جان / پایان ---------- */
  function loseLife() {
    if (state !== 'play') return;
    lives--;
    updateHUD();
    SFX.miss();
    try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {}
    if (lives <= 0) gameOver('🍃 میوه‌ها از دست رفت!');
  }

  function gameOver(reason) {
    state = 'over';
    SFX.click();
    if (score > best) {
      best = score;
      localStorage.setItem('fruit_slicer_best', String(best));
    }
    $('go-reason').textContent = reason;
    $('final-score').textContent = fa(score);
    $('final-best').textContent = fa(best);
    $('best').textContent = '🏆 رکورد: ' + fa(best);
    $('best').classList.remove('hidden');
    hud.classList.add('hidden');
    goEl.classList.remove('hidden');
  }

  function updateHUD() {
    scoreEl.textContent = fa(score);
    heartsEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 'heart' + (i < lives ? '' : ' lost');
      s.textContent = '❤️';
      heartsEl.appendChild(s);
    }
  }

  /* ---------- ورودی ---------- */
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    SFX.ensure();
    const p = pxy(e);
    pointers.set(e.pointerId, { x: p.x, y: p.y, px: p.x, py: p.y, trail: [{ x: p.x, y: p.y }] });
  }, { passive: false });

  canvas.addEventListener('pointermove', (e) => {
    e.preventDefault();
    const p = pointers.get(e.pointerId);
    const np = pxy(e);
    if (!p) {
      pointers.set(e.pointerId, { x: np.x, y: np.y, px: np.x, py: np.y, trail: [{ x: np.x, y: np.y }] });
      return;
    }
    p.px = p.x;
    p.py = p.y;
    p.x = np.x;
    p.y = np.y;
    p.trail.push({ x: np.x, y: np.y });
    if (p.trail.length > 12) p.trail.shift();

    if (state === 'play' || state === 'menu') {
      checkSlice({ x: p.px, y: p.py }, { x: p.x, y: p.y });
    }
    if (state === 'play') {
      const now = performance.now();
      if (now - lastSwoosh > 90) {
        lastSwoosh = now;
        SFX.swoosh();
      }
    }
  }, { passive: false });

  const endPointer = (e) => { pointers.delete(e.pointerId); };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- دکمه‌ها ---------- */
  $('play').addEventListener('click', () => {
    SFX.ensure();
    SFX.click();
    startGame();
  });
  $('again').addEventListener('click', () => {
    SFX.click();
    startGame();
  });
  $('home').addEventListener('click', () => {
    SFX.click();
    state = 'menu';
    fruits.length = 0;
    halves.length = 0;
    parts.length = 0;
    popups.length = 0;
    pointers.clear();
    goEl.classList.add('hidden');
    hud.classList.add('hidden');
    menuEl.classList.remove('hidden');
  });
  muteBtn.addEventListener('click', () => {
    SFX.muted = !SFX.muted;
    SFX.setMuted(SFX.muted);
    muteBtn.textContent = SFX.muted ? '🔇' : '🔊';
  });

  /* ---------- به‌روزرسانی ---------- */
  function update(dt) {
    time += dt;

    nextSpawn -= dt;
    if (nextSpawn <= 0) {
      spawnFruit();
      const diff = 1 + score / 300;
      nextSpawn = Math.max(0.38, 1.05 - 0.28 * Math.min(diff, 2.6)) * rnd(0.7, 1.25);
    }

    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 0;
    }
    if (shake > 0) {
      shake *= Math.pow(0.0001, dt);
      if (shake < 0.05) shake = 0;
    }
    if (flash > 0) flash = Math.max(0, flash - dt * 2.2);

    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      f.vy += G * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.vr * dt;
      if (f.x < -80) f.vx = Math.abs(f.vx);
      if (f.x > LW + 80) f.vx = -Math.abs(f.vx);
      if (!f.sliced && f.y - f.r > LH + 40) {
        fruits.splice(i, 1);
        if (!f.bomb) loseLife();
      }
    }

    for (let i = halves.length - 1; i >= 0; i--) {
      const h = halves[i];
      h.vy += G * 1.15 * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += h.vr * dt;
      if (h.y - h.r > LH + 60) halves.splice(i, 1);
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vy += G * 1.4 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > LH + 20) {
        p.y = LH + 20;
        p.vy *= -0.45;
        p.vx *= 0.8;
      }
    }

    for (let i = popups.length - 1; i >= 0; i--) {
      const u = popups[i];
      u.t += dt;
      u.y -= 55 * dt;
      if (u.t >= u.life) popups.splice(i, 1);
    }
  }

  function menuUpdate(dt) {
    time += dt;
    nextSpawn -= dt;
    if (nextSpawn <= 0) {
      spawnFruit();
      const last = fruits[fruits.length - 1];
      if (last && last.bomb) fruits.pop();
      nextSpawn = rnd(0.7, 1.4);
    }
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      f.vy += G * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.vr * dt;
      if (f.y - f.r > LH + 40) fruits.splice(i, 1);
    }
    for (let i = halves.length - 1; i >= 0; i--) {
      const h = halves[i];
      h.vy += G * 1.15 * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.rot += h.vr * dt;
      if (h.y - h.r > LH + 60) halves.splice(i, 1);
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vy += G * 1.4 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > LH + 20) {
        p.y = LH + 20;
        p.vy *= -0.45;
        p.vx *= 0.8;
      }
    }
    for (let i = popups.length - 1; i >= 0; i--) {
      const u = popups[i];
      u.t += dt;
      u.y -= 55 * dt;
      if (u.t >= u.life) popups.splice(i, 1);
    }
  }

  /* ---------- رسم ---------- */
  function drawBG() {
    const g = ctx.createLinearGradient(0, 0, 0, LH);
    g.addColorStop(0, '#26104a');
    g.addColorStop(0.55, '#181640');
    g.addColorStop(1, '#0c1a38');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LW, LH);

    const glows = [
      { x: LW * 0.2, y: LH * 0.22, r: 260, c: 'rgba(255,107,53,0.14)' },
      { x: LW * 0.85, y: LH * 0.35, r: 220, c: 'rgba(255,209,102,0.10)' },
      { x: LW * 0.55, y: LH * 0.75, r: 300, c: 'rgba(64,240,160,0.07)' }
    ];
    for (const gl of glows) {
      const rg = ctx.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r);
      rg.addColorStop(0, gl.c);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(gl.x - gl.r, gl.y - gl.r, gl.r * 2, gl.r * 2);
    }
  }

  function render() {
    ctx.setTransform(DPR * K, 0, 0, DPR * K, 0, 0);

    if (shake > 0) {
      ctx.translate(rnd(-shake, shake) * 0.5, rnd(-shake, shake) * 0.5);
    }

    drawBG();

    // میوه‌ها
    for (const f of fruits) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      if (f.bomb) drawBomb(ctx, f.r, time);
      else drawWholeFruit(ctx, f.type, f.r);
      ctx.restore();
    }

    // نیمه‌ها
    for (const h of halves) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.rot);
      drawHalfFruit(ctx, h.type, h.r, 0);
      ctx.restore();
    }

    // ذرات آبمیوه
    for (const p of parts) {
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // رد انگشت
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const p of pointers.values()) {
      const trail = p.trail;
      if (trail.length < 2) continue;
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1], b = trail[i];
        const t = i / (trail.length - 1);
        ctx.strokeStyle = `rgba(255,235,180,${0.5 * t})`;
        ctx.lineWidth = 12 * t;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // متن‌های شناور
    ctx.textAlign = 'center';
    for (const u of popups) {
      const a = 1 - u.t / u.life;
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.font = (u.big ? 'bold 40px' : 'bold 26px') + ' Vazirmatn, Tahoma, sans-serif';
      ctx.fillStyle = u.big ? '#ffd166' : '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 4;
      ctx.strokeText(u.text, u.x, u.y);
      ctx.fillText(u.text, u.x, u.y);
    }
    ctx.globalAlpha = 1;

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.85})`;
      ctx.fillRect(-40, -40, LW + 80, LH + 80);
    }
  }

  /* ---------- جریان بازی ---------- */
  function startGame() {
    score = 0;
    lives = 3;
    combo = 0;
    comboTimer = 0;
    time = 0;
    nextSpawn = 0.5;
    shake = 0;
    flash = 0;
    fruits.length = 0;
    halves.length = 0;
    parts.length = 0;
    popups.length = 0;
    pointers.clear();
    menuEl.classList.add('hidden');
    goEl.classList.add('hidden');
    hud.classList.remove('hidden');
    updateHUD();
    state = 'play';
  }

  function frame(ts) {
    const dt = Math.min((ts - lastTS) / 1000, 0.033);
    lastTS = ts;
    if (state === 'play') update(dt);
    else if (state === 'menu') menuUpdate(dt);
    render();
    requestAnimationFrame(frame);
  }

  /* ---------- راه‌اندازی ---------- */
  window.addEventListener('resize', resize);
  resize();
  updateHUD();
  if (best > 0) {
    $('best').textContent = '🏆 رکورد: ' + fa(best);
    $('best').classList.remove('hidden');
  }
  requestAnimationFrame(frame);
})();
