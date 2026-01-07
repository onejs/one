import { startTransition } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

globalThis["__vxrnVersion"] ||= 0;

const listeners = new Set<Function>();
let didRender = false;

export function render(element: React.ReactNode) {
  if (typeof document === "undefined") return;

  if (globalThis["__vxrnRoot"]) {
    globalThis["__vxrnVersion"]++;
    globalThis["__vxrnRoot"].render(element);
  } else {
    startTransition(() => {
      const rootElement = process.env.ONE_USE_FASTER_DOCUMENT
        ? document.documentElement
        : (document as any);

      if (globalThis["__vxrnIsSPA"]) {
        const root = createRoot(rootElement);
        globalThis["__vxrnRoot"] = root;
        root.render(element);
      } else {
        globalThis["__vxrnRoot"] = hydrateRoot(rootElement, element, {
          onRecoverableError(...args) {
            console.groupCollapsed(
              `[one] Non-critical recoverable React error occurred, expand group to see details`,
            );
            console.error(...args);
            console.groupEnd();
          },
          onUncaughtError(...args) {
            console.error(`[one] onUncaughtError`, ...args);
          },
          onCaughtError(...args) {
            console.error(`[one] onCaughtError`, ...args);
          },
        });
      }
    });
  }

  listeners.forEach((cb) => {
    cb();
  });
  didRender = true;
}

export function afterClientRender(listener: Function) {
  if (didRender) {
    listener();
    return;
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
