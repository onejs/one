import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const action = { id: 'dev.vxrn.native.tests.quick-open', title: 'Open Quick Actions', subtitle: 'One proof action' }

export default function OneNativeQuickActions() {
  const [initial, setInitial] = useState('waiting')
  const [warm, setWarm] = useState<string[]>([])
  const [registered, setRegistered] = useState('waiting')
  const [invalid, setInvalid] = useState('waiting')
  const [error, setError] = useState('none')

  useEffect(() => {
    setInitial(One.QuickActions.getInitialAction() ?? 'null')
    return One.QuickActions.addListener((id) => setWarm((events) => [...events, id]))
  }, [])

  async function setItems() {
    try {
      await One.QuickActions.setItems([action])
      const items = await One.QuickActions.getItems()
      setRegistered(`${items.length}:${items[0]?.id}:${items[0]?.title}:${items[0]?.subtitle}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  async function clearItems() {
    try {
      await One.QuickActions.setItems([])
      setRegistered(`cleared:${(await One.QuickActions.getItems()).length}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  function clearInitial() {
    try {
      One.QuickActions.clearInitialAction()
      setInitial(One.QuickActions.getInitialAction() ?? 'null')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  function checkInvalid() {
    const cases: unknown[] = [
      'not an array',
      [{ ...action, title: ' ' }],
      [action, action],
      [{ ...action, subtitle: 5 }],
    ]
    const results = cases.map((items) => {
      try {
        One.QuickActions.setItems(items as typeof action[])
        return 'accepted'
      } catch (cause) {
        return cause instanceof TypeError ? 'rejected' : 'wrong-error'
      }
    })
    try {
      One.QuickActions.addListener(null as never)
      results.push('accepted')
    } catch (cause) {
      results.push(cause instanceof TypeError ? 'rejected' : 'wrong-error')
    }
    setInvalid(results.join(','))
  }

  return (
    <View style={styles.screen}>
      <Text>{`Initial: ${initial}`}</Text>
      <Text>{`Warm: ${warm.length}:${warm.join(',')}`}</Text>
      <Text>{`Registered: ${registered}`}</Text>
      <Text>{`Invalid: ${invalid}`}</Text>
      <Text>{`Error: ${error}`}</Text>
      <Pressable testID="one-native-quick-actions-set" style={styles.chip} onPress={setItems}>
        <Text>Set quick action</Text>
      </Pressable>
      <Pressable testID="one-native-quick-actions-clear" style={styles.chip} onPress={clearItems}>
        <Text>Clear quick actions</Text>
      </Pressable>
      <Pressable testID="one-native-quick-actions-clear-initial" style={styles.chip} onPress={clearInitial}>
        <Text>Clear initial action</Text>
      </Pressable>
      <Pressable testID="one-native-quick-actions-invalid" style={styles.chip} onPress={checkInvalid}>
        <Text>Check invalid arguments</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12, backgroundColor: '#fff' },
  chip: { padding: 9, borderRadius: 8, backgroundColor: '#e5e7eb', alignSelf: 'flex-start' },
})
