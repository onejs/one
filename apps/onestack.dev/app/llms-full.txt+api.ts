import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { docsRoutes } from '~/features/docs/docsRoutes'
import { nativeRoutes } from '~/features/docs/nativeRoutes'

async function mdxFilesIn(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mdx'))
    .map((entry) => entry.name)
}

export async function GET() {
  try {
    // Get all MDX files from the docs and native directories
    const docsPath = join(process.cwd(), 'data/docs')
    const nativePath = join(process.cwd(), 'data/native')
    const mdxFiles = await mdxFilesIn(docsPath)
    const nativeMdxFiles = await mdxFilesIn(nativePath)

    let consolidatedContent = '# One Framework - Complete Documentation #\n\n'
    consolidatedContent +=
      'This is a consolidated version of all One framework documentation for LLM assistance.\n\n\n\n'

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
    const remainingFiles = mdxFiles.filter((file) => !orderedFiles.includes(file))
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

    // Native docs, ordered by nativeRoutes structure (/native index first)
    consolidatedContent += '# One Framework - Native Documentation #\n\n'

    const orderedNativeFiles: string[] = []

    for (const section of nativeRoutes) {
      if (section.pages) {
        for (const page of section.pages) {
          const filename =
            (page.route.replace('/native', '') || '/overview').replace('/', '') + '.mdx'
          if (nativeMdxFiles.includes(filename)) {
            orderedNativeFiles.push(filename)
          }
        }
      }
    }

    const remainingNativeFiles = nativeMdxFiles.filter(
      (file) => !orderedNativeFiles.includes(file)
    )
    orderedNativeFiles.push(...remainingNativeFiles.sort())

    for (const file of orderedNativeFiles) {
      const filePath = join(nativePath, file)
      const resolvedFilePath = resolve(filePath)
      if (!resolvedFilePath.startsWith(resolve(nativePath))) {
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
