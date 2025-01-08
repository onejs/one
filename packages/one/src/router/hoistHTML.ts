import { cloneElement, createContext, useContext } from 'react'

// stores [html, head, body]
// for html and body just the tag itself no children
// for head it contains the inner children as well
export type FoundHTML = [
  React.ReactElement | null,
  React.ReactElement | null,
  React.ReactElement | null,
]

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

// recursively loop over elements, find:
//  1. html tag, get the props (no children)
//  2. body tag, get the props (no children)
//  3. head tag, get the props (include children)
// removes html, body, head and leaves the rest
// returns [theReaminingElements, [html, head, body]]
export function filterRootHTML(el: React.ReactNode): [React.ReactNode, FoundHTML] {
  let html: React.ReactElement | null = null
  let head: React.ReactElement | null = null
  let body: React.ReactElement | null = null
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
      const children = reactElement.props.children
      if (children) traverse(children)
    } else if (type === 'head') {
      head = reactElement
    } else if (type === 'body') {
      body = cloneElement(reactElement, { ...props, children: null })
      traverse(reactElement.props.children)
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
