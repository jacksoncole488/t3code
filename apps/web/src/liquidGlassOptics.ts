export function liquidGlassGeometry(width: number, height: number, radius: number) {
  const corner = Math.min(radius, width / 2, height / 2);
  const bevel = Math.min(28, corner * 1.3, width / 2, height / 2);
  return {
    width,
    height,
    radius: corner,
    bevel,
    // Keep the sampling gradient below one so strokes cannot fold over themselves.
    strength: bevel * 0.48,
  };
}

export function liquidGlassDisplacement(
  x: number,
  y: number,
  geometry: ReturnType<typeof liquidGlassGeometry>,
) {
  const { width, height, radius, bevel, strength } = geometry;
  const px = x - width / 2;
  const py = y - height / 2;
  const qx = Math.abs(px) - (width / 2 - radius);
  const qy = Math.abs(py) - (height / 2 - radius);
  const outsideX = Math.max(qx, 0);
  const outsideY = Math.max(qy, 0);
  const outside = Math.hypot(outsideX, outsideY);
  const depth = radius - outside - Math.min(Math.max(qx, qy), 0);
  const t = Math.min(Math.max(depth / bevel, 0), 1);
  const amount = strength * (1 - t * t * (3 - 2 * t));
  const nx = outside > 0 ? outsideX / outside : qx > qy ? 1 : 0;
  const ny = outside > 0 ? outsideY / outside : qx > qy ? 0 : 1;
  return [-Math.sign(px) * nx * amount, -Math.sign(py) * ny * amount] as const;
}
