import { Component, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useSearchParams } from 'one'
import { z } from 'zod'

// no catch or default on a bad value, so a malformed url throws while rendering
export const sortParams = z.object({
  sort: z.enum(['asc', 'desc']).default('asc'),
})

export function StrictSort() {
  const [{ sort }] = useSearchParams(sortParams)
  return <Text testID="sort-value">sort {sort}</Text>
}

export class SortBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <View testID="sort-error">
          <Text>sort failed: {this.state.error.message}</Text>
        </View>
      )
    }
    return this.props.children
  }
}
