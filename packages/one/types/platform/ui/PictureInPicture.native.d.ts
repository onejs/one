import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
export type PictureInPictureProps = ViewProps & {
    children?: ReactNode;
    /** asks for the pip window; acted on when it changes */
    active?: boolean;
    /** enters pip when the app goes to the background */
    autoEnter?: boolean;
    /** every real transition, including ones the system makes on its own */
    onActiveChange?: (active: boolean) => void;
};
export declare function PictureInPicture({ active, autoEnter, onActiveChange, ...props }: PictureInPictureProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=PictureInPicture.native.d.ts.map