import type { LiveActivityState, PushTokenEvent, WidgetData } from './index.native'
import type { ReactNode } from 'react'
import type { ActivityView } from './view'

export { WidgetUI, type WidgetStyle, type ActivityView } from './view'

export type { LiveActivityState, PushTokenEvent, WidgetData }

function unavailable(): never {
  throw new Error('Widgets and Live Activities require iOS')
}

export const Widgets = Object.freeze({
  write(_data: WidgetData): Promise<void> {
    return unavailable()
  },
  writeView(_view: ReactNode): Promise<void> {
    return unavailable()
  },
})

export const LiveActivities = Object.freeze({
  start(_title: string, _state: LiveActivityState, _push = false): Promise<string> {
    return unavailable()
  },
  startView(_title: string, _view: ActivityView, _push = false): Promise<string> {
    return unavailable()
  },
  update(_id: string, _state: LiveActivityState): Promise<void> {
    return unavailable()
  },
  updateView(_id: string, _view: ActivityView): Promise<void> {
    return unavailable()
  },
  end(_id: string): Promise<void> {
    return unavailable()
  },
  pushToken(_id: string): Promise<string | null> {
    return unavailable()
  },
  onPushToken(_listener: (event: PushTokenEvent) => void): () => void {
    return unavailable()
  },
})
