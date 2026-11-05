import { useEffect, useId, useRef } from "react";

import { useLiquidGlass } from "~/hooks/useLiquidGlass";
import { observeResize } from "~/lib/observeResize";
import { liquidGlassDisplacement, liquidGlassGeometry } from "~/liquidGlassOptics";

const lensMaps = new Map<string, string>();

function createLensMap(width: number, height: number, radius: number, density: number) {
  const key = `${width}:${height}:${radius}:${density}`;
  const cached = lensMaps.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * density);
  canvas.height = Math.ceil(height * density);
  const context = canvas.getContext("2d");
  if (!context) return "";

  const pixels = context.createImageData(canvas.width, canvas.height);
  const geometry = liquidGlassGeometry(width, height, radius);
  pixels.data.fill(128);
  for (let alpha = 3; alpha < pixels.data.length; alpha += 4) pixels.data[alpha] = 255;
  const inset = Math.ceil(Math.max(geometry.radius, geometry.bevel) * density);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      // Large windows have a neutral center; only the perimeter needs optical sampling.
      if (canvas.width > inset * 2 && y >= inset && y < canvas.height - inset && x === inset) {
        x = canvas.width - inset;
      }
      const [dx, dy] = liquidGlassDisplacement((x + 0.5) / density, (y + 0.5) / density, geometry);
      const offset = (y * canvas.width + x) * 4;
      pixels.data[offset] = Math.round(128 + (dx / geometry.strength) * 127);
      pixels.data[offset + 1] = Math.round(128 + (dy / geometry.strength) * 127);
    }
  }
  context.putImageData(pixels, 0, 0);
  const map = canvas.toDataURL();
  const oldest = lensMaps.keys().next().value;
  if (lensMaps.size >= 12 && oldest !== undefined) lensMaps.delete(oldest);
  lensMaps.set(key, map);
  return map;
}

/** Defines a backdrop lens for its parent; foreground text never enters the filter. */
export function LiquidGlassLens({ radius = 22, blur = 1 }: { radius?: number; blur?: number }) {
  const enabled = useLiquidGlass();
  const id = `liquid-lens-${useId().replaceAll(":", "")}`;
  const svgRef = useRef<SVGSVGElement>(null);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Synchronizes decoded SVG displacement maps with DOM surface geometry.
  useEffect(() => {
    const svg = svgRef.current;
    const surface = svg?.parentElement;
    if (!enabled || !surface || !svg) return;
    const filters = Array.from(svg.querySelectorAll("filter"));
    let lastSize = "";
    let revision = 0;
    let active = 1;
    let frame = 0;
    let disposed = false;
    let preparing = false;
    let requested: { width: number; height: number; density: number } | undefined;
    surface.style.setProperty("--liquid-glass-softness", `${blur}px`);

    const prepare = () => {
      if (disposed || preparing || !requested) return;
      const request = requested;
      const { width, height, density } = request;
      revision += 1;
      const currentRevision = revision;
      const map = createLensMap(width, height, radius, density);
      if (!map) return;
      preparing = true;
      const decoded = new Image();
      decoded.src = map;
      void decoded
        .decode()
        .then(() => {
          if (disposed) return;
          const next = 1 - active;
          const filter = filters[next];
          const image = filter?.querySelector("feImage");
          const displacement = filter?.querySelector("feDisplacementMap");
          if (!filter || !image || !displacement) return;
          filter.setAttribute("width", String(width));
          filter.setAttribute("height", String(height));
          image.setAttribute("width", String(width));
          image.setAttribute("height", String(height));
          image.setAttribute("href", map);
          displacement.setAttribute(
            "scale",
            String(liquidGlassGeometry(width, height, radius).strength * 2),
          );
          // Chromium caches filter rasters by id. Prepare the inactive bank before changing the reference.
          filter.id = `${id}-${currentRevision}`;
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => {
              if (disposed) return;
              surface.style.setProperty("--liquid-glass-refraction", `url("#${filter.id}")`);
              active = next;
              preparing = false;
              // Coalesce rapid resizes without cancelling the lens already being prepared.
              if (requested !== request) prepare();
            });
          });
        })
        .catch(() => {
          // Keep the previous lens (or the CSS material) if decoding is unavailable.
          preparing = false;
          if (requested !== request) prepare();
        });
    };
    const resize = () => {
      const width = surface.offsetWidth;
      const height = surface.offsetHeight;
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const size = `${width}:${height}:${density}`;
      if (!width || !height || size === lastSize) return;
      lastSize = size;
      requested = { width, height, density };
      prepare();
    };
    const stopObserving = observeResize(surface, resize);
    resize();
    return () => {
      disposed = true;
      stopObserving();
      cancelAnimationFrame(frame);
      surface.style.removeProperty("--liquid-glass-refraction");
      surface.style.removeProperty("--liquid-glass-softness");
    };
  }, [enabled, id, radius, blur]);

  if (!enabled) return null;
  return (
    <svg
      ref={svgRef}
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute size-0"
    >
      <defs>
        {[0, 1].map((bank) => (
          <filter
            key={bank}
            x="0"
            y="0"
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feImage x="0" y="0" preserveAspectRatio="none" result="encoded-lens" />
            <feComponentTransfer in="encoded-lens" result="lens">
              <feFuncR type="linear" slope="1" intercept={-0.5 / 255} />
              <feFuncG type="linear" slope="1" intercept={-0.5 / 255} />
            </feComponentTransfer>
            <feDisplacementMap
              in="SourceGraphic"
              in2="lens"
              xChannelSelector="R"
              yChannelSelector="G"
              result="refracted"
            />
            <feGaussianBlur in="refracted" stdDeviation={blur} />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
