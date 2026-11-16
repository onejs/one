import type { LayoutChangeEvent } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';
import type Reanimated from 'react-native-reanimated';
declare const useScrollState: (ref: AnimatedRef<Reanimated.ScrollView>, initialOffset?: number) => {
    offset: import("react-native-reanimated").SharedValue<number>;
    layout: import("react-native-reanimated").SharedValue<{
        width: number;
        height: number;
    }>;
    size: import("react-native-reanimated").SharedValue<{
        width: number;
        height: number;
    }>;
    onLayout: (e: LayoutChangeEvent) => void;
    onContentSizeChange: (w: number, h: number) => void;
};
export default useScrollState;
//# sourceMappingURL=useScrollState.d.ts.map