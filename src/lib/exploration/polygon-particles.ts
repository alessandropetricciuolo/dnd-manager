import type { NormPoint } from "@/lib/exploration/fow-geometry";
import { intrinsicNormToElementPx, pointInPolygon } from "@/lib/exploration/fow-geometry";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  cr: number;
  cg: number;
  cb: number;
  phase?: number;
};

export type ParticleSystem = { particles: Particle[] };

/** Elementi disegnati su canvas 2D (clip poligono). */
export type CanvasParticleKind = "fuoco" | "veleno" | "ghiaccio" | "fulmine" | "oscurità";

/** Tutti gli elementi selezionabili (canvas + Pixi fumo). */
export type ParticleElement = CanvasParticleKind | "fumo" | "fumini";

export function polygonBBox(points: NormPoint[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

function centroid(points: NormPoint): NormPoint;
function centroid(points: NormPoint[]): NormPoint;
function centroid(points: NormPoint[] | NormPoint): NormPoint {
  if (!Array.isArray(points)) return points;
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  const n = points.length || 1;
  return { x: x / n, y: y / n };
}

export function randomPointInPolygon(points: NormPoint[]): NormPoint {
  const box = polygonBBox(points);
  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  if (!Number.isFinite(w) || !Number.isFinite(h) || (w <= 0 && h <= 0)) {
    return centroid(points);
  }
  for (let k = 0; k < 96; k++) {
    const x = box.minX + Math.random() * (w || 1);
    const y = box.minY + Math.random() * (h || 1);
    if (pointInPolygon(x, y, points)) return { x, y };
  }
  return centroid(points);
}

function spawnFuoco(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): Particle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  const yellowish = Math.random() < 0.48;
  const r = yellowish ? 255 : 248 + Math.random() * 7;
  const g = yellowish ? 200 + Math.random() * 55 : 120 + Math.random() * 85;
  const b = yellowish ? 55 + Math.random() * 70 : 20 + Math.random() * 60;
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 38,
    vy: -(88 + Math.random() * 100),
    life: 0,
    maxLife: 0.48 + Math.random() * 0.72,
    size: 1.4 + Math.random() * 3.2,
    cr: r,
    cg: g,
    cb: b,
  };
}

function tickFuoco(p: Particle, dt: number): boolean {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx += (Math.random() - 0.5) * 32 * dt;
  p.vy -= 48 * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

function spawnVeleno(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): Particle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 22,
    vy: -(38 + Math.random() * 58),
    life: 0,
    maxLife: 0.75 + Math.random() * 1.05,
    size: 1.2 + Math.random() * 2.8,
    phase: Math.random() * Math.PI * 2,
    cr: 28 + Math.random() * 65,
    cg: 165 + Math.random() * 95,
    cb: 72 + Math.random() * 75,
  };
}

function tickVeleno(p: Particle, dt: number): boolean {
  p.phase = (p.phase ?? 0) + dt * 7;
  p.x += (p.vx + Math.sin(p.phase) * 18) * dt;
  p.y += p.vy * dt;
  p.vy -= 12 * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

function spawnGhiaccio(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): Particle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  const frost = Math.random() < 0.55;
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 26,
    vy: frost ? -(12 + Math.random() * 28) : -(4 + Math.random() * 18),
    life: 0,
    maxLife: 0.85 + Math.random() * 1.35,
    size: 0.9 + Math.random() * 2.6,
    phase: Math.random() * Math.PI * 2,
    cr: frost ? 210 + Math.random() * 45 : 140 + Math.random() * 70,
    cg: 230 + Math.random() * 25,
    cb: 248 + Math.random() * 7,
  };
}

function tickGhiaccio(p: Particle, dt: number): boolean {
  p.phase = (p.phase ?? 0) + dt * 4.5;
  p.x += (p.vx + Math.cos(p.phase) * 10) * dt;
  p.y += p.vy * dt;
  p.vy -= 6 * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

function spawnFulmine(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): Particle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  const core = Math.random() < 0.35;
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 420,
    vy: (Math.random() - 0.5) * 420,
    life: 0,
    maxLife: 0.05 + Math.random() * 0.11,
    size: core ? 2.2 + Math.random() * 3.5 : 0.8 + Math.random() * 1.8,
    cr: core ? 255 : 160 + Math.random() * 95,
    cg: core ? 255 : 210 + Math.random() * 45,
    cb: core ? 255 : 255,
  };
}

function tickFulmine(p: Particle, dt: number): boolean {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx *= 1 - 2.4 * dt;
  p.vy *= 1 - 2.4 * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

function spawnOscurita(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): Particle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 14,
    vy: (Math.random() - 0.5) * 14,
    life: 0,
    maxLife: 1.4 + Math.random() * 2.2,
    size: 2.2 + Math.random() * 5.5,
    phase: Math.random() * Math.PI * 2,
    cr: 12 + Math.random() * 35,
    cg: 4 + Math.random() * 22,
    cb: 28 + Math.random() * 55,
  };
}

function tickOscurita(p: Particle, dt: number): boolean {
  p.phase = (p.phase ?? 0) + dt * 1.8;
  p.x += (p.vx + Math.sin(p.phase) * 6) * dt;
  p.y += (p.vy + Math.cos(p.phase * 0.7) * 6) * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

const LIMITS: Record<CanvasParticleKind, { max: number; spawnPerSec: number }> = {
  fuoco: { max: 420, spawnPerSec: 155 },
  veleno: { max: 400, spawnPerSec: 115 },
  ghiaccio: { max: 380, spawnPerSec: 95 },
  fulmine: { max: 520, spawnPerSec: 380 },
  oscurità: { max: 260, spawnPerSec: 48 },
};

function spawnFor(
  element: CanvasParticleKind,
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): Particle {
  switch (element) {
    case "fuoco":
      return spawnFuoco(pt, dims, naturalW, naturalH);
    case "veleno":
      return spawnVeleno(pt, dims, naturalW, naturalH);
    case "ghiaccio":
      return spawnGhiaccio(pt, dims, naturalW, naturalH);
    case "fulmine":
      return spawnFulmine(pt, dims, naturalW, naturalH);
    case "oscurità":
      return spawnOscurita(pt, dims, naturalW, naturalH);
  }
}

function tickParticle(p: Particle, element: CanvasParticleKind, dt: number): boolean {
  switch (element) {
    case "fuoco":
      return tickFuoco(p, dt);
    case "veleno":
      return tickVeleno(p, dt);
    case "ghiaccio":
      return tickGhiaccio(p, dt);
    case "fulmine":
      return tickFulmine(p, dt);
    case "oscurità":
      return tickOscurita(p, dt);
  }
}

export function tickParticleSystem(
  points: NormPoint[],
  element: CanvasParticleKind,
  system: ParticleSystem,
  dt: number,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
) {
  if (!system || points.length < 3) return;
  const lim = LIMITS[element];
  let spawnBudget = lim.spawnPerSec * dt;
  while (spawnBudget > 0 && system.particles.length < lim.max && spawnBudget >= 1) {
    const pt = randomPointInPolygon(points);
    system.particles.push(spawnFor(element, pt, dims, naturalW, naturalH));
    spawnBudget -= 1;
  }
  if (spawnBudget > 0 && system.particles.length < lim.max && Math.random() < spawnBudget) {
    const pt = randomPointInPolygon(points);
    system.particles.push(spawnFor(element, pt, dims, naturalW, naturalH));
  }

  const next: Particle[] = [];
  for (const p of system.particles) {
    if (!tickParticle(p, element, dt)) next.push(p);
  }
  system.particles = next;
}

export function isCanvasParticleElement(el: ParticleElement): el is CanvasParticleKind {
  return el === "fuoco" || el === "veleno" || el === "ghiaccio" || el === "fulmine" || el === "oscurità";
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  element: CanvasParticleKind
) {
  const glow = element === "fuoco" || element === "fulmine" || element === "ghiaccio";
  const softOsc = element === "oscurità";

  for (const p of particles) {
    const u = p.life / p.maxLife;
    let a: number;
    if (element === "fulmine") {
      a = Math.min(1, (1 - u) * (1 - u) * 1.85);
    } else if (element === "oscurità") {
      a = Math.min(0.42, Math.max(0, (1 - u * 0.65) * 0.38));
    } else {
      a = Math.min(1, Math.max(0, (1 - u) * (1 - u)) * (element === "fuoco" ? 1.22 : 1.08));
    }

    const rr = Math.round(p.cr);
    const gg = Math.round(p.cg);
    const bb = Math.round(p.cb);

    if (glow) {
      ctx.save();
      ctx.shadowColor = `rgba(${rr},${gg},${bb},${Math.min(0.95, a + 0.15)})`;
      ctx.shadowBlur = element === "fulmine" ? 14 : element === "fuoco" ? 10 : 7;
    }

    if (softOsc) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.2);
      g.addColorStop(0, `rgba(${rr},${gg},${bb},${a * 0.95})`);
      g.addColorStop(0.45, `rgba(${rr},${gg},${bb},${a * 0.35})`);
      g.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
      ctx.fillStyle = g;
    } else {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.35);
      g.addColorStop(0, `rgba(${rr},${gg},${bb},${a})`);
      g.addColorStop(0.55, `rgba(${rr},${gg},${bb},${a * 0.45})`);
      g.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
      ctx.fillStyle = g;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (element === "fulmine" ? 1.15 : 1.4), 0, Math.PI * 2);
    ctx.fill();

    if (glow) ctx.restore();
  }
}
