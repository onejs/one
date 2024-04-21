export function getHtml({
  template,
  props,
  appHtml,
  headHtml,
  css,
}: { css?: string; template: string; props: Object; appHtml: string; headHtml: string }) {
  const propsHtml = `\n<script>globalThis['__vxrnProps']=${JSON.stringify(props)}</script>`
  return template
    .replace(`<!--ssr-outlet-->`, appHtml + propsHtml)
    .replace(`<!--head-outlet-->`, `${headHtml}\n${css ? `<style>${css}</style>` : ``}`)
}
