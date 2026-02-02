import { type ReactNode } from 'react';
interface LinkPreviewContextValue {
    openPreviewKey: string | undefined;
    setOpenPreviewKey: (key: string | undefined) => void;
}
export declare function LinkPreviewProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useLinkPreviewContext(): LinkPreviewContextValue;
export {};
//# sourceMappingURL=LinkPreviewContext.d.ts.map