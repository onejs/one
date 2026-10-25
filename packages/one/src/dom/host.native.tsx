import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
} from 'react'
import { getDevServer } from '../getDevServer.native'
import OneDOMHost, { Commands } from '../platform/specs/OneDOMHostNativeComponent'
import { DOMNativeBridge } from './nativeBridge'
import { DOM_PROTOCOL_VERSION } from './protocol'
import { DOMBridgeError, serializeError, serializeProps } from './serialize'
import type { DOMProps } from './types'

/** the native transform replaces only the default export with this host proxy. */
export function createDOMComponent<
  P extends object = Record<string, unknown>,
  Handle extends object = Record<string, (...args: unknown[]) => Promise<unknown>>,
>(entryId: string) {
  const DOMComponent = forwardRef<Handle, P & { dom?: DOMProps }>((allProps, ref) => {
    const { dom, ...props } = allProps
    const host = useRef<ComponentRef<typeof OneDOMHost>>(null)
    const options = useRef(dom)
    const epoch = useRef<string | undefined>(undefined)
    const mountGeneration = useRef(0)
    const [handle, setHandle] = useState<Record<
      string,
      (...args: unknown[]) => Promise<unknown>
    > | null>(null)
    const [height, setHeight] = useState<number | undefined>(undefined)
    const serialized = serializeProps(props)
    const report = (error: unknown) => {
      const detail = { entryId, epoch: epoch.current, ...serializeError(error, __DEV__) }
      if (options.current?.onError) options.current.onError(detail)
      else throw new DOMBridgeError(detail.message, detail.code)
    }
    const [bridge] = useState(
      () =>
        new DOMNativeBridge(
          serialized,
          (raw) => {
            if (!host.current)
              throw new DOMBridgeError('One DOM host is unmounted', 'DOM_DISPOSED')
            Commands.post(host.current, raw)
          },
          (message) => {
            if (message.type === 'document') {
              epoch.current = message.epoch
              setHandle(null)
              setHeight(undefined)
            } else if (message.type === 'handle') {
              setHandle(
                message.methods.length ? bridge.createHandle(message.methods) : null
              )
            } else if (message.type === 'size') {
              setHeight((current) =>
                current === message.height ? current : message.height
              )
            } else if (message.type === 'error') {
              report(Object.assign(new Error(message.error.message), message.error))
            }
          },
          report,
          __DEV__
        )
    )
    const prepared = bridge.prepare(serialized)
    useLayoutEffect(() => {
      options.current = dom
      bridge.commit(prepared)
    })
    useLayoutEffect(() => {
      const generation = ++mountGeneration.current
      return () => {
        // strict mode rehearses effect cleanup without replacing the host document.
        queueMicrotask(() => {
          if (mountGeneration.current === generation) bridge.dispose()
        })
      }
    }, [bridge])
    useImperativeHandle(ref, () => handle as Handle, [handle])
    const guard = (callback: () => void) => {
      try {
        callback()
      } catch (error) {
        bridge.dispose()
        report(error)
      }
    }
    const developmentURL = __DEV__
      ? new URL(`/_one/dom/${encodeURIComponent(entryId)}/`, getDevServer().url).href
      : undefined
    return (
      <OneDOMHost
        ref={host}
        entryId={entryId}
        developmentURL={developmentURL}
        bootstrapState={JSON.stringify({
          version: DOM_PROTOCOL_VERSION,
          ...prepared.state,
        })}
        scrollEnabled={dom?.scrollEnabled ?? true}
        style={[
          dom?.style,
          dom?.matchContents && height !== undefined ? { height } : undefined,
        ]}
        onDocumentStart={({ nativeEvent }) =>
          guard(() => bridge.startDocument(nativeEvent.epoch, nativeEvent.revision))
        }
        onMessage={({ nativeEvent }) => guard(() => bridge.receive(nativeEvent.message))}
        onLoad={({ nativeEvent }) => {
          if (nativeEvent.epoch === epoch.current)
            options.current?.onLoad?.({ entryId, epoch: nativeEvent.epoch })
        }}
        onError={({ nativeEvent }) => {
          if (nativeEvent.epoch === epoch.current) {
            bridge.dispose()
            report(new DOMBridgeError(nativeEvent.message, nativeEvent.code))
          }
        }}
        onProcessTerminated={({ nativeEvent }) => {
          if (nativeEvent.epoch !== epoch.current) return
          bridge.dispose()
          report(
            new DOMBridgeError(
              'One DOM browser process terminated',
              'DOM_PROCESS_TERMINATED'
            )
          )
        }}
      />
    )
  })
  DOMComponent.displayName = `OneDOM(${entryId})`
  return DOMComponent
}
