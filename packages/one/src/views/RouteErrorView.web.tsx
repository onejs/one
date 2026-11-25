import { cleanErrorStack } from './cleanErrorStack'
import type { RouteErrorViewProps } from './RouteErrorView'

const sans =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

function Frames({ title, frames }: { title: string; frames: string[] }) {
  if (!frames.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ color: '#777', fontSize: 12, fontFamily: sans }}>{title}</div>
      <pre
        style={{
          margin: 0,
          color: '#a3a3a3',
          fontSize: 12,
          lineHeight: '18px',
          fontFamily: mono,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
        }}
      >
        {frames.join('\n')}
      </pre>
    </div>
  )
}

export function RouteErrorView({
  routeName,
  error,
  errorInfo,
  onRetry,
}: RouteErrorViewProps) {
  return (
    <div
      style={{
        minHeight: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#0c0c0c',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{ color: '#ff6363', fontSize: 13, fontWeight: 600, fontFamily: sans }}
        >
          Error on route "{routeName}"
        </div>
        <div
          style={{
            color: '#f5f5f5',
            fontSize: 17,
            lineHeight: '24px',
            fontWeight: 500,
            fontFamily: sans,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        >
          {error instanceof Error ? error.message : String(error)}
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: '7px 14px',
            border: 'none',
            borderRadius: 8,
            backgroundColor: '#f5f5f5',
            color: '#0c0c0c',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: sans,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
      <Frames
        title="Stack"
        frames={error instanceof Error && error.stack ? cleanErrorStack(error.stack) : []}
      />
      <Frames
        title="Component stack"
        frames={
          errorInfo?.componentStack ? cleanErrorStack(errorInfo.componentStack) : []
        }
      />
    </div>
  )
}
