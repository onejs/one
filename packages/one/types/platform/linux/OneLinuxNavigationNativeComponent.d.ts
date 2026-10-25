import type { ViewProps } from 'react-native';
import type { DirectEventHandler, Double, Int32 } from 'react-native/Libraries/Types/CodegenTypes';
export type SelectEvent = Readonly<{
    index: Int32;
    revision: Int32;
    eventCount: Int32;
}>;
export type ContentLayoutEvent = Readonly<{
    width: Double;
    height: Double;
}>;
interface NativeProps extends ViewProps {
    mode: string;
    pageKeys: ReadonlyArray<string>;
    pageTitles: ReadonlyArray<string>;
    title: string;
    selectedIndex: Int32;
    headerShown: boolean;
    canGoBack: boolean;
    revision: Int32;
    acknowledgedEvent: Int32;
    onSelect?: DirectEventHandler<SelectEvent>;
    onBack?: DirectEventHandler<Readonly<{}>>;
    onContentLayout?: DirectEventHandler<ContentLayoutEvent>;
}
declare const _default: import("react-native/Libraries/Utilities/codegenNativeComponent").NativeComponentType<NativeProps>;
export default _default;
//# sourceMappingURL=OneLinuxNavigationNativeComponent.d.ts.map