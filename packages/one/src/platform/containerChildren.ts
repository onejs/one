import { Children, createContext, Fragment, isValidElement, type ReactNode } from 'react'
import {
  Image,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput,
  View,
} from 'react-native'

// a slot only works where SwiftUI proposes its box, so containers mark their children
// and a slot marks its own React Native subtree as outside again.
export const InsideContainer = createContext(false)

// the native insertChild preconditions on non-composable children, so the wrappers
// fail first with a JavaScript stack: a denylist, because a custom component that
// renders SwiftUI inside is a function too and must stay legal. composite and
// third-party native views fall through to the native gate.
const reactNativeChildren = new Set<unknown>(
  [View, RNText, Image, RNScrollView, TextInput].filter(Boolean)
)

export function assertOneNativeChildren(children: ReactNode, owner: string) {
  for (const child of Children.toArray(children)) {
    if (child === null || child === undefined || typeof child === 'boolean') continue
    if (typeof child === 'string' || typeof child === 'number')
      throw new Error(`${owner} takes SwiftUI children, not raw text or numbers`)
    if (!isValidElement<{ children?: ReactNode }>(child)) continue
    // a fragment mounts its contents directly, so its children are checked too.
    if (child.type === Fragment) {
      assertOneNativeChildren(child.props.children, owner)
      continue
    }
    if (typeof child.type === 'string' || reactNativeChildren.has(child.type))
      throw new Error(
        `${owner} takes SwiftUI children; move React Native content into Swift.Slot`
      )
  }
}
