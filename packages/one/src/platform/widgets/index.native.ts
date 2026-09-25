import { NativeEventEmitter, NativeModules } from 'react-native'
import type { ReactNode } from 'react'
import { encodeActivityView, encodeWidgetView, type ActivityView } from './view'

export { WidgetUI, type WidgetStyle, type ActivityView } from './view'

export type WidgetData = { title: string; value: string; subtitle: string }
export type LiveActivityState = { status: string; value: string }
export type PushTokenEvent = { id: string; token: string }

interface WidgetsBridge {
  writeWidget(title: string, value: string, subtitle: string): Promise<void>
  writeView(layout: string): Promise<void>
  start(title: string, status: string, value: string, push: boolean): Promise<string>
  startView(title: string, layout: string, push: boolean): Promise<string>
  update(id: string, status: string, value: string): Promise<void>
  updateView(id: string, layout: string): Promise<void>
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
  writeView(view: ReactNode): Promise<void> {
    return bridge().writeView(encodeWidgetView(view))
  },
})

export const LiveActivities = Object.freeze({
  start(title: string, state: LiveActivityState, push = false): Promise<string> {
    return bridge().start(title, state.status, state.value, push)
  },
  startView(title: string, view: ActivityView, push = false): Promise<string> {
    return bridge().startView(title, encodeActivityView(view), push)
  },
  update(id: string, state: LiveActivityState): Promise<void> {
    return bridge().update(id, state.status, state.value)
  },
  updateView(id: string, view: ActivityView): Promise<void> {
    return bridge().updateView(id, encodeActivityView(view))
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
