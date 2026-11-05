import { useLayoutEffect, useRef } from "react";

import { useLiquidGlass } from "~/hooks/useLiquidGlass";
import { observeResize } from "~/lib/observeResize";

export function LiquidGlassSidebarLayout() {
  const enabled = useLiquidGlass();
  const anchorRef = useRef<HTMLSpanElement>(null);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Measures overlay chrome so scroll content and keyboard reveal clear its actual height.
  useLayoutEffect(() => {
    const sidebar = anchorRef.current?.parentElement;
    if (!enabled || !sidebar) return;
    const header = sidebar.querySelector<HTMLElement>("[data-sidebar-chrome-header]");
    const search = sidebar.querySelector<HTMLElement>('[data-slot="sidebar-fixed-header"]');
    const footer = sidebar.querySelector<HTMLElement>('[data-slot="sidebar-footer"]');
    if (!header || !search || !footer) return;
    const measure = () => {
      sidebar.style.setProperty(
        "--liquid-sidebar-top",
        `${header.offsetHeight + search.offsetHeight}px`,
      );
      sidebar.style.setProperty("--liquid-sidebar-bottom", `${footer.offsetHeight + 14}px`);
    };
    const stop = observeResize([header, search, footer], measure);
    measure();
    return () => {
      stop();
      sidebar.style.removeProperty("--liquid-sidebar-top");
      sidebar.style.removeProperty("--liquid-sidebar-bottom");
    };
  }, [enabled]);

  return enabled ? <span ref={anchorRef} hidden aria-hidden="true" /> : null;
}
