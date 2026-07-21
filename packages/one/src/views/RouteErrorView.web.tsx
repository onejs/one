import type { RouteErrorViewProps } from './RouteErrorView'

const mono = { color: 'white', fontFamily: 'monospace', margin: 0 } as const

export function RouteErrorView({
  routeName,
  error,
  errorInfo,
  onRetry,
}: RouteErrorViewProps) {
  return (
    <div style={{ backgroundColor: '#000', padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <span
            style={{
              padding: 5,
              backgroundColor: 'red',
              color: 'white',
              fontSize: 20,
              fontFamily: 'monospace',
            }}
          >
            Error on route "{routeName}"
          </span>
        </div>
        <pre style={{ ...mono, fontSize: 16, whiteSpace: 'pre-wrap' }}>
          {error instanceof Error ? error.message : String(error)}
        </pre>
        <div>
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: 6,
              border: 'none',
              backgroundColor: 'white',
              color: 'black',
              fontSize: 14,
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error instanceof Error ? (
            <pre style={{ ...mono, fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {error.stack}
            </pre>
          ) : null}
          {errorInfo?.componentStack ? (
            <pre style={{ ...mono, fontSize: 12, whiteSpace: 'pre-wrap' }}>
              Component Stack: {errorInfo.componentStack}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  )
}
