import { useId } from 'react'

// replacing Vites since we control the root
export function DevHead() {
  if (process.env.NODE_ENV === 'development') {
    const id = useId()
    return (
      <>
        <link rel="preload" href={id} as="style" />
        <link rel="stylesheet" href={id} data-ssr-css />
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
