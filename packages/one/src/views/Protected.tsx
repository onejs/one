import { createNavigatorFactory } from '@react-navigation/core'
import {
  type FunctionComponent,
  type ReactElement,
  type ReactNode,
  isValidElement,
} from 'react'

// Get Group component directly from react-navigation core
// (avoids pulling in @react-navigation/elements which has asset imports)
const { Group } = createNavigatorFactory({} as any)()

export type ProtectedProps = {
  guard: boolean
  children?: ReactNode
}

/**
 * Wrap screens in a Protected component to conditionally show/hide them based on the guard prop.
 *
 * When `guard` is `false`, the wrapped screens are filtered out and cannot be navigated to.
 * When `guard` is `true`, the wrapped screens are available for navigation.
 *
 * Works with any navigator: Stack, Tabs, Drawer, or custom Navigator.
 *
 * @example
 * ```tsx
 * import { Stack, Protected } from 'one'
 *
 * export default function Layout() {
 *   const { isAuthed } = useAuth()
 *   return (
 *     <Stack>
 *       <Stack.Screen name="login" />
 *       <Protected guard={isAuthed}>
 *         <Stack.Screen name="dashboard" />
 *         <Stack.Screen name="settings" />
 *       </Protected>
 *     </Stack>
 *   )
 * }
 * ```
 */
export const Protected = Group as FunctionComponent<ProtectedProps>

// Export Group for use in isProtectedElement check
export { Group }

/**
 * Type guard to check if a React element is a Protected component with a guard prop.
 */
export function isProtectedElement(
  child: ReactNode
): child is ReactElement<ProtectedProps> {
  return Boolean(
    isValidElement(child) &&
    child.type === Group &&
    child.props &&
    typeof child.props === 'object' &&
    'guard' in child.props
  )
}
