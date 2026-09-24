import type { LiveActivityState, PushTokenEvent, WidgetData } from './index.native'

export type { LiveActivityState, PushTokenEvent, WidgetData }

function unavailable(): never {
  throw new Error('Widgets and Live Activities require iOS')
}

export const Widgets = Object.freeze({
  write(_data: WidgetData): Promise<void> {
    return unavailable()
  },
})

export const LiveActivities = Object.freeze({
  start(_title: string, _state: LiveActivityState, _push = false): Promise<string> {
    return unavailable()
  },
  update(_id: string, _state: LiveActivityState): Promise<void> {
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
