/* میوه‌ها: تعریف نوع‌ها و رسم میوه کامل / نیمه / بمب */
const FRUIT_TYPES = [
  { name: 'هندوانه', r: 46, skin: '#1e7a3a', skinLight: '#2ea85a', flesh: '#ff4757', seed: '#172e1a', leaf: true },
  { name: 'پرتقال', r: 33, skin: '#ff9f1c', skinLight: '#ffbe4d', flesh: '#ffb84d', seed: null, leaf: true },
  { name: 'سیب', r: 31, skin: '#e63946', skinLight: '#ff6b7a', flesh: '#ffe8cc', seed: null, leaf: true },
  { name: 'لیمو', r: 27, skin: '#ffd60a', skinLight: '#ffe566', flesh: '#fff3b0', seed: null, leaf: false },
  { name: 'کیوی', r: 29, skin: '#8a5a3b', skinLight: '#a97c5a', flesh: '#7ac74f', seed: '#2f3e2f', leaf: false },
  { name: 'آلو', r: 25, skin: '#72305a', skinLight: '#9a4f7d', flesh: '#ffcfab', seed: null, leaf: false },
];

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt;
  let g = ((n >> 8) & 255) + amt;
  let b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

function drawWholeFruit(ctx, type, r) {
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r);
  g.addColorStop(0, type.skinLight);
  g.addColorStop(0.7, type.skin);
  g.addColorStop(1, shade(type.skin, -25));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
  ctx.fill();

  if (type.leaf) {
    ctx.save();
    ctx.translate(r * 0.5, -r * 0.7);
    ctx.rotate(0.5);
    ctx.fillStyle = '#34a853';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.42, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5cbf6a';
    ctx.beginPath();
    ctx.ellipse(1, -1, r * 0.28, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHalfFruit(ctx, type, r, angle) {
  // نیمه میوه از زاویه angle تا angle+π
  ctx.beginPath();
  ctx.arc(0, 0, r, angle, angle + Math.PI);
  ctx.closePath();
  ctx.fillStyle = type.flesh;
  ctx.fill();

  // لبه پوست بیرونی
  ctx.beginPath();
  ctx.arc(0, 0, r - 1.5, angle, angle + Math.PI);
  ctx.strokeStyle = type.skin;
  ctx.lineWidth = Math.max(6, r * 0.34);
  ctx.lineCap = 'butt';
  ctx.stroke();

  // برق سطح برش
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, angle + 0.35, angle + Math.PI - 0.35);
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.fill();

  // دانه هندوانه
  if (type.seed) {
    ctx.fillStyle = type.seed;
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = angle + 0.45 + (i + 0.5) * (Math.PI - 0.9) / n;
      const rr = r * 0.6;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.055, r * 0.032, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBomb(ctx, r, t) {
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#4a4a5a');
  g.addColorStop(1, '#111118');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.18, r * 0.1, -0.6, 0, Math.PI * 2);
  ctx.fill();

  // فیتیله جرقه‌زن
  ctx.save();
  ctx.translate(0, -r);
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -10, 2, -20);
  ctx.stroke();
  const flick = 0.5 + 0.5 * Math.sin(t * 14);
  ctx.fillStyle = `rgba(255,180,60,${0.7 + 0.3 * flick})`;
  ctx.beginPath();
  ctx.arc(2, -22, 5 + flick * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
