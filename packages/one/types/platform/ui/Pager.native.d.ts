import type { ViewProps } from 'react-native';
import { type PagerRef } from './pagerTypes';
export declare const Pager: import("react").ForwardRefExoticComponent<ViewProps & {
    children?: import("react").ReactNode;
    initialPage?: number;
    scrollEnabled?: boolean;
    orientation?: 'horizontal' | 'vertical';
    layoutDirection?: 'ltr' | 'rtl';
    offscreenPageLimit?: number;
    pageMargin?: number;
    overdrag?: boolean;
    overScrollMode?: 'auto' | 'always' | 'never';
    keyboardDismissMode?: 'none' | 'on-drag';
    onPageScroll?: (event: import("./pagerTypes").PagerScrollEvent) => void;
    onPageSelected?: (event: import("./pagerTypes").PagerSelectedEvent) => void;
    onPageScrollStateChanged?: (event: import("./pagerTypes").PagerScrollStateEvent) => void;
} & import("react").RefAttributes<PagerRef>>;
export type { PagerProps, PagerRef, PagerScrollEvent, PagerSelectedEvent, PagerScrollStateEvent, } from './pagerTypes';
//# sourceMappingURL=Pager.native.d.ts.map