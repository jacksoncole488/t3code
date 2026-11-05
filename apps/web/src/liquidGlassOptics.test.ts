import { describe, expect, it } from "vite-plus/test";

import { liquidGlassDisplacement, liquidGlassGeometry } from "./liquidGlassOptics";

describe("Liquid Glass lens sampling", () => {
  it.each([
    [736, 114, 22],
    [146, 26, 9999],
    [242, 764, 20],
  ])("keeps background strokes in order through a %sx%s bevel", (width, height, radius) => {
    const geometry = liquidGlassGeometry(width, height, radius);
    let previous = -Infinity;
    for (let y = 0; y <= height; y += 0.25) {
      const [, offset] = liquidGlassDisplacement(width / 2, y, geometry);
      const source = y + offset;
      expect(source).toBeGreaterThan(previous);
      previous = source;
    }
  });

  it("leaves the center stationary and refracts opposite edges symmetrically", () => {
    const geometry = liquidGlassGeometry(736, 114, 22);
    expect(liquidGlassDisplacement(368, 57, geometry).map(Math.abs)).toEqual([0, 0]);
    const left = liquidGlassDisplacement(5, 57, geometry);
    const right = liquidGlassDisplacement(731, 57, geometry);
    expect(left[0]).toBeGreaterThan(0);
    expect(left[0]).toBeCloseTo(-right[0]);
    expect(Math.abs(left[1])).toBe(0);
  });
});
