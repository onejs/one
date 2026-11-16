import React from 'react';
import type { OverKeyboardViewProps } from '../../typings/index.js';
import type { PropsWithChildren } from 'react';
/**
 * A view component that renders its children over the keyboard without closing the keyboard.
 * Acts similar to modal, but doesn't close the keyboard when it's visible.
 *
 * @param props - Component props.
 * @returns A view component that renders over the keyboard.
 * @example
 * ```tsx
 * <OverKeyboardView visible={true}>
 *   <Text>This will appear over the keyboard</Text>
 * </OverKeyboardView>
 * ```
 */
declare const OverKeyboardView: (props: PropsWithChildren<OverKeyboardViewProps>) => React.JSX.Element;
export default OverKeyboardView;
//# sourceMappingURL=index.d.ts.map