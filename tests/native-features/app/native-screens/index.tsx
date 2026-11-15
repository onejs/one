import { useRouter } from 'one'
import { EntryList } from '../../fixtures/native-screens/views'
import { useNativeScreensStore } from '../../fixtures/native-screens/store'

export default function EntryListScreen() {
  const router = useRouter()
  const { entries } = useNativeScreensStore()
  return (
    <EntryList
      style={{ flex: 1 }}
      entries={entries}
      onSelect={(id) => router.push(`/native-screens/${id}`)}
      onAdd={() => router.push('/native-screens/new')}
      onSort={() => router.push('/native-screens/sort')}
    />
  )
}
