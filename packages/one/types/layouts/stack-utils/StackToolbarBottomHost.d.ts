import { type StackToolbarBottomProps } from './stackToolbarDescriptors';
/**
 * In-screen bottom toolbar. Mount inside screen content so the toolbar host
 * sits under the screen view controller in the responder chain; the host
 * writes the controller toolbar items and drives animated visibility.
 * iOS only: there is no Android toolbar host, so this renders null elsewhere.
 */
export declare function StackToolbarBottom({ children, hidden, animated }: StackToolbarBottomProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=StackToolbarBottomHost.d.ts.map