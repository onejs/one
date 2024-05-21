// TODO merge with the other one
export function getHtml({
  template,
  loaderData,
  loaderProps,
  appHtml,
  headHtml,
  css,
  preloads,
}: {
  css?: string
  template: string
  loaderData: Object
  loaderProps?: any
  appHtml: string
  headHtml: string
  preloads: string[]
}) {
  if (!template.includes(`<!--ssr-outlet-->`)) {
    throw new Error(`No <!--ssr-outlet--> found in html to inject SSR contents`)
  }
  if (!template.includes(`<!--head-outlet-->`)) {
    throw new Error(`No <!--head-outlet--> found in html to inject SSR contents`)
  }

  const loaderDataJS = `globalThis['__vxrnLoaderData__']=${JSON.stringify(loaderData)}`
  const loaderPropsJS = `globalThis['__vxrnLoaderProps__']=${JSON.stringify(loaderProps || null)}`
  const loaderDataString = `\n<script>
    ${loaderDataJS};
    ${loaderPropsJS};
  </script>`

  return template
    .replace(/\s*<!--ssr-outlet-->\s*/, appHtml)
    .replace(
      `<!--head-outlet-->`,
      [
        headHtml,
        `<style>${css}</style>\n`,
        ...preloads.map((src) => `<link rel="modulepreload" href="${src}" />`),
      ].join('\n  ')
    )
    .replace('</body>', loaderDataString)
}
