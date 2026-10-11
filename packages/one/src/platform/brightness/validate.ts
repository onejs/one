import type { BrightnessEvent, BrightnessMode } from './types'

// shared argument checks: identical checks and messages on web and native.
export function assertBrightnessValue(
  value: unknown,
  verb: string
): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${verb}: value must be a number between 0 and 1`)
  }
}

const SYSTEM_MODES: readonly BrightnessMode[] = ['manual', 'automatic']

export function assertSystemMode(mode: unknown): asserts mode is BrightnessMode {
  if (mode !== 'manual' && mode !== 'automatic') {
    throw new Error(
      `Brightness.setSystemMode: mode must be one of: ${SYSTEM_MODES.join(', ')}.`
    )
  }
}

export function assertBrightnessListener(
  listener: unknown
): asserts listener is (event: BrightnessEvent) => void {
  if (typeof listener !== 'function') {
    throw new Error('Brightness.addListener: listener must be a function')
  }
}
