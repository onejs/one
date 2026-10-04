import { useRef } from 'react'
import { One } from 'one'
import { ScrollView, Text } from 'react-native'
import { Action, Results, assert, useResults } from './realapps-api-report'

const W = One.iOS.WidgetUI
function WidgetView({ step }: { step: number }) {
  return (
    <W.VStack style={{ padding: 12, spacing: 8 }}>
      <W.HStack>
        <W.Image systemName="shippingbox.fill" />
        <W.Text>Native API probe</W.Text>
      </W.HStack>
      <W.Text>{`Step ${step}`}</W.Text>
      <W.Progress value={step} total={3} />
      <W.Divider />
      <W.Link url="https://onestack.dev">
        <W.Text>Open probe</W.Text>
      </W.Link>
    </W.VStack>
  )
}
function activityView(step: number) {
  return {
    lockScreen: <WidgetView step={step} />,
    compactLeading: <W.Text>Probe</W.Text>,
    compactTrailing: <W.Text>{step}</W.Text>,
    minimal: <W.Text>{step}</W.Text>,
    expandedLeading: <W.Text>Native API probe</W.Text>,
    expandedTrailing: <W.Gauge value={step} total={3} />,
    expandedBottom: <WidgetView step={step} />,
  }
}

export default function Widgets() {
  const activity = useRef<string | null>(null)
  const jsxActivity = useRef<string | null>(null)
  const { results, run } = useResults([
    'One.Widgets',
    'One.iOS.WidgetUI',
    'One.LiveActivities',
  ])
  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
      <Results results={results} />
      <Action
        id="widgets-write"
        onPress={() =>
          void run(
            'One.Widgets',
            async () => {
              const data = {
                title: 'Native API probe',
                value: '42',
                subtitle: 'real app snapshot',
              }
              const result = await One.Widgets.write(data)
              return { data, result }
            },
            'observed',
            'runner must inspect installed widget extension; write completion cannot prove widget pixels'
          )
        }
      >
        Write widget data
      </Action>
      <Action
        id="widgets-jsx"
        onPress={() =>
          void run(
            'One.iOS.WidgetUI',
            async () => {
              const result = await One.Widgets.writeView(<WidgetView step={2} />)
              return { step: 2, result }
            },
            'observed',
            'JSX serialized into native widget; runner must inspect extension rendering'
          )
        }
      >
        Write JSX widget
      </Action>
      <Action
        id="activity-start"
        onPress={() =>
          void run(
            'One.LiveActivities',
            async () => {
              assert(
                activity.current === null,
                'End existing fixture activity before starting'
              )
              const id = await One.LiveActivities.start('Native API probe', {
                status: 'Preparing',
                value: '1 of 3',
              })
              assert(
                typeof id === 'string' && id.length > 0,
                'LiveActivities.start returned empty id'
              )
              activity.current = id
              return { id, phase: 'started' }
            },
            'observed',
            'parent inspects lock screen before update'
          )
        }
      >
        Start activity for capture
      </Action>
      <Action
        id="activity-update"
        onPress={() =>
          void run(
            'One.LiveActivities.update',
            async () => {
              assert(activity.current, 'Start fixture activity first')
              return {
                id: activity.current,
                result: await One.LiveActivities.update(activity.current, {
                  status: 'On the way',
                  value: '2 of 3',
                }),
              }
            },
            'observed',
            'parent inspects updated lock screen'
          )
        }
      >
        Update activity for capture
      </Action>
      <Action
        id="activity-end"
        onPress={() =>
          void run(
            'One.LiveActivities.end',
            async () => {
              assert(activity.current, 'Start fixture activity first')
              const id = activity.current
              const result = await One.LiveActivities.end(id)
              activity.current = null
              return { id, result }
            },
            'observed',
            'parent proves activity removal'
          )
        }
      >
        End captured activity
      </Action>
      <Action
        id="activity-jsx-start"
        onPress={() =>
          void run(
            'One.LiveActivities.jsx',
            async () => {
              assert(
                jsxActivity.current === null,
                'End existing JSX fixture activity before starting'
              )
              const id = await One.LiveActivities.startView(
                'Native API probe JSX',
                activityView(1)
              )
              assert(
                typeof id === 'string' && id.length > 0,
                'LiveActivities.startView returned empty id'
              )
              jsxActivity.current = id
              return { id, step: 1 }
            },
            'observed',
            'parent inspects WidgetUI rendered in extension'
          )
        }
      >
        Start JSX activity for capture
      </Action>
      <Action
        id="activity-jsx-update"
        onPress={() =>
          void run(
            'One.LiveActivities.jsx.update',
            async () => {
              assert(jsxActivity.current, 'Start JSX fixture activity first')
              return {
                id: jsxActivity.current,
                result: await One.LiveActivities.updateView(
                  jsxActivity.current,
                  activityView(2)
                ),
              }
            },
            'observed',
            'parent inspects JSX step two'
          )
        }
      >
        Update JSX activity for capture
      </Action>
      <Action
        id="activity-jsx-end"
        onPress={() =>
          void run(
            'One.LiveActivities.jsx.end',
            async () => {
              assert(jsxActivity.current, 'Start JSX fixture activity first')
              const id = jsxActivity.current
              const result = await One.LiveActivities.end(id)
              jsxActivity.current = null
              return { id, result }
            },
            'observed',
            'parent proves JSX activity removal'
          )
        }
      >
        End captured JSX activity
      </Action>
      <Action
        id="activity-cycle"
        onPress={() =>
          void run(
            'One.LiveActivities',
            async () => {
              const id = await One.LiveActivities.start('Native API probe', {
                status: 'Preparing',
                value: '1 of 3',
              })
              assert(
                typeof id === 'string' && id.length > 0,
                'LiveActivities.start returned empty id'
              )
              try {
                const update = await One.LiveActivities.update(id, {
                  status: 'On the way',
                  value: '2 of 3',
                })
                const end = await One.LiveActivities.end(id)
                return { id, update, end }
              } catch (error) {
                await One.LiveActivities.end(id)
                throw error
              }
            },
            'observed',
            'start/update/end exact results; runner needs lock-screen evidence for visible lifecycle'
          )
        }
      >
        Run activity lifecycle
      </Action>
      <Action
        id="activity-jsx-cycle"
        onPress={() =>
          void run(
            'One.LiveActivities.jsx',
            async () => {
              const id = await One.LiveActivities.startView(
                'Native API probe JSX',
                activityView(1)
              )
              assert(
                typeof id === 'string' && id.length > 0,
                'LiveActivities.startView returned empty id'
              )
              try {
                const update = await One.LiveActivities.updateView(
                  id,
                  activityView(2)
                )
                const end = await One.LiveActivities.end(id)
                return { id, update, end }
              } catch (error) {
                await One.LiveActivities.end(id)
                throw error
              }
            },
            'observed',
            'WidgetUI uses extension SwiftUI rendering, never React Native host tags'
          )
        }
      >
        Run JSX activity lifecycle
      </Action>
      <Text>
        Missing native widget configuration is reported as the exact API error. It never
        counts as unsupported or passed on iOS.
      </Text>
    </ScrollView>
  )
}
