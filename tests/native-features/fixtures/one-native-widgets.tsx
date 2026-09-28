import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const Widgets = One.iOS.Widgets
const LiveActivities = One.iOS.LiveActivities
const WidgetUI = One.iOS.WidgetUI

function errorCode(cause: unknown): string {
  if (typeof cause === 'object' && cause !== null && 'code' in cause &&
      typeof cause.code === 'string') return cause.code
  return cause instanceof Error ? cause.message : String(cause)
}

export default function OneNativeWidgets() {
  const [widget, setWidget] = useState('pending')
  const [activity, setActivity] = useState('pending')
  const [activityId, setActivityId] = useState<string>()
  const [error, setError] = useState('none')

  const run = async (action: () => Promise<void>) => {
    try {
      await action()
      setError('none')
    } catch (cause) {
      setError(errorCode(cause))
    }
  }

  const runWidget = async (name: string, action: () => Promise<void>) => {
    try {
      await action()
      setWidget(`${name} written`)
      setError('none')
    } catch (cause) {
      setWidget(`${name} rejected`)
      setError(errorCode(cause))
    }
  }

  return (
    <View style={styles.screen}>
      <Text>Widget: {widget}</Text>
      <Text>Activity: {activity}</Text>
      <Text>Error: {error}</Text>
      <Pressable testID="one-native-widgets-write" onPress={() => void runWidget('plain', async () => {
        await Widgets.write({ title: 'One widget', value: 'First', subtitle: 'Conformance' })
      })}><Text>Write widget</Text></Pressable>
      <Pressable testID="one-native-widgets-view" onPress={() => void runWidget('view', async () => {
        await Widgets.writeView(
          <WidgetUI.VStack>
            <WidgetUI.Text>One widget view</WidgetUI.Text>
            <WidgetUI.Text>Second</WidgetUI.Text>
          </WidgetUI.VStack>
        )
      })}><Text>Write widget view</Text></Pressable>
      <Pressable testID="one-native-activity-start" onPress={() => void run(async () => {
        const id = await LiveActivities.start('One trip', { status: 'Boarding', value: 'Gate 12' })
        setActivityId(id)
        setActivity(id ? 'started' : 'empty id')
      })}><Text>Start activity</Text></Pressable>
      <Pressable testID="one-native-activity-update" onPress={() => void run(async () => {
        if (!activityId) throw new Error('activity id missing')
        await LiveActivities.update(activityId, { status: 'Departed', value: 'On time' })
        setActivity('updated')
      })}><Text>Update activity</Text></Pressable>
      <Pressable testID="one-native-activity-end" onPress={() => void run(async () => {
        if (!activityId) throw new Error('activity id missing')
        await LiveActivities.end(activityId)
        setActivity('ended')
      })}><Text>End activity</Text></Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 16, backgroundColor: '#fff' },
})
