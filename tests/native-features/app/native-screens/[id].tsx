import { useLocalSearchParams, useRouter } from 'one'
import { Platform } from 'react-native'
import { EntryDetail } from '../../fixtures/native-screens/views'
import { useNativeScreensStore } from '../../fixtures/native-screens/store'

export default function EntryDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { entries, update } = useNativeScreensStore()
  const entry = entries.find((item) => item.id === id)
  if (!entry) return null
  return (
    <EntryDetail
      style={{ flex: 1 }}
      entry={entry}
      onChange={update}
      {...(Platform.OS === 'android' ? { onBack: () => router.back() } : {})}
    />
  )
}
