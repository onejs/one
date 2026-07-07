import type { SatteriExpressiveCodeOptions } from 'satteri-expressive-code'

// Expressive Code config for the site. two themes mapped to tamagui's theme
// classes (`@vxrn/color-scheme` toggles `t_dark`/`t_light` on <html>), so code
// blocks follow the site's light/dark toggle rather than only the OS setting.
export const expressiveCodeConfig: SatteriExpressiveCodeOptions = {
  themes: ['github-light', 'github-dark'],
  themeCssSelector: (theme) => `.t_${theme.type}`,
  useDarkModeMediaQuery: false,
  styleOverrides: {
    frames: {
      // softer, evenly-diffused shadow instead of the default hard offset one
      frameBoxShadowCssValue: '0 1px 4px rgba(0, 0, 0, 0.08)',
      // drop the colored accent line above the active filename tab
      editorActiveTabIndicatorTopColor: 'transparent',
    },
  },
}

// satteri mdast plugin: translate our `fileName=x` code-fence meta into
// Expressive Code's `title="x"` so filenames render as code-block frame titles.
// a plain object works as a satteri plugin definition (defineMdastPlugin is only
// an identity helper for types), so this file pulls in no native satteri code.
export const fileNameToTitle = {
  name: 'onestack-filename-to-title',
  code(node: any, ctx: any) {
    if (!node.meta || !node.meta.includes('fileName')) return
    const meta = node.meta.replace(
      /\bfileName=(?:"([^"]*)"|'([^']*)'|(\S+))/g,
      (_: string, a?: string, b?: string, c?: string) => `title="${a ?? b ?? c}"`
    )
    if (meta !== node.meta) ctx.replaceNode(node, { ...node, meta })
  },
}
