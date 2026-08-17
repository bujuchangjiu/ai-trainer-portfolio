const canvas = document.querySelector('#fiber-cursor');

if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const ctx = canvas.getContext('2d');
  if (ctx) document.documentElement.classList.add('fiber-cursor-ready');
  const fibers = Array.from({ length: 7 }, (_, i) => ({
    points: Array.from({ length: 22 }, () => ({ x: innerWidth * .5, y: innerHeight * .5 })),
    offset: (i - 3) * 2.35,
    phase: i * .86
  }));
  const pointer = { x: innerWidth * .5, y: innerHeight * .5, tx: innerWidth * .5, ty: innerHeight * .5, active: false };
  const bursts = [];
  let last = performance.now(), speed = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  addEventListener('pointermove', e => {
    speed = Math.min(42, Math.hypot(e.clientX - pointer.tx, e.clientY - pointer.ty));
    pointer.tx = e.clientX; pointer.ty = e.clientY;
    if (!pointer.active) {
      pointer.x = pointer.tx; pointer.y = pointer.ty; pointer.active = true;
      fibers.forEach(f => f.points.forEach(p => { p.x = pointer.x; p.y = pointer.y; }));
    }
  }, { passive: true });
  addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    const particles = Array.from({ length: 20 }, (_, i) => {
      const angle = (Math.PI * 2 * i / 20) + (Math.random() - .5) * .18;
      const velocity = 1.6 + Math.random() * 1.8;
      return {
        x: e.clientX, y: e.clientY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        length: 4 + Math.random() * 7,
        color: i % 3 === 0 ? '216,255,56' : '250,250,240'
      };
    });
    bursts.push({ x: e.clientX, y: e.clientY, born: performance.now(), particles });
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { pointer.active = false; });

  function draw(now) {
    const dt = Math.min(2, (now - last) / 16.67); last = now;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    pointer.x += (pointer.tx - pointer.x) * .55 * dt;
    pointer.y += (pointer.ty - pointer.y) * .55 * dt;
    speed *= Math.pow(.9, dt);

    if (pointer.active) {
      fibers.forEach((fiber, fi) => {
        const points = fiber.points;
        const wobble = Math.sin(now * .004 + fiber.phase) * (1.1 + speed * .025);
        points[0].x += (pointer.x - points[0].x) * (.72 - fi * .018) * dt;
        points[0].y += (pointer.y + fiber.offset + wobble - points[0].y) * (.72 - fi * .018) * dt;
        for (let i = 1; i < points.length; i++) {
          const follow = .34 - i * .006;
          points[i].x += (points[i - 1].x - points[i].x) * follow * dt;
          points[i].y += (points[i - 1].y - points[i].y) * follow * dt;
        }
        const tail = points[points.length - 1];
        const gradient = ctx.createLinearGradient(tail.x, tail.y, points[0].x, points[0].y);
        gradient.addColorStop(0, 'rgba(245,245,245,0)');
        gradient.addColorStop(.38, `rgba(245,245,245,${.2 + fi * .025})`);
        gradient.addColorStop(1, fi === 3 ? 'rgba(216,255,56,1)' : 'rgba(255,255,255,.9)');
        ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 1; i++) {
          const mx = (points[i].x + points[i + 1].x) * .5;
          const my = (points[i].y + points[i + 1].y) * .5;
          ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
        }
        ctx.strokeStyle = gradient;
        ctx.lineWidth = fi === 3 ? 1.75 : 1;
        ctx.lineCap = 'round'; ctx.stroke();
      });

      const radius = 15 + speed * .1;
      const glow = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius);
      glow.addColorStop(0, 'rgba(235,255,145,1)');
      glow.addColorStop(.18, 'rgba(216,255,56,.95)');
      glow.addColorStop(1, 'rgba(216,255,56,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7ffcf'; ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 2.6, 0, Math.PI * 2); ctx.fill();
    }

    for (let bi = bursts.length - 1; bi >= 0; bi--) {
      const burst = bursts[bi], age = (now - burst.born) / 520;
      if (age >= 1) { bursts.splice(bi, 1); continue; }
      const alpha = Math.pow(1 - age, 1.45);
      burst.particles.forEach(p => {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= Math.pow(.972, dt); p.vy = p.vy * Math.pow(.972, dt) + .025 * dt;
        const mag = Math.hypot(p.vx, p.vy) || 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx / mag * p.length, p.y - p.vy / mag * p.length);
        ctx.strokeStyle = `rgba(${p.color},${alpha})`;
        ctx.lineWidth = .7 + alpha * .6; ctx.lineCap = 'round'; ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(burst.x, burst.y, 7 + age * 34, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(216,255,56,${alpha * .34})`;
      ctx.lineWidth = 1; ctx.stroke();
      const flash = ctx.createRadialGradient(burst.x, burst.y, 0, burst.x, burst.y, 11 * (1 - age * .35));
      flash.addColorStop(0, `rgba(250,255,220,${alpha})`);
      flash.addColorStop(1, 'rgba(216,255,56,0)');
      ctx.fillStyle = flash; ctx.beginPath(); ctx.arc(burst.x, burst.y, 11, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  addEventListener('resize', resize);
  requestAnimationFrame(draw);
}
