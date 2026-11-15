import { NitroModules } from 'react-native-nitro-modules'
import type { OneCalendar } from '../specs/OneCalendar.nitro'

let hybrid: OneCalendar | undefined

export function calendarNative(): OneCalendar {
  hybrid ??= NitroModules.createHybridObject<OneCalendar>('OneCalendar')
  return hybrid
}
