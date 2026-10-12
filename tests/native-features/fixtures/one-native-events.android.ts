import { EscapeHatch } from '../native-source/EscapeHatch.kt'

export async function runNativeEvents(): Promise<string> {
  const ticks: number[] = []
  const payloads: unknown[] = []
  const survivor: unknown[] = []
  const subscriptions: (() => void)[] = []
  let delivered: (() => void) | undefined
  // the existing two-second event budget bounds real delivery, never a sleep.
  let timeout: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('native event delivery timed out')), 2000)
  })
  const nextEvent = () =>
    new Promise<void>((resolve) => {
      delivered = resolve
    })
  const received = () => {
    delivered?.()
    delivered = undefined
  }
  try {
    const firstTick = nextEvent()
    const offTick = EscapeHatch.onTick((value) => {
      ticks.push(value)
      received()
    })
    subscriptions.push(offTick)
    await Promise.race([firstTick, deadline])

    const offPayload = EscapeHatch.onPayload((point, direction, moment, data) => {
      payloads.push({
        point: { ...point, label: point.label ?? null },
        direction,
        moment: moment.toISOString(),
        data: Array.from(data),
      })
    })
    subscriptions.push(offPayload)
    subscriptions.push(
      EscapeHatch.onPayload((point, direction, moment, data) => {
        survivor.push({
          point: { ...point, label: point.label ?? null },
          direction,
          moment: moment.toISOString(),
          data: Array.from(data),
        })
        received()
      })
    )
    const moment = new Date('2026-01-01T00:00:00.123Z')
    const firstPayload = nextEvent()
    await EscapeHatch.emitPayload(
      { x: 3, y: 4, label: 'first' },
      'SOUTH',
      moment,
      new Uint8Array([0, 128, 255])
    )
    await Promise.race([firstPayload, deadline])
    if (ticks.length !== 1 || payloads.length !== 1 || survivor.length !== 1) {
      throw new Error('native event channels are not isolated')
    }

    offTick()
    offPayload()
    const afterUnsubscribe = nextEvent()
    await EscapeHatch.emitTick(2)
    await EscapeHatch.emitPayload(
      { x: 5, y: 6 },
      'NORTH',
      moment,
      new Uint8Array([255, 0])
    )
    // the still-subscribed listener proves a later native emission happened.
    await Promise.race([afterUnsubscribe, deadline])
    if (ticks.length !== 1 || payloads.length !== 1 || survivor.slice().length !== 2) {
      throw new Error('native event unsubscribe removed the wrong listeners')
    }
    return JSON.stringify({
      ticks,
      payloads,
      survivor,
      isolated: true,
      unsubscribed: true,
    })
  } finally {
    for (const off of subscriptions) off()
    clearTimeout(timeout)
  }
}

export async function runNativeEventsInvalid(): Promise<string> {
  // a non-function listener throws before the subscription leaves JavaScript
  EscapeHatch.onTick('nope' as unknown as (value: number) => void)
  return 'invalid listener did not throw'
}
