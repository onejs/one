import { type ParamListBase, type StackActionHelpers, type StackNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationEventMap, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { type ReactNode } from 'react';
import { type StackRender, type StackRenderComponent } from './ScreenRenderContext';
type RouteOptions = NativeStackNavigationOptions & {
    render?: StackRender;
    keepMounted?: boolean;
};
type Descriptors = Record<string, {
    options: RouteOptions;
    render: () => ReactNode;
    navigation: any;
}>;
type WebStackViewProps = {
    state: StackNavigationState<ParamListBase>;
    navigation: StackActionHelpers<ParamListBase> & {
        dispatch: (action: any) => void;
    };
    descriptors: Descriptors;
    describe?: (route: any, placeholder?: boolean) => any;
    eventMap?: NativeStackNavigationEventMap;
};
/**
 * Resolve which render component to use for an overlay route, in order:
 *   1. options.render?.web        (per-route override)
 *   2. context.web                (Stack-level default; also fed by setupRendering)
 * Returns undefined when neither is set.
 */
export declare function resolveOverlayRender(options: RouteOptions | undefined, contextRender: StackRender | undefined): StackRenderComponent | undefined;
export declare function WebStackView({ state, navigation, descriptors, describe, }: WebStackViewProps): import("react/jsx-runtime").JSX.Element;
export declare function OverlayHost({ route, descriptor, contextRender, open, onDismiss, }: {
    route: {
        key: string;
        name: string;
    };
    descriptor: Descriptors[string];
    contextRender: StackRender | undefined;
    open: boolean;
    onDismiss: () => void;
}): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=WebStackView.d.ts.map