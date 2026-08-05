import type { ComponentProps, ReactElement } from 'react';
import { type TabTriggerProps } from './useTabTrigger';
export type { SwitchToOptions, TabTriggerOptions, TabTriggerProps, TabTriggerSlotProps, Trigger, TriggerProps, UseTabTriggerResult, } from './useTabTrigger';
export { useTabTrigger } from './useTabTrigger';
/**
 * Creates a trigger to navigate to a tab. When used as child of `TabList`, its
 * functionality slightly changes since the `href` prop is required,
 * and the trigger also defines what routes are present in the `Tabs`.
 *
 * When used outside of `TabList`, this component no longer requires an `href`.
 */
export declare function TabTrigger({ asChild, name, href, resetOnFocus, ...props }: TabTriggerProps): import("react/jsx-runtime").JSX.Element;
/**
 * @hidden
 */
export declare function isTabTrigger(child: ReactElement<any>): child is ReactElement<ComponentProps<typeof TabTrigger>>;
//# sourceMappingURL=TabTrigger.d.ts.map