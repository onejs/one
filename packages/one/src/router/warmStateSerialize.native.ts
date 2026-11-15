import type { BackgroundExecutor } from '../background/backgroundContract'
import { createLatestComputation } from '../background/createLatestComputation'
import {
  serializeWarmInputSync,
  type WarmStateSerializeInput,
  type WarmStateSerializeOutput,
} from './warmStateShared'

type WorkletsModule = typeof import('react-native-worklets')

let cachedWorklets: WorkletsModule | null | undefined

function getWorkletsModule(): WorkletsModule | null {
  if (cachedWorklets !== undefined) return cachedWorklets
  try {
    cachedWorklets = require('react-native-worklets') as WorkletsModule
  } catch {
    // react-native-worklets is an optional peer; fall back to an async turn when absent.
    cachedWorklets = null
  }
  return cachedWorklets
}

const runSerializeWorklet = (input: WarmStateSerializeInput) => {
  'worklet'
  return serializeWarmInputSync(input)
}

function createNativeWarmExecutor(): BackgroundExecutor<
  WarmStateSerializeInput,
  WarmStateSerializeOutput
> {
  let disposed = false
  let workletsUnavailable = false
  let runtime: ReturnType<WorkletsModule['createWorkletRuntime']> | null = null
  let queue: Promise<void> = Promise.resolve()

  return {
    execute(request, isCurrent) {
      const job = queue.then(async () => {
        if (disposed || !isCurrent(request.revision)) return null
        const worklets = workletsUnavailable ? null : getWorkletsModule()
        if (
          worklets &&
          typeof worklets.createWorkletRuntime === 'function' &&
          typeof worklets.runOnRuntimeAsync === 'function' &&
          (typeof worklets.isWorkletFunction !== 'function' ||
            worklets.isWorkletFunction(runSerializeWorklet))
        ) {
          try {
            runtime ??= worklets.createWorkletRuntime({ name: 'one-background' })
            const value = await worklets.runOnRuntimeAsync(
              runtime,
              runSerializeWorklet,
              request.input
            )
            return { revision: request.revision, value }
          } catch {
            workletsUnavailable = true
          }
        }

        await new Promise<void>((resolve) => setTimeout(resolve, 0))
        if (disposed || !isCurrent(request.revision)) return null
        return {
          revision: request.revision,
          value: serializeWarmInputSync(request.input),
        }
      })
      queue = job.then(
        () => undefined,
        () => undefined
      )
      return job
    },
    dispose() {
      disposed = true
    },
  }
}

export function createWarmSerializer(
  onState: Parameters<
    typeof createLatestComputation<WarmStateSerializeInput, WarmStateSerializeOutput>
  >[1]
) {
  return createLatestComputation<WarmStateSerializeInput, WarmStateSerializeOutput>(
    { createExecutor: createNativeWarmExecutor },
    onState
  )
}
