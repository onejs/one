import { useEffect } from "react";
import { getURL } from "../getURL";
import { preloadRoute } from "../router/router";

export function PreloadLinks() {
  // only in prod because we don't generate them until build
  if (typeof window !== "undefined" && import.meta.env.PROD) {
    useEffect(() => {
      const url = getURL();
      const controller = new AbortController();

      document.addEventListener(
        "mouseover",
        (e) => {
          let target = e.target;
          if (!(target instanceof HTMLElement)) return;
          target = target instanceof HTMLAnchorElement ? target : target.closest("a");
          if (!(target instanceof HTMLAnchorElement)) return;
          const href = target.getAttribute("href");
          if (href?.[0] === "/" || href?.[0].startsWith(url)) {
            // local route
            preloadRoute(href.replace(url, ""));
          }
        },
        {
          passive: true,
          signal: controller.signal,
        },
      );

      return () => {
        controller.abort();
      };
    }, []);
  }

  return null;
}
