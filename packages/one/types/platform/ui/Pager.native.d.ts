import type { ViewProps } from 'react-native';
import { type PagerRef } from './pagerTypes.js';
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
    onPageScroll?: (event: import("./pagerTypes.js").PagerScrollEvent) => void;
    onPageSelected?: (event: import("./pagerTypes.js").PagerSelectedEvent) => void;
    onPageScrollStateChanged?: (event: import("./pagerTypes.js").PagerScrollStateEvent) => void;
} & import("react").RefAttributes<PagerRef>>;
export type { PagerProps, PagerRef, PagerScrollEvent, PagerSelectedEvent, PagerScrollStateEvent, } from './pagerTypes.js';
//# sourceMappingURL=Pager.native.d.ts.map