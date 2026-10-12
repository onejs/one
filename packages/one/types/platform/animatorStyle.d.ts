import type { OneNativeStyle } from './generated/controlTypes';
export type AnimatorStyle = {
    id: number;
    kind: 'phase';
    owner: string;
    samples: readonly OneNativeStyle[];
} | {
    id: number;
    kind: 'keyframe';
    owner: string;
    samples: readonly OneNativeStyle[];
    values: readonly (readonly number[])[];
};
export declare function animatedSwiftStyle(animator: AnimatorStyle): OneNativeStyle;
export declare function animatorStyleOf(style: OneNativeStyle): AnimatorStyle | undefined;
export declare function animatorStyleNative<Native>(animator: AnimatorStyle, convert: (style: OneNativeStyle | undefined) => Native | undefined): Native;
//# sourceMappingURL=animatorStyle.d.ts.map