import { defineHastPlugin } from 'satteri'

// satteri (via pulldown-cmark) keeps the newline text nodes between table
// elements; they become stray children of the table/row nodes, which trips
// React's "whitespace text nodes cannot be a child of <table>" hydration
// warning and can spawn anonymous table cells. strip whitespace-only children
// from table structural elements, matching remark-rehype's clean output.
export const tableWhitespacePlugin = defineHastPlugin({
  name: 'vxrn-strip-table-whitespace',
  element: {
    filter: ['table', 'thead', 'tbody', 'tr'],
    visit(node: any, ctx: any) {
      const children = node.children || []
      const cleaned = children.filter(
        (c: any) =>
          !(c.type === 'text' && typeof c.value === 'string' && c.value.trim() === '')
      )
      if (cleaned.length !== children.length) {
        ctx.replaceNode(node, { ...node, children: cleaned })
      }
    },
  },
})
