import { useLocalSearchParams } from 'one'
import { EntryDetail } from '../../fixtures/native-screens/views'
import { useNativeScreensStore } from '../../fixtures/native-screens/store'

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { entries, update } = useNativeScreensStore()
  const entry = entries.find((item) => item.id === id)
  if (!entry) return null
  return <EntryDetail style={{ flex: 1 }} entry={entry} onChange={update} />
}
