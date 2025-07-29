import React from 'react'
import { View, Text } from 'react-native'

export default function Route() {
  return React.createElement(
    View,
    { style: { flex: 1, justifyContent: 'center', alignItems: 'center' } },
    React.createElement(
      Text,
      {
        style: { color: 'black', backgroundColor: 'white' },
      },
      'You should not see this page in the app. It should be ignored via the `ignoredRouteFiles` option in `vite.config.ts`.'
    )
  )
}
