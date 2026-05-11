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
  /** Cooldown per raffiche di fumini (secondi). */
  burstCd: number;
};

const FUMO_LIMIT = { max: 220, spawnPerSec: 52 };
const FUMINI_LIMIT = { max: 160, burstEvery: 0.16, burstCount: 14 };

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
    scale: 0.55 + Math.random() * 0.55,
    scaleGrowth: 0.35 + Math.random() * 0.45,
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

export function ensurePixiSmokeSystems(systems: PixiSmokeSystem[], count: number) {
  while (systems.length < count) systems.push({ particles: [], burstCd: 0 });
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

function buildSmokeTexture(): Texture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return Texture.WHITE;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(245, 245, 250, 0.55)");
  g.addColorStop(0.35, "rgba(210, 215, 225, 0.22)");
  g.addColorStop(0.65, "rgba(170, 178, 190, 0.08)");
  g.addColorStop(1, "rgba(140, 148, 160, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
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

export type PolySmokeLayer = {
  parent: Container;
  maskG: Graphics;
  bucket: Container;
  pool: Sprite[];
};

const POOL = 260;

function createLayer(texture: Texture): PolySmokeLayer {
  const parent = new Container();
  const maskG = new Graphics();
  const bucket = new Container();
  bucket.blendMode = "screen";
  bucket.mask = maskG;
  parent.addChild(maskG);
  parent.addChild(bucket);
  const pool: Sprite[] = [];
  for (let i = 0; i < POOL; i++) {
    const s = new Sprite(texture);
    s.anchor.set(0.5);
    s.visible = false;
    s.tint = 0xd8dce6;
    s.blendMode = "normal";
    bucket.addChild(s);
    pool.push(s);
  }
  return { parent, maskG, bucket, pool };
}

export type PixiSmokeRuntime = {
  app: Application;
  texture: Texture;
  root: Container;
  layers: PolySmokeLayer[];
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
  const texture = buildSmokeTexture();
  const root = new Container();
  app.stage.addChild(root);
  host.appendChild(app.canvas as HTMLCanvasElement);
  (app.canvas as HTMLCanvasElement).style.position = "absolute";
  (app.canvas as HTMLCanvasElement).style.left = "0";
  (app.canvas as HTMLCanvasElement).style.top = "0";
  (app.canvas as HTMLCanvasElement).style.width = "100%";
  (app.canvas as HTMLCanvasElement).style.height = "100%";
  (app.canvas as HTMLCanvasElement).style.pointerEvents = "none";
  return { app, texture, root, layers: [] };
}

export function resizePixiSmokeRuntime(rt: PixiSmokeRuntime, cssW: number, cssH: number, dpr: number) {
  rt.app.renderer.resize(Math.max(1, cssW), Math.max(1, cssH), dpr);
}

export function destroyPixiSmokeRuntime(rt: PixiSmokeRuntime | null) {
  if (!rt) return;
  rt.layers.length = 0;
  try {
    rt.texture.destroy(true);
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
    rt.layers.push(createLayer(rt.texture));
  }
  while (rt.layers.length > n) {
    const L = rt.layers.pop();
    if (L) {
      L.bucket.removeChildren();
      L.parent.destroy({ children: true });
    }
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
    const isPixi = poly.element === "fumo" || poly.element === "fumini";
    traceMaskGraphics(L.maskG, poly.points, cssW, cssH, naturalW, naturalH);
    L.parent.visible = isPixi;
    if (isPixi) rt.root.addChild(L.parent);
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
      for (const s of L.pool) s.visible = false;
      continue;
    }
    let u = 0;
    for (const p of sys.particles) {
      const spr = L.pool[u++];
      if (!spr) break;
      const t = p.life / p.maxLife;
      const fade = Math.max(0, 1 - t);
      const a = fade * fade;
      spr.visible = true;
      spr.x = p.x;
      spr.y = p.y;
      spr.rotation = p.rot;
      spr.alpha = a * 0.92;
      spr.scale.set(p.scale);
    }
    for (; u < L.pool.length; u++) L.pool[u].visible = false;
  }
}

export function renderPixiSmokeFrame(rt: PixiSmokeRuntime) {
  rt.app.render();
}
