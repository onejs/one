import { useRouter } from 'one'
import { SortSheet } from '../../fixtures/native-screens/views'
import { useNativeScreensStore } from '../../fixtures/native-screens/store'

export default function SortScreen() {
  const router = useRouter()
  const { order, setOrder } = useNativeScreensStore()
  return <SortSheet style={{ flex: 1 }} order={order} onSelect={setOrder} onClose={() => router.back()} />
}
