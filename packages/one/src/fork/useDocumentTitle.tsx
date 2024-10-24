// No change just vendored to avoid import issue with RR7

import type { NavigationContainerRef, ParamListBase, Route } from '@react-navigation/core'
import * as React from 'react'

type DocumentTitleOptions = {
  enabled?: boolean
  formatter?: (options: Record<string, any> | undefined, route: Route<string> | undefined) => string
}

/**
 * Set the document title for the active screen
 */
export function useDocumentTitle(
  ref: React.RefObject<NavigationContainerRef<ParamListBase>>,
  {
    enabled = true,
    formatter = (options, route) => options?.title ?? route?.name,
  }: DocumentTitleOptions = {}
) {
  React.useEffect(() => {
    if (!enabled) {
      return
    }

    const navigation = ref.current

    if (navigation) {
      const title = formatter(navigation.getCurrentOptions(), navigation.getCurrentRoute())

      document.title = title
    }

    return navigation?.addListener('options', (e) => {
      const title = formatter(e.data.options, navigation?.getCurrentRoute())

      document.title = title
    })
  })
}
