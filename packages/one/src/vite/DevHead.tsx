import { VIRTUAL_SSR_CSS_HREF } from "../constants";

// replacing Vites since we control the root
export function DevHead() {
  if (process.env.TAMAGUI_TARGET === "native") {
    return null;
  }
  if (process.env.NODE_ENV === "development") {
    return (
      <>
        <link rel="preload" href={VIRTUAL_SSR_CSS_HREF} as="style" />
        <link rel="stylesheet" href={VIRTUAL_SSR_CSS_HREF} data-ssr-css />
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `import { createHotContext } from "/@vite/client";
  const hot = createHotContext("/__clear_ssr_css");
  hot.on("vite:afterUpdate", () => {
    document
      .querySelectorAll("[data-ssr-css]")
      .forEach(node => node.remove());
  });`,
          }}
        />
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `import { injectIntoGlobalHook } from "/@react-refresh";
  injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => (type) => type;`,
          }}
        />
      </>
    );
  }

  return null;
}
