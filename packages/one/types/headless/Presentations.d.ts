import { type ReactNode } from 'react';
import type { WebPresentations } from './types';
export type PresentationsProps = {
    /**
     * components that render `presentation` screens on web. omit one and that
     * presentation keeps rendering its content inline with no chrome.
     */
    web?: WebPresentations;
    children?: ReactNode;
};
export declare function Presentations({ web, children }: PresentationsProps): import("react/jsx-runtime").JSX.Element;
export declare function useWebPresentations(): WebPresentations | undefined;
//# sourceMappingURL=Presentations.d.ts.map