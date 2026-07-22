import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import * as React from 'react'
import { Link } from '../link/Link'
import { matchDeepDynamicRouteName } from '../router/matchers'
import type { RouteNode } from '../router/Route'
import { getSortedRoutes } from '../router/router'

const INDENT = 24

export function getNavOptions(): NativeStackNavigationOptions {
  return {
    title: 'sitemap',
    headerShown: false,
    presentation: 'modal',
    animation: 'default',
    headerLargeTitle: false,
    headerTitleStyle: { color: 'white' },
    headerTintColor: 'white',
    headerLargeTitleStyle: { color: 'white' },
    headerStyle: { backgroundColor: 'black' },
  }
}

export function Sitemap() {
  return (
    <main
      style={{
        minHeight: '100vh',
        boxSizing: 'border-box',
        backgroundColor: 'black',
        color: 'white',
        padding: 12,
      }}
    >
      <div style={{ width: 'min(960px, 90vw)', margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, margin: '12px 0 20px' }}>Sitemap</h1>
        {getSortedRoutes().map((route) => (
          <div
            key={route.contextKey}
            style={{
              border: '1px solid #323232',
              borderRadius: 19,
              marginBottom: 12,
              overflow: 'hidden',
            }}
          >
            <FileItem route={route} />
          </div>
        ))}
      </div>
    </main>
  )
}

function FileItem({
  route,
  level = 0,
  parents = [],
  isInitial = false,
}: {
  route: RouteNode
  level?: number
  parents?: string[]
  isInitial?: boolean
}) {
  const disabled = route.children.length > 0
  const segments = React.useMemo(
    () => [...parents, ...route.route.split('/')],
    [parents, route.route]
  )
  const href = React.useMemo(
    () =>
      '/' +
      segments
        .map((segment) => {
          if (matchDeepDynamicRouteName(segment)) {
            return `${segment}/${Date.now()}`
          }
          return segment === 'index' ? '' : segment
        })
        .filter(Boolean)
        .join('/'),
    [segments]
  )
  const filename = React.useMemo(() => {
    const contextSegments = route.contextKey.split('/')
    if (route.contextKey.match(/_layout\.[jt]sx?$/)) {
      return contextSegments.slice(-2).join('/')
    }
    return contextSegments.slice(-route.route.split('/').length).join('/')
  }, [route])
  const content = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        minHeight: 56,
        boxSizing: 'border-box',
        padding: `16px ${INDENT}px 16px ${INDENT + level * INDENT}px`,
        color: 'white',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: 20 }}>
        {route.children.length ? '🗀' : '📄'} {filename}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {(isInitial || route.generated) && (
          <span style={{ fontSize: 13 }}>{isInitial ? 'Initial' : 'Virtual'}</span>
        )}
        {!disabled && <span aria-hidden="true">›</span>}
      </span>
    </div>
  )

  return (
    <>
      {!route.internal &&
        (disabled ? (
          content
        ) : (
          <Link
            href={href}
            replace
            accessibilityLabel={route.contextKey}
            style={
              {
                display: 'block',
                textDecoration: 'none',
              } satisfies React.CSSProperties as any
            }
          >
            {content}
          </Link>
        ))}
      {route.children.map((child) => (
        <FileItem
          key={child.contextKey}
          route={child}
          isInitial={route.initialRouteName === child.route}
          parents={segments}
          level={level + (route.generated ? 0 : 1)}
        />
      ))}
    </>
  )
}
