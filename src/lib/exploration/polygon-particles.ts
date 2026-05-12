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
    vx: (Math.random() - 0.5) * 42,
    vy: -(92 + Math.random() * 105),
    life: 0,
    maxLife: 0.52 + Math.random() * 0.78,
    size: 1.8 + Math.random() * 4.2,
    cr: r,
    cg: g,
    cb: b,
  };
}

function tickFuoco(p: Particle, dt: number): boolean {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx += (Math.random() - 0.5) * 36 * dt;
  p.vy -= 52 * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

/** Nebbia verde: lenta, molto diffusa, poco moto verticale (non “pallini che salgono”). */
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
    vx: (Math.random() - 0.5) * 52,
    vy: -(5 + Math.random() * 16),
    life: 0,
    maxLife: 2.2 + Math.random() * 2.8,
    size: 5 + Math.random() * 12,
    phase: Math.random() * Math.PI * 2,
    cr: 32 + Math.random() * 55,
    cg: 175 + Math.random() * 75,
    cb: 78 + Math.random() * 65,
  };
}

function tickVeleno(p: Particle, dt: number): boolean {
  p.phase = (p.phase ?? 0) + dt * 2.4;
  p.vx += (Math.random() - 0.5) * 42 * dt;
  p.vy += (Math.random() - 0.5) * 22 * dt;
  p.x += (p.vx + Math.sin(p.phase) * 28 + Math.cos(p.phase * 0.37) * 12) * dt;
  p.y += (p.vy + Math.sin(p.phase * 0.61) * 10) * dt;
  p.vx *= 1 - 0.35 * dt;
  p.vy *= 1 - 0.28 * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

/** Cristalli / brina: quasi fermi, chiari, diversi dal fumo grigio Pixi. */
function spawnGhiaccio(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): Particle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  const sparkle = Math.random() < 0.28;
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * (sparkle ? 42 : 14),
    vy: (Math.random() - 0.5) * (sparkle ? 38 : 10) - (sparkle ? 15 : 4),
    life: 0,
    maxLife: sparkle ? 0.22 + Math.random() * 0.35 : 1.1 + Math.random() * 1.6,
    size: sparkle ? 0.55 + Math.random() * 1.2 : 1.4 + Math.random() * 3.2,
    phase: Math.random() * Math.PI * 2,
    cr: sparkle ? 240 : 170 + Math.random() * 75,
    cg: sparkle ? 252 : 220 + Math.random() * 32,
    cb: 255,
  };
}

function tickGhiaccio(p: Particle, dt: number): boolean {
  p.phase = (p.phase ?? 0) + dt * (p.size < 1.4 ? 11 : 3.2);
  p.x += (p.vx * 0.85 + Math.cos(p.phase) * (p.size < 1.4 ? 22 : 8)) * dt;
  p.y += (p.vy * 0.85 + Math.sin(p.phase * 0.9) * (p.size < 1.4 ? 18 : 5)) * dt;
  p.vx *= 1 - 1.1 * dt;
  p.vy *= 1 - 1.1 * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

/** Scarica elettrica: azzurro-bianco, corta, compositing lighter in draw. */
function spawnFulmine(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): Particle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  const core = Math.random() < 0.28;
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * (core ? 620 : 380),
    vy: (Math.random() - 0.5) * (core ? 620 : 380),
    life: 0,
    maxLife: core ? 0.04 + Math.random() * 0.06 : 0.07 + Math.random() * 0.1,
    size: core ? 3 + Math.random() * 5 : 1.2 + Math.random() * 2.8,
    cr: core ? 255 : 80 + Math.random() * 120,
    cg: core ? 255 : 160 + Math.random() * 95,
    cb: core ? 255 : 235 + Math.random() * 20,
  };
}

function tickFulmine(p: Particle, dt: number): boolean {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx *= 1 - 3.2 * dt;
  p.vy *= 1 - 3.2 * dt;
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
    vx: (Math.random() - 0.5) * 18,
    vy: (Math.random() - 0.5) * 18,
    life: 0,
    maxLife: 1.8 + Math.random() * 2.6,
    size: 10 + Math.random() * 18,
    phase: Math.random() * Math.PI * 2,
    cr: 18 + Math.random() * 28,
    cg: 8 + Math.random() * 18,
    cb: 38 + Math.random() * 45,
  };
}

function tickOscurita(p: Particle, dt: number): boolean {
  p.phase = (p.phase ?? 0) + dt * 1.4;
  p.x += (p.vx + Math.sin(p.phase) * 5) * dt;
  p.y += (p.vy + Math.cos(p.phase * 0.7) * 5) * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

const LIMITS: Record<CanvasParticleKind, { max: number; spawnPerSec: number }> = {
  fuoco: { max: 520, spawnPerSec: 185 },
  veleno: { max: 620, spawnPerSec: 210 },
  ghiaccio: { max: 420, spawnPerSec: 120 },
  fulmine: { max: 580, spawnPerSec: 320 },
  oscurità: { max: 420, spawnPerSec: 95 },
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
  const prevComp = ctx.globalCompositeOperation;

  if (element === "fulmine") {
    ctx.globalCompositeOperation = "lighter";
  }

  for (const p of particles) {
    const u = p.life / p.maxLife;
    let a: number;
    if (element === "fulmine") {
      a = Math.min(1, (1 - u) * (1 - u) * 2.35);
    } else if (element === "oscurità") {
      a = Math.min(0.88, (1 - u * 0.45) * 0.62);
    } else if (element === "veleno") {
      a = Math.min(0.55, (1 - u) ** 0.55 * 0.48);
    } else if (element === "ghiaccio") {
      a = Math.min(1, p.size < 1.4 ? (1 - u) * 1.5 : (1 - u) * (1 - u) * 1.25);
    } else {
      a = Math.min(1, Math.max(0, (1 - u) * (1 - u)) * 1.38);
    }

    const rr = Math.round(p.cr);
    const gg = Math.round(p.cg);
    const bb = Math.round(p.cb);

    const useGlow = element === "fuoco" || element === "fulmine" || element === "ghiaccio";
    if (useGlow) {
      ctx.save();
      ctx.shadowColor = `rgba(${rr},${gg},${bb},${Math.min(0.98, a + 0.22)})`;
      ctx.shadowBlur =
        element === "fulmine" ? 18 : element === "fuoco" ? 12 : p.size < 1.4 ? 8 : 6;
    }

    let rMul = 1.4;
    if (element === "veleno") rMul = 3.1;
    else if (element === "oscurità") rMul = 2.45;
    else if (element === "ghiaccio") rMul = p.size < 1.4 ? 2.2 : 1.85;
    else if (element === "fulmine") rMul = 1.25;

    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * rMul);
    if (element === "oscurità") {
      g.addColorStop(0, `rgba(${rr},${gg},${bb},${a * 0.82})`);
      g.addColorStop(0.28, `rgba(${rr},${gg},${bb},${a * 0.58})`);
      g.addColorStop(0.55, `rgba(${rr},${gg},${bb},${a * 0.32})`);
      g.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    } else if (element === "veleno") {
      g.addColorStop(0, `rgba(${rr},${gg},${bb},${a * 0.42})`);
      g.addColorStop(0.4, `rgba(${rr},${gg},${bb},${a * 0.22})`);
      g.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    } else {
      g.addColorStop(0, `rgba(${rr},${gg},${bb},${a})`);
      g.addColorStop(0.5, `rgba(${rr},${gg},${bb},${a * 0.5})`);
      g.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    }
    ctx.fillStyle = g;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (element === "fulmine" ? 1.2 : 1.45), 0, Math.PI * 2);
    ctx.fill();

    if (useGlow) ctx.restore();
  }

  ctx.globalCompositeOperation = prevComp;
}
