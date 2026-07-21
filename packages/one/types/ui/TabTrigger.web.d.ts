import type { ComponentProps, ReactElement } from 'react';
import { type TabTriggerProps as SharedTabTriggerProps } from './useTabTrigger';
export type { SwitchToOptions, TabTriggerOptions, TabTriggerSlotProps, Trigger, TriggerProps, UseTabTriggerResult, } from './useTabTrigger';
export { useTabTrigger } from './useTabTrigger';
export type TabTriggerProps = Omit<SharedTabTriggerProps, 'style'>;
export declare function TabTrigger({ asChild, name, href, resetOnFocus, ...props }: TabTriggerProps): import("react/jsx-runtime").JSX.Element;
/**
 * @hidden
 */
export declare function isTabTrigger(child: ReactElement<any>): child is ReactElement<ComponentProps<typeof TabTrigger>>;
//# sourceMappingURL=TabTrigger.web.d.ts.map