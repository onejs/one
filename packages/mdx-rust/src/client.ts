import * as runtime from 'react/jsx-runtime'

/**
 * Evaluate the `code` returned by `getMDX` into a React component.
 *
 * satteri compiles MDX to a `function-body` module that reads its JSX runtime
 * from `arguments[0]` and returns `{ default, ...exports }`. Render the result
 * with a `components` prop: `<Component components={components} />`.
 *
 * Browser-safe: imports only React, never satteri's native binding.
 */
export function getMDXComponent(
  code: string,
  globals: Record<string, unknown> = {}
): (props: { components?: Record<string, unknown> }) => any {
  // eslint-disable-next-line no-new-func
  const fn = new Function(String(code))
  const mod = fn({ ...runtime, ...globals })
  return mod.default
}
