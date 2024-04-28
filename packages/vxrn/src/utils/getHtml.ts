// TODO merge with the other one
export function getHtml({
  template,
  loaderData,
  appHtml,
  headHtml,
  css,
}: { css?: string; template: string; loaderData: Object; appHtml: string; headHtml: string }) {
  if (!template.includes(`<!--ssr-outlet-->`)) {
    throw new Error(`No <!--ssr-outlet--> found in html to inject SSR contents`)
  }
  if (!template.includes(`<!--head-outlet-->`)) {
    throw new Error(`No <!--head-outlet--> found in html to inject SSR contents`)
  }

  const loaderDataString = `\n<script>globalThis['__vxrnLoaderData__']=${JSON.stringify(
    loaderData
  )}</script>`

  return template
    .replace(/\s*<!--ssr-outlet-->\s*/, appHtml)
    .replace(`<!--head-outlet-->`, `${headHtml}\n${css ? `<style>${css}</style>\n` : ``}`)
    .replace('</body>', loaderDataString)
}
