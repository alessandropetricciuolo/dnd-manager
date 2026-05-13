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

/** Elementi disegnati su canvas 2D (clip poligono). Fuoco e fulmine sono su Pixi. */
export type CanvasParticleKind = "veleno" | "ghiaccio" | "oscurità";

/** Tutti gli elementi selezionabili (canvas + Pixi: fumo, fuoco, fulmine…). */
export type ParticleElement = CanvasParticleKind | "fumo" | "fumini" | "fuoco" | "fulmine";

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
  veleno: { max: 620, spawnPerSec: 210 },
  ghiaccio: { max: 420, spawnPerSec: 120 },
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
    case "veleno":
      return spawnVeleno(pt, dims, naturalW, naturalH);
    case "ghiaccio":
      return spawnGhiaccio(pt, dims, naturalW, naturalH);
    case "oscurità":
      return spawnOscurita(pt, dims, naturalW, naturalH);
  }
}

function tickParticle(p: Particle, element: CanvasParticleKind, dt: number): boolean {
  switch (element) {
    case "veleno":
      return tickVeleno(p, dt);
    case "ghiaccio":
      return tickGhiaccio(p, dt);
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
  return el === "veleno" || el === "ghiaccio" || el === "oscurità";
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  element: CanvasParticleKind
) {
  const prevComp = ctx.globalCompositeOperation;

  for (const p of particles) {
    const u = p.life / p.maxLife;
    let a: number;
    if (element === "oscurità") {
      a = Math.min(0.88, (1 - u * 0.45) * 0.62);
    } else if (element === "veleno") {
      a = Math.min(0.55, (1 - u) ** 0.55 * 0.48);
    } else {
      a = Math.min(1, p.size < 1.4 ? (1 - u) * 1.5 : (1 - u) * (1 - u) * 1.25);
    }

    const rr = Math.round(p.cr);
    const gg = Math.round(p.cg);
    const bb = Math.round(p.cb);

    const useGlow = element === "ghiaccio";
    if (useGlow) {
      ctx.save();
      ctx.shadowColor = `rgba(${rr},${gg},${bb},${Math.min(0.98, a + 0.22)})`;
      ctx.shadowBlur = p.size < 1.4 ? 8 : 6;
    }

    let rMul = 1.4;
    if (element === "veleno") rMul = 3.1;
    else if (element === "oscurità") rMul = 2.45;
    else rMul = p.size < 1.4 ? 2.2 : 1.85;

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
    ctx.arc(p.x, p.y, p.size * 1.45, 0, Math.PI * 2);
    ctx.fill();

    if (useGlow) ctx.restore();
  }

  ctx.globalCompositeOperation = prevComp;
}
