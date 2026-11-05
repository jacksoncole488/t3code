import { useLayoutEffect, useRef } from "react";

import { useLiquidGlass } from "~/hooks/useLiquidGlass";
import { observeResize } from "~/lib/observeResize";
import { LiquidGlassLens } from "./LiquidGlassLens";

/** One persistent lens follows the selected control, including recycled list rows. */
export function LiquidGlassSelection({ selector }: { selector: string }) {
  const enabled = useLiquidGlass();
  const indicatorRef = useRef<HTMLDivElement>(null);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Tracks selection and virtualized DOM geometry without rerendering the list during motion or scrolling.
  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    const container = indicator?.parentElement;
    if (!enabled || !indicator || !container) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let selected: HTMLElement | null = null;
    let selectedKey: string | null = null;
    let frame = 0;
    let animation: Animation | undefined;
    let stopSelectedResize = () => {};

    const measure = () => {
      const target = container.querySelector<HTMLElement>(selector);
      if (!target || target.offsetWidth === 0 || target.offsetHeight === 0) {
        indicator.hidden = true;
        animation?.cancel();
        selected = null;
        return;
      }
      const key =
        target.dataset.glassKey ??
        target.getAttribute("value") ??
        target.getAttribute("aria-label");
      const changed = selected !== target || selectedKey !== key;
      const base = container.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const x = rect.left - base.left + container.scrollLeft;
      const y = rect.top - base.top + container.scrollTop;
      const rest = `translate(${x}px, ${y}px)`;
      const previous = indicator.hidden ? null : indicator.getBoundingClientRect();
      if (selected !== target) {
        stopSelectedResize();
        stopSelectedResize = observeResize(target, schedule);
      }
      selected = target;
      selectedKey = key;
      if (
        !changed &&
        animation?.playState === "running" &&
        !reducedMotion.matches &&
        indicator.style.transform === rest
      )
        return;
      animation?.cancel();
      indicator.hidden = false;
      indicator.style.width = `${rect.width}px`;
      indicator.style.height = `${rect.height}px`;
      indicator.style.transform = rest;
      delete indicator.dataset.moving;
      if (!changed || !previous || reducedMotion.matches) return;

      const oldX = previous.left - base.left + container.scrollLeft;
      const oldY = previous.top - base.top + container.scrollTop;
      const dx = x - oldX;
      const dy = y - oldY;
      const stretchX = 1 + Math.min(0.22, Math.abs(dx) / 300);
      const stretchY = 1 + Math.min(0.32, Math.abs(dy) / 200);
      indicator.dataset.moving = "true";
      animation = indicator.animate(
        [
          {
            transform: `translate(${oldX}px, ${oldY}px) scale(${previous.width / rect.width}, ${previous.height / rect.height})`,
            offset: 0,
          },
          {
            transform: `translate(${oldX + dx * 0.7}px, ${oldY + dy * 0.7}px) scale(${stretchX}, ${stretchY})`,
            offset: 0.42,
          },
          {
            transform: `translate(${x + dx * 0.025}px, ${y + dy * 0.025}px) scale(1.035, 1.025)`,
            offset: 0.72,
          },
          { transform: rest, offset: 1 },
        ],
        { duration: 440, easing: "cubic-bezier(0.2, 0.75, 0.25, 1)" },
      );
      animation.onfinish = () => {
        delete indicator.dataset.moving;
        animation = undefined;
        schedule();
      };
    };
    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    }
    const mutations = new MutationObserver(schedule);
    mutations.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-pressed", "data-pressed", "data-model-selected", "data-glass-key"],
    });
    const stopResize = observeResize(container, schedule);
    container.addEventListener("scroll", schedule, true);
    reducedMotion.addEventListener("change", schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      animation?.cancel();
      mutations.disconnect();
      stopResize();
      stopSelectedResize();
      container.removeEventListener("scroll", schedule, true);
      reducedMotion.removeEventListener("change", schedule);
    };
  }, [enabled, selector]);

  return enabled ? (
    <div ref={indicatorRef} data-liquid-selection="true" aria-hidden="true" hidden>
      <div data-liquid-selection-material="true">
        <LiquidGlassLens radius={9999} blur={0.35} />
      </div>
    </div>
  ) : null;
}
