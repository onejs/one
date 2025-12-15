import type { TextStyle } from 'react-native';
/**
 * Convert numeric font weights to string format for React Navigation compatibility.
 * React Navigation only accepts string font weights, not numbers.
 */
export declare function convertFontWeightToStringFontWeight(fontWeight: TextStyle['fontWeight']): Exclude<TextStyle['fontWeight'], number> | undefined;
//# sourceMappingURL=style.d.ts.map