import type { SDKEventValueShape } from './swiftStyleNative';
export declare const viewSlotAvailability: {
    readonly accessibilityActions: 16;
    readonly accessibilityActionsWithAccessibilityActionCategory: 18;
    readonly accessibilityChildren: 15;
    readonly accessibilityRepresentation: 15;
    readonly accessibilityShowsLargeContentViewer: 15;
    readonly alert: 15;
    readonly background: 15;
    readonly backgroundPreferenceValuePreferredColorScheme: 16;
    readonly confirmationDialog: 15;
    readonly containerBackground: 17;
    readonly contentToolbar: 18.4;
    readonly contextMenu: 13;
    readonly dismissalConfirmationDialog: 27;
    readonly documentBrowserContextMenu: 18.1;
    readonly fullScreenCover: 14;
    readonly inspector: 17;
    readonly listRowBackground: 13;
    readonly mapControls: 17;
    readonly mask: 15;
    readonly navigationBarItemsWithLeading: 13;
    readonly navigationBarItemsWithTrailing: 13;
    readonly navigationDestination: 16;
    readonly overlay: 15;
    readonly overlayPreferenceValuePreferredColorScheme: 16;
    readonly popover: 13;
    readonly presentationBackground: 16.4;
    readonly safeAreaBarWithHorizontalEdge: 26;
    readonly safeAreaBarWithVerticalEdge: 26;
    readonly safeAreaInsetWithHorizontalEdge: 15;
    readonly safeAreaInsetWithVerticalEdge: 15;
    readonly sceneAccessory: 27;
    readonly searchScopesWithBindingString: 16;
    readonly searchScopesWithBindingStringAndSearchScopeActivation: 16.4;
    readonly searchSuggestions: 16;
    readonly sectionActions: 18;
    readonly sheet: 13;
    readonly subscriptionStoreControlIcon: 17;
    readonly subscriptionStorePolicyDestination: 17;
    readonly swipeActions: 15;
    readonly tabItem: 13;
    readonly tabViewBottomAccessory: 26;
    readonly tabViewBottomAccessoryWithBool: 26.1;
    readonly tabViewSidebarBottomBar: 18;
    readonly tabViewSidebarFooter: 18;
    readonly tabViewSidebarHeader: 18;
    readonly toolbar: 14;
    readonly toolbarOverflowMenu: 27;
    readonly toolbarTitleMenu: 16;
};
export type ViewSlotName = keyof typeof viewSlotAvailability;
export declare const viewSlotArguments: {
    readonly accessibilityActions: readonly [];
    readonly accessibilityActionsWithAccessibilityActionCategory: readonly [{
        readonly field: 'category';
        readonly kind: 'enum';
        readonly cases: {
            readonly default: 18;
            readonly edit: 18;
        };
    }];
    readonly accessibilityChildren: readonly [];
    readonly accessibilityRepresentation: readonly [];
    readonly accessibilityShowsLargeContentViewer: readonly [];
    readonly alert: readonly [{
        readonly field: 'title';
        readonly kind: 'string';
    }, {
        readonly field: 'isPresented';
        readonly kind: 'bindingBoolean';
    }];
    readonly background: readonly [];
    readonly backgroundPreferenceValuePreferredColorScheme: readonly [];
    readonly confirmationDialog: readonly [{
        readonly field: 'title';
        readonly kind: 'string';
    }, {
        readonly field: 'isPresented';
        readonly kind: 'bindingBoolean';
    }];
    readonly containerBackground: readonly [{
        readonly field: 'container';
        readonly kind: 'enum';
        readonly cases: {
            readonly navigation: 18;
            readonly navigationSplitView: 18;
            readonly subscriptionStore: 17;
            readonly subscriptionStoreHeader: 17;
            readonly subscriptionStoreFullHeight: 17;
        };
    }];
    readonly contentToolbar: readonly [{
        readonly field: 'placement';
        readonly kind: 'enum';
        readonly cases: {
            readonly tabViewSidebar: 18.4;
        };
    }];
    readonly contextMenu: readonly [];
    readonly dismissalConfirmationDialog: readonly [{
        readonly field: 'title';
        readonly kind: 'string';
    }, {
        readonly field: 'shouldPresent';
        readonly kind: 'boolean';
    }];
    readonly documentBrowserContextMenu: readonly [];
    readonly fullScreenCover: readonly [{
        readonly field: 'isPresented';
        readonly kind: 'bindingBoolean';
    }];
    readonly inspector: readonly [{
        readonly field: 'isPresented';
        readonly kind: 'bindingBoolean';
    }];
    readonly listRowBackground: readonly [];
    readonly mapControls: readonly [];
    readonly mask: readonly [];
    readonly navigationBarItemsWithLeading: readonly [];
    readonly navigationBarItemsWithTrailing: readonly [];
    readonly navigationDestination: readonly [{
        readonly field: 'isPresented';
        readonly kind: 'bindingBoolean';
    }];
    readonly overlay: readonly [];
    readonly overlayPreferenceValuePreferredColorScheme: readonly [];
    readonly popover: readonly [{
        readonly field: 'isPresented';
        readonly kind: 'bindingBoolean';
    }];
    readonly presentationBackground: readonly [];
    readonly safeAreaBarWithHorizontalEdge: readonly [{
        readonly field: 'edge';
        readonly kind: 'enum';
        readonly cases: {
            readonly leading: 15;
            readonly trailing: 15;
        };
    }];
    readonly safeAreaBarWithVerticalEdge: readonly [{
        readonly field: 'edge';
        readonly kind: 'enum';
        readonly cases: {
            readonly top: 15;
            readonly bottom: 15;
        };
    }];
    readonly safeAreaInsetWithHorizontalEdge: readonly [{
        readonly field: 'edge';
        readonly kind: 'enum';
        readonly cases: {
            readonly leading: 15;
            readonly trailing: 15;
        };
    }];
    readonly safeAreaInsetWithVerticalEdge: readonly [{
        readonly field: 'edge';
        readonly kind: 'enum';
        readonly cases: {
            readonly top: 15;
            readonly bottom: 15;
        };
    }];
    readonly sceneAccessory: readonly [];
    readonly searchScopesWithBindingString: readonly [{
        readonly field: 'scope';
        readonly kind: 'bindingString';
    }];
    readonly searchScopesWithBindingStringAndSearchScopeActivation: readonly [{
        readonly field: 'scope';
        readonly kind: 'bindingString';
    }, {
        readonly field: 'activation';
        readonly kind: 'enum';
        readonly cases: {
            readonly automatic: 16.4;
            readonly onTextEntry: 16.4;
            readonly onSearchPresentation: 16.4;
        };
    }];
    readonly searchSuggestions: readonly [];
    readonly sectionActions: readonly [];
    readonly sheet: readonly [{
        readonly field: 'isPresented';
        readonly kind: 'bindingBoolean';
    }];
    readonly subscriptionStoreControlIcon: readonly [];
    readonly subscriptionStorePolicyDestination: readonly [{
        readonly field: 'button';
        readonly kind: 'enum';
        readonly cases: {
            readonly termsOfService: 17;
            readonly privacyPolicy: 17;
        };
    }];
    readonly swipeActions: readonly [];
    readonly tabItem: readonly [];
    readonly tabViewBottomAccessory: readonly [];
    readonly tabViewBottomAccessoryWithBool: readonly [{
        readonly field: 'isEnabled';
        readonly kind: 'boolean';
    }];
    readonly tabViewSidebarBottomBar: readonly [];
    readonly tabViewSidebarFooter: readonly [];
    readonly tabViewSidebarHeader: readonly [];
    readonly toolbar: readonly [];
    readonly toolbarOverflowMenu: readonly [];
    readonly toolbarTitleMenu: readonly [];
};
export declare const viewSlotEvents: Record<string, SDKEventValueShape>;
export type ViewSlotConfiguration = {
    name: 'accessibilityActions';
    options?: never;
} | {
    name: 'accessibilityActionsWithAccessibilityActionCategory';
    options: {
        category: 'default' | 'edit';
    };
} | {
    name: 'accessibilityChildren';
    options?: never;
} | {
    name: 'accessibilityRepresentation';
    options?: never;
} | {
    name: 'accessibilityShowsLargeContentViewer';
    options?: never;
} | {
    name: 'alert';
    options: {
        title: string;
        isPresented: {
            value: boolean;
            onChange: (value: boolean) => void;
        };
    };
} | {
    name: 'background';
    options?: never;
} | {
    name: 'backgroundPreferenceValuePreferredColorScheme';
    options: {
        onValue: (value: 'light' | 'dark' | 'unknown' | null) => void;
    };
} | {
    name: 'confirmationDialog';
    options: {
        title: string;
        isPresented: {
            value: boolean;
            onChange: (value: boolean) => void;
        };
    };
} | {
    name: 'containerBackground';
    options: {
        container: 'navigation' | 'navigationSplitView' | 'subscriptionStore' | 'subscriptionStoreHeader' | 'subscriptionStoreFullHeight';
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
    name: 'dismissalConfirmationDialog';
    options: {
        title: string;
        shouldPresent: boolean;
    };
} | {
    name: 'documentBrowserContextMenu';
    options?: never;
} | {
    name: 'fullScreenCover';
    options: {
        isPresented: {
            value: boolean;
            onChange: (value: boolean) => void;
        };
    };
} | {
    name: 'inspector';
    options: {
        isPresented: {
            value: boolean;
            onChange: (value: boolean) => void;
        };
    };
} | {
    name: 'listRowBackground';
    options?: never;
} | {
    name: 'mapControls';
    options?: never;
} | {
    name: 'mask';
    options?: never;
} | {
    name: 'navigationBarItemsWithLeading';
    options?: never;
} | {
    name: 'navigationBarItemsWithTrailing';
    options?: never;
} | {
    name: 'navigationDestination';
    options: {
        isPresented: {
            value: boolean;
            onChange: (value: boolean) => void;
        };
    };
} | {
    name: 'overlay';
    options?: never;
} | {
    name: 'overlayPreferenceValuePreferredColorScheme';
    options: {
        onValue: (value: 'light' | 'dark' | 'unknown' | null) => void;
    };
} | {
    name: 'popover';
    options: {
        isPresented: {
            value: boolean;
            onChange: (value: boolean) => void;
        };
    };
} | {
    name: 'presentationBackground';
    options?: never;
} | {
    name: 'safeAreaBarWithHorizontalEdge';
    options: {
        edge: 'leading' | 'trailing';
    };
} | {
    name: 'safeAreaBarWithVerticalEdge';
    options: {
        edge: 'top' | 'bottom';
    };
} | {
    name: 'safeAreaInsetWithHorizontalEdge';
    options: {
        edge: 'leading' | 'trailing';
    };
} | {
    name: 'safeAreaInsetWithVerticalEdge';
    options: {
        edge: 'top' | 'bottom';
    };
} | {
    name: 'sceneAccessory';
    options?: never;
} | {
    name: 'searchScopesWithBindingString';
    options: {
        scope: {
            value: string;
            onChange: (value: string) => void;
        };
    };
} | {
    name: 'searchScopesWithBindingStringAndSearchScopeActivation';
    options: {
        scope: {
            value: string;
            onChange: (value: string) => void;
        };
        activation: 'automatic' | 'onTextEntry' | 'onSearchPresentation';
    };
} | {
    name: 'searchSuggestions';
    options?: never;
} | {
    name: 'sectionActions';
    options?: never;
} | {
    name: 'sheet';
    options: {
        isPresented: {
            value: boolean;
            onChange: (value: boolean) => void;
        };
    };
} | {
    name: 'subscriptionStoreControlIcon';
    options?: never;
} | {
    name: 'subscriptionStorePolicyDestination';
    options: {
        button: 'termsOfService' | 'privacyPolicy';
    };
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
    name: 'tabViewBottomAccessoryWithBool';
    options: {
        isEnabled: boolean;
    };
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
    readonly tabViewBottomAccessoryWithBool: 26.1;
    readonly tabViewSidebarBottomBar: 18;
    readonly tabViewSidebarFooter: 18;
    readonly tabViewSidebarHeader: 18;
};
export type TabViewSlotName = keyof typeof tabViewSlotAvailability;
//# sourceMappingURL=viewSlots.d.ts.map