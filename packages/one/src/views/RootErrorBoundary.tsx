import React from 'react'
import { Text, View } from 'react-native'

type RootErrorBoundaryState = {
  hasError: boolean
  error: Error | null
  componentStack: string | null
}

export class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = {
    hasError: false,
    error: null,
    componentStack: null,
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ componentStack: info.componentStack || null })

    console.error(
      `[One] Root error boundary caught error:\n${printError(error)}\n${info.componentStack}`
    )
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, componentStack: null })
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state

      return (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0f',
            padding: 24,
          }}
        >
          <View
            style={{
              width: 64,
              height: 64,
              backgroundColor: '#ef4444',
              borderRadius: 32,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Text style={{ color: 'white', fontSize: 32 }}>!</Text>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#e8e8e8',
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#888',
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            {error?.message || 'An unexpected error occurred'}
          </Text>
        </View>
      )
    }

    return this.props.children
  }
}

function printError(err: unknown): string {
  return err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
}
