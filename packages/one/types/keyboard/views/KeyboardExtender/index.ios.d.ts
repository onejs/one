import React from 'react';
import type { KeyboardExtenderProps } from '../../typings/index.js';
import type { PropsWithChildren } from 'react';
/**
 * A component that embeds its children into the keyboard thus enhancing keyboard functionality.
 *
 * @param props - Component props.
 * @returns A view component that renders inside the keyboard above all system buttons.
 * @example
 * ```tsx
 * <KeyboardExtender>
 *   <Button>10$</Button>
 *   <Button>20$</Button>
 *   <Button>50$</Button>
 * </KeyboardExtender>
 * ```
 */
declare const KeyboardExtender: (props: PropsWithChildren<KeyboardExtenderProps>) => React.JSX.Element;
export default KeyboardExtender;
//# sourceMappingURL=index.ios.d.ts.map