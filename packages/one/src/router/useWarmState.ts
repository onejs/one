import {
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react'
import { getContextKey } from './matchers'
import { RouteParamsContext, useRouteNode } from './Route'
import { registerWarmStateSource, scheduleWarmStatePersist } from './warmState'

type Values = Record<string, unknown>

// what the last session saved, each value read once by the first mount of its screen
let saved: Values = {}
// what mounted screens hold now, which is all the next save writes: a screen
// that was left takes its values with it
const live = new Map<string, unknown>()

registerWarmStateSource<Values>('one:screen', {
  getSnapshot: () => Object.fromEntries(live),
  hydrate: (value) => {
    saved = { ...value }
  },
  validate: (value): value is Values =>
    !!value && typeof value === 'object' && !Array.isArray(value),
})

/**
 * useState for where the user is: a value that belongs to the screen it is
 * read in and comes back when warm start reopens that screen. leaving the
 * screen drops it, so nothing outlives the place it describes.
 */
export function useWarmState<T>(
  key: string,
  initial: T | (() => T),
  validate?: (value: unknown) => value is T
): [T, Dispatch<SetStateAction<T>>] {
  const node = useRouteNode()
  const params = useContext(RouteParamsContext)
  const id = `${node ? getContextKey(node.contextKey) : ''}${
    params && Object.keys(params).length ? JSON.stringify(params) : ''
  }#${key}`
  const [value, setValue] = useState<T>(() => {
    if (id in saved) {
      const restored = saved[id]
      delete saved[id]
      if (!validate || validate(restored)) return restored as T
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial
  })
  useEffect(
    () => () => {
      live.delete(id)
      scheduleWarmStatePersist()
    },
    [id]
  )
  useEffect(() => {
    live.set(id, value)
    scheduleWarmStatePersist()
  }, [id, value])
  return [value, setValue]
}
