// replacing Vites since we control the root
export function DevHead({ ssrID }: { ssrID: string }) {
  if (process.env.NODE_ENV === 'development') {
    return (
      <>
        <link rel="preload" href={ssrID} as="style" />
        <link rel="stylesheet" href={ssrID} data-ssr-css />
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
    )
  }

  return null
}
