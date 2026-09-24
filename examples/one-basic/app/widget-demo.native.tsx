import { useState } from 'react'
import { Button, Text, View } from 'react-native'
import { One } from 'one'

const W = One.iOS.WidgetUI

function DeliveryView({ value }: { value: string }) {
  return (
    <W.VStack style={{ padding: 12, spacing: 4 }}>
      <W.Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
        One delivery
      </W.Text>
      <W.Text style={{ color: '#FFFFFF' }}>{value}</W.Text>
    </W.VStack>
  )
}

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
            await One.iOS.Widgets.writeView(
              <W.VStack style={{ padding: 12, spacing: 4 }}>
                <W.Text style={{ fontSize: 18, fontWeight: 'bold' }}>One JSX</W.Text>
                <W.Text>Value 84 from React</W.Text>
              </W.VStack>
            )
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
            const id = await One.iOS.LiveActivities.startView('One delivery', {
              lockScreen: <DeliveryView value="Preparing 1 of 3" />,
              compactLeading: <W.Text>One</W.Text>,
              compactTrailing: <W.Text>1/3</W.Text>,
              minimal: <W.Text>1</W.Text>,
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
            await One.iOS.LiveActivities.updateView(jsxActivityId!, {
              lockScreen: <DeliveryView value="On the way 2 of 3" />,
              compactLeading: <W.Text>One</W.Text>,
              compactTrailing: <W.Text>2/3</W.Text>,
              minimal: <W.Text>2</W.Text>,
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
            await One.iOS.LiveActivities.end(jsxActivityId!)
            setJsxActivityId(null)
            setMessage('Ended JSX activity')
          })
        }
      />
    </View>
  )
}
