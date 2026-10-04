import React, { useLayoutEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { createLatestComputation, useBackgroundComputation } from 'one/background'
import { calculation } from './definition'

export default function BackgroundProof() {
  const [status, setStatus] = useState('pending')
  const [input] = useState({ value: 7 })
  const hook = useBackgroundComputation(calculation, input)
  useLayoutEffect(() => {
    const ready: number[] = []
    let disposed = false
    const owner = createLatestComputation(calculation, (state) => {
      if (state.phase === 'failed') setStatus(`failed:${state.error.message}`)
      if (state.phase !== 'ready') return
      ready.push(state.result.revision)
      if (
        state.result.revision !== 3 ||
        state.result.value.value !== 6 ||
        ready.length !== 1 ||
        state.result.value.runtime === 'main'
      ) {
        setStatus(`failed:${JSON.stringify(state)}`)
        return
      }
      const runtime = state.result.value.runtime
      owner.dispose()
      owner.update({ value: 99 })
      if (owner.getCurrent() !== null) setStatus('failed:disposed result')
      disposed = true
      const errors = createLatestComputation(calculation, (failure) => {
        if (failure.phase === 'ready') setStatus('failed:error calculation resolved')
        if (failure.phase !== 'failed') return
        errors.dispose()
        setStatus(
          failure.error.message.includes('requested calculation failure')
            ? `latest=3 value=6 runtime=${runtime} error=handled dispose=silent`
            : `failed:${failure.error.message}`
        )
      })
      errors.update({ value: 9, fail: true })
    })
    owner.update({ value: 1, delayMs: 100 })
    owner.update({ value: 2, fail: true })
    owner.update({ value: 3 })
    if (owner.getCurrent() !== null) setStatus('failed:stale current')
    return () => {
      if (!disposed) owner.dispose()
    }
  }, [])
  return (
    <View style={{ padding: 20, paddingTop: 90, flex: 1, backgroundColor: '#fff' }}>
      <Text testID="background-status">{status}</Text>
      <Text testID="background-hook">
        hook={hook.result?.value.value ?? 'pending'} current=
        {String(hook.result !== null && hook.getCurrent() === hook.result)}
      </Text>
    </View>
  )
}
