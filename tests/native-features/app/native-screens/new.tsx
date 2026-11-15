import { useRouter } from 'one'
import { EntryForm } from '../../fixtures/native-screens/views'
import { useNativeScreensStore } from '../../fixtures/native-screens/store'

export default function NewEntryScreen() {
  const router = useRouter()
  const { add } = useNativeScreensStore()
  return (
    <EntryForm
      style={{ flex: 1 }}
      onSubmit={(title, notes) => {
        add(title, notes)
        router.back()
      }}
      onCancel={() => router.back()}
    />
  )
}
