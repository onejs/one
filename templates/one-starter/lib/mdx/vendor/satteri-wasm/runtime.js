import { compileMdxToHast } from './materialize.js'
import {
  initSync,
  default as init,
  markdown_to_html as markdownToHtml,
  mdx_to_hast as mdxToHastBuffer,
} from './wasm/satteri_runtime.js'

export { init, initSync, markdownToHtml, mdxToHastBuffer }

export function mdxToHast(source) {
  return compileMdxToHast(source, mdxToHastBuffer)
}
