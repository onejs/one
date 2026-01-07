/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/native/src/useBackButton.tsx
 *
 * No changes are made except of formatting.
 */

import type { NavigationContainerRef, ParamListBase } from "@react-navigation/core";

// eslint-disable-next-line @eslint-react/hooks-extra/ensure-custom-hooks-using-other-hooks
export function useBackButton(_: React.RefObject<NavigationContainerRef<ParamListBase> | null>) {
  // No-op
  // BackHandler is not available on web
}
