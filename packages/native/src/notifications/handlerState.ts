import type {
  Notification,
  NotificationBehavior,
  NotificationHandlerInput,
} from './types'

// expo shows an arriving foreground notification until the app says
// otherwise, and keeps showing it when the handler stalls, so a slow
// handler never drops one. the null handler is the only quiet mode.
export const showAllBehavior: NotificationBehavior = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: true,
  shouldSetBadge: true,
}

export const suppressBehavior: NotificationBehavior = {
  shouldShowBanner: false,
  shouldShowList: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
}

// the js side answers within 2.5s; native shows everything after 3s, so a
// stalled bridge resolves the same way as a stalled handler.
export const HANDLER_TIMEOUT_MS = 2500

export function normalizeBehavior(input: unknown): NotificationBehavior {
  if (!input || typeof input !== 'object') return { ...suppressBehavior }
  const behavior = input as Partial<Record<keyof NotificationBehavior, unknown>>
  return {
    shouldShowBanner: behavior.shouldShowBanner === true,
    shouldShowList: behavior.shouldShowList === true,
    shouldPlaySound: behavior.shouldPlaySound === true,
    shouldSetBadge: behavior.shouldSetBadge === true,
  }
}

// pairs foreground arrivals with their presentation answers by request id.
// each id settles exactly once; duplicates of an in-flight id are ignored.
// no react-native imports: unit-tested with fake timers.
export class ForegroundHandler {
  private handler: NotificationHandlerInput | null = null
  private nulled = false
  private pending = new Map<
    string,
    { settled: boolean; timer: ReturnType<typeof setTimeout> }
  >()

  constructor(
    private present: (requestId: string, behavior: NotificationBehavior) => void,
    private timeoutMs: number = HANDLER_TIMEOUT_MS
  ) {}

  setHandler(handler: NotificationHandlerInput | null) {
    this.handler = handler
    this.nulled = handler === null
  }

  // returns false for a duplicate of an in-flight id; the caller skips
  // listener delivery for those.
  receive(requestId: string, notification: Notification): boolean {
    if (this.pending.has(requestId)) return false
    if (!this.handler) {
      // never set: show, like expo. explicitly nulled: stay quiet.
      this.present(requestId, { ...(this.nulled ? suppressBehavior : showAllBehavior) })
      return true
    }
    const handler = this.handler
    const record = {
      settled: false,
      timer: setTimeout(() => this.settle(requestId, showAllBehavior), this.timeoutMs),
    }
    this.pending.set(requestId, record)
    Promise.resolve()
      .then(() => handler.handleNotification(notification))
      .then(
        (behavior) => this.settle(requestId, normalizeBehavior(behavior)),
        () => this.settle(requestId, showAllBehavior)
      )
    return true
  }

  private settle(requestId: string, behavior: NotificationBehavior) {
    const record = this.pending.get(requestId)
    if (!record || record.settled) return
    record.settled = true
    clearTimeout(record.timer)
    this.pending.delete(requestId)
    this.present(requestId, { ...behavior })
  }
}
