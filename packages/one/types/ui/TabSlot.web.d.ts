import { type ComponentProps, type ReactElement } from 'react';
import type { ScreenContainer } from 'react-native-screens';
import { type TabsDescriptor } from './TabContext';
import type { TabListProps } from './TabList';
export type TabSlotProps = ComponentProps<typeof ScreenContainer> & {
    /** Remove inactive screens from the visible DOM tree. */
    detachInactiveScreens?: boolean;
    /** Override how each screen is rendered. */
    renderFn?: typeof defaultTabsSlotRender;
};
export type TabsSlotRenderOptions = {
    index: number;
    isFocused: boolean;
    loaded: boolean;
    detachInactiveScreens: boolean;
};
export declare function useTabSlot({ detachInactiveScreens, renderFn, }?: TabSlotProps): import("react/jsx-runtime").JSX.Element;
export declare function TabSlot(props: TabSlotProps): import("react/jsx-runtime").JSX.Element;
export declare function defaultTabsSlotRender(descriptor: TabsDescriptor, { isFocused, loaded, detachInactiveScreens }: TabsSlotRenderOptions): import("react/jsx-runtime").JSX.Element | null;
/**
 * @hidden
 */
export declare function isTabSlot(child: ReactElement<any>): child is ReactElement<TabListProps>;
//# sourceMappingURL=TabSlot.web.d.ts.map