import { useState } from 'react'
import { Button, Text, View } from 'react-native'
import { One } from 'one'
import {
  Voltra,
  updateWidget,
  startLiveActivity,
  updateLiveActivity,
  stopLiveActivity,
} from '@use-voltra/ios-client'

export default function WidgetDemo() {
  const [activityId, setActivityId] = useState<string | null>(null)
  const [jsxActivityId, setJsxActivityId] = useState<string | null>(null)
  const [message, setMessage] = useState('Ready')

  const run = async (action: () => Promise<void>) => {
    try {
      await action()
    } catch (error) {
      setMessage(String(error))
    }
  }

  return (
    <View style={{ flex: 1, padding: 30, gap: 16, justifyContent: 'center' }}>
      <Text>Widget and Live Activity proof</Text>
      <Text>{message}</Text>
      <Button
        title="Write widget"
        onPress={() =>
          run(async () => {
            await One.iOS.Widgets.write({
              title: 'One Basic',
              value: '42',
              subtitle: 'Written by the app',
            })
            setMessage('Widget data written: 42')
          })
        }
      />
      <Button
        title="Write JSX widget"
        onPress={() =>
          run(async () => {
            const view = (
              <Voltra.VStack style={{ padding: 16 }}>
                <Voltra.Text>One JSX</Voltra.Text>
                <Voltra.Text>Value 84 from React</Voltra.Text>
              </Voltra.VStack>
            )
            await updateWidget('one_basic_jsx', { systemSmall: view, systemMedium: view })
            setMessage('JSX widget data written: 84')
          })
        }
      />
      <Button
        title="Start activity"
        onPress={() =>
          run(async () => {
            const id = await One.iOS.LiveActivities.start('One delivery', {
              status: 'Preparing',
              value: '1 of 3',
            })
            setActivityId(id)
            setMessage(`Started ${id}`)
          })
        }
      />
      <Button
        title="Update activity"
        disabled={!activityId}
        onPress={() =>
          run(async () => {
            await One.iOS.LiveActivities.update(activityId!, {
              status: 'On the way',
              value: '2 of 3',
            })
            setMessage('Updated activity: 2 of 3')
          })
        }
      />
      <Button
        title="End activity"
        disabled={!activityId}
        onPress={() =>
          run(async () => {
            await One.iOS.LiveActivities.end(activityId!)
            setActivityId(null)
            setMessage('Ended activity')
          })
        }
      />
      <Button
        title="Start JSX activity"
        onPress={() =>
          run(async () => {
            const id = await startLiveActivity({
              lockScreen: <Voltra.Text>JSX activity preparing</Voltra.Text>,
              island: {
                compact: {
                  leading: <Voltra.Text>One</Voltra.Text>,
                  trailing: <Voltra.Text>1/3</Voltra.Text>,
                },
              },
            })
            setJsxActivityId(id)
            setMessage(`Started JSX activity ${id}`)
          })
        }
      />
      <Button
        title="Update JSX activity"
        disabled={!jsxActivityId}
        onPress={() =>
          run(async () => {
            await updateLiveActivity(jsxActivityId!, {
              lockScreen: <Voltra.Text>JSX activity on the way</Voltra.Text>,
              island: {
                compact: {
                  leading: <Voltra.Text>One</Voltra.Text>,
                  trailing: <Voltra.Text>2/3</Voltra.Text>,
                },
              },
            })
            setMessage('Updated JSX activity: 2 of 3')
          })
        }
      />
      <Button
        title="End JSX activity"
        disabled={!jsxActivityId}
        onPress={() =>
          run(async () => {
            await stopLiveActivity(jsxActivityId!)
            setJsxActivityId(null)
            setMessage('Ended JSX activity')
          })
        }
      />
    </View>
  )
}
