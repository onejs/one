import { describe, expect, it } from 'vitest'
import { transformBabel } from './transformBabel'

describe('transformBabel Flow parsing', () => {
  it('parses and strips React Native Flow as-casts', async () => {
    const result = await transformBabel(
      '/project/VirtualViewNativeComponent.js',
      `
        // @flow strict-local
        import type { HostComponent } from './HostComponent'
        import codegenNativeComponent from './codegenNativeComponent'

        type Props = $ReadOnly<{ enabled?: boolean }>

        export default codegenNativeComponent<Props>('VirtualView') as HostComponent<Props>
      `,
      { plugins: [] }
    )

    expect(result?.code).toContain("codegenNativeComponent('VirtualView')")
    expect(result?.code).not.toContain('HostComponent')
  })
})
