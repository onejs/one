import type * as React from 'react'
import { type GestureResponderEvent } from 'react-native'
export declare function useLinkTo(props: { href: string; replace?: boolean }): {
  href: string
  role: 'link'
  onPress: (
    e?: React.MouseEvent<HTMLAnchorElement, MouseEvent> | GestureResponderEvent
  ) => void
}
//# sourceMappingURL=useLinkTo.d.ts.map
