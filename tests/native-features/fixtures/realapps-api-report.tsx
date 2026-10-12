import { Component, useCallback, useEffect, useState, type ReactNode } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'

export type Status =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'observed'
  | 'unsupported'
export type Result = {
  api: string
  status: Status
  value?: unknown
  error?: unknown
  scope?: string
}
export type Report = (
  api: string,
  status: Status,
  value?: unknown,
  scope?: string
) => void

export function exactError(error: unknown) {
  if (error && typeof error === 'object') {
    const value = error as {
      name?: unknown
      message?: unknown
      code?: unknown
      actual?: unknown
    }
    return {
      name: value.name,
      message: value.message ?? String(error),
      code: value.code,
      actual: value.actual,
    }
  }
  return { message: String(error) }
}

export function assert(
  condition: unknown,
  message: string,
  actual?: unknown
): asserts condition {
  if (!condition) throw Object.assign(new Error(message), { actual })
}

export function useResults(apis: readonly string[]) {
  const [results, setResults] = useState<Record<string, Result>>(() =>
    Object.fromEntries(apis.map((api) => [api, { api, status: 'pending' }]))
  )
  const report: Report = useCallback((api, status, value, scope) => {
    setResults((current) => ({ ...current, [api]: { api, status, value, scope } }))
  }, [])
  const run = useCallback(
    async (
      api: string,
      action: () => unknown | Promise<unknown>,
      status: Status = 'passed',
      scope?: string
    ) => {
      report(api, 'running')
      try {
        report(api, status, await action(), scope)
      } catch (error) {
        setResults((current) => ({
          ...current,
          [api]: { api, status: 'failed', error: exactError(error) },
        }))
      }
    },
    [report]
  )
  return { results, report, run }
}

// undefined is an actual void result, preserved instead of disappearing from json.
export function Results({ results }: { results: Record<string, Result> }) {
  const json = JSON.stringify({ schema: 1, results }, (_key, value) =>
    value === undefined ? { $undefined: true } : value
  )
  useEffect(() => {
    if (Object.values(results).every((result) => result.status === 'pending')) return
    // the runner owns this receipt collector independently of the app server.
    const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost'
    void fetch(`http://${host}:8149/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
    }).then((response) => {
      if (!response.ok) throw new Error(`Receipt collector HTTP ${response.status}`)
    })
  }, [json])
  return (
    <Text
      selectable
      numberOfLines={1}
      testID="realapps-api-results"
      accessibilityLabel={json}
    >
      {json}
    </Text>
  )
}

export function Action({
  id,
  children,
  onPress,
}: {
  id: string
  children: ReactNode
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={`realapps-api-${id}`}
      onPress={onPress}
      style={{ padding: 10, backgroundColor: '#eee' }}
    >
      <Text>{children}</Text>
    </Pressable>
  )
}

export class Boundary extends Component<
  { api: string; report: Report; children: ReactNode },
  { error: unknown }
> {
  state = { error: null as unknown }
  static getDerivedStateFromError(error: unknown) {
    return { error }
  }
  componentDidCatch(error: unknown) {
    this.props.report(this.props.api, 'failed', exactError(error), 'render exception')
  }
  render() {
    return this.state.error ? (
      <View>
        <Text testID="realapps-api-render-error">
          {JSON.stringify(exactError(this.state.error))}
        </Text>
      </View>
    ) : (
      this.props.children
    )
  }
}
