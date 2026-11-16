import { KeyboardControllerNative } from './bindings'

// copied from `android.view.WindowManager.LayoutParams`
export enum AndroidSoftInputModes {
  SOFT_INPUT_ADJUST_NOTHING = 48,
  SOFT_INPUT_ADJUST_PAN = 32,
  SOFT_INPUT_ADJUST_RESIZE = 16,
  SOFT_INPUT_ADJUST_UNSPECIFIED = 0,
  SOFT_INPUT_IS_FORWARD_NAVIGATION = 256,
  SOFT_INPUT_MASK_ADJUST = 240,
  SOFT_INPUT_MASK_STATE = 15,
  SOFT_INPUT_MODE_CHANGED = 512,
  SOFT_INPUT_STATE_ALWAYS_HIDDEN = 3,
  SOFT_INPUT_STATE_ALWAYS_VISIBLE = 5,
  SOFT_INPUT_STATE_HIDDEN = 2,
  SOFT_INPUT_STATE_UNCHANGED = 1,
  // temporarily disable this rule to avoid breaking changes.
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  SOFT_INPUT_STATE_UNSPECIFIED = 0,
  SOFT_INPUT_STATE_VISIBLE = 4,
}
export const KEYBOARD_BORDER_RADIUS = KeyboardControllerNative.keyboardBorderRadius
export const KEYBOARD_HAS_ROUNDED_CORNERS = KEYBOARD_BORDER_RADIUS > 0
