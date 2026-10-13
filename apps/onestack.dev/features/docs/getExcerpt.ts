import fs from 'node:fs'
import path from 'node:path'

// first prose paragraph of an mdx file as plain text, for meta description
// on pages whose frontmatter has no description
export function getExcerpt(basePath: string, slug: string, maxLength = 160) {
  const source = fs.readFileSync(path.join(basePath, `${slug}.mdx`), 'utf8')
  const body = source.replace(/^---\n[\s\S]*?\n---\n/, '')

  const paragraph = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find(
      (block) => block && !/^(#|<|```|\||[-*>] |\d+\. |import |export |\{)/.test(block)
    )

  if (!paragraph) return

  // inline code keeps its text, html/jsx outside of it is dropped
  const text = paragraph
    .split(/(`[^`]*`)/)
    .map((part) =>
      part.startsWith('`')
        ? part.slice(1, -1)
        : part
            .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .replace(/<[^>]+>/g, '')
            .replace(/[*_]/g, '')
    )
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    // paragraphs that introduce a code block end in a colon
    .replace(/:$/, '.')

  if (text.length <= maxLength) return text
  return `${text.slice(0, text.lastIndexOf(' ', maxLength - 1))}…`
}
