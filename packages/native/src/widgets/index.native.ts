import { NativeEventEmitter, NativeModules } from 'react-native'

export type WidgetData = { title: string; value: string; subtitle: string }
export type LiveActivityState = { status: string; value: string }
export type PushTokenEvent = { id: string; token: string }

interface WidgetsBridge {
  writeWidget(title: string, value: string, subtitle: string): Promise<void>
  start(title: string, status: string, value: string, push: boolean): Promise<string>
  update(id: string, status: string, value: string): Promise<void>
  end(id: string): Promise<void>
  pushToken(id: string): Promise<string | null>
  addListener(event: string): void
  removeListeners(count: number): void
}

function bridge(): WidgetsBridge {
  const native = NativeModules.OneWidgetsBridge as WidgetsBridge | undefined
  if (!native)
    throw new Error('iOS widgets require native.app.ios.widgets and a new iOS build')
  return native
}

export const Widgets = Object.freeze({
  write(data: WidgetData): Promise<void> {
    return bridge().writeWidget(data.title, data.value, data.subtitle)
  },
})

export const LiveActivities = Object.freeze({
  start(title: string, state: LiveActivityState, push = false): Promise<string> {
    return bridge().start(title, state.status, state.value, push)
  },
  update(id: string, state: LiveActivityState): Promise<void> {
    return bridge().update(id, state.status, state.value)
  },
  end(id: string): Promise<void> {
    return bridge().end(id)
  },
  pushToken(id: string): Promise<string | null> {
    return bridge().pushToken(id)
  },
  onPushToken(listener: (event: PushTokenEvent) => void): () => void {
    const subscription = new NativeEventEmitter(bridge()).addListener(
      'oneLiveActivityPushToken',
      listener
    )
    return () => subscription.remove()
  },
})
