import { Children, isValidElement, type ReactNode } from 'react'

// config components (Screen, Header, Toolbar, ...) mark themselves with this
// static so navigators can tell config children from custom layout children
export const NAVIGATOR_CONFIG = '__oneNavigatorConfig'

export function isNavigatorConfigChild(child: unknown): boolean {
  return (
    isValidElement(child) &&
    typeof child.type === 'function' &&
    (child.type as any)[NAVIGATOR_CONFIG] === true
  )
}

// the one mechanical rule from plans/headless-navigators.md: a navigator
// child that is not config replaces the headless default on web
export function getCustomNavigatorChildren(children: ReactNode): ReactNode[] {
  const custom: ReactNode[] = []
  Children.forEach(children, (child) => {
    if (child != null && !isNavigatorConfigChild(child)) {
      custom.push(child)
    }
  })
  return custom
}
