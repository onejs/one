import { type ReactNode } from 'react';
import { Screen } from '../views/Screen';
type WebTabsNavigatorProps = {
    children?: ReactNode;
    headlessChildren?: ReactNode[];
    initialRouteName?: string;
    screenOptions?: any;
    id?: string;
    [key: string]: any;
};
type TabsProps = Omit<WebTabsNavigatorProps, 'headlessChildren'> & {
    render?: unknown;
    tabBar?: unknown;
};
export declare const Tabs: import("react").ForwardRefExoticComponent<Omit<TabsProps, "ref"> & import("react").RefAttributes<unknown>> & {
    Protected: import("react").FunctionComponent<import("..").ProtectedProps>;
    Screen: typeof Screen;
};
export default Tabs;
//# sourceMappingURL=Tabs.web.d.ts.map