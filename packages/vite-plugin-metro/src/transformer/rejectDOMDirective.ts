import { parseSync } from 'oxc-parser'

/** reject a native DOM boundary before Metro can collect its browser imports. */
export function rejectDOMDirective(
  code: string,
  filename: string,
  platform?: string | null
) {
  if (
    (platform !== 'ios' && platform !== 'android') ||
    !code.includes('use dom') ||
    !/\.[cm]?[jt]sx?$/.test(filename)
  )
    return

  const parsed = parseSync(filename, code, {
    lang: /\.[cm]?tsx?$/.test(filename) ? (filename.endsWith('x') ? 'tsx' : 'ts') : 'jsx',
  })
  for (const node of parsed.program.body) {
    if (
      node.type !== 'ExpressionStatement' ||
      !('directive' in node) ||
      typeof node.directive !== 'string'
    )
      break
    if (node.directive === 'use dom') {
      throw new Error(
        `[one/use-dom] ${filename}: "use dom" requires native.bundler: "vite"; Metro is unsupported`
      )
    }
  }
}
