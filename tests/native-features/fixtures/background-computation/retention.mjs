import { createElement, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useBackgroundComputation } from '../../../../packages/one/src/background/useBackgroundComputation'

let input = { size: 16 * 1024 * 1024, index: 0 }
let disposed = 0,
  executed = 0,
  created = 0,
  skipped = 0,
  latest,
  committed,
  unblock,
  finished
const commits = []
const createExecutor = (name) => {
  created++
  return {
    async execute(request, isCurrent) {
      executed++
      let complete
      if (request.input.hold) {
        finished = new Promise((resolve) => {
          complete = resolve
        })
        await new Promise((resolve) => {
          unblock = resolve
        })
      }
      try {
        if (!isCurrent(request.revision)) {
          skipped++
          return null
        }
        return {
          revision: request.revision,
          value: {
            token: 'retention-output',
            buffer: new Uint8Array(request.input.size),
            index: request.input.index,
            factory: name,
          },
        }
      } finally {
        complete?.()
      }
    },
    dispose() {
      disposed++
    },
  }
}
const firstFactory = { createExecutor: () => createExecutor('first') },
  secondFactory = { createExecutor: () => createExecutor('second') }
let factory = firstFactory
let reader
function Probe({ active, tick }) {
  const computation = useBackgroundComputation(factory, active ? input : null)
  useLayoutEffect(() => {
    latest = computation
    reader ??= computation.getCurrent
    const current = computation.getCurrent()
    commits.push({
      active,
      tick,
      resultRevision: computation.result?.revision ?? null,
      currentRevision: current?.revision ?? null,
      resultCurrentExact: computation.result === current,
    })
    committed?.({ active, tick, ready: computation.result !== null })
  })
  return null
}
const root = createRoot(document.getElementById('probe'))
function render(active, tick, ready) {
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(
      () => reject(Error('background hook commit missing')),
      5000
    )
    committed = (state) => {
      if (state.active !== active || state.tick !== tick || state.ready !== ready) return
      clearTimeout(deadline)
      committed = null
      resolve(state)
    }
    root.render(createElement(Probe, { active, tick }))
  })
}
function inspect() {
  const refs = [],
    seen = new Set(),
    pending = [root._internalRoot?.current, root._internalRoot?.current.alternate]
  while (pending.length) {
    const fiber = pending.pop()
    if (!fiber || seen.has(fiber)) continue
    seen.add(fiber)
    for (let hook = fiber.memoizedState; hook; hook = hook.next) {
      const state = hook.memoizedState
      if (state?.phase === 'ready' && state.result?.value?.token === 'retention-output')
        refs.push({
          phase: state.phase,
          revision: state.result.revision,
          bytes: state.result.value.buffer.byteLength,
        })
    }
    pending.push(fiber.child, fiber.sibling)
  }
  const current = latest.getCurrent()
  return {
    refs,
    disposed,
    executed,
    created,
    skipped,
    resultNull: latest.result === null,
    currentNull: current === null,
    currentBytes: current?.value.buffer.byteLength ?? 0,
    currentRevision: current?.revision ?? null,
    currentIndex: current?.value.index ?? null,
    currentFactory: current?.value.factory ?? null,
    resultCurrentExact: latest.result === current,
    readerStable: latest.getCurrent === reader,
    commits,
  }
}
globalThis.__qaBackgroundRetention = {
  render,
  inspect,
  configure(options, nextFactory = 'first') {
    input = { size: 16 * 1024 * 1024, ...options }
    factory = nextFactory === 'first' ? firstFactory : secondFactory
  },
  release() {
    if (!unblock) throw Error('background request is not held')
    const done = finished,
      action = unblock
    unblock = null
    action()
    return done
  },
  unmount: () => root.unmount(),
}
