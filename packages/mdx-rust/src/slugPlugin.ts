import GithubSlugger from 'github-slugger'
import { defineHastPlugin } from 'satteri'

function textOf(node: any): string {
  if (node.type === 'text') return node.value || ''
  if (node.children) return node.children.map(textOf).join('')
  return ''
}

// adds github-style id slugs to headings so table-of-contents anchors resolve.
// used as a factory so the slugger's dedupe counter resets per document.
export const slugPlugin = () => {
  const slugger = new GithubSlugger()
  return defineHastPlugin({
    name: 'vxrn-heading-slugs',
    element: {
      filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      visit(node: any, ctx: any) {
        if (node.properties?.id) return
        const id = slugger.slug(textOf(node))
        ctx.replaceNode(node, {
          ...node,
          properties: { ...node.properties, id },
        })
      },
    },
  })
}
