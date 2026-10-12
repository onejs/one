import type { PedometerResult } from './types'

// shared argument checks: identical checks and messages on web and native.
export function assertStepCountListener(
  listener: unknown
): asserts listener is (result: PedometerResult) => void {
  if (typeof listener !== 'function') {
    throw new Error('Pedometer.watchStepCount: listener must be a function')
  }
}

export function assertStepCountRange(start: unknown, end: unknown): asserts start is Date {
  if (!(start instanceof Date) || !(end instanceof Date)) {
    throw new Error('Pedometer.getStepCount: start and end must be Dates')
  }
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    throw new Error('Pedometer.getStepCount: start and end must be valid dates')
  }
  if (start.getTime() > end.getTime()) {
    throw new Error('Pedometer.getStepCount: start must precede end')
  }
}
