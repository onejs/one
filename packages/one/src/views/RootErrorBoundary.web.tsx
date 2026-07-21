import React from 'react'
import { checkSkewAndReload } from '../skewProtection'
import { handleSkewError, isChunkLoadError } from '../utils/dynamicImport'

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

    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ONE_SKEW_PROTECTION !== 'false'
    ) {
      if (isChunkLoadError(error)) {
        handleSkewError()
      } else {
        checkSkewAndReload()
      }
    }

    window.dispatchEvent(
      new CustomEvent('one-error', {
        detail: {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
          componentStack: info.componentStack,
          timestamp: Date.now(),
          type: 'render',
        },
      })
    )
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, componentStack: null })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const { error } = this.state

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0f',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          color: '#e8e8e8',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              backgroundColor: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>
            {error?.message || 'An unexpected error occurred'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => {
                window.location.href = '/'
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#888',
                border: '1px solid #3a3a5a',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Go Home
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <p style={{ fontSize: 11, color: '#666', marginTop: 24 }}>
              Press Alt+E to view error details
            </p>
          )}
        </div>
      </div>
    )
  }
}

function printError(err: unknown): string {
  return err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
}
