import { Bench } from '../native/Bench/Bench.swift'

export const engine = (globalThis as any).HermesInternal ? 'hermes' : 'bun'
let run = 'manual'
export function setRun(value: string) {
  run = value
}
export async function emit(name: string, metric: string, value: number, unit = 'ms') {
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`Invalid ${name}/${metric}: ${value}`)
  await Bench.log(
    `BENCH ${JSON.stringify({ app: 'one-bench', engine, case: name, metric, value, unit, run })}`
  )
}
export async function footprint(name: string) {
  await emit(name, 'physical-footprint', await Bench.footprint(), 'MiB')
}
