import React from 'react'
export declare class RootErrorBoundary extends React.Component<{
  children: any
}> {
  state: {
    hasError: boolean
  }
  static getDerivedStateFromError(error: any): {
    hasError: boolean
  }
  componentDidCatch(error: any, info: any): void
  render(): any
}
//# sourceMappingURL=RootErrorBoundary.d.ts.map
