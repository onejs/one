import {
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  type DependencyList,
  type Ref,
} from 'react'
import { DOMBridgeContext } from './context'
import {
  deserializeError,
  DOMBridgeError,
  serializeData,
  serializeError,
} from './serialize'
import type { DOMImperativeHandle, DOMValue } from './types'

export type {
  DOMProps,
  DOMValue,
  DOMError,
  DOMErrorEvent,
  DOMLoadEvent,
  DOMImperativeHandle,
  DOMAction,
} from './types'

/** expose async methods on both inline web components and hosted native components. */
export function useDOMImperativeHandle<
  T extends { [K in keyof T]: (...args: any[]) => Promise<DOMValue | void> },
>(ref: Ref<T> | undefined, factory: () => T, deps: DependencyList) {
  const bridge = useContext(DOMBridgeContext)
  const binding = useMemo(() => {
    const methods = factory()
    const wrapped: DOMImperativeHandle = Object.create(null)
    const lifetime = { live: false, pending: new Set<(error: Error) => void>() }
    for (const name of Object.keys(methods)) {
      const method = (methods as DOMImperativeHandle)[name]
      if (typeof method !== 'function' || name === 'then') {
        throw new DOMBridgeError(`Invalid DOM imperative method ${name}`)
      }
      wrapped[name] = (...args) =>
        new Promise((resolve, reject) => {
          if (!lifetime.live)
            throw new DOMBridgeError('DOM handle is disposed', 'DOM_DISPOSED')
          const input = serializeData(args, 'arguments') as DOMValue[]
          lifetime.pending.add(reject)
          void Promise.resolve()
            .then(() => {
              if (!lifetime.live)
                throw new DOMBridgeError('DOM handle is disposed', 'DOM_DISPOSED')
              return method.apply(methods, input)
            })
            .then(
              (result) => {
                if (!lifetime.pending.delete(reject)) return
                try {
                  resolve(
                    result === undefined ? undefined : serializeData(result, 'result')
                  )
                } catch (error) {
                  reject(error)
                }
              },
              (error) => {
                if (lifetime.pending.delete(reject))
                  reject(
                    deserializeError(
                      serializeError(error, process.env.NODE_ENV !== 'production')
                    )
                  )
              }
            )
        })
    }
    return { wrapped: wrapped as T, lifetime }
  }, deps)

  useLayoutEffect(() => {
    binding.lifetime.live = true
    const unregister = bridge?.setHandle(binding.wrapped)
    return () => {
      binding.lifetime.live = false
      for (const reject of binding.lifetime.pending)
        reject(new DOMBridgeError('DOM handle is disposed', 'DOM_DISPOSED'))
      binding.lifetime.pending.clear()
      unregister?.()
    }
  }, [bridge, binding])
  useImperativeHandle(ref, () => binding.wrapped, [binding])
}
