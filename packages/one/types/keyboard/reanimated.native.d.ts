import { useAnimatedProps as useReanimatedAnimatedProps, useAnimatedReaction as useReanimatedAnimatedReaction, useAnimatedStyle as useReanimatedAnimatedStyle, useDerivedValue as useReanimatedDerivedValue, useHandler as useReanimatedHandler } from 'react-native-reanimated';
import type { EventWithName, FocusedInputLayoutChangedEvent, FocusedInputLayoutHandlerHook, KeyboardHandlerHook, NativeEvent } from './typings/index.js';
type EventContext = Record<string, unknown>;
export declare const useAnimatedProps: typeof useReanimatedAnimatedProps;
export declare const useAnimatedReaction: typeof useReanimatedAnimatedReaction;
export declare const useAnimatedStyle: typeof useReanimatedAnimatedStyle;
export declare const useDerivedValue: typeof useReanimatedDerivedValue;
export declare const useHandler: typeof useReanimatedHandler;
export declare const useAnimatedKeyboardHandler: KeyboardHandlerHook<EventContext, EventWithName<NativeEvent>>;
export declare const useFocusedInputLayoutHandler: FocusedInputLayoutHandlerHook<EventContext, EventWithName<FocusedInputLayoutChangedEvent>>;
export {};
//# sourceMappingURL=reanimated.native.d.ts.map