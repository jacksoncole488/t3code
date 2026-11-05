import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let observer: MutationObserver | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!observer) {
    observer = new MutationObserver(() => {
      for (const notify of listeners) notify();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme-id"],
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}

function getSnapshot() {
  return (
    typeof document !== "undefined" && document.documentElement.dataset.themeId === "liquid-glass"
  );
}

// Primitive UI cannot import the theme store: its server-state dependencies also import menus.
export function useLiquidGlass() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
