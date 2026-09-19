import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (path: string) => readFileSync(root + path, 'utf8')
const generated = readdirSync(root + 'ios/Generated').filter((file) =>
  file.endsWith('View.swift')
)

// a nested leaf mounted before root attachment must stay silent until the root
// attaches, and go silent again on detach. every generated control carries the
// same propagation contract; Alert is asserted byte for byte as the
// presentation-bearing example, the rest by the two contract lines. committed
// output plus generate:check determinism makes this an emitter assertion: any
// template drift fails here and in the check together.
describe('generated leaf activation', () => {
  it('wires every generated control to parent-propagated activation', () => {
    const controls = generated.filter((file) =>
      read(`ios/Generated/${file}`).includes(
        'func composeInto(_ parent: OneNativeCompositionParent)'
      )
    )
    expect(controls.length).toBeGreaterThan(0)
    for (const file of controls) {
      const source = read(`ios/Generated/${file}`)
      expect(source, file).toContain('model.active = parent.compositionActive')
      expect(source, file).toContain(
        'public func propagateActive(_ active: Bool) { model.active = active }'
      )
      expect(source, file).not.toContain('model.active = true')
    }
  })

  it('spells the Alert lifecycle block byte for byte', () => {
    expect(read('ios/Generated/OneNativeAlertView.swift')).toContain(
      [
        '  public func composeInto(_ parent: OneNativeCompositionParent) {',
        '    controller?.detach(); controller = nil',
        '    compositionParent = parent',
        '    bindCallbacks()',
        '    model.active = parent.compositionActive',
        '  }',
        '  public func decompose() { compositionParent = nil; model.active = false }',
        '  public func propagateActive(_ active: Bool) { model.active = active }',
      ].join('\n')
    )
  })
})
