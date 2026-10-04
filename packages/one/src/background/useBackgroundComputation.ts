import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createLatestComputation } from './createLatestComputation'
import type { BackgroundComputation, BackgroundState } from './backgroundContract'

export function useBackgroundComputation<Input, Output>(
  definition: BackgroundComputation<Input, Output>,
  input: Input | null
) {
  const [state, setState] = useState<BackgroundState<Output>>({
    phase: 'idle',
    revision: 0,
  })
  const owner = useRef<ReturnType<typeof createLatestComputation<Input, Output>> | null>(
    null
  )
  const submitted = useRef<{
    input: Input
    factory: typeof definition
  }>(null)
  const active = input !== null

  useLayoutEffect(() => {
    if (!active) return
    const computation = createLatestComputation(definition, setState)
    owner.current = computation
    return () => {
      owner.current = null
      submitted.current = null
      computation.dispose()
    }
  }, [active, definition])
  useLayoutEffect(() => {
    if (input === null) return
    submitted.current = { input, factory: definition }
    owner.current?.update(input)
  }, [active, definition, input])

  const getCurrent = useCallback(() => owner.current?.getCurrent() ?? null, [])
  const matches =
    active &&
    submitted.current?.input === input &&
    submitted.current.factory === definition
  if (matches && state.phase === 'failed') throw state.error
  const result =
    matches && state.phase === 'ready' && state.result === owner.current?.getCurrent()
      ? state.result
      : null
  return { result, getCurrent }
}
