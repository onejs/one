import React from 'react'

export class RootErrorBoundary extends React.Component<{ children: any }> {
  state = { hasError: false }

  static getDerivedStateFromError(error) {
    console.error('RootErrorBoundary.error', error)
    // Update state so the next render will show the fallback UI.
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // Example "componentStack":
    //   in ComponentThatThrows (created by App)
    //   in ErrorBoundary (created by App)
    //   in div (created by App)
    //   in App
    console.error(`RootErrorBoundary.error:\n${printError(error)}\n${info.componentStack}`)
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return null
    }

    return this.props.children
  }
}

function printError(err) {
  return `${err instanceof Error ? `${err.message}\n${err.stack}` : err}`
}
