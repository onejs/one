import type { NavigationContainerRef, ParamListBase, Route } from '@react-navigation/core';
import * as React from 'react';
type DocumentTitleOptions = {
    enabled?: boolean;
    formatter?: (options: Record<string, any> | undefined, route: Route<string> | undefined) => string;
};
/**
 * Set the document title for the active screen
 */
export declare function useDocumentTitle(ref: React.RefObject<NavigationContainerRef<ParamListBase>>, { enabled, formatter, }?: DocumentTitleOptions): void;
export {};
//# sourceMappingURL=useDocumentTitle.d.ts.map