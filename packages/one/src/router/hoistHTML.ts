import { cloneElement, createContext, useContext, useEffect, useState } from 'react'

// stores [html, head, body]
// for html and body just the tag itself no children
// for head it contains the inner children as well
type FoundHTML = [React.ReactNode, React.ReactNode, React.ReactNode]

export const HoistHTMLContext = createContext<((props: FoundHTML) => void) | null>(null)

/**
 * To enable custom <html> and other html-like stuff in the root _layout
 * we are doing some fancy stuff, namely, just capturing the root layout return
 * value and deep-mapping over it.
 *
 * On server, we filter it out and hoist it to the parent root html in createApp
 *
 * On client, we just filter it out completely as in One we don't hydrate html
 */

export function useFilteredAndHoistedRootHTML(rootEl: React.ReactNode) {
  const hoistHTML = useContext(HoistHTMLContext)
  if (!hoistHTML) {
    throw new Error(`‼️ 01`)
  }

  const [filteredChildren, rootElements] = filterRootElements(rootEl)
  const rootElementsKey = rootElements.map(hashElements).join('')

  console.log('got', { filteredChildren, rootElements, rootElementsKey })

  useEffect(() => {
    hoistHTML(rootElements)
  }, [rootElementsKey])

  return filteredChildren
}

// quick and dirty uid based on react elements (recursive)
function hashElements(el: React.ReactNode) {
  if (!el || typeof el !== 'object') return ''
  if (Array.isArray(el)) return el.map(hashElements).join('')
  const element = el as React.ReactElement
  const type = typeof element.type === 'string' ? element.type : ''
  const props = element.props
    ? Object.keys(element.props)
        .sort()
        .map((key) => key + hashElements((element.props as any)[key]))
        .join('')
    : ''
  return type + props
}

// recursively loop over elements, find:
//  1. html tag, get the props (no children)
//  2. body tag, get the props (no children)
//  3. head tag, get the props (include children)
// removes html, body, head and leaves the rest
// returns [theReaminingElements, [html, head, body]]
function filterRootElements(el: React.ReactNode): [React.ReactNode, FoundHTML] {
  let html: React.ReactNode = null
  let head: React.ReactNode = null
  let body: React.ReactNode = null
  const remainingElements: React.ReactNode[] = []

  function traverse(element: React.ReactNode) {
    if (!element || typeof element !== 'object') {
      remainingElements.push(element)
      return
    }

    if (Array.isArray(element)) {
      element.forEach(traverse)
      return
    }

    const reactElement = element as React.ReactElement
    const { type, props } = reactElement

    if (type === 'html') {
      html = cloneElement(reactElement, { ...props, children: null })
    } else if (type === 'head') {
      head = reactElement
    } else if (type === 'body') {
      body = cloneElement(reactElement, { ...props, children: null })
    } else {
      remainingElements.push(
        cloneElement(reactElement, {
          ...props,
          children: props.children ? traverse(props.children) : null,
        })
      )
    }
  }

  traverse(el)

  return [remainingElements, [html, head, body]] as const
}
