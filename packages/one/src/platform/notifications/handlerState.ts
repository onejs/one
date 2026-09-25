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

export function normalizeBehavior(input: unknown): NotificationBehavior {
  if (!input || typeof input !== 'object') return { ...suppressBehavior }
  return {
    shouldShowBanner: 'shouldShowBanner' in input && input.shouldShowBanner === true,
    shouldShowList: 'shouldShowList' in input && input.shouldShowList === true,
    shouldPlaySound: 'shouldPlaySound' in input && input.shouldPlaySound === true,
    shouldSetBadge: 'shouldSetBadge' in input && input.shouldSetBadge === true,
  }
}

// pairs foreground arrivals with their presentation answers by request id.
// each id settles exactly once; duplicates of an in-flight id are ignored.
// native shows everything after 3s on its own, so js never times out: a
// stalled handler resolves natively, and a late js answer finds no pending
// record and stays a no-op. no react-native imports: unit-tested.
export class ForegroundHandler {
  private handler: NotificationHandlerInput | null = null
  private nulled = false
  private pending = new Map<string, { settled: boolean }>()

  constructor(
    private present: (requestId: string, behavior: NotificationBehavior) => void
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
    this.pending.set(requestId, { settled: false })
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
    this.pending.delete(requestId)
    this.present(requestId, { ...behavior })
  }
}
