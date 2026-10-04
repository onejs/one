import { missingNativeBuild } from '../nativeError'
import type { LiveActivityState, PushTokenEvent, WidgetData } from './index.native'
import type { ReactNode } from 'react'
import type { ActivityView } from './view'

export { WidgetUI, type WidgetStyle, type ActivityView } from './view'

export type { LiveActivityState, PushTokenEvent, WidgetData }

export const Widgets = Object.freeze({
  write(_data: WidgetData): Promise<void> {
    return Promise.resolve()
  },
  writeView(_view: ReactNode): Promise<void> {
    return Promise.resolve()
  },
})

export const LiveActivities = Object.freeze({
  start(_title: string, _state: LiveActivityState, _push = false): Promise<string> {
    return Promise.reject(missingNativeBuild('LiveActivities.start'))
  },
  startView(_title: string, _view: ActivityView, _push = false): Promise<string> {
    return Promise.reject(missingNativeBuild('LiveActivities.startView'))
  },
  update(_id: string, _state: LiveActivityState): Promise<void> {
    return Promise.resolve()
  },
  updateView(_id: string, _view: ActivityView): Promise<void> {
    return Promise.resolve()
  },
  end(_id: string): Promise<void> {
    return Promise.resolve()
  },
  pushToken(_id: string): Promise<string | null> {
    return Promise.resolve(null)
  },
  onPushToken(_listener: (event: PushTokenEvent) => void): () => void {
    return () => {}
  },
})
