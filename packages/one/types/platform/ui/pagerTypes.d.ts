import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
export type PagerScrollEvent = Readonly<{
    nativeEvent: Readonly<{
        position: number;
        offset: number;
    }>;
}>;
export type PagerSelectedEvent = Readonly<{
    nativeEvent: Readonly<{
        position: number;
    }>;
}>;
export type PagerScrollStateEvent = Readonly<{
    nativeEvent: Readonly<{
        pageScrollState: 'idle' | 'dragging' | 'settling';
    }>;
}>;
export interface PagerRef {
    setPage(index: number): void;
    setPageWithoutAnimation(index: number): void;
    setScrollEnabled(enabled: boolean): void;
}
export type PagerProps = ViewProps & {
    children?: ReactNode;
    initialPage?: number;
    scrollEnabled?: boolean;
    orientation?: 'horizontal' | 'vertical';
    layoutDirection?: 'ltr' | 'rtl';
    offscreenPageLimit?: number;
    pageMargin?: number;
    overdrag?: boolean;
    overScrollMode?: 'auto' | 'always' | 'never';
    keyboardDismissMode?: 'none' | 'on-drag';
    onPageScroll?: (event: PagerScrollEvent) => void;
    onPageSelected?: (event: PagerSelectedEvent) => void;
    onPageScrollStateChanged?: (event: PagerScrollStateEvent) => void;
};
export declare function validatePager({ initialPage, pageMargin, offscreenPageLimit, orientation, layoutDirection, keyboardDismissMode, overScrollMode, }: PagerProps): void;
export declare function validatePage(index: number): void;
//# sourceMappingURL=pagerTypes.d.ts.map