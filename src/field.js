export function drawChromatic(canvas, time = 0) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#0900ff'; ctx.fillRect(0, 0, w, h);
  const colors = ['#ff54b5', '#ff3600', '#deff00', '#000000', '#10ee00', '#0900ff'];
  const cx = w * (.5 + Math.sin(time * .5) * .1), cy = h * .5;
  for (let i = 24; i >= 0; i--) {
    ctx.beginPath();
    for (let n = 0; n <= 120; n++) {
      const a = n / 120 * Math.PI * 2;
      const r = (i + 1) * w / 34 * (1 + Math.sin(a * 3 + time + i * .12) * .12);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (n === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fillStyle = colors[i % colors.length]; ctx.fill();
  }
}
