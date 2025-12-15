import {
  isValidElement,
  type JSXElementConstructor,
  type ReactElement,
  type ReactNode,
} from 'react'

/**
 * Type-safe check if a React element is of a specific component type.
 * Used for filtering children in compositional APIs.
 */
export function isChildOfType<ComponentT extends JSXElementConstructor<any>>(
  element: ReactNode,
  type: ComponentT
): element is ReactElement<React.ComponentProps<ComponentT>, ComponentT> {
  return isValidElement(element) && element.type === type
}

/**
 * Get the first child element of a specific type.
 */
export function getFirstChildOfType<ComponentT extends JSXElementConstructor<any>>(
  children: ReactNode,
  type: ComponentT
): ReactElement<React.ComponentProps<ComponentT>, ComponentT> | undefined {
  const childArray = Array.isArray(children) ? children : [children]
  for (const child of childArray) {
    if (isChildOfType(child, type)) {
      return child
    }
  }
  return undefined
}

/**
 * Get all children of a specific type.
 */
export function getAllChildrenOfType<ComponentT extends JSXElementConstructor<any>>(
  children: ReactNode,
  type: ComponentT
): ReactElement<React.ComponentProps<ComponentT>, ComponentT>[] {
  const childArray = Array.isArray(children) ? children : [children]
  return childArray.filter(
    (child): child is ReactElement<React.ComponentProps<ComponentT>, ComponentT> =>
      isChildOfType(child, type)
  )
}
