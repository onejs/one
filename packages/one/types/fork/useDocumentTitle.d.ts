/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/native/src/useDocumentTitle.tsx
 *
 * No changes are made except of formatting and updating the imports.
 */
import type { NavigationContainerRef, ParamListBase } from '@react-navigation/core'
import type { DocumentTitleOptions } from '@react-navigation/native'
import * as React from 'react'
/**
 * Set the document title for the active screen
 */
export declare function useDocumentTitle(
  ref: React.RefObject<NavigationContainerRef<ParamListBase> | null>,
  { enabled, formatter }?: DocumentTitleOptions
): void
//# sourceMappingURL=useDocumentTitle.d.ts.map
