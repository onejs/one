export type Frontmatter = {
  title?: string
  description?: string
  slug?: string
  headings?: Array<{ depth: number; text: string; slug: string }>
  readingTime?: { text: string; minutes: number; time: number; words: number }
  [key: string]: unknown
}

export type HastPropertyValue = string | number | boolean | null | Array<string | number>

export type HastMdxAttribute =
  | {
      type: 'mdxJsxAttribute'
      name: string
      value: string | null | { type: 'mdxJsxAttributeValueExpression'; value: string }
    }
  | { type: 'mdxJsxExpressionAttribute'; value: string }

export type HastNode =
  | { type: 'root'; children: HastNode[] }
  | {
      type: 'element'
      tagName: string
      properties?: Record<string, HastPropertyValue>
      children: HastNode[]
    }
  | { type: 'text'; value: string }
  | { type: 'comment'; value: string }
  | { type: 'doctype' }
  | { type: 'raw'; value: string }
  | {
      type: 'mdxJsxFlowElement' | 'mdxJsxTextElement'
      name: string | null
      attributes?: HastMdxAttribute[]
      children: HastNode[]
    }
  | {
      type: 'mdxFlowExpression' | 'mdxTextExpression' | 'mdxjsEsm'
      value: string
    }

export type HastRoot = Extract<HastNode, { type: 'root' }>

export type CompiledMDX = {
  frontmatter: Frontmatter
  hast: HastRoot
}
