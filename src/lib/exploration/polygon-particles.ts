import { createNoise2D } from "simplex-noise";
import type { NormPoint } from "@/lib/exploration/fow-geometry";
import { intrinsicNormToElementPx, pointInPolygon } from "@/lib/exploration/fow-geometry";

const mistNoise2D = createNoise2D();

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
  /** Fulmine: polilinea in px layout (clip mappa). */
  boltX?: number[];
  boltY?: number[];
  /** Ghiaccio: brina / scintilla / striscia riflesso. */
  iceRole?: "frost" | "sparkle" | "streak";
};

export type ParticleSystem = { particles: Particle[] };
export type ParticleElement = "fuoco" | "veleno" | "fumo" | "fumini" | "oscurita" | "ghiaccio";

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

function centroid(points: NormPoint[]): NormPoint {
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

/** Fuoco: germoglio in basso nella forma, risalita con lingua. */
function spawnFuoco(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): Particle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  const core = Math.random() < 0.35;
  const r = core ? 255 : 240 + Math.random() * 15;
  const g = core ? 140 + Math.random() * 90 : 55 + Math.random() * 110;
  const b = core ? 18 + Math.random() * 40 : 8 + Math.random() * 35;
  const spread = (Math.random() - 0.5) * 38;
  return {
    x,
    y,
    vx: spread,
    vy: -(95 + Math.random() * 115),
    life: 0,
    maxLife: 0.35 + Math.random() * 0.55,
    size: 2.4 + Math.random() * 5.5,
    cr: r,
    cg: g,
    cb: b,
    phase: Math.random() * Math.PI * 2,
  };
}

function tickFuoco(p: Particle, dt: number): boolean {
  const wob = mistNoise2D(p.x * 0.02, p.y * 0.02 + (p.phase ?? 0) + p.life * 3);
  p.x += (p.vx + wob * 42) * dt;
  p.y += p.vy * dt;
  p.vx *= 1 - 1.8 * dt;
  p.vy -= 32 * dt;
  p.size += (2.8 - p.life / p.maxLife) * 1.1 * dt;
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
    vx: (Math.random() - 0.5) * 12,
    vy: -(8 + Math.random() * 22),
    life: 0,
    maxLife: 1.1 + Math.random() * 1.5,
    size: 4 + Math.random() * 9,
    phase: Math.random() * Math.PI * 2,
    cr: 22 + Math.random() * 55,
    cg: 140 + Math.random() * 95,
    cb: 48 + Math.random() * 55,
  };
}

function tickVeleno(p: Particle, dt: number): boolean {
  const n1 = mistNoise2D(p.x * 0.009, p.y * 0.009 + p.life * 0.35);
  const n2 = mistNoise2D(p.y * 0.011 + 20, p.x * 0.011 + p.life * 0.28);
  p.x += (p.vx + n1 * 36) * dt;
  p.y += (p.vy + n2 * 18) * dt;
  p.vy -= 3.5 * dt;
  p.size += 2.2 * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

function spawnFumoCanvas(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): Particle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 10,
    vy: -(6 + Math.random() * 14),
    life: 0,
    maxLife: 1.4 + Math.random() * 1.6,
    size: 6 + Math.random() * 14,
    cr: 118 + Math.random() * 55,
    cg: 122 + Math.random() * 58,
    cb: 128 + Math.random() * 62,
    phase: Math.random() * Math.PI * 2,
  };
}

function tickFumoCanvas(p: Particle, dt: number): boolean {
  const n1 = mistNoise2D(p.x * 0.0065 + 100, p.y * 0.0065 + p.life * 0.22);
  const n2 = mistNoise2D(p.y * 0.0065, p.x * 0.0065 + p.life * 0.18);
  p.x += (p.vx + n1 * 22) * dt;
  p.y += (p.vy + n2 * 12) * dt;
  p.vy -= 1.2 * dt;
  p.size += 2.8 * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

function spawnLightningBolt(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): Particle {
  const [x0, y0] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  const len = 38 + Math.random() * 95;
  const angle = Math.random() * Math.PI * 2;
  const steps = 6 + Math.floor(Math.random() * 5);
  const xs: number[] = [x0];
  const ys: number[] = [y0];
  let x = x0;
  let y = y0;
  for (let i = 1; i < steps; i++) {
    const t = i / (steps - 1);
    const spread = (1 - t * 0.45) * 26;
    const jx = (Math.random() - 0.5) * spread;
    const jy = (Math.random() - 0.5) * spread;
    x = x0 + Math.cos(angle) * len * t + jx;
    y = y0 + Math.sin(angle) * len * t + jy;
    xs.push(x);
    ys.push(y);
  }
  return {
    x: x0,
    y: y0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 0.05 + Math.random() * 0.07,
    size: 1.8 + Math.random() * 2.2,
    cr: 230,
    cg: 248,
    cb: 255,
    boltX: xs,
    boltY: ys,
  };
}

function tickBolt(p: Particle, dt: number): boolean {
  p.life += dt;
  return p.life >= p.maxLife;
}

/** Nebbia nera: stesso moto del fumo (simplex), colore su nero. */
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
    vx: (Math.random() - 0.5) * 11,
    vy: -(5 + Math.random() * 12),
    life: 0,
    maxLife: 1.5 + Math.random() * 1.8,
    size: 8 + Math.random() * 18,
    cr: 4 + Math.random() * 18,
    cg: 4 + Math.random() * 18,
    cb: 6 + Math.random() * 20,
    phase: Math.random() * Math.PI * 2,
  };
}

function tickOscurita(p: Particle, dt: number): boolean {
  return tickFumoCanvas(p, dt);
}

function spawnGhiaccioFrost(
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
    vy: (Math.random() - 0.5) * 10 - 4,
    life: 0,
    maxLife: 1.35 + Math.random() * 1.25,
    size: 5 + Math.random() * 14,
    phase: Math.random() * Math.PI * 2,
    cr: 168 + Math.random() * 55,
    cg: 218 + Math.random() * 32,
    cb: 248 + Math.random() * 7,
    iceRole: "frost",
  };
}

function tickGhiaccioFrost(p: Particle, dt: number): boolean {
  const n1 = mistNoise2D(p.x * 0.008 + 50, p.y * 0.008 + p.life * 0.28);
  const n2 = mistNoise2D(p.y * 0.009, p.x * 0.009 + (p.phase ?? 0) + p.life * 0.22);
  p.x += (p.vx + n1 * 28) * dt;
  p.y += (p.vy + n2 * 20) * dt;
  p.vx *= 1 - 0.9 * dt;
  p.vy *= 1 - 0.9 * dt;
  p.size += 1.6 * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

function spawnGhiaccioSparkle(
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
    vy: (Math.random() - 0.5) * 18,
    life: 0,
    maxLife: 0.35 + Math.random() * 0.55,
    size: 1.2 + Math.random() * 2.8,
    phase: Math.random() * Math.PI * 2,
    cr: 230 + Math.random() * 25,
    cg: 248 + Math.random() * 8,
    cb: 255,
    iceRole: "sparkle",
  };
}

function tickGhiaccioSparkle(p: Particle, dt: number): boolean {
  const n = mistNoise2D(p.x * 0.04 + (p.phase ?? 0), p.y * 0.04 + p.life * 2);
  p.x += (p.vx + n * 12) * dt;
  p.y += (p.vy + n * 10) * dt;
  p.size += Math.sin(p.life * 14 + (p.phase ?? 0)) * 0.35 * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

function spawnGhiaccioStreak(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): Particle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  const ang = (Math.random() - 0.5) * 0.85;
  const sp = 5 + Math.random() * 12;
  return {
    x,
    y,
    vx: Math.cos(ang) * sp,
    vy: Math.sin(ang) * sp,
    life: 0,
    maxLife: 0.85 + Math.random() * 1.1,
    size: 22 + Math.random() * 48,
    phase: ang,
    cr: 200 + Math.random() * 45,
    cg: 232 + Math.random() * 20,
    cb: 255,
    iceRole: "streak",
  };
}

function tickGhiaccioStreak(p: Particle, dt: number): boolean {
  const n = mistNoise2D(p.x * 0.015, p.y * 0.015 + p.life * 0.4);
  p.x += (p.vx * 0.35 + n * 8) * dt;
  p.y += (p.vy * 0.35 + n * 6) * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

const LIMITS: Record<ParticleElement, { max: number; spawnPerSec: number }> = {
  fuoco: { max: 640, spawnPerSec: 260 },
  veleno: { max: 380, spawnPerSec: 95 },
  fumo: { max: 220, spawnPerSec: 58 },
  fumini: { max: 200, spawnPerSec: 220 },
  oscurita: { max: 260, spawnPerSec: 62 },
  ghiaccio: { max: 460, spawnPerSec: 135 },
};

function pushSpawn(
  system: ParticleSystem,
  points: NormPoint[],
  element: ParticleElement,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
) {
  const pt = randomPointInPolygon(points);
  let p: Particle;
  switch (element) {
    case "fuoco":
      p = spawnFuoco(pt, dims, naturalW, naturalH);
      break;
    case "veleno":
      p = spawnVeleno(pt, dims, naturalW, naturalH);
      break;
    case "fumo":
      p = spawnFumoCanvas(pt, dims, naturalW, naturalH);
      break;
    case "oscurita":
      p = spawnOscurita(pt, dims, naturalW, naturalH);
      break;
    case "ghiaccio": {
      const r = Math.random();
      if (r < 0.64) p = spawnGhiaccioFrost(pt, dims, naturalW, naturalH);
      else if (r < 0.9) p = spawnGhiaccioSparkle(pt, dims, naturalW, naturalH);
      else p = spawnGhiaccioStreak(pt, dims, naturalW, naturalH);
      break;
    }
    default:
      p = spawnLightningBolt(pt, dims, naturalW, naturalH);
  }
  system.particles.push(p);
}

export function tickParticleSystem(
  points: NormPoint[],
  element: ParticleElement,
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
    pushSpawn(system, points, element, dims, naturalW, naturalH);
    spawnBudget -= 1;
  }
  if (spawnBudget > 0 && system.particles.length < lim.max && Math.random() < spawnBudget) {
    pushSpawn(system, points, element, dims, naturalW, naturalH);
  }

  const next: Particle[] = [];
  for (const p of system.particles) {
    let dead: boolean;
    switch (element) {
      case "fuoco":
        dead = tickFuoco(p, dt);
        break;
      case "veleno":
        dead = tickVeleno(p, dt);
        break;
      case "fumo":
        dead = tickFumoCanvas(p, dt);
        break;
      case "oscurita":
        dead = tickOscurita(p, dt);
        break;
      case "ghiaccio":
        if (p.iceRole === "sparkle") dead = tickGhiaccioSparkle(p, dt);
        else if (p.iceRole === "streak") dead = tickGhiaccioStreak(p, dt);
        else dead = tickGhiaccioFrost(p, dt);
        break;
      case "fumini":
        dead = tickBolt(p, dt);
        break;
      default:
        dead = tickBolt(p, dt);
    }
    if (!dead) next.push(p);
  }
  system.particles = next;
}

function drawFlameParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const u = p.life / p.maxLife;
  const a = Math.min(1, (1 - u) * (1 - u) * 1.35);
  const ang =
    Math.abs(p.vx) + Math.abs(p.vy) < 1e-3 ? -Math.PI / 2 : Math.atan2(p.vy, p.vx) + Math.PI / 2;
  const len = p.size * (1.6 + (1 - u) * 1.4);
  const w = p.size * (0.55 + (1 - u) * 0.35);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(0, len * 0.5, 0, -len * 0.5);
  g.addColorStop(0, `rgba(${Math.round(p.cr * 0.35)},${Math.round(p.cg * 0.25)},${Math.round(p.cb * 0.2)},0)`);
  g.addColorStop(0.45, `rgba(${Math.round(p.cr)},${Math.round(p.cg)},${Math.round(p.cb)},${a * 0.92})`);
  g.addColorStop(1, `rgba(255,255,220,${a * 0.35})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -len * 0.55);
  ctx.quadraticCurveTo(w, 0, 0, len * 0.45);
  ctx.quadraticCurveTo(-w, 0, 0, -len * 0.55);
  ctx.fill();
  ctx.restore();
}

function drawMistBlob(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  tint: "veleno" | "fumo"
) {
  const u = p.life / p.maxLife;
  const a = Math.min(0.22, (1 - u) * (1 - u) * 0.38) * (tint === "veleno" ? 1.15 : 0.9);
  const rad = p.size * (0.85 + u * 0.55);
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
  if (tint === "veleno") {
    g.addColorStop(0, `rgba(${Math.round(p.cr)},${Math.round(p.cg)},${Math.round(p.cb)},${a})`);
    g.addColorStop(0.45, `rgba(${Math.round(p.cr * 0.7)},${Math.round(p.cg * 0.95)},${Math.round(p.cb * 0.55)},${a * 0.55})`);
    g.addColorStop(1, `rgba(20,90,40,0)`);
  } else {
    g.addColorStop(0, `rgba(${Math.round(p.cr)},${Math.round(p.cg)},${Math.round(p.cb)},${a * 0.95})`);
    g.addColorStop(0.5, `rgba(${Math.round(p.cr * 0.92)},${Math.round(p.cg * 0.92)},${Math.round(p.cb * 0.92)},${a * 0.45})`);
    g.addColorStop(1, `rgba(70,75,85,0)`);
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
  ctx.fill();
}

function drawBlackMist(ctx: CanvasRenderingContext2D, p: Particle) {
  const u = p.life / p.maxLife;
  const a = Math.min(0.42, (1 - u) * (1 - u) * 0.52);
  const rad = p.size * (0.88 + u * 0.5);
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
  const k = 0.85 + (p.cr / 255) * 0.15;
  g.addColorStop(0, `rgba(${Math.round(p.cr * k)},${Math.round(p.cg * k)},${Math.round(p.cb * k)},${a})`);
  g.addColorStop(0.55, `rgba(${Math.round(p.cr * 0.5)},${Math.round(p.cg * 0.5)},${Math.round(p.cb * 0.5)},${a * 0.45})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
  ctx.fill();
}

function drawIceFrost(ctx: CanvasRenderingContext2D, p: Particle) {
  const u = p.life / p.maxLife;
  const a = Math.min(0.2, (1 - u) * (1 - u) * 0.34);
  const rad = p.size * (0.82 + u * 0.45);
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
  g.addColorStop(0, `rgba(${Math.round(p.cr)},${Math.round(p.cg)},${Math.round(p.cb)},${a * 0.95})`);
  g.addColorStop(0.4, `rgba(${Math.round(p.cr * 0.92)},${Math.round(p.cg * 0.97)},${Math.round(p.cb)},${a * 0.5})`);
  g.addColorStop(1, "rgba(180, 230, 255, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
  ctx.fill();
}

function drawIceSparkle(ctx: CanvasRenderingContext2D, p: Particle) {
  const u = p.life / p.maxLife;
  const a = (1 - u) * (1 - u) * 0.95;
  const rad = Math.max(0.6, p.size * (1.1 - u * 0.35));
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 1.8);
  g.addColorStop(0, `rgba(255,255,255,${a})`);
  g.addColorStop(0.35, `rgba(${Math.round(p.cr)},${Math.round(p.cg)},${Math.round(p.cb)},${a * 0.55})`);
  g.addColorStop(1, "rgba(200, 240, 255, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
  ctx.fill();
}

function drawIceStreak(ctx: CanvasRenderingContext2D, p: Particle) {
  const u = p.life / p.maxLife;
  const a = (1 - u) * 0.55;
  const ang = p.phase ?? 0;
  const half = p.size * 0.5;
  const thick = Math.max(0.8, p.size * 0.06);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(ang);
  const g = ctx.createLinearGradient(-half, 0, half, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.45, `rgba(${Math.round(p.cr)},${Math.round(p.cg)},${Math.round(p.cb)},${a * 0.85})`);
  g.addColorStop(0.55, `rgba(255,255,255,${a * 0.5})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-half, -thick, p.size, thick * 2);
  ctx.restore();
}

function drawBolt(ctx: CanvasRenderingContext2D, p: Particle) {
  const xs = p.boltX;
  const ys = p.boltY;
  if (!xs || !ys || xs.length < 2) return;
  const u = p.life / p.maxLife;
  const flash = u < 0.35 ? 1 : (1 - u) / 0.65;
  const a = Math.min(1, flash * 1.15);
  ctx.strokeStyle = `rgba(240,250,255,${a * 0.95})`;
  ctx.lineWidth = p.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(120, 190, 255, 0.95)";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i]);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(255,255,255,${a * 0.55})`;
  ctx.lineWidth = p.size * 0.35;
  ctx.stroke();
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  element: ParticleElement
) {
  if (element === "fuoco") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) drawFlameParticle(ctx, p);
    ctx.restore();
    return;
  }
  if (element === "fumini") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) drawBolt(ctx, p);
    ctx.restore();
    return;
  }
  if (element === "oscurita") {
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (const p of particles) drawBlackMist(ctx, p);
    ctx.restore();
    return;
  }
  if (element === "ghiaccio") {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const p of particles) {
      if (p.iceRole === "sparkle") drawIceSparkle(ctx, p);
      else if (p.iceRole === "streak") drawIceStreak(ctx, p);
      else drawIceFrost(ctx, p);
    }
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      if (p.iceRole === "sparkle") drawIceSparkle(ctx, p);
    }
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (const p of particles) {
    if (element === "veleno") drawMistBlob(ctx, p, "veleno");
    else drawMistBlob(ctx, p, "fumo");
  }
  ctx.restore();
}
