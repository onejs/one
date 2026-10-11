import { EscapeHatch } from '../native-source/EscapeHatch.kt'

export async function runNativeEvents(): Promise<string> {
  const ticks: number[] = []
  const unsubscribe = EscapeHatch.onTick((value) => {
    ticks.push(value)
  })
  await new Promise((resolve) => setTimeout(resolve, 2000))
  unsubscribe()
  return JSON.stringify({ ticks })
}

export async function runNativeEventsInvalid(): Promise<string> {
  // a non-function listener throws before the subscription leaves JavaScript
  EscapeHatch.onTick('nope' as unknown as (value: number) => void)
  return 'invalid listener did not throw'
}
