import { isValidElement } from 'react'

type Props = Record<string, any>

export type FoundRootHTML = {
  children: React.ReactElement
  htmlProps?: Props
  bodyProps?: Props
  head?: React.ReactElement
}

/**
 * To enable custom <html> and other html-like stuff in the root _layout
 * we are doing some fancy stuff, namely, just capturing the root layout return
 * value and deep-mapping over it.
 *
 * On server, we filter it out and hoist it to the parent root html in createApp
 *
 * On client, we just filter it out completely as in One we don't hydrate html
 */

export function filterRootHTML(el: React.ReactNode): FoundRootHTML {
  let htmlProps: Props | undefined
  let bodyProps: Props | undefined
  let head: React.ReactElement | undefined

  function traverse(element: React.ReactNode) {
    if (!element || typeof element !== 'object') {
      return element
    }
    if (Array.isArray(element)) {
      return element.map(traverse)
    }

    const reactElement = element as React.ReactElement
    const { type, props } = reactElement

    if (type === 'html') {
      if (props && typeof props === 'object' && 'children' in props) {
        const { children, ...restProps } = props
        htmlProps = restProps
        return traverse(children as React.ReactNode)
      }
      return null
    }

    if (type === 'head') {
      head = reactElement
      return null
    }

    if (type === 'body') {
      if (props && typeof props === 'object' && 'children' in props) {
        const { children, ...restProps } = props
        bodyProps = restProps
        if (process.env.TAMAGUI_TARGET === 'native') {
          // must traverse children so nested HTML elements (e.g. <div>) get filtered on native
          return traverse(children as React.ReactNode)
        }
        return children as React.ReactNode
      }
      return null
    }

    if (process.env.TAMAGUI_TARGET === 'native') {
      if (
        isValidElement(element) &&
        typeof element.type === 'string' &&
        element.type.toLowerCase() === element.type
      ) {
        // filter out HTML elements on native (e.g. <div>, <meta>)
        // preserve children so <div><Slot/></div> renders <Slot/> instead of nothing
        if (element.props && typeof element.props === 'object' && 'children' in element.props) {
          return traverse(element.props.children as React.ReactNode)
        }
        return null
      }
    }

    return element
  }

  const children =
    traverse(el) ||
    // if none found, we assume they aren't returning any html so just pass it on
    el

  return {
    children,
    htmlProps,
    bodyProps,
    head,
  }
}
