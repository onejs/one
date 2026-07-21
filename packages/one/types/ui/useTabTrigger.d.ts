import type { TabNavigationState } from '@react-navigation/native';
import { type MouseEvent as ReactMouseEvent, type ReactNode, type RefAttributes } from 'react';
import type { GestureResponderEvent, PressableProps, View } from 'react-native';
import type { OneRouter } from '../interfaces/router';
import type { TriggerMap } from './common';
type PressablePropsWithoutFunctionChildren = Omit<PressableProps, 'children'> & {
    children?: ReactNode | undefined;
};
export type TabTriggerProps = PressablePropsWithoutFunctionChildren & {
    /** Name of the tab. */
    name: string;
    /** Link used when defining the trigger within a `TabList`. */
    href?: OneRouter.Href;
    /** Forward props to the child component. */
    asChild?: boolean;
    /** Reset the route when switching to the tab. */
    resetOnFocus?: boolean;
};
export type TabTriggerOptions = {
    name: string;
    href: OneRouter.Href;
};
export type TabTriggerSlotProps = PressablePropsWithoutFunctionChildren & RefAttributes<View> & {
    isFocused?: boolean;
    href?: string;
};
export type SwitchToOptions = {
    resetOnFocus?: boolean;
};
export type Trigger = TriggerMap[string] & {
    isFocused: boolean;
    resolvedHref: string;
    route: TabNavigationState<any>['routes'][number];
};
export type UseTabTriggerResult = {
    switchTab: (name: string, options: SwitchToOptions) => void;
    getTrigger: (name: string) => Trigger | undefined;
    trigger?: Trigger;
    triggerProps: TriggerProps;
};
export type TriggerProps = {
    isFocused: boolean;
    onPress: PressableProps['onPress'];
    onLongPress: PressableProps['onLongPress'];
};
export declare function shouldHandleMouseEvent(event?: ReactMouseEvent<HTMLAnchorElement, MouseEvent> | GestureResponderEvent): boolean;
export declare function useTabTrigger(options: TabTriggerProps): UseTabTriggerResult;
export {};
//# sourceMappingURL=useTabTrigger.d.ts.map