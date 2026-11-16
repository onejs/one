import type { SharedValue } from 'react-native-reanimated';
type EndVisibleCallback = (visible: boolean) => void;
type Options = {
    scroll: SharedValue<number>;
    layout: SharedValue<{
        width: number;
        height: number;
    }>;
    size: SharedValue<{
        width: number;
        height: number;
    }>;
    inverted: boolean;
    onEndVisible?: EndVisibleCallback;
};
export declare const useEndVisible: ({ scroll, layout, size, inverted, onEndVisible, }: Options) => void;
export {};
//# sourceMappingURL=useEndVisible.d.ts.map