import { createContext, useContext, type Context } from 'react'

// react-navigation keeps its shared contexts in one global map keyed by name,
// so every package reaches the same instance. reading HeaderHeightContext
// through that map gives the header height without importing
// @react-navigation/elements, whose asset imports break server bundles. if
// this runs first it creates the context under that name, and elements reuses
// it.
const contextsKey = '__react_navigation__elements_contexts'
const contextName = 'HeaderHeightContext'

let headerHeightContext: Context<number | undefined> | undefined

function getHeaderHeightContext(): Context<number | undefined> {
  if (headerHeightContext) return headerHeightContext
  let contexts: Map<string, Context<number | undefined>> | undefined = Reflect.get(
    globalThis,
    contextsKey
  )
  if (!contexts) {
    contexts = new Map()
    Reflect.set(globalThis, contextsKey, contexts)
  }
  let context = contexts.get(contextName)
  if (!context) {
    context = createContext<number | undefined>(undefined)
    context.displayName = contextName
    contexts.set(contextName, context)
  }
  headerHeightContext = context
  return context
}

/**
 * the height of the navigator header drawn above this screen, status bar
 * included, in points. 0 where the screen shows no header.
 */
export function useHeaderHeight(): number {
  return useContext(getHeaderHeightContext()) ?? 0
}
