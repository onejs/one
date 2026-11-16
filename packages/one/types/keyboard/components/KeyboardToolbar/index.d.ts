import React from 'react';
import { RCTKeyboardToolbarGroupView } from '../../bindings.js';
import { colors } from './colors.js';
import { Background, Content, Done, Next, Prev } from './compound/components/index.js';
import type { KeyboardToolbarProps } from './types.js';
/**
 * `KeyboardToolbar` is a component that is shown above the keyboard with `Prev`/`Next` buttons from left and
 * `Done` button from the right (to dismiss the keyboard). Allows to add customizable content (yours UI elements) in the middle.
 *
 * @param props - Component props.
 * @returns A component that is shown above the keyboard with `Prev`/`Next` and `Done` buttons.
 * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-toolbar|Documentation} page for more details.
 * @example
 * ```tsx
 * <KeyboardToolbar>
 *   <KeyboardToolbar.Done text="Close" />
 * </KeyboardToolbar>
 * ```
 */
declare const KeyboardToolbar: React.FC<KeyboardToolbarProps> & {
    Background: typeof Background;
    Content: typeof Content;
    Prev: typeof Prev;
    Next: typeof Next;
    Done: typeof Done;
    Group: typeof RCTKeyboardToolbarGroupView;
};
export { colors as DefaultKeyboardToolbarTheme, KeyboardToolbarProps };
export default KeyboardToolbar;
//# sourceMappingURL=index.d.ts.map