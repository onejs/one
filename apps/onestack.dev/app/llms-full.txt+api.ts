import { docsRoutes } from '~/features/docs/docsRoutes'
import { nativeRoutes } from '~/features/docs/nativeRoutes'

// bundled at build time so the route reads no filesystem at runtime (workers have none)
const docsSources = byFileName(
  import.meta.glob<string>('../data/docs/*.mdx', {
    query: '?raw',
    import: 'default',
    eager: true,
  })
)
const nativeSources = byFileName(
  import.meta.glob<string>('../data/native/*.mdx', {
    query: '?raw',
    import: 'default',
    eager: true,
  })
)

function byFileName(sources: Record<string, string>) {
  return new Map(
    Object.entries(sources).map(([path, source]) => [path.split('/').pop()!, source])
  )
}

export async function GET() {
  try {
    const mdxFiles = [...docsSources.keys()]
    const nativeMdxFiles = [...nativeSources.keys()]

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
      consolidatedContent += docsSources.get(file)
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
      consolidatedContent += nativeSources.get(file)
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
