import { useEffect, useRef, useState } from 'react'
import { PixelRatio, StyleSheet, Text, View } from 'react-native'
import { Canvas as GpuCanvas, useCanvasRef } from 'react-native-webgpu'
import * as THREE from 'three/webgpu'
import {
  createRoot,
  events,
  extend,
  unmountComponentAtNode,
  useFrame,
  type ReconcilerRoot,
} from '@react-three/fiber'

// the native three.js path is three/webgpu on a react-native-webgpu canvas:
// R3F mounts through createRoot (FiberCanvas below), never through
// @react-three/fiber/native, which hard-requires expo-gl. bare 'three' is
// aliased to the webgpu build on the native environments (vite.config.ts),
// so this explicit subpath import and R3F's internal 'three' resolve to one
// module instance.
export default function OneNativeGpu() {
  const [triangle, setTriangle] = useState('pending')
  const [fiber, setFiber] = useState('pending')
  const [ticks, setTicks] = useState(0)
  const [shader, setShader] = useState('pending')
  const [size, setSize] = useState({ width: 0, height: 220 })

  const status: [string, string | number][] = [
    ['Triangle', triangle],
    ['Fiber', fiber],
    ['Ticks', ticks],
    ['Shader', shader],
  ]

  return (
    <View style={styles.screen} testID="one-native-gpu-screen">
      <View style={styles.status}>
        {status.map(([label, value]) => (
          <Text
            key={label}
            style={styles.statusText}
            testID={`one-native-gpu-${label.toLowerCase()}`}
          >{`${label}: ${value}`}</Text>
        ))}
      </View>
      <View
        style={[styles.pane, { height: size.height }]}
        testID="one-native-gpu-triangle"
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout
          setSize((current) =>
            current.width === width ? current : { width, height: 220 }
          )
        }}
      >
        {size.width > 0 ? (
          <TrianglePane
            width={size.width}
            height={size.height}
            onReady={() => setTriangle('ready')}
            onError={(message) => setTriangle(`error: ${message}`)}
          />
        ) : null}
      </View>
      <View style={[styles.pane, { height: size.height }]} testID="one-native-gpu-fiber">
        {size.width > 0 ? (
          <FiberPane
            width={size.width}
            height={size.height}
            onReady={() => setFiber('ready')}
            onTick={() => setTicks((count) => count + 1)}
            onShader={(verdict) => setShader(verdict)}
            onError={(message) => setFiber(`error: ${message}`)}
          />
        ) : null}
      </View>
    </View>
  )
}

const triangleVertWGSL = /* wgsl */ `
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  var pos = array<vec2<f32>, 3>(vec2<f32>(0.0, 1.0), vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0));
  return vec4<f32>(pos[i], 0.0, 1.0);
}
`

const triangleFragWGSL = /* wgsl */ `
@fragment fn fs() -> @location(0) vec4<f32> {
  return vec4<f32>(1.0, 0.0, 1.0, 1.0);
}
`

function TrianglePane({
  width,
  height,
  onReady,
  onError,
}: {
  width: number
  height: number
  onReady: () => void
  onError: (message: string) => void
}) {
  const ref = useCanvasRef()
  const settled = useRef(false)
  const settle = (fn: () => void) => {
    if (settled.current) return
    settled.current = true
    fn()
  }

  useEffect(() => {
    let cancelled = false
    let frame = 0
    let device: GPUDevice | null = null
    const context = ref.current?.getContext('webgpu')
    if (!context) {
      settle(() => onError('no webgpu context'))
      return
    }
    const canvas = context.canvas as unknown as {
      width: number
      height: number
      clientWidth: number
      clientHeight: number
    }
    canvas.width = width * PixelRatio.get()
    canvas.height = height * PixelRatio.get()

    const run = async () => {
      try {
        const adapter = await navigator.gpu.requestAdapter()
        if (!adapter) throw new Error('no adapter')
        device = await adapter.requestDevice()
        if (cancelled) return
        const format = navigator.gpu.getPreferredCanvasFormat()
        context.configure({ device, format, alphaMode: 'opaque' })
        const module = device.createShaderModule({
          code: `${triangleVertWGSL}\n${triangleFragWGSL}`,
        })
        const pipeline = device.createRenderPipeline({
          layout: 'auto',
          vertex: { module, entryPoint: 'vs' },
          fragment: { module, entryPoint: 'fs', targets: [{ format }] },
          primitive: { topology: 'triangle-list' },
        })
        const render = () => {
          if (cancelled || !device) return
          const encoder = device.createCommandEncoder()
          const pass = encoder.beginRenderPass({
            colorAttachments: [
              {
                view: context.getCurrentTexture().createView(),
                loadOp: 'clear',
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                storeOp: 'store',
              },
            ],
          })
          pass.setPipeline(pipeline)
          pass.draw(3)
          pass.end()
          device.queue.submit([encoder.finish()])
          context.present()
          settle(onReady)
          frame = requestAnimationFrame(render)
        }
        render()
      } catch (error) {
        settle(() =>
          onError(error instanceof Error ? error.message.slice(0, 80) : 'unknown')
        )
      }
    }
    run()
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      device?.destroy()
    }
    // width/height/ref identity is fixed for the pane's mount; a remount
    // restarts the loop through unmount cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <GpuCanvas ref={ref} style={{ width, height }} />
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 10, backgroundColor: '#F5F5F7' },
  status: { padding: 6, borderRadius: 8, backgroundColor: '#FFFFFF' },
  statusText: { color: '#17233A', fontSize: 11, fontVariant: ['tabular-nums'] },
  pane: { marginTop: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: '#000000' },
})

const probeVertGLSL = /* glsl */ `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const probeFragGLSL = /* glsl */ `
void main() {
  gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
}
`

function TickReporter({ onTick }: { onTick: () => void }) {
  const frames = useRef(0)
  useFrame(() => {
    frames.current += 1
    if (frames.current % 60 === 0) onTick()
  })
  return null
}

function FiberScene({ onTick }: { onTick: () => void }) {
  return (
    <>
      <color attach="background" args={['#202028']} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 6, 8]} intensity={2} />
      <mesh>
        <boxGeometry args={[1.4, 1.4, 1.4]} />
        <meshStandardMaterial color="#ff4422" />
      </mesh>
      {/* the ShaderMaterial probe: GLSL under WebGPURenderer. three either
      renders it, skips it, or reports a compile failure the pane owns. */}
      <mesh position={[2.2, 0, -1]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          args={[{ vertexShader: probeVertGLSL, fragmentShader: probeFragGLSL }]}
        />
      </mesh>
      <TickReporter onTick={onTick} />
    </>
  )
}

// R3F on a react-native-webgpu canvas, after the library's own FiberCanvas
// example: createRoot on the webgpu context canvas with an explicit
// WebGPURenderer, present() after every frame, full teardown on unmount
// (R3F's unmount alone never stops three's internal rAF loop).
function FiberPane({
  width,
  height,
  onReady,
  onTick,
  onShader,
  onError,
}: {
  width: number
  height: number
  onReady: () => void
  onTick: () => void
  onShader: (verdict: string) => void
  onError: (message: string) => void
}) {
  const ref = useCanvasRef()
  const root = useRef<ReconcilerRoot<HTMLCanvasElement> | null>(null)
  const settled = useRef(false)
  const settle = (fn: () => void) => {
    if (settled.current) return
    settled.current = true
    fn()
  }

  useEffect(() => {
    // the three namespace carries non-constructor members (REVISION, ...)
    // the catalogue type rejects; the library's own example suppresses the
    // same call the same way.
    // @ts-expect-error extend takes the whole three namespace at runtime
    extend(THREE)
    // the probe owns shader-compile console noise for its first five
    // seconds and reports it as the Shader label; everything else passes
    // through to the suite's console sweep untouched.
    const errors: string[] = []
    const originalError = console.error
    const shaderNoise = /shader|program|compile|wgsl|glsl|dawn|webgpu/i
    console.error = (...args: unknown[]) => {
      const message = args.map((part) => String(part)).join(' ')
      if (shaderNoise.test(message)) {
        if (errors.length < 3) errors.push(message.slice(0, 120))
        return
      }
      originalError(...args)
    }
    const verdictTimer = setTimeout(() => {
      onShader(errors.length ? `unsupported: ${errors[0].slice(0, 80)}` : 'clean')
    }, 5000)

    let renderer: THREE.WebGPURenderer | null = null
    let canvas: unknown = null
    try {
      const context = ref.current?.getContext('webgpu')
      if (!context) {
        settle(() => onError('no webgpu context'))
        return
      }
      canvas = context.canvas
      const sized = canvas as unknown as {
        width: number
        height: number
        clientWidth: number
        clientHeight: number
      }
      sized.width = width * PixelRatio.get()
      sized.height = height * PixelRatio.get()
      renderer = new THREE.WebGPURenderer({
        antialias: true,
        canvas: canvas as HTMLCanvasElement,
      })
      const active = renderer
      root.current = createRoot(canvas as HTMLCanvasElement)
      root.current.configure({
        size: { top: 0, left: 0, width, height },
        events,
        gl: active as never,
        frameloop: 'always',
        dpr: 1,
        onCreated: async (state) => {
          try {
            // R3F types gl as WebGLRenderer; the configured renderer is a
            // WebGPURenderer, which init()s explicitly and presents manually.
            const gl = state.gl as unknown as THREE.WebGPURenderer
            await gl.init()
            const renderFrame = gl.render.bind(gl)
            gl.render = ((scene: THREE.Scene, camera: THREE.Camera) => {
              renderFrame(scene, camera)
              context.present()
            }) as typeof gl.render
            settle(onReady)
          } catch (error) {
            settle(() =>
              onError(error instanceof Error ? error.message.slice(0, 80) : 'init failed')
            )
          }
        },
      })
      root.current.render(<FiberScene onTick={onTick} />)
    } catch (error) {
      settle(() =>
        onError(error instanceof Error ? error.message.slice(0, 80) : 'mount failed')
      )
    }
    return () => {
      clearTimeout(verdictTimer)
      console.error = originalError
      if (canvas != null) unmountComponentAtNode(canvas as HTMLCanvasElement)
      // dispose stops three's internal rAF loop; setAnimationLoop(null)
      // alone leaves it running and rooting the renderer graph forever.
      renderer?.setAnimationLoop(null)
      void renderer?.dispose()
      renderer = null
      root.current = null
    }
    // fixed mount: width/height/ref identity never changes for the pane.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <GpuCanvas ref={ref} style={{ width, height }} />
}
