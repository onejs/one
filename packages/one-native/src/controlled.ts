import { useRef, useState } from 'react'

export type ControlledEvent = { eventCount: number; revision: number }

export function useControlled<T extends ControlledEvent>(
  onChange: (event: T) => void,
  revision = 0
) {
  if (!Number.isInteger(revision) || revision < 0 || revision > 2147483647) {
    throw new Error('Swift control revision must be a nonnegative Int32')
  }
  const received = useRef<ControlledEvent>({ eventCount: 0, revision })
  const [acknowledged, setAcknowledged] = useState<ControlledEvent>(received.current)
  return {
    revision,
    acknowledgedEvent: acknowledged.revision === revision ? acknowledged.eventCount : 0,
    onNativeChange(event: T) {
      if (event.revision !== revision) return
      if (
        received.current.revision === revision &&
        event.eventCount <= received.current.eventCount
      )
        return
      received.current = event
      try {
        onChange(event)
      } finally {
        setAcknowledged(event)
      }
    },
  }
}
