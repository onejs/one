import { useState } from 'react'
import { One, router } from 'one'
import { Text } from 'react-native'
import { Action, Page, text, useShell } from '../../probe/shell'

export default function Home() {
  const { blocked, toggleBlocked } = useShell()
  const [count, setCount] = useState(0)
  const [value, setValue] = useState('Type here for the Input shortcut')
  return <Page title="One on Linux">
    <Text style={text}>GTK navigation, React Native content</Text>
    <Action title={`React Native presses ${count}`} onPress={() => setCount(count + 1)} />
    <One.linux.TextField text={value} onTextChange={setValue} style={{ width: 360 }} />
    <Action title="Push detail" onPress={() => router.push('/detail')} />
    <Action title="Open sidebar" onPress={() => router.push('/sidebar')} />
    <Action title={blocked ? 'Unblock Settings tab' : 'Block Settings tab'} onPress={toggleBlocked} />
    <Action title="Open native controls" onPress={() => router.push('/controls')} />
    <One.linux.Button title="Open second window" onPress={() => One.linux.Window.open()} />
  </Page>
}
