import { describe, expect, test } from 'vitest'

describe('system widget acceptance', () => {
  const expected = ['Step 2', 'Open probe']
  const leaf = (AXLabel: string, pid: number) => ({
    AXLabel,
    pid,
    frame: { x: 12, y: 12, width: 80, height: 20 },
  })
  test('rejects settled app text and absent or stale native content', async () => {
    const { assertWidgetSurface } =
      await import('../../../tests/native-features/scripts/realapps-widgets')
    expect(() =>
      assertWidgetSurface(
        expected.map((label) => leaf(label, 10)),
        expected,
        [20]
      )
    ).toThrow('Native renderer missing')
    expect(() => assertWidgetSurface([], expected, [20])).toThrow(
      'Native renderer missing'
    )
    expect(() =>
      assertWidgetSurface([leaf('Step 1', 20), leaf('Open probe', 20)], expected, [20])
    ).toThrow('Native renderer missing')
    expect(
      assertWidgetSurface(
        expected.map((label) => leaf(label, 20)),
        expected,
        [20]
      )
    ).toEqual({ pid: 20, expected })
  })
  test('requires one renderer and nonempty native frames', async () => {
    const { assertWidgetSurface } =
      await import('../../../tests/native-features/scripts/realapps-widgets')
    expect(() =>
      assertWidgetSurface(
        [leaf('Step 2', 20), leaf('Open probe', 30)],
        expected,
        [20, 30]
      )
    ).toThrow('Native renderer missing')
    expect(() =>
      assertWidgetSurface(
        expected.map((label) => ({
          ...leaf(label, 20),
          frame: { x: 0, y: 0, width: 0, height: 0 },
        })),
        expected,
        [20]
      )
    ).toThrow('Native renderer missing')
  })
  test('activity absence rejects a visible native card without identifiers', async () => {
    const { widgetActivityIsAbsent } =
      await import('../../../tests/native-features/scripts/realapps-widgets')
    expect(widgetActivityIsAbsent([leaf('Preparing', 20)], [20])).toBe(false)
    expect(
      widgetActivityIsAbsent(
        [{ ...leaf('67%', 20), AXLabel: undefined, AXValue: '67%' }],
        [20]
      )
    ).toBe(false)
    expect(widgetActivityIsAbsent([leaf('Notification Center', 10)], [20])).toBe(true)
    expect(widgetActivityIsAbsent([], [20])).toBe(true)
  })
})
