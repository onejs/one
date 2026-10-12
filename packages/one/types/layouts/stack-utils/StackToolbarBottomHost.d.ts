import type { ReactNode } from 'react';
export interface BottomToolbarHostProps {
    children?: ReactNode;
    hidden?: boolean;
    animated?: boolean;
}
/**
 * In-screen bottom toolbar, rendered by Stack.Toolbar with bottom placement.
 * Mounts inside screen content so the host sits under the screen view
 * controller; the host writes the controller toolbar items. iOS only.
 */
export declare function BottomToolbarHost({ children, hidden, animated, }: BottomToolbarHostProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=StackToolbarBottomHost.d.ts.map