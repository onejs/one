import { describe, expect, it } from 'vitest'
import { rnCodegenPlugin, transformReactNativeCodegen } from './rnCodegenPlugin'

describe('rnCodegenPlugin', () => {
  it('generates view-config replacement for codegenNativeComponent default export', () => {
    const inputCode = `
import type { ViewProps, HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  color?: string;
}

export default codegenNativeComponent<NativeProps>('MyCustomView') as HostComponent<NativeProps>;
`

    const result = transformReactNativeCodegen(
      inputCode,
      '/workspace/src/MyCustomViewNativeComponent.ts'
    )

    expect(result).toBeDefined()
    expect(result?.code).not.toContain('codegenNativeComponent<NativeProps>')
    expect(result?.code).toContain(
      'export default NativeComponentRegistry.get(nativeComponentName, () => __INTERNAL_VIEW_CONFIG);'
    )
    expect(result?.code).toContain('uiViewClassName: "MyCustomView"')
    expect(result?.code).toContain('export const __INTERNAL_VIEW_CONFIG')
    expect(result?.map).toBeDefined()
  })

  it('leaves already-generated output alone on a second pass', () => {
    // the transform runs more than once over the same module. its own output
    // keeps the codegenNativeComponent import and turns Commands into a plain
    // object, which the reserved-export check would otherwise reject.
    const inputCode = `
import type { ViewProps, HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';

export interface NativeProps extends ViewProps {
  color?: string;
}

interface NativeCommands {
  reload: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
}

export const Commands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['reload'],
});

export default codegenNativeComponent<NativeProps>('MyCustomView') as HostComponent<NativeProps>;
`

    const id = '/workspace/src/MyCustomViewNativeComponent.ts'
    const first = transformReactNativeCodegen(inputCode, id)
    expect(first?.code).toContain('export const Commands')

    expect(() => transformReactNativeCodegen(first!.code, id)).not.toThrow()
    expect(transformReactNativeCodegen(first!.code, id)).toBeUndefined()
  })

  it('removes export const Commands = codegenNativeCommands(...) and generates runtime commands', () => {
    const inputCode = `
import * as React from 'react';
import type { ViewProps, HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';

export interface NativeProps extends ViewProps {
  color?: string;
}

type ComponentType = HostComponent<NativeProps>;

interface NativeCommands {
  flash: (viewRef: React.ElementRef<ComponentType>, enabled: boolean) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['flash'],
});

export default codegenNativeComponent<NativeProps>('MyCustomView') as HostComponent<NativeProps>;
`

    const result = transformReactNativeCodegen(
      inputCode,
      '/workspace/src/MyCustomViewNativeComponent.ts'
    )

    expect(result).toBeDefined()
    // The original codegenNativeCommands export must be removed
    expect(result?.code).not.toContain('codegenNativeCommands<NativeCommands>')
    // The runtime Commands implementation must be generated
    expect(result?.code).toContain('export const Commands = {')
    expect(result?.code).toContain('dispatchCommand(ref, "flash", [enabled]);')
    expect(result?.code).toContain(
      'export default NativeComponentRegistry.get(nativeComponentName, () => __INTERNAL_VIEW_CONFIG);'
    )
  })

  it('throws an error if native commands are exported with a name other than Commands', () => {
    const inputCode = `
import * as React from 'react';
import type { ViewProps, HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';

export interface NativeProps extends ViewProps {
  color?: string;
}

type ComponentType = HostComponent<NativeProps>;

interface NativeCommands {
  flash: (viewRef: React.ElementRef<ComponentType>, enabled: boolean) => void;
}

export const OtherCommands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['flash'],
});

export default codegenNativeComponent<NativeProps>('MyCustomView') as HostComponent<NativeProps>;
`

    expect(() => {
      transformReactNativeCodegen(
        inputCode,
        '/workspace/src/MyCustomViewNativeComponent.ts'
      )
    }).toThrow("Native commands must be exported with the name 'Commands'")
  })

  it("throws an error if 'Commands' is exported without codegenNativeCommands", () => {
    const inputCode = `
import type { ViewProps, HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  color?: string;
}

export const Commands = 123;

export default codegenNativeComponent<NativeProps>('MyCustomView') as HostComponent<NativeProps>;
`

    expect(() => {
      transformReactNativeCodegen(
        inputCode,
        '/workspace/src/MyCustomViewNativeComponent.ts'
      )
    }).toThrow(
      "'Commands' is a reserved export and may only be used to export the result of codegenNativeCommands."
    )
  })

  it("throws an error if 'Commands' is exported via export specifier without codegenNativeCommands", () => {
    const inputCode = `
import type { ViewProps, HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  color?: string;
}

const Commands = 123;
export { Commands };

export default codegenNativeComponent<NativeProps>('MyCustomView') as HostComponent<NativeProps>;
`

    expect(() => {
      transformReactNativeCodegen(
        inputCode,
        '/workspace/src/MyCustomViewNativeComponent.ts'
      )
    }).toThrow(
      "'Commands' is a reserved export and may only be used to export the result of codegenNativeCommands."
    )
  })

  it('ignores files that do not match the codegen pattern', () => {
    const inputCode = `
export default function Button() {
  return null;
}
`
    const result = transformReactNativeCodegen(inputCode, '/workspace/src/Button.tsx')
    expect(result).toBeUndefined()
  })

  it('ignores matching files without codegenNativeComponent', () => {
    const inputCode = `
export default function MyNativeComponent() {
  return null;
}
`
    const result = transformReactNativeCodegen(
      inputCode,
      '/workspace/src/MyNativeComponent.tsx'
    )
    expect(result).toBeUndefined()
  })

  it('supports files inside specs/ directory', () => {
    const inputCode = `
import type { ViewProps, HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  color?: string;
}

export default codegenNativeComponent<NativeProps>('SpecView') as HostComponent<NativeProps>;
`

    const result = transformReactNativeCodegen(inputCode, '/workspace/specs/SpecView.ts')

    expect(result).toBeDefined()
    expect(result?.code).toContain('uiViewClassName: "SpecView"')
  })

  it('works through the Vite plugin interface', () => {
    const plugin = rnCodegenPlugin()
    expect(plugin.name).toBe('vxrn:rn-codegen')
    expect(plugin.enforce).toBe('pre')

    const inputCode = `
import type { ViewProps, HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  color?: string;
}

export default codegenNativeComponent<NativeProps>('PluginView') as HostComponent<NativeProps>;
`

    const transformFn =
      typeof plugin.transform === 'function'
        ? plugin.transform
        : (plugin.transform as any)?.handler

    const result = transformFn.call(
      {} as any,
      inputCode,
      '/workspace/src/PluginViewNativeComponent.ts'
    )

    expect(result).toBeDefined()
    expect(result?.code).toContain('uiViewClassName: "PluginView"')
    expect(result?.map).toBeDefined()
  })

  it('removes export const Commands with sequence expression (e.g. coverage instrumentation)', () => {
    const inputCode = `
import type { ViewProps, HostComponent } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';

export interface NativeProps extends ViewProps {
  color?: string;
}

export const Commands = (0, codegenNativeCommands({
  supportedCommands: [],
}));

export default codegenNativeComponent<NativeProps>('SequenceView') as HostComponent<NativeProps>;
`

    const result = transformReactNativeCodegen(
      inputCode,
      '/workspace/src/SequenceViewNativeComponent.ts'
    )

    expect(result).toBeDefined()
    expect(result?.code).not.toContain('export const Commands')
    expect(result?.code).toContain('uiViewClassName: "SequenceView"')
    expect(result?.code).toContain('export default NativeComponentRegistry.get')
  })

  it('transforms Flow component specs correctly', () => {
    const flowCode = `/**
 * @flow strict-local
 * @format
 */

import type {ViewProps} from 'react-native/Libraries/Components/View/ViewPropTypes';
import type {HostComponent} from 'react-native/Libraries/Renderer/shims/ReactNativeTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

type FlowViewProps = $ReadOnly<{
  ...ViewProps,
  title?: string,
}>;

export default codegenNativeComponent<FlowViewProps>('FlowView') as HostComponent<FlowViewProps>;
`

    const result = transformReactNativeCodegen(
      flowCode,
      '/workspace/src/FlowViewNativeComponent.js'
    )

    expect(result).toBeDefined()
    expect(result?.code).toContain('uiViewClassName: "FlowView"')
    expect(result?.code).toContain('export default NativeComponentRegistry.get')
  })
})
