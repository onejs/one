import type { ComponentType, ReactNode } from 'react';
export type LaunchScreenHideOptions = {
    fade?: boolean;
};
export type LaunchScreenCoverProps = {
    artwork?: boolean;
    children?: ReactNode;
};
export interface LaunchScreen {
    preventAutoHide(): void;
    hide(options?: LaunchScreenHideOptions): void;
    Cover: ComponentType<LaunchScreenCoverProps>;
    artworkWidth: number | null;
}
//# sourceMappingURL=types.d.ts.map