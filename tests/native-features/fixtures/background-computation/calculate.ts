export function calculate(input: { value: number; fail?: boolean; delayMs?: number }) {
  const until = Date.now() + (input.delayMs ?? 0)
  while (Date.now() < until) {}
  if (input.fail) throw new Error('requested calculation failure')
  return {
    value: input.value * 2,
    runtime:
      Reflect.get(globalThis, '__RUNTIME_KIND') === 3
        ? 'worklet'
        : Reflect.get(globalThis, 'document') === undefined
          ? 'worker'
          : 'main',
  }
}
