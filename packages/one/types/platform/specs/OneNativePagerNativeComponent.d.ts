import type { HostComponent, ViewProps } from 'react-native';
import type { DirectEventHandler, Int32, Double, WithDefault } from 'react-native/Libraries/Types/CodegenTypes';
import type * as React from 'react';
interface NativeProps extends ViewProps {
    initialPage?: WithDefault<Int32, 0>;
    scrollEnabled?: WithDefault<boolean, true>;
    orientation?: WithDefault<'horizontal' | 'vertical', 'horizontal'>;
    layoutDirection?: WithDefault<'ltr' | 'rtl', 'ltr'>;
    offscreenPageLimit?: WithDefault<Int32, -1>;
    pageMargin?: WithDefault<Double, 0>;
    overdrag?: WithDefault<boolean, false>;
    overScrollMode?: WithDefault<'auto' | 'always' | 'never', 'auto'>;
    keyboardDismissMode?: WithDefault<'none' | 'on-drag', 'none'>;
    onPageScroll?: DirectEventHandler<Readonly<{
        position: Int32;
        offset: Double;
    }>>;
    onPageSelected?: DirectEventHandler<Readonly<{
        position: Int32;
    }>>;
    onPageScrollStateChanged?: DirectEventHandler<Readonly<{
        pageScrollState: string;
    }>>;
}
interface NativeCommands {
    setPage(viewRef: React.ElementRef<HostComponent<NativeProps>>, index: Int32): void;
    setPageWithoutAnimation(viewRef: React.ElementRef<HostComponent<NativeProps>>, index: Int32): void;
    setScrollEnabledImperatively(viewRef: React.ElementRef<HostComponent<NativeProps>>, enabled: boolean): void;
}
export declare const Commands: NativeCommands;
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneNativePagerNativeComponent.d.ts.map