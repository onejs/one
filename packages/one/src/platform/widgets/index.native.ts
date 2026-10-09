import { NativeEventEmitter, NativeModules, Platform } from 'react-native'
import type { ReactNode } from 'react'
import { encodeActivityView, encodeWidgetView, type ActivityView } from './view'
import {
  Widgets as unavailableWidgets,
  LiveActivities as unavailableLiveActivities,
} from './unavailable'

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

const nativeWidgets = Object.freeze({
  write(data: WidgetData): Promise<void> {
    return bridge().writeWidget(data.title, data.value, data.subtitle)
  },
  writeView(view: ReactNode): Promise<void> {
    return bridge().writeView(encodeWidgetView(view))
  },
})

const nativeLiveActivities = Object.freeze({
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

function androidLimit(operation: string): Error {
  return new Error(`${operation} requires an iOS native build`)
}

const androidWidgets = Object.freeze({
  ...unavailableWidgets,
  write(_data: WidgetData): Promise<void> {
    return Promise.reject(androidLimit('Widgets.write'))
  },
  writeView(_view: ReactNode): Promise<void> {
    return Promise.reject(androidLimit('Widgets.writeView'))
  },
})

const androidLiveActivities = Object.freeze({
  ...unavailableLiveActivities,
  start(_title: string, _state: LiveActivityState, _push = false): Promise<string> {
    return Promise.reject(androidLimit('LiveActivities.start'))
  },
  startView(_title: string, _view: ActivityView, _push = false): Promise<string> {
    return Promise.reject(androidLimit('LiveActivities.startView'))
  },
  update(_id: string, _state: LiveActivityState): Promise<void> {
    return Promise.reject(androidLimit('LiveActivities.update'))
  },
  updateView(_id: string, _view: ActivityView): Promise<void> {
    return Promise.reject(androidLimit('LiveActivities.updateView'))
  },
  end(_id: string): Promise<void> {
    return Promise.reject(androidLimit('LiveActivities.end'))
  },
  onPushToken(_listener: (event: PushTokenEvent) => void): () => void {
    throw androidLimit('LiveActivities.onPushToken')
  },
})

// widgetkit and activitykit are iOS only; Android action methods report that limit.
export const Widgets: typeof nativeWidgets =
  Platform.OS === 'android' ? androidWidgets : nativeWidgets
export const LiveActivities: typeof nativeLiveActivities =
  Platform.OS === 'android' ? androidLiveActivities : nativeLiveActivities
