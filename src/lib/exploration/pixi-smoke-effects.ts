import "pixi.js/unsafe-eval";
import { Application, Container, Graphics, Sprite, Texture } from "pixi.js";
import type { NormPoint } from "@/lib/exploration/fow-geometry";
import { intrinsicNormToElementPx } from "@/lib/exploration/fow-geometry";
import { randomPointInPolygon } from "@/lib/exploration/polygon-particles";

export type PixiSmokeElement = "fumo" | "fumini";

export type PixiSmokeParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  scale: number;
  scaleGrowth: number;
  rot: number;
  vr: number;
};

export type PixiSmokeSystem = {
  particles: PixiSmokeParticle[];
  burstCd: number;
};

export type PixiFireParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  scale: number;
  scaleGrowth: number;
  rot: number;
  vr: number;
  tint: number;
};

export type PixiFireSystem = { particles: PixiFireParticle[] };

export type PixiLightningBolt = {
  life: number;
  maxLife: number;
  /** Pixel CSS */
  ax: number;
  ay: number;
  bx: number;
  by: number;
};

export type PixiLightningSystem = {
  bolts: PixiLightningBolt[];
  strikeCd: number;
};

const FUMO_LIMIT = { max: 300, spawnPerSec: 68 };
const FUMINI_LIMIT = { max: 180, burstEvery: 0.14, burstCount: 16 };

const FIRE_LIMIT = { max: 380, spawnPerSec: 165 };
const LIGHTNING_MAX_BOLTS = 14;
const LIGHTNING_STRIKE_MIN = 0.045;
const LIGHTNING_STRIKE_MAX = 0.14;

const SMOKE_POOL = 260;
const FIRE_POOL = 360;

function spawnFumo(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): PixiSmokeParticle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 22,
    vy: -(38 + Math.random() * 52),
    life: 0,
    maxLife: 1.1 + Math.random() * 1.4,
    scale: 0.62 + Math.random() * 0.62,
    scaleGrowth: 0.42 + Math.random() * 0.48,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.35,
  };
}

function spawnFumino(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): PixiSmokeParticle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 55,
    vy: -(95 + Math.random() * 110),
    life: 0,
    maxLife: 0.22 + Math.random() * 0.28,
    scale: 0.22 + Math.random() * 0.35,
    scaleGrowth: 0.9 + Math.random() * 1.1,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 1.2,
  };
}

function tickFumo(p: PixiSmokeParticle, dt: number): boolean {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx += (Math.random() - 0.5) * 18 * dt;
  p.vy -= 12 * dt;
  p.rot += p.vr * dt;
  p.scale += p.scaleGrowth * dt * 0.35;
  p.life += dt;
  return p.life >= p.maxLife;
}

function tickFumini(p: PixiSmokeParticle, dt: number): boolean {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx *= 1 - 0.85 * dt;
  p.vy -= 180 * dt;
  p.rot += p.vr * dt;
  p.scale += p.scaleGrowth * dt;
  p.life += dt;
  return p.life >= p.maxLife;
}

function spawnFire(
  pt: NormPoint,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
): PixiFireParticle {
  const [x, y] = intrinsicNormToElementPx(pt.x, pt.y, dims.w, dims.h, naturalW, naturalH);
  const hot = Math.random() < 0.35;
  const tint = hot ? 0xffcc66 : Math.random() < 0.5 ? 0xff6622 : 0xff3300;
  return {
    x,
    y: y + (Math.random() - 0.5) * 8,
    vx: (Math.random() - 0.5) * 55,
    vy: -(120 + Math.random() * 140),
    life: 0,
    maxLife: 0.35 + Math.random() * 0.55,
    scale: 0.45 + Math.random() * 0.95,
    scaleGrowth: 0.85 + Math.random() * 1.15,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 2.8,
    tint,
  };
}

function tickFire(p: PixiFireParticle, dt: number): boolean {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.vx += (Math.random() - 0.5) * 70 * dt;
  p.vy -= 35 * dt;
  p.rot += p.vr * dt;
  p.scale += p.scaleGrowth * dt * 0.42;
  p.life += dt;
  return p.life >= p.maxLife;
}

export function ensurePixiSmokeSystems(systems: PixiSmokeSystem[], count: number) {
  while (systems.length < count) systems.push({ particles: [], burstCd: 0 });
  systems.length = count;
}

export function ensurePixiFireSystems(systems: PixiFireSystem[], count: number) {
  while (systems.length < count) systems.push({ particles: [] });
  systems.length = count;
}

export function ensurePixiLightningSystems(systems: PixiLightningSystem[], count: number) {
  while (systems.length < count) systems.push({ bolts: [], strikeCd: 0.02 });
  systems.length = count;
}

export function tickPixiSmokeSystem(
  points: NormPoint[],
  element: PixiSmokeElement,
  system: PixiSmokeSystem,
  dt: number,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
) {
  if (!system || points.length < 3) return;
  const lim = element === "fumo" ? FUMO_LIMIT : FUMINI_LIMIT;

  if (element === "fumo") {
    let budget = FUMO_LIMIT.spawnPerSec * dt;
    while (budget > 0 && system.particles.length < lim.max && budget >= 1) {
      system.particles.push(spawnFumo(randomPointInPolygon(points), dims, naturalW, naturalH));
      budget -= 1;
    }
    if (budget > 0 && system.particles.length < lim.max && Math.random() < budget) {
      system.particles.push(spawnFumo(randomPointInPolygon(points), dims, naturalW, naturalH));
    }
  } else {
    system.burstCd -= dt;
    if (system.burstCd <= 0) {
      system.burstCd = FUMINI_LIMIT.burstEvery * (0.65 + Math.random() * 0.75);
      const n = FUMINI_LIMIT.burstCount + Math.floor(Math.random() * 9);
      for (let k = 0; k < n && system.particles.length < lim.max; k++) {
        system.particles.push(spawnFumino(randomPointInPolygon(points), dims, naturalW, naturalH));
      }
    }
  }

  const next: PixiSmokeParticle[] = [];
  const tickFn = element === "fumo" ? tickFumo : tickFumini;
  for (const p of system.particles) {
    if (!tickFn(p, dt)) next.push(p);
  }
  system.particles = next;
}

export function tickPixiFireSystem(
  points: NormPoint[],
  system: PixiFireSystem,
  dt: number,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
) {
  if (!system || points.length < 3) return;
  let budget = FIRE_LIMIT.spawnPerSec * dt;
  while (budget > 0 && system.particles.length < FIRE_LIMIT.max && budget >= 1) {
    system.particles.push(spawnFire(randomPointInPolygon(points), dims, naturalW, naturalH));
    budget -= 1;
  }
  if (budget > 0 && system.particles.length < FIRE_LIMIT.max && Math.random() < budget) {
    system.particles.push(spawnFire(randomPointInPolygon(points), dims, naturalW, naturalH));
  }
  const next: PixiFireParticle[] = [];
  for (const p of system.particles) {
    if (!tickFire(p, dt)) next.push(p);
  }
  system.particles = next;
}

function polygonPixelBBox(
  points: NormPoint[],
  w: number,
  h: number,
  naturalW: number,
  naturalH: number
) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    const [x, y] = intrinsicNormToElementPx(p.x, p.y, w, h, naturalW, naturalH);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, cw: maxX - minX, ch: maxY - minY };
}

export function tickPixiLightningSystem(
  points: NormPoint[],
  system: PixiLightningSystem,
  dt: number,
  dims: { w: number; h: number },
  naturalW: number,
  naturalH: number
) {
  if (!system || points.length < 3) return;
  const box = polygonPixelBBox(points, dims.w, dims.h, naturalW, naturalH);
  const span = Math.max(40, Math.hypot(box.cw, box.ch));

  for (const b of system.bolts) {
    b.life -= dt;
  }
  system.bolts = system.bolts.filter((b) => b.life > 0);

  system.strikeCd -= dt;
  while (system.strikeCd <= 0 && system.bolts.length < LIGHTNING_MAX_BOLTS) {
    system.strikeCd += LIGHTNING_STRIKE_MIN + Math.random() * (LIGHTNING_STRIKE_MAX - LIGHTNING_STRIKE_MIN);
    const base = randomPointInPolygon(points);
    const [ax, ay] = intrinsicNormToElementPx(base.x, base.y, dims.w, dims.h, naturalW, naturalH);
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
    const len = span * (0.35 + Math.random() * 0.65);
    const bx = ax + Math.cos(ang) * len;
    const by = ay + Math.sin(ang) * len;
    const dur = 0.05 + Math.random() * 0.09;
    system.bolts.push({
      life: dur,
      maxLife: dur,
      ax,
      ay,
      bx,
      by,
    });
  }
}

function jaggedLine(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  displace: number,
  minSeg: number
): { x: number; y: number }[] {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  if (dist < minSeg || displace < 2.5) {
    return [
      { x: ax, y: ay },
      { x: bx, y: by },
    ];
  }
  const mx = (ax + bx) / 2 + (Math.random() * 2 - 1) * displace;
  const my = (ay + by) / 2 + (Math.random() * 2 - 1) * displace;
  const left = jaggedLine(ax, ay, mx, my, displace * 0.52, minSeg);
  const right = jaggedLine(mx, my, bx, by, displace * 0.52, minSeg);
  return [...left.slice(0, -1), ...right];
}

function strokePolyline(
  g: Graphics,
  pts: { x: number; y: number }[],
  width: number,
  color: number,
  alpha: number
) {
  if (pts.length < 2) return;
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    g.lineTo(pts[i].x, pts[i].y);
  }
  g.stroke({ width, color, alpha, cap: "round", join: "round" });
}

function buildSmokeTexture(): Texture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return Texture.WHITE;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255, 255, 255, 0.88)");
  g.addColorStop(0.18, "rgba(236, 240, 252, 0.52)");
  g.addColorStop(0.4, "rgba(200, 210, 228, 0.26)");
  g.addColorStop(0.68, "rgba(155, 168, 188, 0.1)");
  g.addColorStop(1, "rgba(115, 125, 145, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(c);
}

/** Fiamma allungata verso l’alto (ancora in basso). */
function buildFlameTexture(): Texture {
  const rw = 48;
  const rh = 112;
  const c = document.createElement("canvas");
  c.width = rw;
  c.height = rh;
  const ctx = c.getContext("2d");
  if (!ctx) return Texture.WHITE;
  const g = ctx.createRadialGradient(rw / 2, rh * 0.88, 0, rw / 2, rh * 0.55, rh * 0.62);
  g.addColorStop(0, "rgba(255, 255, 220, 0.95)");
  g.addColorStop(0.12, "rgba(255, 220, 120, 0.85)");
  g.addColorStop(0.35, "rgba(255, 120, 40, 0.65)");
  g.addColorStop(0.62, "rgba(200, 40, 10, 0.35)");
  g.addColorStop(0.88, "rgba(80, 10, 0, 0.12)");
  g.addColorStop(1, "rgba(40, 5, 0, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(rw / 2, rh * 0.58, rw * 0.48, rh * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  return Texture.from(c);
}

function traceMaskGraphics(
  g: Graphics,
  poly: NormPoint[],
  w: number,
  h: number,
  naturalW: number,
  naturalH: number
) {
  g.clear();
  if (poly.length < 3) return;
  const [x0, y0] = intrinsicNormToElementPx(poly[0].x, poly[0].y, w, h, naturalW, naturalH);
  g.moveTo(x0, y0);
  for (let i = 1; i < poly.length; i++) {
    const [xi, yi] = intrinsicNormToElementPx(poly[i].x, poly[i].y, w, h, naturalW, naturalH);
    g.lineTo(xi, yi);
  }
  g.closePath();
  g.fill({ color: 0xffffff, alpha: 1 });
}

export type PolyEffectLayer = {
  parent: Container;
  maskG: Graphics;
  smokeBucket: Container;
  fireBucket: Container;
  lightningG: Graphics;
  smokePool: Sprite[];
  firePool: Sprite[];
};

function createLayer(smokeTex: Texture, flameTex: Texture): PolyEffectLayer {
  const parent = new Container();
  const maskG = new Graphics();
  const smokeBucket = new Container();
  smokeBucket.blendMode = "screen";
  smokeBucket.mask = maskG;
  const fireBucket = new Container();
  fireBucket.blendMode = "screen";
  fireBucket.mask = maskG;
  const lightningG = new Graphics();
  lightningG.blendMode = "screen";
  lightningG.mask = maskG;

  parent.addChild(maskG);
  parent.addChild(smokeBucket);
  parent.addChild(fireBucket);
  parent.addChild(lightningG);

  const smokePool: Sprite[] = [];
  for (let i = 0; i < SMOKE_POOL; i++) {
    const s = new Sprite(smokeTex);
    s.anchor.set(0.5);
    s.visible = false;
    s.tint = 0xd8dce6;
    smokeBucket.addChild(s);
    smokePool.push(s);
  }

  const firePool: Sprite[] = [];
  for (let i = 0; i < FIRE_POOL; i++) {
    const s = new Sprite(flameTex);
    s.anchor.set(0.5, 0.92);
    s.visible = false;
    s.blendMode = "add";
    fireBucket.addChild(s);
    firePool.push(s);
  }

  return { parent, maskG, smokeBucket, fireBucket, lightningG, smokePool, firePool };
}

export type PixiSmokeRuntime = {
  app: Application;
  smokeTexture: Texture;
  flameTexture: Texture;
  root: Container;
  layers: PolyEffectLayer[];
};

export async function createPixiSmokeRuntime(
  host: HTMLElement,
  cssW: number,
  cssH: number,
  dpr: number
): Promise<PixiSmokeRuntime> {
  const app = new Application();
  await app.init({
    width: Math.max(1, cssW),
    height: Math.max(1, cssH),
    backgroundAlpha: 0,
    resolution: dpr,
    autoDensity: true,
    antialias: true,
    preference: "webgl",
    autoStart: false,
  });
  app.stop?.();
  const smokeTexture = buildSmokeTexture();
  const flameTexture = buildFlameTexture();
  const root = new Container();
  app.stage.addChild(root);
  host.appendChild(app.canvas as HTMLCanvasElement);
  (app.canvas as HTMLCanvasElement).style.position = "absolute";
  (app.canvas as HTMLCanvasElement).style.left = "0";
  (app.canvas as HTMLCanvasElement).style.top = "0";
  (app.canvas as HTMLCanvasElement).style.width = "100%";
  (app.canvas as HTMLCanvasElement).style.height = "100%";
  (app.canvas as HTMLCanvasElement).style.pointerEvents = "none";
  return { app, smokeTexture, flameTexture, root, layers: [] };
}

export function resizePixiSmokeRuntime(rt: PixiSmokeRuntime, cssW: number, cssH: number, dpr: number) {
  rt.app.renderer.resize(Math.max(1, cssW), Math.max(1, cssH), dpr);
}

export function destroyPixiSmokeRuntime(rt: PixiSmokeRuntime | null) {
  if (!rt) return;
  rt.layers.length = 0;
  try {
    rt.smokeTexture.destroy(true);
  } catch {
    /* noop */
  }
  try {
    rt.flameTexture.destroy(true);
  } catch {
    /* noop */
  }
  try {
    rt.app.destroy({ removeView: true }, true);
  } catch {
    /* noop */
  }
}

function ensureLayerCount(rt: PixiSmokeRuntime, n: number) {
  while (rt.layers.length < n) {
    rt.layers.push(createLayer(rt.smokeTexture, rt.flameTexture));
  }
  while (rt.layers.length > n) {
    const L = rt.layers.pop();
    if (L) L.parent.destroy({ children: true });
  }
}

export function syncPixiSmokeLayers(
  rt: PixiSmokeRuntime,
  polys: Array<{ element: string; points: NormPoint[] }>,
  naturalW: number,
  naturalH: number,
  cssW: number,
  cssH: number
) {
  ensureLayerCount(rt, polys.length);
  rt.root.removeChildren();
  for (let i = 0; i < polys.length; i++) {
    const poly = polys[i];
    const L = rt.layers[i];
    const el = poly.element;
    const usePixi = el === "fumo" || el === "fumini" || el === "fuoco" || el === "fulmine";
    traceMaskGraphics(L.maskG, poly.points, cssW, cssH, naturalW, naturalH);
    L.smokeBucket.visible = el === "fumo" || el === "fumini";
    L.fireBucket.visible = el === "fuoco";
    L.lightningG.visible = el === "fulmine";
    L.parent.visible = usePixi;
    if (usePixi) rt.root.addChild(L.parent);
  }
}

export function drawPixiSmokeSprites(
  rt: PixiSmokeRuntime,
  polys: Array<{ element: string }>,
  systems: PixiSmokeSystem[]
) {
  for (let i = 0; i < polys.length; i++) {
    const poly = polys[i];
    const L = rt.layers[i];
    const sys = systems[i];
    if (!L || !sys) continue;
    if (poly.element !== "fumo" && poly.element !== "fumini") {
      for (const s of L.smokePool) s.visible = false;
      continue;
    }
    let u = 0;
    const tint = poly.element === "fumini" ? 0x6ab0e8 : 0x98aab8;
    for (const p of sys.particles) {
      const spr = L.smokePool[u++];
      if (!spr) break;
      const t = p.life / p.maxLife;
      const fade = Math.max(0, 1 - t);
      const a = fade * fade;
      spr.visible = true;
      spr.tint = tint;
      spr.x = p.x;
      spr.y = p.y;
      spr.rotation = p.rot;
      spr.alpha = Math.min(1, a * 0.98 + 0.06);
      spr.scale.set(p.scale);
    }
    for (; u < L.smokePool.length; u++) L.smokePool[u].visible = false;
  }
}

export function drawPixiFireSprites(
  rt: PixiSmokeRuntime,
  polys: Array<{ element: string }>,
  systems: PixiFireSystem[]
) {
  for (let i = 0; i < polys.length; i++) {
    const poly = polys[i];
    const L = rt.layers[i];
    const sys = systems[i];
    if (!L || !sys) continue;
    if (poly.element !== "fuoco") {
      for (const s of L.firePool) s.visible = false;
      continue;
    }
    let u = 0;
    for (const p of sys.particles) {
      const spr = L.firePool[u++];
      if (!spr) break;
      const t = p.life / p.maxLife;
      const fade = Math.max(0, 1 - t);
      const a = Math.min(1, fade ** 0.65 * 1.05 + 0.08);
      spr.visible = true;
      spr.tint = p.tint;
      spr.x = p.x;
      spr.y = p.y;
      spr.rotation = p.rot;
      spr.alpha = a;
      const sc = p.scale * (1 + t * 0.35);
      spr.scale.set(sc * 0.55, sc * 0.72);
    }
    for (; u < L.firePool.length; u++) L.firePool[u].visible = false;
  }
}

export function drawPixiLightning(
  rt: PixiSmokeRuntime,
  polys: Array<{ element: string }>,
  systems: PixiLightningSystem[]
) {
  for (let i = 0; i < polys.length; i++) {
    const poly = polys[i];
    const L = rt.layers[i];
    const sys = systems[i];
    if (!L || !sys) continue;
    const g = L.lightningG;
    g.clear();
    if (poly.element !== "fulmine") continue;

    for (const bolt of sys.bolts) {
      const disp = Math.hypot(bolt.bx - bolt.ax, bolt.by - bolt.ay) * 0.42;
      const pts = jaggedLine(bolt.ax, bolt.ay, bolt.bx, bolt.by, disp, 6);
      const flicker = 0.55 + 0.45 * (bolt.life / Math.max(bolt.maxLife, 1e-6));
      strokePolyline(g, pts, 16, 0x2244aa, 0.22 * flicker);
      strokePolyline(g, pts, 9, 0x66aaff, 0.42 * flicker);
      strokePolyline(g, pts, 4, 0xccddff, 0.72 * flicker);
      strokePolyline(g, pts, 1.5, 0xffffff, 0.95 * flicker);
    }
  }
}

export function renderPixiSmokeFrame(rt: PixiSmokeRuntime) {
  rt.app.render();
}
