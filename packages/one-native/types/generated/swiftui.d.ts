export type MenuOrder = 'automatic' | 'priority' | 'fixed';
export type MenuActionDismissBehavior = 'automatic' | 'enabled' | 'disabled';
export type TabBarMinimizeBehavior = 'automatic' | 'onScrollDown' | 'onScrollUp' | 'never';
export type ButtonRole = 'destructive' | 'cancel' | 'confirm' | 'close';
export type TabRole = 'search';
export type ControlGroupStyle = 'palette' | 'automatic' | 'navigation' | 'menu' | 'compactMenu';
export declare const swiftUIValues: {
    readonly MenuOrder: {
        readonly automatic: 16;
        readonly priority: 16;
        readonly fixed: 16;
    };
    readonly MenuActionDismissBehavior: {
        readonly automatic: 16.4;
        readonly enabled: 16.4;
        readonly disabled: 16.4;
    };
    readonly TabBarMinimizeBehavior: {
        readonly automatic: 26;
        readonly onScrollDown: 26;
        readonly onScrollUp: 26;
        readonly never: 26;
    };
    readonly ButtonRole: {
        readonly destructive: 15;
        readonly cancel: 15;
        readonly confirm: 26;
        readonly close: 26;
    };
    readonly TabRole: {
        readonly search: 18;
    };
    readonly ControlGroupStyle: {
        readonly palette: 17;
        readonly automatic: 15;
        readonly navigation: 15;
        readonly menu: 16.4;
        readonly compactMenu: 16.4;
    };
};
export declare function assertSwiftUIValue(type: keyof typeof swiftUIValues, value: string, iosVersion: number): void;
//# sourceMappingURL=swiftui.d.ts.map