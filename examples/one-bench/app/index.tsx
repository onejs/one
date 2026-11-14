import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { router } from 'one'
import { Bench } from '../native/Bench/Bench.swift'
import { jsCases } from '../bench/cases'
import { emit, footprint, setRun } from '../bench/protocol'

type Scene = { name: string; revision: number }
import { waitForNavigation } from '../bench/navigation'

function Tree({ depth }: { depth: number }) {
  return depth ? (
    <View collapsable={false} style={{ paddingLeft: 1 }}>
      <Tree depth={depth - 1} />
    </View>
  ) : (
    <Text>Leaf</Text>
  )
}

export default function Benchmark() {
  const [scene, setScene] = useState<Scene>({ name: 'startup', revision: 0 })
  const [status, setStatus] = useState('One benchmark')
  const pending = useRef<(() => void) | undefined>(undefined)
  const started = useRef(false)
  useLayoutEffect(() => {
    pending.current?.()
    pending.current = undefined
  }, [scene])

  async function commit(name: string, revision = 0) {
    const start = performance.now()
    await new Promise<void>((resolve) => {
      pending.current = resolve
      setScene({ name, revision })
    })
    const duration = performance.now() - start
    await Bench.frame()
    return duration
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    async function run() {
      const args = await Bench.arguments()
      if (!args.includes('--bench')) return
      if (__DEV__) throw new Error('Release build required')
      const runIndex = args.indexOf('--bench-run')
      setRun(runIndex >= 0 ? args[runIndex + 1] : '0')
      await Bench.log(`BENCH_META ${JSON.stringify(await Bench.environment())}`)
      await Bench.frame()
      await emit('startup', 'process-to-first-frame-proxy', await Bench.processElapsed())
      const timing = (performance as any).rnStartupTiming
      if (timing) {
        for (const key of [
          'initializeRuntimeStart',
          'executeJavaScriptBundleEntryPointStart',
          'endTime',
        ]) {
          if (Number.isFinite(timing[key]) && timing[key] >= 0)
            await emit('startup', key, timing[key], 'timestamp-ms')
        }
        if (
          Number.isFinite(timing.initializeRuntimeStart) &&
          Number.isFinite(timing.executeJavaScriptBundleEntryPointStart)
        ) {
          await emit(
            'startup',
            'runtime-init-to-bundle',
            timing.executeJavaScriptBundleEntryPointStart - timing.initializeRuntimeStart
          )
        }
        if (
          Number.isFinite(timing.endTime) &&
          Number.isFinite(timing.executeJavaScriptBundleEntryPointStart)
        ) {
          await emit(
            'startup',
            'bundle-to-startup-end',
            timing.endTime - timing.executeJavaScriptBundleEntryPointStart
          )
        }
      }
      await commit('content')
      await emit('startup', 'process-to-content-ready', await Bench.processElapsed())
      await footprint('startup')
      for (const name of ['mount-1000', 'updates-300', 'deep-tree', 'long-text-list']) {
        await commit('empty')
        if (name === 'updates-300') await commit('mount-1000')
        const start = performance.now()
        let commitDuration = 0
        if (name === 'updates-300') {
          for (let i = 1; i <= 300; i++) commitDuration += await commit('mount-1000', i)
        } else commitDuration = await commit(name)
        await emit(name, 'duration', performance.now() - start)
        await emit(name, 'react-commit-duration', commitDuration)
        await footprint(name)
      }
      await commit('empty')
      const navigationStart = performance.now()
      const ready = waitForNavigation()
      router.push('/heavy')
      await ready
      await emit('navigation-heavy', 'duration', performance.now() - navigationStart)
      await footprint('navigation-heavy')
      router.back()
      await Bench.frame()
      for (const [name, work] of Object.entries(jsCases)) {
        const start = performance.now()
        const checksum = work()
        await emit(name, 'duration', performance.now() - start)
        await emit(name, 'checksum', checksum, 'count')
        await footprint(name)
        await Bench.frame()
      }
      setStatus('Complete')
      await Bench.log('BENCH_DONE')
      await Bench.finish()
    }
    run().catch(async (error) => {
      setStatus(String(error))
      await Bench.log(`BENCH_ERROR ${String(error)}`)
    })
  }, [])

  return (
    <View style={{ flex: 1, paddingTop: 64, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, padding: 16 }}>{status}</Text>
      <ScrollView>
        {scene.name === 'content' &&
          Array.from({ length: 20 }, (_, i) => <Text key={i}>Content row {i}</Text>)}
        {scene.name === 'mount-1000' &&
          Array.from({ length: 1000 }, (_, i) => (
            <View
              collapsable={false}
              key={i}
              style={{
                height: 2,
                backgroundColor: (i + scene.revision) % 2 ? '#2864d7' : '#ddd',
              }}
            />
          ))}
        {scene.name === 'deep-tree' && <Tree depth={100} />}
        {scene.name === 'long-text-list' &&
          Array.from({ length: 300 }, (_, i) => (
            <Text key={i} style={{ fontSize: 14 }}>
              Row {i}:{' '}
              {'The quick brown fox jumps over the lazy dog. Café 日本語. '.repeat(8)}
            </Text>
          ))}
      </ScrollView>
    </View>
  )
}
