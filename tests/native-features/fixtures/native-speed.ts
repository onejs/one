export const repeatRuns = 7

export function distribution(values: number[]) {
  if (!values.length || values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('benchmark requires finite nonnegative samples')
  }
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return {
    median:
      sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1]!,
  }
}

export async function compare<T>(
  candidates: Record<string, (run: number) => Promise<T>>,
  record: (sample: { component: string; run: number; result: T }) => Promise<void>
) {
  const names = Object.keys(candidates)
  for (let run = 0; run < repeatRuns; run++) {
    // rotate the first library, then reverse alternate runs to balance ordering.
    const offset = run % names.length
    const order = [...names.slice(offset), ...names.slice(0, offset)]
    if (run % 2) order.reverse()
    for (const component of order) {
      await record({ component, run, result: await candidates[component]!(run) })
    }
  }
}

export async function timeAsync(
  count: number,
  operation: (index: number) => Promise<unknown>
) {
  const samplesMs: number[] = []
  for (let index = 0; index < count; index++) {
    const started = performance.now()
    await operation(index)
    samplesMs.push(performance.now() - started)
  }
  return { samplesMs, ...distribution(samplesMs) }
}

export function timeSync(count: number, operation: (index: number) => unknown) {
  const batchSize = 100
  const samplesUs: number[] = []
  for (let offset = 0; offset < count; offset += batchSize) {
    const started = performance.now()
    for (let index = offset; index < offset + batchSize; index++) operation(index)
    samplesUs.push(((performance.now() - started) * 1000) / batchSize)
  }
  // microbenchmarks retain means for each batch of 100 calls. p95 is the
  // distribution of these batch means, not an individual-call latency.
  return { samplesUs, ...distribution(samplesUs) }
}
