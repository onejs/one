export declare const viewSlotAvailability: {
    readonly accessibilityChildren: 15;
    readonly accessibilityRepresentation: 15;
    readonly accessibilityShowsLargeContentViewer: 15;
    readonly background: 15;
    readonly containerBackground: 17;
    readonly contentToolbar: 18.4;
    readonly contextMenu: 13;
    readonly mask: 15;
    readonly overlay: 15;
    readonly presentationBackground: 16.4;
    readonly searchSuggestions: 16;
    readonly sectionActions: 18;
    readonly swipeActions: 15;
    readonly tabItem: 13;
    readonly tabViewBottomAccessory: 26;
    readonly tabViewSidebarBottomBar: 18;
    readonly tabViewSidebarFooter: 18;
    readonly tabViewSidebarHeader: 18;
    readonly toolbar: 14;
    readonly toolbarOverflowMenu: 27;
    readonly toolbarTitleMenu: 16;
};
export type ViewSlotName = keyof typeof viewSlotAvailability;
export declare const viewSlotArguments: {
    readonly accessibilityChildren: readonly [];
    readonly accessibilityRepresentation: readonly [];
    readonly accessibilityShowsLargeContentViewer: readonly [];
    readonly background: readonly [];
    readonly containerBackground: readonly [{
        readonly field: 'container';
        readonly cases: {
            readonly navigation: 18;
            readonly navigationSplitView: 18;
        };
    }];
    readonly contentToolbar: readonly [{
        readonly field: 'placement';
        readonly cases: {
            readonly tabViewSidebar: 18.4;
        };
    }];
    readonly contextMenu: readonly [];
    readonly mask: readonly [];
    readonly overlay: readonly [];
    readonly presentationBackground: readonly [];
    readonly searchSuggestions: readonly [];
    readonly sectionActions: readonly [];
    readonly swipeActions: readonly [];
    readonly tabItem: readonly [];
    readonly tabViewBottomAccessory: readonly [];
    readonly tabViewSidebarBottomBar: readonly [];
    readonly tabViewSidebarFooter: readonly [];
    readonly tabViewSidebarHeader: readonly [];
    readonly toolbar: readonly [];
    readonly toolbarOverflowMenu: readonly [];
    readonly toolbarTitleMenu: readonly [];
};
export type ViewSlotConfiguration = {
    name: 'accessibilityChildren';
    options?: never;
} | {
    name: 'accessibilityRepresentation';
    options?: never;
} | {
    name: 'accessibilityShowsLargeContentViewer';
    options?: never;
} | {
    name: 'background';
    options?: never;
} | {
    name: 'containerBackground';
    options: {
        container: 'navigation' | 'navigationSplitView';
    };
} | {
    name: 'contentToolbar';
    options: {
        placement: 'tabViewSidebar';
    };
} | {
    name: 'contextMenu';
    options?: never;
} | {
    name: 'mask';
    options?: never;
} | {
    name: 'overlay';
    options?: never;
} | {
    name: 'presentationBackground';
    options?: never;
} | {
    name: 'searchSuggestions';
    options?: never;
} | {
    name: 'sectionActions';
    options?: never;
} | {
    name: 'swipeActions';
    options?: never;
} | {
    name: 'tabItem';
    options?: never;
} | {
    name: 'tabViewBottomAccessory';
    options?: never;
} | {
    name: 'tabViewSidebarBottomBar';
    options?: never;
} | {
    name: 'tabViewSidebarFooter';
    options?: never;
} | {
    name: 'tabViewSidebarHeader';
    options?: never;
} | {
    name: 'toolbar';
    options?: never;
} | {
    name: 'toolbarOverflowMenu';
    options?: never;
} | {
    name: 'toolbarTitleMenu';
    options?: never;
};
export declare const tabViewSlotAvailability: {
    readonly tabViewBottomAccessory: 26;
    readonly tabViewSidebarBottomBar: 18;
    readonly tabViewSidebarFooter: 18;
    readonly tabViewSidebarHeader: 18;
};
export type TabViewSlotName = keyof typeof tabViewSlotAvailability;
//# sourceMappingURL=viewSlots.d.ts.map