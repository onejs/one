import { PropsWithChildren, memo } from 'react'
import { isWeb } from 'utilities/src/platform'
// eslint-disable-next-line no-restricted-imports
import { ITraceContext } from 'utilities/src/telemetry/trace/TraceContext'

export function getEventsFromProps(
  logPress?: boolean,
  logFocus?: boolean,
  logKeyPress?: boolean
): string[] {
  const events = []
  if (logPress) {
    events.push(isWeb ? 'onClick' : 'onPress')
  }
  // if (logFocus) {
  //   events.push(BrowserEvent.onFocus)
  // }
  // if (logKeyPress) {
  //   events.push(BrowserEvent.onKeyPress)
  // }
  return events
}

export type TraceProps = {
  // whether to log impression on mount
  logImpression?: boolean

  // whether to log a press on a click within the area
  logPress?: boolean

  // whether to log a focus on this element
  logFocus?: boolean

  // whether to log a key press
  logKeyPress?: boolean

  // event to log if logging an event other than the default for press
  eventOnTrigger?: string

  // verifies an impression has come from that page directly to override the direct only skip list
  directFromPage?: boolean

  // additional properties to log with impression
  // (eg. TokenDetails Impression: { tokenAddress: 'address', tokenName: 'name' })
  properties?: Record<string, unknown>
}

// only used for avoiding double logging in development
const devDoubleLogDisableMap: Record<string, boolean> = {}

function _Trace({
  children,
  logImpression,
  eventOnTrigger,
  logPress,
  logFocus,
  logKeyPress,
  directFromPage,
  screen,
  page,
  section,
  element,
  modal,
  properties,
}: PropsWithChildren<TraceProps & ITraceContext>): JSX.Element {
  return <></>
}

export const Trace = memo(_Trace)
