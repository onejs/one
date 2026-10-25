import {
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useState,
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
  const [lifetime] = useState(() => ({
    live: false,
    methods: null as DOMImperativeHandle | null,
    pending: new Set<(error: Error) => void>(),
  }))
  const binding = useMemo(() => {
    const methods = factory()
    const wrapped: DOMImperativeHandle = Object.create(null)
    for (const name of Object.keys(methods)) {
      if (
        typeof (methods as DOMImperativeHandle)[name] !== 'function' ||
        name === 'then'
      ) {
        throw new DOMBridgeError(`Invalid DOM imperative method ${name}`)
      }
      wrapped[name] = (...args) =>
        new Promise((resolve, reject) => {
          if (!lifetime.live)
            throw new DOMBridgeError('DOM handle is disposed', 'DOM_DISPOSED')
          const committed = lifetime.methods
          if (!committed || !Object.hasOwn(committed, name)) {
            throw new DOMBridgeError(
              `DOM method ${name} is unavailable`,
              'DOM_METHOD_UNAVAILABLE'
            )
          }
          const method = committed[name]
          const input = serializeData(args, 'arguments') as DOMValue[]
          lifetime.pending.add(reject)
          void Promise.resolve()
            .then(() => {
              if (!lifetime.live)
                throw new DOMBridgeError('DOM handle is disposed', 'DOM_DISPOSED')
              return method.apply(committed, input)
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
    return { wrapped: wrapped as T, methods: methods as DOMImperativeHandle }
  }, deps)

  useLayoutEffect(() => {
    lifetime.live = true
    return () => {
      lifetime.live = false
      lifetime.methods = null
      for (const reject of lifetime.pending)
        reject(new DOMBridgeError('DOM handle is disposed', 'DOM_DISPOSED'))
      lifetime.pending.clear()
    }
  }, [bridge, lifetime])
  useLayoutEffect(() => {
    lifetime.methods = binding.methods
    return bridge?.setHandle(binding.wrapped)
  }, [bridge, binding, lifetime])
  useImperativeHandle(ref, () => binding.wrapped, [binding])
}
