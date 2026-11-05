import { useEffect, useId, useRef } from "react";

import { useTheme } from "~/hooks/useTheme";
import { observeResize } from "~/lib/observeResize";
import { resolveThemeHalf } from "~/themePalette";

const lensMaps = new Map<string, string>();

function createLensMap(width: number, height: number, radius: number): string {
  const key = `${width}:${height}:${radius}`;
  const cached = lensMaps.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return "";

  const pixels = context.createImageData(width, height);
  const corner = Math.min(radius, width / 2, height / 2);
  const bevel = Math.min(28, width / 2, height / 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5 - width / 2;
      const py = y + 0.5 - height / 2;
      const qx = Math.abs(px) - (width / 2 - corner);
      const qy = Math.abs(py) - (height / 2 - corner);
      const outsideX = Math.max(qx, 0);
      const outsideY = Math.max(qy, 0);
      const outside = Math.hypot(outsideX, outsideY);
      const depth = corner - outside - Math.min(Math.max(qx, qy), 0);
      const slope = Math.pow(1 - Math.min(Math.max(depth / bevel, 0), 1), 2);
      const nx = outside > 0 ? outsideX / outside : qx > qy ? 1 : 0;
      const ny = outside > 0 ? outsideY / outside : qx > qy ? 0 : 1;
      const offset = (y * width + x) * 4;
      // A rounded-rectangle normal pulls the live backdrop inward along the bevel.
      pixels.data[offset] = Math.round(127.5 - Math.sign(px) * nx * slope * 127.5);
      pixels.data[offset + 1] = Math.round(127.5 - Math.sign(py) * ny * slope * 127.5);
      pixels.data[offset + 2] = Math.round(255 * Math.min(Math.max(depth / bevel, 0), 1));
      pixels.data[offset + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const map = canvas.toDataURL();
  const oldest = lensMaps.keys().next().value;
  if (lensMaps.size >= 4 && oldest !== undefined) lensMaps.delete(oldest);
  lensMaps.set(key, map);
  return map;
}

/** Defines a backdrop lens for its parent; foreground text never enters the filter. */
export function LiquidGlassLens({ radius = 22 }: { radius?: number }) {
  const { theme, resolvedTheme, themeHalves } = useTheme();
  const enabled = resolveThemeHalf(theme, themeHalves, resolvedTheme) === "liquid-glass";
  const id = `liquid-lens-${useId().replaceAll(":", "")}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const filterRef = useRef<SVGFilterElement>(null);
  const imageRef = useRef<SVGFEImageElement>(null);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Synchronizes the SVG displacement map with the actual DOM surface geometry.
  useEffect(() => {
    const surface = svgRef.current?.parentElement;
    const image = imageRef.current;
    const filter = filterRef.current;
    if (!enabled || !surface || !image || !filter) return;
    let lastSize = "";
    const resize = () => {
      const width = surface.offsetWidth;
      const height = surface.offsetHeight;
      const size = `${width}:${height}`;
      if (width === 0 || height === 0 || size === lastSize) return;
      lastSize = size;
      const map = createLensMap(width, height, radius);
      if (!map) return;
      filter.setAttribute("width", String(width));
      filter.setAttribute("height", String(height));
      image.setAttribute("width", String(width));
      image.setAttribute("height", String(height));
      image.setAttribute("href", map);
      // Chromium caches backdrop filters by id; resize must invalidate the old raster.
      filter.id = `${id}-${width}-${height}`;
      surface.style.setProperty("--liquid-glass-refraction", `url("#${filter.id}")`);
    };
    const stopObserving = observeResize(surface, resize);
    resize();
    return () => {
      stopObserving();
      surface.style.removeProperty("--liquid-glass-refraction");
    };
  }, [enabled, id, radius]);

  if (!enabled) return null;
  return (
    <svg
      ref={svgRef}
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute"
    >
      <defs>
        <filter
          ref={filterRef}
          id={id}
          x="0"
          y="0"
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feImage ref={imageRef} x="0" y="0" preserveAspectRatio="none" result="lens" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="softened" />
          <feColorMatrix
            in="lens"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0"
            result="core-mask"
          />
          <feComposite in="softened" in2="core-mask" operator="in" result="core" />
          <feComposite in="SourceGraphic" in2="core-mask" operator="out" result="edge" />
          <feComposite in="core" in2="edge" operator="arithmetic" k2="1" k3="1" result="material" />
          <feDisplacementMap
            in="material"
            in2="lens"
            scale="48"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
