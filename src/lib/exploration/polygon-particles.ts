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
export type ParticleElement = "fuoco" | "veleno" | "fumo" | "fumini";

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
  const yellowish = Math.random() < 0.42;
  const r = yellowish ? 255 : 248 + Math.random() * 7;
  const g = yellowish ? 210 + Math.random() * 45 : 130 + Math.random() * 75;
  const b = yellowish ? 70 + Math.random() * 55 : 28 + Math.random() * 55;
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 32,
    vy: -(78 + Math.random() * 92),
    life: 0,
    maxLife: 0.42 + Math.random() * 0.62,
    size: 1.1 + Math.random() * 2.4,
    cr: r,
    cg: g,
    cb: b,
  };
}

function tickFuoco(p: Particle, dt: number): boolean {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx += (Math.random() - 0.5) * 26 * dt;
  p.vy -= 42 * dt;
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
    vx: (Math.random() - 0.5) * 18,
    vy: -(32 + Math.random() * 48),
    life: 0,
    maxLife: 0.65 + Math.random() * 0.85,
    size: 0.9 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
    cr: 36 + Math.random() * 55,
    cg: 175 + Math.random() * 75,
    cb: 85 + Math.random() * 55,
  };
}

function tickVeleno(p: Particle, dt: number): boolean {
  p.phase = (p.phase ?? 0) + dt * 6;
  p.x += (p.vx + Math.sin(p.phase) * 14) * dt;
  p.y += p.vy * dt;
  p.vy -= 10 * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

const LIMITS: Record<"fuoco" | "veleno", { max: number; spawnPerSec: number }> = {
  fuoco: { max: 300, spawnPerSec: 110 },
  veleno: { max: 300, spawnPerSec: 90 },
};

export function tickParticleSystem(
  points: NormPoint[],
  element: "fuoco" | "veleno",
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
    system.particles.push(
      element === "fuoco" ? spawnFuoco(pt, dims, naturalW, naturalH) : spawnVeleno(pt, dims, naturalW, naturalH)
    );
    spawnBudget -= 1;
  }
  if (spawnBudget > 0 && system.particles.length < lim.max && Math.random() < spawnBudget) {
    const pt = randomPointInPolygon(points);
    system.particles.push(
      element === "fuoco" ? spawnFuoco(pt, dims, naturalW, naturalH) : spawnVeleno(pt, dims, naturalW, naturalH)
    );
  }

  const next: Particle[] = [];
  for (const p of system.particles) {
    const dead = element === "fuoco" ? tickFuoco(p, dt) : tickVeleno(p, dt);
    if (!dead) next.push(p);
  }
  system.particles = next;
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const u = p.life / p.maxLife;
    /** Leggermente più visibile sopra la nebbia (clip interno alla forma). */
    const a = Math.min(1, Math.max(0, (1 - u) * (1 - u)) * 1.15);
    ctx.fillStyle = `rgba(${Math.round(p.cr)},${Math.round(p.cg)},${Math.round(p.cb)},${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}
