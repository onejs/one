import type { StyleProp, TextStyle } from 'react-native';
/**
 * Merge a style prop into a single object. Replaces `StyleSheet.flatten` so the
 * web graph doesn't import react-native just to read a style value.
 */
export declare function flattenStyle<T extends object>(style: StyleProp<T>): T | undefined;
/**
 * Convert numeric font weights to string format for React Navigation compatibility.
 * React Navigation only accepts string font weights, not numbers.
 */
export declare function convertFontWeightToStringFontWeight(fontWeight: TextStyle['fontWeight']): Exclude<TextStyle['fontWeight'], number> | undefined;
//# sourceMappingURL=style.d.ts.map