import React from 'react'
import type { ErrorBoundaryProps } from './Try'

/**
 * Default error boundary component for web.
 * Shows a user-friendly error message with retry capability.
 *
 * This component is used when:
 * - A route doesn't export its own ErrorBoundary
 * - An error occurs during rendering
 *
 * Users can override this by exporting their own ErrorBoundary from a route.
 */
export function ErrorBoundary({ error, retry, route }: ErrorBoundaryProps) {
  const isDev = process.env.NODE_ENV === 'development'

  // Dispatch error event for devtools
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('one-error', {
          detail: {
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
            route: route || {},
            timestamp: Date.now(),
            type: 'render',
          },
        })
      )
    }
  }, [error, route])

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
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
          backgroundColor: '#1a1a2e',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px', color: 'white' }}>
              Something went wrong
            </div>
            {route?.pathname && (
              <div
                style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.8)',
                  marginTop: '2px',
                }}
              >
                on {route.pathname}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Error message */}
          <div
            style={{
              backgroundColor: '#2a2a4a',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.5',
                color: '#f87171',
                wordBreak: 'break-word',
              }}
            >
              {error.message || 'An unexpected error occurred'}
            </div>
          </div>

          {/* Stack trace (dev only) */}
          {isDev && error.stack && (
            <details
              style={{
                marginBottom: '16px',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#888',
                  marginBottom: '8px',
                }}
              >
                Stack trace
              </summary>
              <div
                style={{
                  backgroundColor: '#16162a',
                  borderRadius: '8px',
                  padding: '12px',
                  maxHeight: '200px',
                  overflow: 'auto',
                }}
              >
                <pre
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    lineHeight: '1.6',
                    color: '#a0a0a0',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {error.stack}
                </pre>
              </div>
            </details>
          )}

          {/* Route info (dev only) */}
          {isDev && route && (
            <details
              style={{
                marginBottom: '16px',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#888',
                  marginBottom: '8px',
                }}
              >
                Route info
              </summary>
              <div
                style={{
                  backgroundColor: '#16162a',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '8px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              >
                {route.pathname && (
                  <>
                    <span style={{ color: '#888' }}>pathname</span>
                    <span style={{ color: '#e8e8e8' }}>{route.pathname}</span>
                  </>
                )}
                {route.routeName && (
                  <>
                    <span style={{ color: '#888' }}>route</span>
                    <span style={{ color: '#e8e8e8' }}>{route.routeName}</span>
                  </>
                )}
                {route.params && Object.keys(route.params).length > 0 && (
                  <>
                    <span style={{ color: '#888' }}>params</span>
                    <span style={{ color: '#e8e8e8' }}>
                      {JSON.stringify(route.params)}
                    </span>
                  </>
                )}
              </div>
            </details>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => retry()}
              style={{
                flex: 1,
                padding: '12px 20px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6'
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/'
                }
              }}
              style={{
                padding: '12px 20px',
                backgroundColor: 'transparent',
                color: '#888',
                border: '1px solid #3a3a5a',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2a2a4a'
                e.currentTarget.style.color = '#e8e8e8'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#888'
              }}
            >
              Go Home
            </button>
          </div>
        </div>

        {/* Footer */}
        {isDev && (
          <div
            style={{
              padding: '12px 20px',
              backgroundColor: '#16162a',
              borderTop: '1px solid #2a2a4a',
              fontSize: '11px',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#666"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span>
              Press{' '}
              <kbd
                style={{
                  padding: '2px 6px',
                  backgroundColor: '#2a2a4a',
                  borderRadius: '4px',
                }}
              >
                Alt+E
              </kbd>{' '}
              to open Error Panel
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
