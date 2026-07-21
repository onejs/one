import type { ErrorInfo } from 'react'
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native'

export type RouteErrorViewProps = {
  routeName: string
  error: unknown
  errorInfo: ErrorInfo | null
  onRetry: () => void
}

export function RouteErrorView({
  routeName,
  error,
  errorInfo,
  onRetry,
}: RouteErrorViewProps) {
  return (
    <SafeAreaView style={{ backgroundColor: '#000' }}>
      <View style={{ margin: 16, gap: 16 }}>
        <Text
          style={{
            alignSelf: 'flex-start',
            padding: 5,
            margin: -5,
            backgroundColor: 'red',
            color: 'white',
            fontSize: 20,
            fontFamily: 'monospace',
          }}
        >
          Error on route "{routeName}"
        </Text>
        <Text style={{ color: 'white', fontSize: 16, fontFamily: 'monospace' }}>
          {error instanceof Error ? error.message : String(error)}
        </Text>
        <TouchableOpacity onPress={onRetry}>
          <Text
            style={{
              alignSelf: 'flex-start',
              margin: -6,
              padding: 6,
              backgroundColor: 'white',
              color: 'black',
              fontSize: 14,
              fontFamily: 'monospace',
            }}
          >
            Retry
          </Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          {error instanceof Error ? (
            <Text style={{ color: 'white', fontSize: 12, fontFamily: 'monospace' }}>
              {error.stack}
            </Text>
          ) : null}
          {errorInfo?.componentStack ? (
            <Text style={{ color: 'white', fontSize: 12, fontFamily: 'monospace' }}>
              Component Stack: {errorInfo.componentStack}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}
