import { View, Text } from 'react-native'
import { useLoader, route, watchFile } from 'one'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const loader = route.createLoader(async () => {
  const contentPath = join(process.cwd(), 'data/content.json')
  watchFile(contentPath) // Register file for hot reload
  const content = JSON.parse(readFileSync(contentPath, 'utf-8'))
  return { content }
})

export const ssr = true

export default function LoaderTestPage() {
  const { content } = useLoader(loader)

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text testID="loader-title">{content.title}</Text>
      <Text testID="loader-count">Count: {content.count}</Text>
    </View>
  )
}
