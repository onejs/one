export {
  initSync,
  default as init,
  markdown_to_html as markdownToHtml,
  mdx_to_hast as mdxToHastBuffer,
} from './wasm/satteri_runtime'
export type {
  InitInput,
  InitOutput,
  SyncInitInput,
} from './wasm/satteri_runtime'

export type HastNode = {
  type: string
  children?: HastNode[]
  [key: string]: unknown
}

export type HastRoot = HastNode & {
  type: 'root'
  children: HastNode[]
}

export function mdxToHast(source: string): HastRoot
