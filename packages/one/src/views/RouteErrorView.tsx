import type { ErrorInfo } from 'react'
import { Platform, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native'
import { cleanErrorStack } from './cleanErrorStack'

export type RouteErrorViewProps = {
  routeName: string
  error: unknown
  errorInfo: ErrorInfo | null
  onRetry: () => void
}

const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace'

function Frames({ title, frames }: { title: string; frames: string[] }) {
  if (!frames.length) return null
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: '#777', fontSize: 12 }}>{title}</Text>
      <Text
        selectable
        style={{ color: '#a3a3a3', fontSize: 11, lineHeight: 17, fontFamily: mono }}
      >
        {frames.join('\n')}
      </Text>
    </View>
  )
}

export function RouteErrorView({
  routeName,
  error,
  errorInfo,
  onRetry,
}: RouteErrorViewProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0c0c0c' }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ color: '#ff6363', fontSize: 13, fontWeight: '600' }}>
            Error on route "{routeName}"
          </Text>
          <Text
            selectable
            style={{ color: '#f5f5f5', fontSize: 17, lineHeight: 24, fontWeight: '500' }}
          >
            {error instanceof Error ? error.message : String(error)}
          </Text>
        </View>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            paddingVertical: 7,
            paddingHorizontal: 14,
            borderRadius: 8,
            backgroundColor: '#f5f5f5',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: '#0c0c0c', fontSize: 14, fontWeight: '500' }}>Retry</Text>
        </Pressable>
        <Frames
          title="Stack"
          frames={
            error instanceof Error && error.stack ? cleanErrorStack(error.stack) : []
          }
        />
        <Frames
          title="Component stack"
          frames={
            errorInfo?.componentStack ? cleanErrorStack(errorInfo.componentStack) : []
          }
        />
      </ScrollView>
    </SafeAreaView>
  )
}
