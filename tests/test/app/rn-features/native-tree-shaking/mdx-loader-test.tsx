/**
 * Test route to verify that @vxrn/mdx is tree-shaken from native bundles.
 *
 * This route uses @vxrn/mdx in its loader via dynamic import.
 * The clientTreeShakePlugin should:
 * 1. Remove the loader function from the client/native bundle
 * 2. Dead-code elimination should remove the dynamic import of @vxrn/mdx
 *
 * If working correctly, the native bundle should NOT contain:
 * - 'mdx-bundler' (dependency of @vxrn/mdx)
 * - 'getAllFrontmatter' (function from @vxrn/mdx)
 * - '@vxrn/mdx' package code
 */

import { Text, View } from 'react-native'
import { useLoader } from 'one'

// This loader uses @vxrn/mdx via dynamic import
// The clientTreeShakePlugin should remove this loader
export async function loader() {
  const { getAllFrontmatter } = await import('@vxrn/mdx')
  const frontmatters = getAllFrontmatter('data')
  return {
    count: frontmatters.length,
    // Add a marker to verify the loader is being called on server
    serverMarker: 'LOADER_WAS_EXECUTED_ON_SERVER',
  }
}

export default function MdxLoaderTestPage() {
  const data = useLoader(loader)

  return (
    <View
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}
    >
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
        MDX Loader Tree-Shaking Test
      </Text>
      <Text>Frontmatter count: {data?.count ?? 'N/A'}</Text>
      <Text>Server marker: {data?.serverMarker ?? 'LOADER_NOT_CALLED'}</Text>
    </View>
  )
}
