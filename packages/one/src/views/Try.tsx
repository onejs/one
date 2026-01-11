import React from 'react'

/**
 * Route context information passed to error boundaries.
 * Provides details about where the error occurred.
 */
export type ErrorRouteInfo = {
  /** The current pathname (e.g., "/users/123") */
  pathname?: string
  /** The route name/key (e.g., "users/[id]") */
  routeName?: string
  /** Route parameters extracted from the path */
  params?: Record<string, string | string[]>
  /** The error type classification */
  errorType?: 'render' | 'loader' | 'hydration'
  /** Component stack trace from React */
  componentStack?: string
}

/** Props passed to a page's `ErrorBoundary` export. */
export type ErrorBoundaryProps = {
  /** Retry rendering the component by clearing the `error` state. */
  retry: () => Promise<void>
  /** The error that was thrown. */
  error: Error
  /** Route information about where the error occurred. */
  route?: ErrorRouteInfo
}

type TryProps = {
  catch: React.ComponentType<ErrorBoundaryProps>
  children: React.ReactNode
  /** Optional route information to pass to the error boundary */
  routeInfo?: ErrorRouteInfo
}

type TryState = {
  error?: Error
  componentStack?: string
}

// No way to access `getDerivedStateFromError` from a functional component afaict.
export class Try extends React.Component<TryProps, TryState> {
  state: TryState = { error: undefined, componentStack: undefined }

  static getDerivedStateFromError(error: Error) {
    // Force hide the splash screen if an error occurs.
    // SplashScreen.hideAsync()

    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Store component stack for debugging
    this.setState({ componentStack: errorInfo.componentStack || undefined })

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      const routeInfo = this.props.routeInfo
      console.error(
        `[One] Error in route${routeInfo?.routeName ? ` "${routeInfo.routeName}"` : ''}:`,
        error,
        '\nComponent Stack:',
        errorInfo.componentStack
      )
    }

    // Dispatch error event for devtools integration
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('one-error', {
          detail: {
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
            route: this.props.routeInfo || {},
            componentStack: errorInfo.componentStack,
            timestamp: Date.now(),
            type: 'render',
          },
        })
      )
    }
  }

  retry = () => {
    return new Promise<void>((resolve) => {
      this.setState({ error: undefined, componentStack: undefined }, () => {
        resolve()
      })
    })
  }

  render() {
    const { error, componentStack } = this.state
    const { catch: ErrorBoundary, children, routeInfo } = this.props

    if (!error) {
      return children
    }

    // Combine route info with component stack
    const enhancedRouteInfo: ErrorRouteInfo = {
      ...routeInfo,
      errorType: 'render',
      componentStack,
    }

    return <ErrorBoundary error={error} retry={this.retry} route={enhancedRouteInfo} />
  }
}
