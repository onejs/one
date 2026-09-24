import { useState } from 'react'
import { Button, Text, View } from 'react-native'
import { One } from 'one'

const W = One.iOS.WidgetUI

function DeliveryView({ value, step }: { value: string; step: number }) {
  return (
    <W.VStack style={{ padding: 12, spacing: 8 }}>
      <W.HStack style={{ spacing: 8 }}>
        <W.Image
          systemName="shippingbox.fill"
          style={{ color: '#55C5E9', fontSize: 20 }}
        />
        <W.Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
          One delivery
        </W.Text>
      </W.HStack>
      <W.Text style={{ color: '#FFFFFF' }}>{value}</W.Text>
      <W.Progress value={step} total={3} style={{ color: '#55C5E9' }} />
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
              <W.VStack style={{ padding: 12, spacing: 8 }}>
                <W.HStack style={{ spacing: 8 }}>
                  <W.Image
                    systemName="shippingbox.fill"
                    style={{ color: '#1685B1', fontSize: 20 }}
                  />
                  <W.Text style={{ fontSize: 18, fontWeight: 'bold' }}>One JSX</W.Text>
                </W.HStack>
                <W.Text>Value 84 from React</W.Text>
                <W.Progress value={2} total={3} style={{ color: '#1685B1' }} />
                <W.Divider />
                <W.Link url="https://onestack.dev">
                  <W.Text style={{ color: '#1685B1', fontSize: 12 }}>
                    Learn about One
                  </W.Text>
                </W.Link>
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
              lockScreen: <DeliveryView value="Preparing 1 of 3" step={1} />,
              compactLeading: <W.Text>One</W.Text>,
              compactTrailing: <W.Text>1/3</W.Text>,
              minimal: <W.Text>1</W.Text>,
              expandedLeading: <W.Text>One delivery</W.Text>,
              expandedTrailing: <W.Gauge value={1} total={3} />,
              expandedBottom: <DeliveryView value="Preparing 1 of 3" step={1} />,
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
              lockScreen: <DeliveryView value="On the way 2 of 3" step={2} />,
              compactLeading: <W.Text>One</W.Text>,
              compactTrailing: <W.Text>2/3</W.Text>,
              minimal: <W.Text>2</W.Text>,
              expandedLeading: <W.Text>One delivery</W.Text>,
              expandedTrailing: <W.Gauge value={2} total={3} />,
              expandedBottom: <DeliveryView value="On the way 2 of 3" step={2} />,
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
