export type CorridorPoint = { x: number; y: number };

/** Corridoio rettilineo: poligono a 4 vertici perpendicolare al segmento. */
export function corridorQuadFromSegment(
  start: CorridorPoint,
  end: CorridorPoint,
  halfWidth: number
): CorridorPoint[] | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1 || halfWidth <= 0) return null;
  const nx = (-dy / len) * halfWidth;
  const ny = (dx / len) * halfWidth;
  return [
    { x: start.x + nx, y: start.y + ny },
    { x: end.x + nx, y: end.y + ny },
    { x: end.x - nx, y: end.y - ny },
    { x: start.x - nx, y: start.y - ny },
  ];
}

function catmullRomPoint(
  p0: CorridorPoint,
  p1: CorridorPoint,
  p2: CorridorPoint,
  p3: CorridorPoint,
  t: number
): CorridorPoint {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

/** Campiona una spline Catmull-Rom attraverso i punti guida (curva). */
export function sampleCorridorCenterline(
  points: CorridorPoint[],
  samplesPerSpan = 10
): CorridorPoint[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [points[0]];
  if (points.length === 2) return [points[0], points[1]];

  const out: CorridorPoint[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const steps = i === points.length - 2 ? samplesPerSpan + 1 : samplesPerSpan;
    for (let s = 0; s < steps; s++) {
      if (i > 0 && s === 0) continue;
      const t = s / samplesPerSpan;
      out.push(catmullRomPoint(p0, p1, p2, p3, t));
    }
  }
  return out;
}

function normalize(dx: number, dy: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

/** Contorno del corridoio offsettando la linea centrale (curva o retta). */
export function corridorPolygonFromCenterline(
  centerline: CorridorPoint[],
  halfWidth: number,
  options?: { curved?: boolean; samplesPerSpan?: number }
): CorridorPoint[] | null {
  if (centerline.length < 2 || halfWidth <= 0) return null;

  if (centerline.length === 2 && !options?.curved) {
    return corridorQuadFromSegment(centerline[0], centerline[1], halfWidth);
  }

  const path =
    centerline.length >= 3 || options?.curved
      ? sampleCorridorCenterline(centerline, options?.samplesPerSpan ?? 10)
      : centerline;

  if (path.length < 2) return null;

  const left: CorridorPoint[] = [];
  const right: CorridorPoint[] = [];

  for (let i = 0; i < path.length; i++) {
    const prev = path[Math.max(0, i - 1)];
    const next = path[Math.min(path.length - 1, i + 1)];
    const tangent = normalize(next.x - prev.x, next.y - prev.y);
    const nx = -tangent.y * halfWidth;
    const ny = tangent.x * halfWidth;
    left.push({ x: path[i].x + nx, y: path[i].y + ny });
    right.push({ x: path[i].x - nx, y: path[i].y - ny });
  }

  return [...left, ...right.reverse()];
}

/** Anteprima corridoio: centerline fissata + cursore. */
export function previewCorridorPolygon(
  centerline: CorridorPoint[],
  cursor: CorridorPoint | null,
  halfWidth: number,
  curved: boolean
): CorridorPoint[] | null {
  if (centerline.length === 0 || !cursor) return null;
  const pts = [...centerline, cursor];
  if (pts.length < 2) return null;
  const curvedPath = curved || pts.length > 2;
  return corridorPolygonFromCenterline(pts, halfWidth, { curved: curvedPath });
}

export function finalizeCorridorPolygon(
  centerline: CorridorPoint[],
  halfWidth: number
): CorridorPoint[] | null {
  if (centerline.length < 2) return null;
  const curved = centerline.length > 2;
  return corridorPolygonFromCenterline(centerline, halfWidth, { curved });
}
