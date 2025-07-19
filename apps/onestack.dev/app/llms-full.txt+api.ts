import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { glob } from 'glob'
import { docsRoutes } from '~/features/docs/docsRoutes'

export async function GET() {
  try {
    // Get all MDX files from the docs directory
    const docsPath = join(process.cwd(), 'data/docs')
    const mdxFiles = await glob('*.mdx', { cwd: docsPath })

    let consolidatedContent = '# One Framework - Complete Documentation #\n\n'
    consolidatedContent += 'This is a consolidated version of all One framework documentation for LLM assistance.\n\n\n\n'

    // Create ordered list based on docsRoutes structure
    const orderedFiles: string[] = []

    for (const section of docsRoutes) {
      if (section.pages) {
        for (const page of section.pages) {
          const filename = page.route.replace('/docs/', '') + '.mdx'
          if (mdxFiles.includes(filename)) {
            orderedFiles.push(filename)
          }
        }
      }
    }

    // Add any remaining files not in docsRoutes
    const remainingFiles = mdxFiles.filter(file => !orderedFiles.includes(file))
    orderedFiles.push(...remainingFiles.sort())

    for (const file of orderedFiles) {
      const filePath = join(docsPath, file)
      const resolvedFilePath = resolve(filePath)
      if (!resolvedFilePath.startsWith(resolve(docsPath))) {
        throw new Error(`Path traversal detected: ${filePath}`)
      }
      const content = await readFile(resolvedFilePath, 'utf-8')
      consolidatedContent += content
      consolidatedContent += '\n\n\n\n'
    }

    return new Response(consolidatedContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error generating consolidated docs:', error)
    return new Response('Error generating documentation', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
}
