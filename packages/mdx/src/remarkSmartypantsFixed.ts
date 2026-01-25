import remarkSmartypants from 'remark-smartypants'

import type { Root, Code, InlineCode, Parent } from 'mdast'

// remark-smartypants incorrectly processes text inside code blocks and inline code
// this wrapper preserves code content and restores it after smartypants runs

type Options = Parameters<typeof remarkSmartypants>[0]

export function remarkSmartypantsFixed(options?: Options) {
  // @ts-expect-error unified plugin type complexities
  const smartypantsTransformer = remarkSmartypants(options) as (tree: Root) => void

  return (tree: Root) => {
    const codeBlocks = new Map<Code | InlineCode, string>()

    // save all code content before smartypants
    function collectCode(node: Root | Parent | Code | InlineCode) {
      if (node.type === 'code' || node.type === 'inlineCode') {
        codeBlocks.set(node as Code | InlineCode, (node as Code | InlineCode).value)
      }
      if ('children' in node && Array.isArray(node.children)) {
        for (const child of node.children) {
          collectCode(child as Parent | Code | InlineCode)
        }
      }
    }

    collectCode(tree)

    // run smartypants
    smartypantsTransformer(tree)

    // restore code content
    for (const [node, originalValue] of codeBlocks) {
      node.value = originalValue
    }
  }
}
