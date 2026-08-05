import { type HTMLAttributes } from 'react';
import { type TabsProps as SharedTabsProps } from './Tabs.shared';
export * from './TabContext';
export * from './TabList';
export * from './TabSlot';
export * from './TabTrigger';
export * from './Tabs.shared';
export type TabsProps = HTMLAttributes<HTMLDivElement> & Pick<SharedTabsProps, 'asChild' | 'options'>;
export declare function Tabs(props: TabsProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Tabs.web.d.ts.map